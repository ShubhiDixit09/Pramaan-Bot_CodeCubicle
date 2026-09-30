# PRAMAAN BOT — Sovereign Legal Intelligence at the Edge

> Private, offline-first legal assistance for India - from a citizen's own words to
> grounded law, a verified action plan, and a ready-to-review document.

PRAMAAN BOT is not a cloud chatbot wrapped around a legal prompt. It is a deterministic
legal-action system designed for citizens who face three barriers at once: difficult
legal language, sensitive personal facts, and unreliable connectivity.

A citizen explains a problem in English, Hindi, or Hinglish. PRAMAAN BOT masks personal
identifiers, retrieves relevant provisions from a local statutory corpus, uses a locally
running Gemma model when available, verifies the response against retrieved law, and
turns the result into a resumable procedure or fact-bound draft. The case stays on the
device.

```text
Citizen's words
      -> privacy shield
      -> legal issue detection
      -> local statutory retrieval
      -> local Gemma / deterministic fallback
      -> citation and safety verification
      -> action checklist + document draft + trust report
```

## The problem

India's legal-access gap is not only a shortage of answers.

- **Jargon excludes people.** Citizens should not need to know an Act number or legal
  phrase before they can understand their rights.
- **Legal facts are sensitive.** Complaints, identity numbers, family disputes, tenancy
  records, and evidence should not be forced through a third-party cloud model.
- **Connectivity is unequal.** A system intended for Bharat must remain useful on a
  local machine with weak or unavailable internet.
- **Chat answers disappear.** Citizens need a saved case, evidence trail, deadlines,
  procedures, drafts, and a clear next action - not another disposable conversation.

## What makes PRAMAAN BOT different

| Ordinary legal chatbot | PRAMAAN BOT |
|---|---|
| Sends prompts to a cloud model | Enforces a loopback-only model endpoint |
| Produces a one-time answer | Builds a persistent local case workspace |
| Hides reasoning quality behind confidence | Exposes citations, grounding, PII safety, and findings |
| Treats workflow as prose | Uses deterministic, resumable procedure state |
| Overwrites mutable records | Uses CAS revisions and immutable event/audit history |
| Generic template drafting | Binds drafts to verified case facts |
| Requires dependable connectivity | Runs with local retrieval and a deterministic fallback |

## Seven-layer architecture

```mermaid
flowchart TD
    UI[React citizen workspace] --> API[FastAPI localhost gateway]
    API --> SHIELD[PII masking and injection guard]
    SHIELD --> WORKFLOW[Case lifecycle and legal workflows]
    WORKFLOW --> RAG[Read-only statutory retrieval]
    RAG --> GEMMA[Local Ollama + Gemma]
    GEMMA --> VERIFY[Citation and safety verification]
    VERIFY --> OUTPUT[Guidance, checklist, draft, trust report]
    OUTPUT --> DB[(SQLite / SQLCipher-ready persistence)]
    DB --> EVENTS[Append-only domain and audit events]
```

| Layer | Implementation | Status |
|---|---|---|
| Domain | Cases, facts, evidence, issues, laws, strategies, timelines | Implemented |
| Database | 13 legal tables, Unit of Work, CAS, tombstones, migrations | Implemented |
| Workflow | Case lifecycle, consumer/RTI/police procedures, drafting | Implemented |
| API | Typed FastAPI gateway, idempotency, evidence upload, PDF export | Implemented |
| Retrieval | Hierarchical offline statutory corpus search | MVP implemented |
| AI | Loopback-only Ollama client with configurable Gemma model | Implemented |
| UI | Responsive React case workspace and trust surfaces | Implemented |

The concept deck contains one legacy reference to an Express API. The final repository
uses FastAPI because the declared stack is Python and the domain, persistence, retrieval,
and safety services are Python-native.

## Deterministic legal infrastructure

### 1. Compare-and-swap case writes

Every mutable case write includes an expected revision:

```sql
UPDATE cases
SET status = ?, revision = revision + 1
WHERE id = ? AND revision = ? AND is_deleted = 0;
```

A stale writer receives a conflict instead of silently overwriting newer case data.

### 2. Atomic Unit of Work

Case state, legal issues, applicable laws, citations, strategies, trust reports, domain
events, and audit records are committed together. If any child write fails, the entire
transaction rolls back.

### 3. Zero physical case deletion

Deleting a case sets a tombstone, advances the revision, appends `CaseDeleted`, and writes
an immutable audit entry. Application workflows never execute `DELETE FROM cases`.

### 4. Idempotent operations

Analysis, procedure, draft, update, and deletion requests use idempotency keys. Retrying
the same operation replays its original result rather than creating duplicate state.

## Local intelligence and retrieval

