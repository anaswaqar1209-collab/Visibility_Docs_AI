
Status C
Build user & role management UI
    /admin/users and /admin/roles screens to invite users and assign roles.
Build hybrid search API
    GET /api/v1/search combining keyword, metadata, and vector search with ranking.
Implement image preprocessing
    Deskew, denoise, contrast enhancement, orientation detection, low-quality scan detection.
Implement RBAC roles and permissions
    Owner, Admin, Manager, Reviewer, Viewer, API User roles with permission checks (document.upload, document.review, admin.manage_users, etc.).
Implement invoice field extraction
    Extract vendor, invoice number, date, due date, currency, subtotal, tax, total as structured JSON.
Build embedding generation pipeline
    Semantic chunking (document_chunks) + embedding generation stored in pgvector via document_embeddings.
Implement document classification
    Classify into Invoice, PO, Contract, HR Doc, Audit Report, Certificate, Financial Report, Engineering Drawing, Unknown.
Build chat API
    POST /api/v1/chat returning answers with page-level citations and source references.
Build AI chat UI panel
    /chat interface with conversation view, source citations linking back to document pages.
Build RAG pipeline
    Query rewriting, permission-filtered hybrid retrieval, reranking, context building, no-answer-when-insufficient-evidence logic.
Build search UI
    /search page with query box, filters (doc type, date), and result previews.
Build field-highlighting document viewer UI
    Overlay extracted field bounding boxes on page images with click-to-jump.
Build processing status UI
    Progress indicators / status badges on document library and detail pages while jobs run.
Implement layout analysis
    Detect headings, paragraphs, tables, forms, signatures, headers/footers, reading order.
Integrate OCR engine
    Primary OCR model with PaddleOCR/Tesseract fallback; output text, bounding boxes, confidence scores.
Build document detail/viewer page
    /documents/:id page rendering page images with metadata panel.
Build drag-and-drop + folder upload UI
    /documents upload widget supporting drag-and-drop, folder upload, and multi-file batch upload.
Build document upload API
    POST /api/v1/documents upload session endpoint: validate file type/size, store original, create metadata record + processing job.
Build login + organization selection UI
    /login route with email/password and magic link flows; org switcher for multi-tenant users.
Implement authentication
    Email/password + magic link auth via Supabase Auth; scaffold for Google/Microsoft login later.
Design multi-tenant schema (organizations, users, roles)
    Create organizations, users, roles, permissions, user_roles tables per architecture doc section 10.
Set up repo structure
    Create monorepo: apps/web, apps/api, workers/document-worker, workers/ai-worker, packages/shared, packages/ui, infra/docker.
Provision PostgreSQL + Supabase, enable RLS
    Stand up managed Postgres (Supabase), enable pgvector extension, configure Row Level Security groundwork for multi-tenancy.


Status P

Implement table extraction
    Detect table boundaries, rows/columns, merged cells, headers, totals; output JSON/CSV/Markdown.



Status D
Set up S3-compatible object storage
    Configure MinIO (on-prem) / S3 or Supabase Storage (cloud) with org-scoped paths: /orgs/{org_id}/documents/{doc_id}/.
Build document library UI
    /documents list view with status, type, thumbnail, filters.
Set up processing queue infra
    Redis + Celery/Dramatiq with separate queues: file_conversion_queue, ocr_queue, layout_queue, extraction_queue, embedding_queue.
Build PDF/Office to page-image conversion worker
    Split documents into pages, convert to images, generate thumbnails, create document_pages records.
Build processing job tracking API
    GET job status/progress endpoint backing processing_jobs table.
Implement contract field extraction
    Extract parties, effective date, expiry date, renewal terms, payment terms, termination notice.
Implement certificate field extraction
    Extract issuer, validity, expiry date.
Build review/correction API
    Endpoints to approve/reject extraction, edit field values, store corrections for reviewed_by/reviewed_at.
Build confidence-based review queue
    Backend logic to surface low-confidence extractions first.
Build side-by-side review screen UI
    /documents/:id/review with document viewer + editable extracted fields, approve/reject actions.
Build AI Gateway service
    Model-agnostic routing service: prompt templates, retry logic, token/cost tracking, provider fallback.
Build dashboard overview UI
    /dashboard with documents-processed count, processing status, recent activity.
Build admin settings + API key management UI
    /settings and /admin/api-keys screens for org configuration and API key issuance.
Implement audit logging
    Backend audit_logs table + middleware capturing API requests, user actions, security events.
Set up Docker Compose dev environment
    Compose file wiring Next.js app, FastAPI backend, PostgreSQL, Redis, MinIO, worker service.
Set up CI/CD pipeline
    GitHub Actions: lint, type check, unit tests, API tests, build images, deploy staging, smoke tests.
Set up basic observability
    Sentry error tracking + structured logging for API and workers.
Write API test suite
    Automated tests for auth, documents, search, chat, review endpoints.
Write E2E smoke test
    End-to-end flow: upload -> OCR -> classify -> review -> search -> chat.
Run MVP UAT / bug bash  
    Joint pass by both developers against the MVP scope checklist (PRD section 21) before release.
Implement full-text search
    PostgreSQL full-text search over document_pages/raw_text with tenant filtering.






