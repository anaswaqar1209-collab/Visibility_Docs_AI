# Visibility Docs AI — Unified Project

Three separate folders, one product:

| Folder | Role | Port | Owner |
|--------|------|------|-------|
| [`frontend/`](./frontend) | Next.js UI | 3124 | You |
| [`api-gateway/`](./api-gateway) | Express + MongoDB gateway | 5100 | You |
| [`ai-backend/`](./ai-backend) | Python FastAPI (OCR, RAG, search) | 8000 | Model person |

**Do not edit `ai-backend/`** without the model person.

Full task split: [`TASK_OWNERSHIP.md`](./TASK_OWNERSHIP.md)  
Original senior list: [`task.md`](./task.md)

## Local development

```bash
# 1. AI service
cd ai-backend && python run.py

# 2. API gateway
cd api-gateway && npm install && npm run dev

# 3. Frontend
cd frontend && npm install && npm run dev
```

## Docker

```bash
docker compose up --build
```

## Data flow

Frontend → api-gateway (JWT) → ai-backend (internal REST) for upload processing, chat, and search.
