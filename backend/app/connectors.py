from __future__ import annotations

from datetime import UTC, datetime
from urllib.parse import urlencode, urljoin, urlparse

import httpx
from bs4 import BeautifulSoup


INDIA_CODE_SEARCH = "https://www.indiacode.nic.in/handle/123456789/1362/simple-search"


class ConnectorParseError(RuntimeError):
    """Raised when an official source responds but its expected structure is absent."""


def parse_india_code_results(html: str, retrieval_url: str, limit: int = 10) -> list[dict]:
    """Parse only the documented result columns and keep links on India Code."""

    soup = BeautifulSoup(html, "html.parser")
    if not soup.select_one("table"):
        raise ConnectorParseError("India Code result table was not present")

    retrieved_at = datetime.now(UTC).isoformat()
    rows: list[dict] = []
    for tr in soup.select("table tr"):
        cells = [cell.get_text(" ", strip=True) for cell in tr.select("td")]
        link = tr.select_one("a[href]")
        if len(cells) < 3 or link is None:
            continue
        href = urljoin("https://www.indiacode.nic.in/", link.get("href", ""))
        if urlparse(href).hostname not in {"www.indiacode.nic.in", "indiacode.nic.in"}:
            continue
        rows.append(
            {
                "enactment_date": cells[0],
                "act_number": cells[1],
                "title": cells[2],
                "official_url": href,
                "source": "India Code",
                "authority_class": "primary_official",
                "retrieval_url": retrieval_url,
                "retrieved_at": retrieved_at,
            }
        )
        if len(rows) >= limit:
            break
    return rows


async def search_india_code(query: str, limit: int = 10) -> list[dict]:
    """Search the official India Code index.

    The upstream site has no documented public JSON API. This connector reads its
    public server-rendered result table, preserves the official URL, and fails closed
    rather than inventing records when markup or network access changes.
    """

    params = {
        "query": query,
        "sort_by": "score",
        "order": "desc",
        "rpp": str(max(1, min(limit, 25))),
        "etal": "0",
    }
    url = f"{INDIA_CODE_SEARCH}?{urlencode(params)}"
    headers = {
        "User-Agent": "Pramaan/0.1 official-source research connector",
        "Accept": "text/html,application/xhtml+xml",
    }
    async with httpx.AsyncClient(timeout=30, follow_redirects=True, headers=headers) as client:
        response = await client.get(url)
        response.raise_for_status()

    if urlparse(str(response.url)).hostname not in {"www.indiacode.nic.in", "indiacode.nic.in"}:
        raise ConnectorParseError("India Code redirected outside its official domain")
    return parse_india_code_results(response.text, url, limit)
