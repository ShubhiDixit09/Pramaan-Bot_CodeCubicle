from __future__ import annotations

import textwrap
from pathlib import Path
from uuid import uuid4

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

from ..database import Database, utc_now


LABELS = {
    "legal_notice": "LEGAL NOTICE",
    "fir_complaint": "POLICE COMPLAINT",
    "rti_application": "APPLICATION UNDER THE RIGHT TO INFORMATION ACT, 2005",
    "consumer_complaint": "CONSUMER COMPLAINT",
}


class DraftService:
    def __init__(self, database: Database, output_dir: Path):
        self.database = database
        self.output_dir = output_dir

    def create(
        self,
        case: dict,
        document_type: str,
        recipient: str,
        requested_relief: str,
        idempotency_key: str,
    ) -> dict:
        cached = self.database.cached_response(idempotency_key)
        if cached:
            return cached
        draft_id = str(uuid4())
        title = LABELS[document_type]
        content = self._content(case, title, recipient, requested_relief)
        result = {
            "id": draft_id,
            "case_id": case["id"],
            "document_type": document_type,
            "title": title,
            "content": content,
        }
        with self.database.unit_of_work() as connection:
            connection.execute(
                """
                INSERT INTO drafts(
                    id, case_id, document_type, title, content, fact_bindings_json, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    draft_id,
                    case["id"],
                    document_type,
                    title,
                    content,
                    Database.encode(
                        {
                            "case_title": case["title"],
                            "jurisdiction": case["jurisdiction"],
                            "description": case["description"],
                        }
                    ),
                    utc_now(),
                ),
            )
            Database.store_response(
                connection, idempotency_key, "draft.create", result
            )
        return result

    def export_pdf(self, draft: dict) -> Path:
        self.output_dir.mkdir(parents=True, exist_ok=True)
        path = self.output_dir / f"{draft['id']}.pdf"
        styles = getSampleStyleSheet()
        doc = SimpleDocTemplate(
            str(path), pagesize=A4, rightMargin=22 * mm, leftMargin=22 * mm,
            topMargin=20 * mm, bottomMargin=20 * mm,
        )
        story = [Paragraph(draft["title"], styles["Title"]), Spacer(1, 8 * mm)]
        for block in draft["content"].split("\n\n"):
            story.append(Paragraph(block.replace("\n", "<br/>"), styles["BodyText"]))
            story.append(Spacer(1, 4 * mm))
        doc.build(story)
        return path

    @staticmethod
    def _content(case: dict, title: str, recipient: str, relief: str) -> str:
        return textwrap.dedent(
            f"""
            {title}

            To:
            {recipient}

            Subject: {case['title']}

            Jurisdiction: {case['jurisdiction']}

            Sir/Madam,

            I submit the following facts for your consideration:

            {case['description']}

            In view of the above, I respectfully request:

            {relief}

            The factual details in this draft have been taken from the saved case. Please verify
            all names, dates, addresses, amounts and legal provisions before submission.

            Date: ____________________
            Place: {case['jurisdiction']}

            Signature: ____________________
            Name: _________________________
            """
        ).strip()


