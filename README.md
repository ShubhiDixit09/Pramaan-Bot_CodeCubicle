# CodeCubicle

CodeCubicle is an evidence operating system for turning a plain-English intelligence
request into a monitored, source-backed, versioned dataset.

It is being built for the **AI-Powered Data Intelligence Platform** problem statement.
NyayaBot is an input prototype only; CodeCubicle is a new product and architecture.

## Product loop

```text
mission -> plan -> collect -> extract -> reconcile -> publish -> monitor
```

The initial vertical is Indian legal and public-sector intelligence because it makes
authority, freshness, disagreement, and provenance impossible to hand-wave. The core
engine remains domain-independent.

## What this first cut contains

- a distinctive React command-center interface;
- mission builder and inspectable workflow plan;
- progressive collection-run view;
- versioned dataset explorer;
- field-level evidence drawer;
- semantic change feed and human review queue;
- official-source registry and legal/public-data radar;
- FastAPI endpoints with stable demo snapshots and a live India Code connector;
- deterministic fallback so the judging flow works without network or an LLM.

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

