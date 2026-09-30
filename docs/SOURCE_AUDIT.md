# Pramaan source and accuracy audit

Audited: 26 September 2026. Runtime policy: **verified-only**.

## Finding

The previous build presented five sources as healthy and displayed opportunity,
change, evidence, confidence, coverage and record-count data as if collected live.
Only one connector existed (India Code HTML search), and it had not completed a
successful runtime check. The remaining values were product fixtures.

Those fixtures have been removed from the runtime path. An unavailable backend or
connector now returns an empty result instead of substituting invented facts.

## Registered sources

| Source | What the official site supports | Current Pramaan status | Next connector gate |
|---|---|---|---|
| India Code | Central acts, sections and subordinate legislation search; content supplied by Government ministries/departments and site operated by NIC | Connector implemented, but direct live check timed out; `connected_unverified` | Successful fetch; parser contract test; snapshot hash; item-detail validation |
| eGazette of India | Gazette publications from the Department of Publication | Official source catalogued; no connector | Confirm stable permitted search/download route; capture issue metadata and PDF hash |
| Central Public Procurement Portal | Tender listings, closing dates, corrigenda and awards; portal says latest tenders/corrigenda update every 15 minutes | Official portal catalogued; no connector | Preserve tender ID, organisation, listing, tender document and each corrigendum separately |
| data.gov.in | Government datasets, catalogues and APIs; resource metadata includes publisher and frequency; datasets are under the Government Open Data Licence–India | API workflow and licence verified; no connector | Use resource-specific IDs/API keys; inherit authority and freshness from resource metadata |
| MeitY | Ministry publications and notices | Official domain catalogued; no connector | Map specific notice/tender/publication routes; avoid generic homepage scraping |

## Publication gate

A value cannot enter a canonical dataset until all mandatory checks pass:

1. The final URL is on a registered host and the retrieval succeeded.
2. The raw response is snapshotted with retrieval time, HTTP metadata and content hash.
3. The item has a stable source identifier or a documented fallback key.
4. Extracted fields retain an exact locator (HTML selector, table cell, or PDF page).
5. Dates, currency and identifiers pass typed validation.
6. Freshness is derived from source metadata or observed retrieval—not invented.
7. Conflicting observations remain stored; resolution never deletes the disagreement.
8. Confidence is computed from inspectable components. A source is classified by
   authority tier; an unexplained numeric authority score is not evidence.
9. A source marked `catalogued` or `connected_unverified` contributes zero live records.
10. Legal analysis is withheld if governing sources were not successfully retrieved.

## Accuracy hierarchy

Use the most direct competent issuer for each claim:

- legislation: Gazette publication and India Code, with amendment/effective-date checks;
- procurement: tender detail and tender documents, with corrigenda ordered by date;
- open data: the publishing department plus data.gov.in resource metadata;
- ministry programme: the exact dated notice/document, not a ministry homepage;
- secondary reporting: discovery only unless the mission explicitly requests it.

Multiple pages copied from one upstream document count as one evidence chain, not
independent confirmation.

## Known gaps

- India Code exposes server-rendered search rather than a documented public JSON API;
  parser drift and slow responses must be monitored.
- A legal answer also needs jurisdiction-specific rules and current case law. India
  Code alone is not sufficient for every matter.
- eGazette access and automation constraints need a separate technical/terms check.
- CPPP detail-page and document retrieval has not been implemented.
- data.gov.in APIs are resource-specific; a generic “all data” connector would be
  misleading.
- No scheduler, immutable snapshot store, deduplication layer or evidence graph is
  connected yet. Therefore the dashboard correctly reports zero monitored sources.

## Official references used in this audit

- India Code: <https://www.indiacode.nic.in/indiacode/home.jsp>
- Central Public Procurement Portal: <https://eprocure.gov.in/eprocure/app>
- Open Government Data Platform help: <https://www.data.gov.in/help>
- Open Government Data Platform: <https://www.data.gov.in/>
- eGazette of India: <https://egazette.nic.in/>
- MeitY: <https://www.meity.gov.in/>
