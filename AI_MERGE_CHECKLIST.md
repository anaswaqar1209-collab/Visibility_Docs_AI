# AI shared-code merge checklist

Use this whenever someone shares a new `Visibility_Docs_AI_VM-main` / `backend` zip.

## Rule

Keep **this repo** (`Visibility_Docs_AI_VM-main`) as the product base.  
Treat the shared zip as an **AI brain patch**, not a full replace.

| Keep forever (do not overwrite) | Safe to take from shared AI zip |
|--------------------------------|----------------------------------|
| `api-gateway/` | `ai-backend/app/services/rag_service.py` |
| `frontend/` | `ai-backend/app/services/chat_service.py` |
| `shared-storage/` | `ai-backend/app/services/conversation_service.py` |
| `ai-backend/app/routers/documents.py` | `SearchResult.cv_score` in `schemas.py` |
| `ai-backend/app/utils/file_utils.py` | `update_chat_session_doc_ids` in `database.py` |
| `ai-backend/app/config.py` + real `.env` | optional list-speed helpers in `document_service.py` |
| `ai-backend/app/services/orchestrator_service.py` (org fixes) | |
| `ai-backend/app/prompts/phase3/finance_agent.md` (extraction prompt) | |

## Easy steps (future drops)

1. Unzip shared code to a sibling folder, e.g. `Visibility_Docs_AI_VM-main (1)`.
2. Compare only `backend/` ↔ your `ai-backend/` (folder names differ).
3. Copy **only** the Safe list files above into your `ai-backend/`.
4. Never copy shared `frontend/`, upload router, `file_utils`, or `docker-compose` over yours.
5. Restart Python AI: `uvicorn app.main:app --reload --port 8000`
6. Smoke test: upload CV → details scores → chat question about that CV.

## Quick PowerShell compare

```powershell
$exist = "e:\VB Office\Visibility_Docs_AI_VM-main\ai-backend"
$new   = "e:\VB Office\Visibility_Docs_AI_VM-main (1)\Visibility_Docs_AI_VM-main\backend"
Compare-Object (Get-ChildItem $exist\app -Recurse -File | ForEach-Object { $_.FullName.Substring($exist.Length) }) `
               (Get-ChildItem $new\app -Recurse -File | ForEach-Object { $_.FullName.Substring($new.Length) })
```
