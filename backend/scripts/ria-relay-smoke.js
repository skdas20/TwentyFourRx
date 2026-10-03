/**
 * End-to-end smoke test for Ria's WebSocket relay (backend ⇄ Vertex Gemini Live).
 *
 *   node scripts/ria-relay-smoke.js [ws-url] [userEmail]
 *
 * Without userEmail it runs as a visitor and asks Ria to open the register page
 * (expects a navigate tool call + spoken reply). With userEmail it signs a JWT
 * for that local user and asks about their KYC (expects get_my_account).
 */
require('dotenv').config();
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const url = process.argv[2] || 'ws://localhost:8081/api/v1/assistant/live';
const email = process.argv[3];

(async () => {
  let token = null;
  if (email) {
    const prisma = new PrismaClient();
    const user = await prisma.user.findUnique({ where: { email } });
    await prisma.$disconnect();
    if (!user) throw new Error(`no user ${email}`);
    token = jwt.sign({ sub: user.id, email: user.email, roleCode: user.roleCode }, process.env.JWT_SECRET, { expiresIn: '5m' });
  }

  const ws = new WebSocket(url, { headers: { Origin: process.env.FRONTEND_URL || 'http://localhost:3000' } });
  const t0 = Date.now();
  const seen = { audioChunks: 0, toolCalls: [], model: '', user: '', turns: 0 };
  let asked = false;

  const ask = () => {
    asked = true;
    ws.send(JSON.stringify({ type: 'text', text: email ? 'Has my KYC been approved? Which documents are pending?' : 'Please take me to the registration page.' }));
  };

  ws.on('open', () => ws.send(JSON.stringify({ type: 'start', token, path: '/' })));
  ws.on('message', (raw) => {
    const m = JSON.parse(raw.toString());
    if (m.type === 'ready') console.log(`ready +${Date.now() - t0}ms`, JSON.stringify(m.user));
    if (m.type === 'audio') seen.audioChunks++;
    if (m.type === 'transcript') seen[m.role] += m.text;
    if (m.type === 'tool_call') {
      seen.toolCalls.push(`${m.name}(${JSON.stringify(m.args)})`);
      const result = m.name === 'navigate' ? { ok: true, path: m.args.path } : { ok: true, path: '/', title: 'Home', targets: [], fields: [] };
      ws.send(JSON.stringify({ type: 'tool_result', id: m.id, result }));
    }
    if (m.type === 'tool_activity') seen.toolCalls.push(`server:${m.name}`);
    if (m.type === 'turn_complete') {
      seen.turns++;
      const said = seen.model.trim();
      console.log(`turn ${seen.turns} done +${Date.now() - t0}ms | Ria: ${said}`);
      seen.model = '';
      if (!asked) ask();
      else if (said) finish(); // a tool-call turn completes silently; wait for the spoken answer
    }
    if (m.type === 'error' || m.type === 'ended') console.log(m.type, m.message || m.reason);
  });
  ws.on('unexpected-response', (_req, res) => { console.log('HTTP', res.statusCode); process.exit(1); });
  ws.on('error', (e) => { console.log('ws error', e.message); process.exit(1); });

  const finish = () => {
    console.log(JSON.stringify({ audioChunks: seen.audioChunks, toolCalls: seen.toolCalls }, null, 1));
    ws.send(JSON.stringify({ type: 'stop' }));
    setTimeout(() => process.exit(seen.audioChunks > 0 ? 0 : 1), 300);
  };
  setTimeout(() => { console.log('timeout'); finish(); }, 45000);
})().catch((e) => { console.error(e); process.exit(1); });
