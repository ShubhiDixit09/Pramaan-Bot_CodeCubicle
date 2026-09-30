# Local API

Interactive documentation is available at `http://127.0.0.1:8000/docs`.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Database, corpus, and Ollama status |
| GET/POST | `/api/cases` | List or create cases |
| GET/PATCH/DELETE | `/api/cases/{id}` | Read, CAS-update, or tombstone a case |
| POST | `/api/cases/{id}/analyze` | Guard, retrieve, generate, verify, persist |
| POST | `/api/cases/{id}/evidence` | Save evidence metadata and extract plain text |
| GET | `/api/research?query=...` | Search the local statutory corpus |
| GET | `/api/procedures` | List deterministic procedure templates |
| POST | `/api/cases/{id}/procedures` | Start a resumable procedure |
| PATCH | `/api/procedure-runs/{id}/steps/{step}` | Toggle a procedure step |
| POST | `/api/cases/{id}/drafts` | Generate and version a fact-bound draft |
| GET | `/api/drafts/{id}/pdf` | Export a saved draft as PDF |
| GET | `/api/courts` | Read the small offline legal-aid directory |

Mutating endpoints accept an idempotency key. Case PATCH and DELETE also require
the expected revision to enforce optimistic concurrency.


