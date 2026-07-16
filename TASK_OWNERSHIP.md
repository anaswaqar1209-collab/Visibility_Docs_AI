# Visibility Docs AI — Task Ownership & Architecture

> **Source list:** [`task.md`](./task.md) (senior’s full backlog)  
> **Your role:** UI (Next.js) + Node.js API gateway + MongoDB  
> **Model person role:** Python AI service only (train models, OCR, RAG, search) — **no UI**

---

## 1. Project roles

| Person | Owns | Does NOT own |
|--------|------|----------------|
| **You** | `frontend/`, `api-gateway/`, MongoDB schema, JWT + OpenRemote auth, all screens, Node→Python proxy | Python model code, embeddings DB internals, OCR/classification algorithms |
| **Model person** | `ai-backend/` (FastAPI), training, OCR, classification, extraction, RAG, vector search | Frontend, Node gateway, MongoDB, Supabase Auth on your side |

**Rule:** Do not edit files inside `ai-backend/` unless coordinating with the model person.

---

## 2. Three-folder layout (numbered)

```
Visibility_Docs_AI_VM-main/          ← project root (unified repo)
├── frontend/                        ← Next.js UI (port 3124) — YOU
├── api-gateway/                     ← Express + MongoDB (port 5100) — YOU
├── ai-backend/                      ← FastAPI AI pipeline (port 8000) — MODEL PERSON
├── TASK_OWNERSHIP.md                ← this file
├── task.md                          ← original senior task list
└── docker-compose.yml               ← wires all 3 services
```

| # | Folder | Stack | Port | Owner |
|---|--------|-------|------|-------|
| 1 | `frontend/` | Next.js 16, Tailwind | **3124** | You |
| 2 | `api-gateway/` | Express 5, TypeScript, MongoDB | **5100** | You |
| 3 | `ai-backend/` | Python FastAPI, Groq, embeddings | **8000** | Model person |

**Deprecated / removed:** Old model-person UI (`frontend` tab app in VM-main) — replaced by your `frontend/`.

---

## 3. Stack decisions (updates from original task.md)

| Original `task.md` | Your project | Action |
|--------------------|--------------|--------|
| PostgreSQL + Supabase + RLS | **MongoDB** in api-gateway | Use Mongo for users, orgs, doc metadata |
| Supabase Auth + magic link | **JWT + OpenRemote** | Already built — drop Supabase from your scope |
| pgvector in Postgres | **Python internal DB** (Supabase/SQLite in ai-backend) | Node stores `pythonDocumentId` link only |
| Monorepo workers (Celery) | Python `orchestrator_service` | Model person owns queue inside ai-backend |
| FastAPI as public API | **Express gateway** + internal FastAPI | Frontend never calls Python directly |
| S3/MinIO | Local `uploads/` in api-gateway (S3 later) | Org-scoped paths already exist |

---

## 4. Node ↔ Python integration contract

**Base URL:** `AI_SERVICE_URL=http://localhost:8000` (api-gateway `.env`)

### Upload (api-gateway → ai-backend)

| Step | Who | Action |
|------|-----|--------|
| 1 | Frontend | `POST /api/docs/documents` (multipart, JWT) |
| 2 | api-gateway | Validate RBAC, save file + Mongo `Document` |
| 3 | api-gateway | `POST {AI_SERVICE_URL}/api/v1/documents/upload` |
| 4 | ai-backend | OCR → classify → extract → embed pipeline |
| 5 | api-gateway | Save `pythonDocumentId`, set `status: processing` |

**Python request:** `multipart/form-data`

- `file` — document binary
- `organization_id` — `user.organizationId` or `personal_{userId}`
- `title` — optional, defaults to filename

**Python response:** `{ id, title, status, message }`

### Chat (api-gateway → ai-backend)

| Frontend | api-gateway | Python |
|----------|-------------|--------|
| `POST /api/docs/chat` `{ message, documentIds? }` | Resolve allowed docs → `pythonDocumentId` list | `POST /api/v1/chat` or `/api/v1/chat/all` |

**Python body:** `{ organization_id, question, document_ids?, session_id? }`

**Python response:** `{ answer, sources[], document_id, session_id? }`

### Search (api-gateway → ai-backend)

| Frontend | api-gateway | Python |
|----------|-------------|--------|
| `POST /api/docs/search` `{ query, filters? }` | Add `organization_id` from JWT user | `POST /api/v1/search` |

**Python body:** `{ query, organization_id, document_type?, limit?, offset? }`

### Job status (processing badges)

| api-gateway | Python |
|-------------|--------|
| `GET /api/docs/documents/:id/processing` | `GET /api/v1/documents/{pythonDocumentId}/job` |

### Auth note

- **Frontend → api-gateway:** JWT Bearer (your tokens)
- **api-gateway → ai-backend:** No user JWT required (optional auth); Python uses `get_optional_user` — gateway is trusted internal caller

### Env vars (api-gateway)

```env
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_TIMEOUT_MS=120000
AI_SERVICE_ENABLED=true
```

---

## 5. Master task table (all `task.md` items)

Legend: **You** | **Model** | **Shared** | **N/A** (replaced/skipped) | **Done** | **Partial**

