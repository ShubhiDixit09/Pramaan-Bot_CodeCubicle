# Pramaan

Pramaan is an evidence operating system for turning a plain-English intelligence
request into a monitored, source-backed, versioned dataset.

It is being built for the **AI-Powered Data Intelligence Platform** problem statement.
NyayaBot is an input prototype only; Pramaan is a new product and architecture.

## Product loop

```text
mission -> plan -> collect -> extract -> reconcile -> publish -> monitor
```

The initial vertical is Indian legal and public-sector intelligence because it makes
authority, freshness, disagreement, and provenance impossible to hand-wave. The core
engine remains domain-independent.

NyayaBot is preserved inside Pramaan as the dedicated Indian legal-intelligence
desk. Its case analysis, statutory research, resumable procedures, verified drafting,
privacy boundary, citation checks, and trust reports remain product capabilities;
Pramaan adds continuous collection, evidence graphs, change monitoring, and living
datasets around them.

## What this first cut contains

- a distinctive React command-center interface;
- mission builder and inspectable workflow plan;
- progressive collection-run view;
- versioned dataset explorer;
- field-level evidence drawer;
- semantic change feed and human review queue;
- official-source registry and legal/public-data radar;
- FastAPI endpoints that default to verified-only data;
- a fail-closed India Code connector currently awaiting a successful live runtime check;
- an audited source registry that distinguishes catalogued sources from working connectors.

The runtime deliberately contains no fabricated opportunities, evidence, changes, or
health metrics. Until a connector succeeds, relevant views are empty and say so.

## Run

```powershell
# API
py -m venv .venv
.venv\Scripts\pip install -r backend\requirements.txt
.venv\Scripts\python -m uvicorn app.main:app --app-dir backend --reload --port 8000

# UI, in another terminal
npm --prefix frontend install
npm --prefix frontend run dev
```

Open `http://127.0.0.1:5173`.

## Trust model

Search results are discovery hints, not evidence. A value becomes publishable only
after it is tied to a fetched source snapshot. Every displayed field can expose its
authority, freshness, extraction method, confidence components, exact locator, and
conflicting observations.

See [`docs/SOURCE_AUDIT.md`](docs/SOURCE_AUDIT.md) for the current source-by-source
status and the acceptance gate every connector must pass.
