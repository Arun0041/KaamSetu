# KaamSetu

> Turn Hindi-English voice notes into assigned, cited action items — and pause whenever conflicting evidence means a human must decide.

KaamSetu is an AI-powered operations tool for small Indian businesses and WhatsApp-heavy teams. It transcribes code-mixed (Hinglish) voice notes, extracts structured tasks with assignees and deadlines, retrieves relevant private documents, detects contradictions between sources, cites the evidence, and routes anything uncertain to a human review queue instead of silently guessing.

## ✨ Features

- **Code-mixed transcription** — Whisper handles Hindi-English (Hinglish) speech.
- **Task extraction** — a reasoning model extracts title, assignee, deadline, priority, and entities.
- **Hybrid retrieval** — keyword/Postgres search over private sources (pgvector-ready).
- **Contradiction detection** — a second model compares the new instruction against private policies and prior notes.
- **Evidence citation** — conflicting quotes are surfaced with source + page references.
- **Confidence routing** — high-confidence items become assignable; low-confidence/conflicting items go to review.
- **Graceful degradation** — runs in offline/review mode when the AI or database is unavailable.
- **Typed text input** — describe the instruction directly instead of uploading a voice note.
- **Auth** — JWT access tokens + hashed, rotating refresh tokens with role-based access.

## 🧠 What problem it solves

Small-business owners lose operational commitments inside informal Hinglish voice notes. A normal task app cannot reliably understand:

> “Rahul, kal tak vendor quotation compare kar dena. Finance policy ke according advance 20% se zyada nahi hona chahiye, but latest vendor document says 30%.”

KaamSetu understands the intent, extracts the action, and — crucially — **refuses to silently average the 20% policy vs. the 30% vendor request**. It pauses, shows the evidence, and hands the decision back to a human.

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Lucide icons |
| Backend | Node.js, Express, TypeScript |
| AI | Groq API — `whisper-large-v3` (speech) + `openai/gpt-oss-120b` (reasoning) |
| Database | PostgreSQL (+ pgvector optional) |
| Queues | Redis / BullMQ-ready (add for production) |
| Auth | JWT (`jsonwebtoken`) + bcrypt |
| Validation | Zod |

## 🏗 Architecture

```text
React dashboard
      ↓
Express API  (TypeScript)
      ↓
POST /api/ingest  (audio)  |  POST /api/ingest/text  (typed)
      ↓
Whisper transcription  (skipped for typed text)
      ↓
Task-extraction model  (strict JSON schema)
      ↓
PostgreSQL keyword/pgvector retrieval
      ↓
Contradiction + citation verifier
      ↓
Confidence router
   ├── Assign task          (high confidence)
   ├── Create review item   (conflict / missing assignee / low confidence)
   └── Mark failed          (unrecoverable error)
```

## 📁 Project Structure

```text
Vocal/
├── client/                   # React app (Vite) — independent project
│   ├── package.json
│   └── src/
│       ├── main.jsx          # UI + demo state
│       └── styles.css        # design tokens
└── server/                   # Express API (TypeScript) — independent project
    ├── package.json
    ├── .env.example          # config template
    ├── migrations/           # SQL migrations
    │   ├── 001_initial.sql
    │   └── 002_pgvector.sql
    └── src/
        ├── index.ts          # entrypoint
        ├── app.ts            # Express app + middleware
        ├── config/env.ts     # typed env config (Zod)
        ├── db/               # pool + migrations + seed
        ├── lib/              # jwt, errors, logger, async-handler, groq
        ├── middleware/       # auth, validate, rate-limit, error-handler
        ├── routes/           # auth, captures, ingest, tasks, review, sources
        ├── services/         # pipeline, transcription, extraction, verification, retrieval, repos
        └── types/            # shared domain types
```

## 🚀 Getting Started

### Prerequisites