| ID | Status | Task | Owner | Done? | Notes / update |
|----|--------|------|-------|-------|----------------|
| C-1 | C | User & role management UI (`/admin/users`, `/admin/roles`) | You | Partial | `/team`, `/admin/admins` exist; expand to full roles UI |
| C-2 | C | Hybrid search API | You (gateway) + Model (impl) | Partial | Node proxies `POST /api/v1/search` |
| C-3 | C | Image preprocessing | Model | — | `preprocessing_service.py` |
| C-4 | C | RBAC roles & permissions | You | Partial | 3 roles + granular permissions; not full Owner/Manager/Reviewer set |
| C-5 | C | Invoice field extraction | Model | — | phase3 `finance_agent` |
| C-6 | C | Embedding generation pipeline | Model | — | `embedding_service.py` |
| C-7 | C | Document classification | Model | — | `classification_service.py` |
| C-8 | C | Chat API | You (gateway) + Model (RAG) | Partial | Node proxies Python chat |
| C-9 | C | AI chat UI panel | You | Partial | `/chat` exists; wire real citations |
| C-10 | C | RAG pipeline | Model | — | `rag_service.py` |
| C-11 | C | Search UI `/search` | You | Partial | Page + sidebar link added |
| C-12 | C | Field-highlighting viewer | You | No | Needs Python extraction data |
| C-13 | C | Processing status UI | You | No | Use job proxy for badges |
| C-14 | C | Layout analysis | Model | — | OCR/orchestrator |
| C-15 | C | OCR engine | Model | — | `ocr_service.py` |
| C-16 | C | Document detail/viewer | You | Partial | PDF/image preview; no page overlays |
| C-17 | C | Drag-drop + folder upload UI | You | **Done** | `/documents` |
| C-18 | C | Document upload API | You | Partial | Local save + Python forward |
| C-19 | C | Login + org selection UI | You | Partial | Login done; no org switcher |
| C-20 | C | Authentication | You | **Done** | JWT + OpenRemote (not Supabase) |
| C-21 | C | Multi-tenant schema | You | Partial | Mongo `Organization`, `User`, `Document` |
| C-22 | C | Repo / folder structure | You | **Done** | 3-folder layout this doc |
| C-23 | C | PostgreSQL + Supabase + RLS | **N/A** | — | Replaced by Mongo + Python DB |
| D-24 | D | S3-compatible object storage | You | Partial | Local disk; S3 later |
| D-25 | D | Document library UI | You | **Done** | Filters, pagination, duplicates |
| D-26 | D | Processing queue infra | Model | — | `orchestrator_service.py` |
| D-27 | D | PDF/Office → page images | Model | — | OCR pipeline |
| D-28 | D | Processing job tracking API | You | Partial | Gateway proxy to Python `/job` |
| D-29 | D | Contract field extraction | Model | — | `legal_agent` |
| D-30 | D | Certificate field extraction | Model | — | `compliance_agent` |
| D-31 | D | Review/correction API | You | No | Mongo corrections TBD |
| D-32 | D | Confidence review queue | Model | — | `validation_service.py` |
| D-33 | D | Side-by-side review UI | You | No | `/documents/:id/review` |
| D-34 | D | AI Gateway service | Model | — | `groq_service.py` |
| D-35 | D | Dashboard overview UI | You | No | `/dashboard` |
| D-36 | D | Admin settings + API keys | You | No | `/settings`, `/admin/api-keys` |
| D-37 | D | Audit logging | You | No | Mongo `audit_logs` |
| D-38 | D | Docker Compose dev | Shared | Partial | Root `docker-compose.yml` |
| D-39 | D | CI/CD pipeline | Shared | No | — |
| D-40 | D | Observability | Shared | Partial | Winston on Node |
| D-41 | D | API test suite | You | No | Gateway + auth tests |
| D-42 | D | E2E smoke test | Shared | No | Upload→process→chat |
| D-43 | D | MVP UAT | Shared | No | — |
| D-44 | D | Full-text search | Model | — | `rag_service` hybrid search |
| P-45 | P | Table extraction | Model | — | `table_service.py` |

---

## 6. Already completed (your work)

- Login UI + JWT + OpenRemote sync
- Document library: search, sort, file type filter, duplicate filter, pagination
- Upload: drag-drop, folder, bulk, paste
- Document preview (PDF/images)
- Team management + super admin pages
- RBAC: superAdmin / admin / team + permissions
- Chat UI + composer (glass pill design)
- Sidebar fixed; main content scrolls
- MongoDB models: User, Organization, Document, DocumentChunk (schema)

---

## 7. Your next sprint priorities

1. **Gateway integration** — upload forward, chat proxy, search proxy (in progress)
2. **Processing badges** — poll Python job status in library
3. **Search UI** — full filters + result cards
4. **Review screen** — side-by-side with Python extractions
5. **Dashboard + admin settings**
6. **Docker Compose** — 3 services locally

---

## 8. How to run locally

```bash
# Terminal 1 — AI service (model person)
cd ai-backend
python run.py      # http://localhost:8000

# Terminal 2 — API gateway (you)
cd api-gateway
npm run dev        # http://localhost:5100

# Terminal 3 — Frontend (you)
cd frontend
npm run dev        # http://localhost:3124
```

Seed users: `cd api-gateway && npm run seed`

---

## 9. Explicit rules

1. **Never modify `ai-backend/`** without model person approval.
2. **Frontend only talks to api-gateway** (`NEXT_PUBLIC_API_URL=http://localhost:5100/api`).
3. **MongoDB is only for api-gateway** — not for vectors/embeddings.
4. **Ignore** old model-person Next.js UI — all screens live in `frontend/`.
