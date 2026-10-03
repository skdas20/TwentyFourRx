# Ria: the 24Rx voice support assistant

Ria is a voice assistant for 24Rx sellers and traders. It answers questions about the platform, explains each feature, guides users through registration, KYC and the dashboard, and looks up the user's own account data. It replies in English, Hindi or Hinglish, matching the user. The user opens it with one click, and it stays available on every page while they browse.

## Decisions

| Topic | Decision |
|---|---|
| Model and hosting | Gemini Live on **Vertex AI**, using the model `gemini-3.8-live`. If that fails, it falls back to `gemini-live-2.5-flash-native-audio`. |
| Where the credentials live | The backend relays audio over a WebSocket. The Vertex key never reaches the browser. |
| Google identity | A dedicated service account, `rx-voice-assistant@black-seer-478409-m8`, with only `roles/aiplatform.user`. Its key file is `backend/24rx-voice-assistant-service-key.json` and is not in git. (The production VM's scopes don't include `cloud-platform`, and its default service account is shared with other VMs.) |
| Language | Ria replies in the language the user speaks: English, Hindi or Hinglish. |
| What Ria may do on the page | Navigate, read the page, highlight, scroll, and fill fields with values the user dictated. It **never** submits a form, uploads a file or types a password. |
| User data | Read-only. Six tools, each limited to the logged-in user's own records. The user is identified from their existing login token. |
| Name and voice | Ria, with the female voice `Aoede`. |

## How it fits together

```
RiaWidget (mounted in providers.tsx; survives client-side navigation)
  ├─ audio.ts          microphone → 16 kHz PCM16 (worklet) / plays 24 kHz PCM, can be interrupted
  ├─ uiTools.ts        read_page, navigate, highlight, clear_highlight, scroll_to, fill_field
  └─ riaController.ts  WebSocket client, captions, idle timeout, resume after a reload
        ⇅  wss://<host>/api/v1/assistant/live
AssistantModule (NestJS; listens for WebSocket upgrades on the existing HTTP server)
  ├─ assistant.service.ts       origin allowlist, session limits, JWT → user
  ├─ assistant-session.ts       one Gemini Live session per browser; tool routing; reconnects with a resume handle on goAway
  ├─ assistant-data.service.ts  get_my_account / selling / buying / deliveries / notifications / support_tickets
  └─ assistant.prompt.ts + knowledge/knowledge-base.ts   persona + full platform knowledge, placed in the system instruction
```

- **Messages from the browser:** `start`, `audio`, `audio_end`, `text`, `context`, `auth`, `tool_result`, `stop`.
- **Messages from the server:** `ready`, `audio`, `interrupted`, `turn_complete`, `transcript`, `tool_call`, `tool_activity`, `resume_handle`, `error`, `ended`.
- **Page changes and login/logout** are added to the conversation as silent `[context]` notes. They don't make Ria speak.
- **UI targets** are found through `data-assist-id` and `data-assist-label` attributes on the pages.

## Guest mode vs. logged-in mode

| | Guest (not logged in) | Logged in |
|---|---|---|
| Answers | Short and basic, about 24Rx only. Off-topic questions are refused. | Full help: onboarding, KYC, dashboard tours |
| Browser tools | Navigate to public pages only, highlight, scroll. **No form filling.** | All browser tools |
| Data tools | `search_medicines` only (the public catalogue) | Also the six `get_my_*` tools (read-only, limited to the user's own records) |
| Limits | 6 spoken answers or 3 minutes; Ria then asks the user to log in. At most 10 guest sessions at once, and 6 guest sessions per IP per hour | 30 minutes |

The server enforces all of this; the prompt only reinforces it:
- **Tool calls:** guests can't fill forms, read account data, or navigate outside the public pages.
- **Logging in mid-conversation:** Live sessions can't change their tools or instructions, so the backend opens a new Live session in member mode, and Ria welcomes the user by name.
- **Showing the user's own data:** for questions like "what's in my portfolio", Ria fetches the data, opens the matching page, and spotlights each item as she describes it.

## Limits and safety
- **Origin allowlist:** `FRONTEND_URL`, `https://24rxexchange.com` and `https://www.24rxexchange.com`. It can be overridden with `ASSISTANT_ALLOWED_ORIGINS`.
- **Session caps:**
  - At most 30 sessions at once.
  - At most 3 per IP address.
  - A session can last up to 30 minutes.
  - The browser ends a session after 2 minutes of silence.
- **Data tools:** only available to logged-in, active users, and the user's ID always comes from the verified token. The model never supplies an ID.

## Configuration (backend `.env`, all optional)
| Variable | Default |
|---|---|
| `ASSISTANT_ENABLED` | `true` |
| `ASSISTANT_CREDENTIALS_FILE` | `24rx-voice-assistant-service-key.json` |
| `ASSISTANT_GCP_PROJECT` | `black-seer-478409-m8` |
| `ASSISTANT_GCP_LOCATION` | `us-central1` |
| `ASSISTANT_MODEL` | `gemini-3.8-live` |
| `ASSISTANT_FALLBACK_MODEL` | `gemini-live-2.5-flash-native-audio` |
| `ASSISTANT_VOICE` | `Aoede` |
| `ASSISTANT_MAX_SESSIONS` | 30 |
| `ASSISTANT_MAX_SESSIONS_PER_IP` | 3 |
| `ASSISTANT_MAX_MINUTES` | 30 |
| `ASSISTANT_GUEST_MAX_MINUTES` | 3 |
| `ASSISTANT_GUEST_MAX_TURNS` | 6 |
| `ASSISTANT_MAX_GUEST_SESSIONS` | 10 |
| `ASSISTANT_GUEST_SESSIONS_PER_HOUR` | 6 |
| `ASSISTANT_ALLOWED_ORIGINS` | the three origins above |

Frontend: `NEXT_PUBLIC_ASSISTANT_WS_URL` is only needed in development, when the backend isn't behind the same host. `BACKEND_INTERNAL_URL` changes the `/api/v1` rewrite target, which defaults to `http://localhost:8080`.

## Deployment (one-time server steps)
1. Copy `backend/24rx-voice-assistant-service-key.json` to `~/24rx/backend/` on the VM and run `chmod 600` on it.
2. nginx: add a WebSocket location in the server block for 24rxexchange.com, before `location /api/`:
   ```nginx
   location /api/v1/assistant/live {
       proxy_pass http://localhost:8080;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection "upgrade";
       proxy_set_header Host $host;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_read_timeout 3600s;
       proxy_send_timeout 3600s;
   }
   ```
   Then run `sudo nginx -t && sudo systemctl reload nginx`.
3. The server must run Node 20 or later, which `@google/genai` requires.
4. Push to `main`. CI runs `npm install` and the build, then restarts both services.

## Testing
- `node backend/scripts/ria-relay-smoke.js [ws-url] [email]` tests the full chain (backend relay → Vertex) as a visitor or as a local user.
- Playwright checks the widget in the browser: opening the panel, tool execution (navigate, highlight, fill), captions, and the typed-text fallback.