PRAMAAN BOT ranks relevant Acts first and then ranks individual provisions inside those
Acts. Retrieved text and source metadata are passed to the local model as the only legal
context. If Ollama is unavailable, a constrained deterministic response is assembled
from the retrieved provisions instead of silently calling a cloud service.

The runnable default model tag is `gemma3:4b`. Set `PRAMAAN_OLLAMA_MODEL` to the exact
supported local Gemma release installed on the machine.

The model endpoint is restricted in code to `localhost`, `127.0.0.1`, or `::1`. A remote
model URL is rejected during startup.

## Citizen product surfaces

- **Dashboard** - local case register and urgency overview
- **New case** - plain-language English, Hindi, or Hinglish intake
- **Case workspace** - analysis, facts, citations, next actions, and trust score
- **Legal research** - semantic search over the offline statutory corpus
- **Action guides** - resumable consumer, RTI, and police-complaint checklists
- **Document drafting** - fact-bound notices, complaints, and RTI applications
- **Trust report** - citation coverage, grounding, PII safety, disclaimer checks, and findings

## Privacy and safety boundary

```text
React :5173  ->  FastAPI :8000  ->  Ollama :11434
     localhost       localhost        localhost

           SQLite + evidence + generated PDFs
                         local disk
```

- The browser never calls Ollama directly.
- The API constructs prompts and owns every case write.
- Aadhaar numbers, phone numbers, email addresses, and PAN patterns are masked before
  model processing.
- Prompt-injection patterns are blocked.
- Unsupported section references reduce the grounding score and remain visible.
- Every response receives a legal-information disclaimer.
- Evidence is content-hashed on ingestion.
- SQLCipher configuration fails closed if a key is supplied without a cipher-capable driver.

## Three-minute demonstration

1. Create a case in Hinglish: *“Landlord security deposit wapas nahi de raha.”*
2. Show that identity and contact patterns are masked locally.
3. Run analysis and inspect retrieved statutes, citations, and trust findings.
4. Open the saved case workspace - nothing disappears after the answer.
5. Start a resumable action checklist and mark one step complete.
6. Generate a fact-bound legal notice and export it locally as PDF.
7. Disconnect Ollama and repeat a research query to demonstrate the offline deterministic fallback.

## Quick start

Prerequisites: Python 3.12+, Node.js 20+, and optionally Ollama.

```powershell
py -m venv .venv
.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
npm --prefix frontend install

# Terminal 1
.venv\Scripts\python.exe backend\run.py

# Terminal 2
npm --prefix frontend run dev
```

Open `http://127.0.0.1:5173`. API documentation is available at
`http://127.0.0.1:8000/docs`.

### Enable local Gemma

```powershell
ollama pull gemma3:4b
ollama serve
$env:PRAMAAN_OLLAMA_MODEL = "gemma3:4b"
```

### Optional SQLCipher deployment

The default development driver is standard SQLite. Do not claim encrypted storage unless
a SQLCipher-capable driver is installed and a local key is configured.

```powershell
$env:PRAMAAN_DB_KEY = "load-this-from-a-local-secret-store"
```

Startup fails if a key is configured but the active driver lacks SQLCipher support.

## Tests

```powershell
.venv\Scripts\python.exe -m pytest backend -q
npm --prefix frontend run build
```

The suite covers schema integrity, atomic rollback, CAS conflicts, tombstones,
idempotency, procedures, PII masking, injection blocking, retrieval, output grounding,
storage-security reporting, and rejection of remote model endpoints.

## Repository map

```text
backend/
  app/
    database.py       schema, migration, Unit of Work, SQLCipher checks
    repositories.py   CAS, idempotency, tombstone and event policy
    services/
      legal_engine.py intent, retrieval, analysis and persistence
      rag.py          offline hierarchical statutory search
      ollama.py       loopback-only local model adapter
      shield.py       input and output safeguards
      procedures.py   resumable deterministic workflows
      drafting.py     fact-bound document generation and PDF export
    main.py           local REST gateway
  data/               demonstration corpus, procedures and court directory
  tests/              integrity and service tests
frontend/src/         connected React citizen application
packages/shieldai/    reusable model-agnostic guardrail package
docs/                 architecture and API contracts
scripts/              local setup, development and test commands
```

## Honest limitations

PRAMAAN BOT provides general legal information, not legal advice. The bundled statutory
corpus is a compact demonstration set, not a production legal database. Before real-world
deployment it must be expanded, versioned, linked to authoritative sources, and reviewed
by qualified Indian lawyers. State-specific laws, amendments, limitation periods, fees,
court directories, and procedural requirements must be independently verified.

Standard SQLite is not encrypted. SQLCipher is an explicit deployment upgrade, and the
health endpoint reports the actual active driver and encryption state. Scanned-document
OCR also requires a separately installed local OCR or vision adapter.

## Author

**Shubhi Dixit**<br>
B.Tech, Computer Science Engineering<br>
Delhi Technological University