- **Node.js 20+**
- **PostgreSQL 15+**
- A **Groq API key** at [console.groq.com/keys](https://console.groq.com/keys) (optional — the app runs offline without it)

### 1. Install dependencies (each project separately)

```bash
# client
cd client && npm install

# server
cd server && npm install
```

### 2. Configure the server

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```env
DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/kaamsetu
GROQ_API_KEY=gsk_...           # leave blank to run offline
```

### 3. Create the database (if missing)

```sql
CREATE DATABASE kaamsetu;
```

> Migrations and demo sources (Finance Policy v3 = 20% cap, Sharma Steels Quotation = 30%) are applied automatically on first boot.

### 4. Run (two terminals)

```bash
# terminal 1 — API
cd server && npm run dev

# terminal 2 — client
cd client && npm run dev
```

- Client: http://localhost:5173
- API: http://localhost:4010

## 📖 API Reference

Base URL: `http://localhost:4010`

### Health
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Service + DB status |

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account (`email`, `password`, `name`) → tokens |
| POST | `/api/auth/login` | Login → tokens |
| POST | `/api/auth/refresh` | Rotate refresh token |
| POST | `/api/auth/logout` | Revoke refresh token |
| GET | `/api/auth/me` | Current user (auth required) |

### Captures & tasks
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/captures` | List captures (auth required) |
| GET | `/api/captures/:id` | Capture + tasks + review items (auth required) |
| GET | `/api/tasks` | List extracted tasks (auth required) |
| PATCH | `/api/tasks/:id` | Update status/assignee (auth + ownership) |

### Ingest
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ingest` | Upload audio (multipart field `audio`) |
| POST | `/api/ingest/text` | Send typed text: `{ "transcript": "..." }` |

### Review & sources
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/review` | Open human-review queue (auth required) |
| POST | `/api/review/:id/resolve` | Resolve a review item (auth + ownership) |
| GET | `/api/sources` | List private knowledge sources (auth required) |

### Example: text ingest

```bash
curl -X POST http://localhost:4010/api/ingest/text \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"transcript":"Rahul, kal tak vendor quotation compare kar dena. Advance 20% se zyada nahi hona chahiye, but vendor says 30%."}'
```

## 🔄 Pipeline: how a note becomes a task

1. **Ingest** — audio (Whisper) or typed text.
2. **Extract** — strict JSON schema via `openai/gpt-oss-120b`: `title`, `assignee`, `deadline`, `priority`, `entities`, `confidence`, `flags`.
3. **Retrieve** — hybrid search over private sources.
4. **Verify** — a second model checks for contradictions and returns citations.
5. **Route** — `review` (conflict/missing assignee/low confidence), `assignable` (task created), or `failed` (error recorded).

## 📊 Evaluation

`server/migrations/001_initial.sql` creates `eval_cases` and `eval_runs` tables for the 20-case evaluation harness. The frontend exposes an **Evaluation** view to track task-extraction, citation-grounding, conflict-detection, and safe-refusal scores.

## 🛡 Graceful Degradation

| Scenario | Behavior |
|---|---|
| `GROQ_API_KEY` missing | Item routed to review with reason *"AI is offline"* |
| Postgres down | Server starts degraded; `/api/health` reports `database: down` |
| pgvector missing | Falls back to keyword/LIKE retrieval (migration is optional) |
| Model error | Capture marked `failed` with the recorded error |

## 🔐 Security Notes

- Passwords hashed with bcrypt (10 rounds).
- JWT access tokens (15m) + hashed refresh tokens (30d, rotating).
- Public registration is forced to the `member` role.
- Ownership checks on task/review mutations.
- Secrets are read from `server/.env` — **never commit it**.

## 🧭 Known Limitations / Next Steps

- The React UI is still a demo shell; wire it to `/api/captures` and `/api/review` for live data.
- pgvector + embeddings are not yet wired (retrieval uses keyword search).
- Audio upload needs a real file and Whisper access on the Groq key.
- Redis/BullMQ background jobs are scaffolded but not enabled.

## 📜 License

MIT © KaamSetu
