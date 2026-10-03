import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { GoogleGenAI } from '@google/genai';
import { WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import * as path from 'path';
import { PrismaService } from '../config/prisma.service';
import { AssistantDataService } from './assistant-data.service';
import { AssistantSession, AssistantUser } from './assistant-session';

export const ASSISTANT_WS_PATH = '/api/v1/assistant/live';

/**
 * Hosts Ria's WebSocket endpoint on the existing HTTP server and relays each
 * connection to a Gemini Live session on Vertex AI. The Vertex credentials
 * stay on the server; browsers only ever talk to this endpoint.
 */
@Injectable()
export class AssistantService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger('Ria');
  private readonly wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024 });
  private ai?: GoogleGenAI;
  private sessions = new Set<AssistantSession>();
  private perIp = new Map<string, number>();

  constructor(
    private readonly adapterHost: HttpAdapterHost,
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly data: AssistantDataService,
  ) {}

  private get enabled() {
    return this.config.get('ASSISTANT_ENABLED', 'true') !== 'false';
  }

  onApplicationBootstrap() {
    if (!this.enabled) {
      this.log.log('Ria voice assistant disabled (ASSISTANT_ENABLED=false)');
      return;
    }

    const keyFile = path.resolve(
      this.config.get('ASSISTANT_CREDENTIALS_FILE', '24rx-voice-assistant-service-key.json'),
    );
    this.ai = new GoogleGenAI({
      vertexai: true,
      project: this.config.get('ASSISTANT_GCP_PROJECT', 'black-seer-478409-m8'),
      location: this.config.get('ASSISTANT_GCP_LOCATION', 'us-central1'),
      googleAuthOptions: { keyFile, scopes: ['https://www.googleapis.com/auth/cloud-platform'] },
    });

    const server = this.adapterHost.httpAdapter.getHttpServer();
    server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
      if (!req.url?.startsWith(ASSISTANT_WS_PATH)) return;
      this.handleUpgrade(req, socket, head);
    });
    this.log.log(`Ria voice assistant listening on ws ${ASSISTANT_WS_PATH}`);
  }

  onModuleDestroy() {
    for (const s of this.sessions) s.close('server shutdown');
    this.wss.close();
  }

  private allowedOrigins(): string[] {
    const configured = this.config.get<string>('ASSISTANT_ALLOWED_ORIGINS');
    if (configured) return configured.split(',').map((o) => o.trim()).filter(Boolean);
    return [
      this.config.get('FRONTEND_URL', 'http://localhost:3000'),
      'https://24rxexchange.com',
      'https://www.24rxexchange.com',
    ];
  }

  private reject(socket: Duplex, status: string) {
    socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
    socket.destroy();
  }

  private handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
    const origin = req.headers.origin;
    if (!origin || !this.allowedOrigins().includes(origin)) {
      this.log.warn(`rejected origin ${origin}`);
      return this.reject(socket, '403 Forbidden');
    }

    const maxSessions = Number(this.config.get('ASSISTANT_MAX_SESSIONS', 30));
    const maxPerIp = Number(this.config.get('ASSISTANT_MAX_SESSIONS_PER_IP', 3));
    // nginx sets X-Real-IP to the connecting client; X-Forwarded-For can be spoofed by clients.
    const ip = String(req.headers['x-real-ip'] ?? req.socket.remoteAddress ?? '').trim();
    if (this.sessions.size >= maxSessions || (this.perIp.get(ip) ?? 0) >= maxPerIp) {
      return this.reject(socket, '429 Too Many Requests');
    }

    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.perIp.set(ip, (this.perIp.get(ip) ?? 0) + 1);

      // Keep the socket alive through proxies while the mic is muted.
      const ping = setInterval(() => ws.readyState === ws.OPEN && ws.ping(), 25_000);

      const session = new AssistantSession(ws, {
        ai: this.ai!,
        models: [
          this.config.get('ASSISTANT_MODEL', 'gemini-3.8-live'),
          this.config.get('ASSISTANT_FALLBACK_MODEL', 'gemini-live-2.5-flash-native-audio'),
        ].filter(Boolean),
        voice: this.config.get('ASSISTANT_VOICE', 'Aoede'),
        maxDurationMs: Number(this.config.get('ASSISTANT_MAX_MINUTES', 30)) * 60_000,
        data: this.data,
        resolveUser: (token) => this.resolveUser(token),
        onEnd: () => {
          clearInterval(ping);
          this.sessions.delete(session);
          const n = (this.perIp.get(ip) ?? 1) - 1;
          if (n > 0) this.perIp.set(ip, n);
          else this.perIp.delete(ip);
        },
      });
      this.sessions.add(session);
    });
  }

  /** Same checks as the REST API: valid JWT + active user. Anything else is a visitor. */
  private async resolveUser(token?: string | null): Promise<AssistantUser> {
    if (!token || typeof token !== 'string') return { loggedIn: false };
    try {
      const payload: any = this.jwt.verify(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, name: true, roleCode: true, status: true, isActive: true },
      });
      if (!user || !user.isActive) return { loggedIn: false };
      return { loggedIn: true, id: user.id, name: user.name, roleCode: user.roleCode, status: user.status };
    } catch {
      return { loggedIn: false };
    }
  }
}
