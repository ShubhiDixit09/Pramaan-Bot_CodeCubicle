"""Verified-only application state.

This module intentionally contains no sample facts. A record may enter the API only
after a connector has captured its source URL and evidence. Product mock data belongs
in design fixtures, never in the runtime data path.
"""

MISSIONS: list[dict] = []
RECORDS: list[dict] = []
CHANGES: list[dict] = []
REVIEWS: list[dict] = []
EVIDENCE: dict[str, dict] = {}
RUN_EVENTS: list[dict] = []

SOURCES = [
    {
        "id": "src-india-code", "name": "India Code", "owner": "Legislative Department / NIC",
        "type": "Official legislation index", "url": "https://www.indiacode.nic.in/indiacode/home.jsp",
        "authority": 100, "authority_class": "primary_official", "freshness": "On-demand search",
        "status": "connected_unverified", "records": 0, "last_checked": "No successful runtime check",
        "connector": "html_search", "verification": "Official ownership verified; live parser awaiting a successful runtime check",
        "notes": "Public server-rendered search. Fail closed if the site times out or markup changes.",
    },
    {
        "id": "src-egazette", "name": "eGazette of India", "owner": "Department of Publication",
        "type": "Official gazette", "url": "https://egazette.nic.in/", "authority": 100,
        "authority_class": "primary_official", "freshness": "Not collected", "status": "catalogued",
        "records": 0, "last_checked": "Never", "connector": "not_implemented",
        "verification": "Official source catalogued; access method still requires verification",
        "notes": "Do not claim monitoring until a stable, permitted retrieval workflow is tested.",
    },
    {
        "id": "src-cppp", "name": "Central Public Procurement Portal", "owner": "Government of India / NIC",
        "type": "Official procurement portal", "url": "https://eprocure.gov.in/eprocure/app", "authority": 100,
        "authority_class": "primary_official", "freshness": "Portal states 15-minute listing updates",
        "status": "catalogued", "records": 0, "last_checked": "Never by connector", "connector": "not_implemented",
        "verification": "Official portal and public listings verified; connector not built",
        "notes": "Prefer stable listing/detail identifiers; preserve corrigenda as separate evidence.",
    },
    {
        "id": "src-data-gov", "name": "Open Government Data Platform India",
        "owner": "NIC / MeitY; datasets owned by publishing departments", "type": "Official open-data catalogue and APIs",
        "url": "https://www.data.gov.in/", "authority": 95, "authority_class": "official_aggregator",
        "freshness": "Dataset-specific", "status": "catalogued", "records": 0, "last_checked": "Never by connector",
        "connector": "not_implemented", "verification": "API-key workflow and Government Open Data Licence verified",
        "notes": "Authority and refresh cadence must be inherited from each resource's publisher and metadata.",
    },
    {
        "id": "src-meity", "name": "Ministry of Electronics and Information Technology", "owner": "MeitY",
        "type": "Official ministry publications", "url": "https://www.meity.gov.in/", "authority": 100,
        "authority_class": "primary_official", "freshness": "Not collected", "status": "catalogued",
        "records": 0, "last_checked": "Never", "connector": "not_implemented",
        "verification": "Official domain catalogued; publication routes not yet mapped",
        "notes": "Build route-specific connectors for notices, tenders and documents; do not scrape the homepage generically.",
    },
]
