from __future__ import annotations

import unittest

from app.connectors import ConnectorParseError, parse_india_code_results
from app.data import CHANGES, EVIDENCE, MISSIONS, RECORDS, REVIEWS, SOURCES


class RuntimeIntegrityTests(unittest.TestCase):
    def test_runtime_contains_no_demo_facts(self) -> None:
        self.assertEqual(MISSIONS, [])
        self.assertEqual(RECORDS, [])
        self.assertEqual(CHANGES, [])
        self.assertEqual(REVIEWS, [])
        self.assertEqual(EVIDENCE, {})

    def test_unimplemented_sources_do_not_claim_health(self) -> None:
        for source in SOURCES:
            if source["connector"] == "not_implemented":
                self.assertEqual(source["status"], "catalogued")
                self.assertEqual(source["records"], 0)

    def test_parser_preserves_only_official_links(self) -> None:
        html = """
        <table><tr><th>Date</th><th>No</th><th>Title</th></tr>
        <tr><td>9-Aug-2019</td><td>35</td><td>The Consumer Protection Act, 2019</td>
        <td><a href="/handle/123456789/15256">View</a></td></tr>
        <tr><td>1-Jan-2000</td><td>1</td><td>Injected</td>
        <td><a href="https://example.com/not-official">View</a></td></tr></table>
        """
        rows = parse_india_code_results(html, "https://www.indiacode.nic.in/search", 10)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["act_number"], "35")
        self.assertTrue(rows[0]["official_url"].startswith("https://www.indiacode.nic.in/"))
        self.assertIn("retrieved_at", rows[0])

    def test_parser_fails_when_expected_structure_disappears(self) -> None:
        with self.assertRaises(ConnectorParseError):
            parse_india_code_results("<html><body>maintenance</body></html>", "https://www.indiacode.nic.in/")


if __name__ == "__main__":
    unittest.main()
