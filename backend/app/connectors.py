from __future__ import annotations

from urllib.parse import urlencode

import httpx
from bs4 import BeautifulSoup


INDIA_CODE_SEARCH = "https://www.indiacode.nic.in/handle/123456789/1362/simple-search"


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
        "User-Agent": "CodeCubicle/0.1 evidence-research demo; contact repository owner",
        "Accept": "text/html,application/xhtml+xml",
    }
    async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers=headers) as client:
        response = await client.get(url)
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    rows: list[dict] = []
    for tr in soup.select("table tr"):
        cells = [cell.get_text(" ", strip=True) for cell in tr.select("td")]
        link = tr.select_one("a[href]")
        if len(cells) < 3 or link is None:
            continue
        href = link.get("href", "")
        if href.startswith("/"):
            href = f"https://www.indiacode.nic.in{href}"
        rows.append(
            {
                "enactment_date": cells[0],
                "act_number": cells[1],
                "title": cells[2],
                "official_url": href,
                "source": "India Code",
                "authority": 100,
            }
        )
        if len(rows) >= limit:
            break
    return rows

