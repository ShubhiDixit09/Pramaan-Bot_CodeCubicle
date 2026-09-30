from __future__ import annotations

import json
from pathlib import Path
from typing import Any
from uuid import uuid4

from ..database import Database, utc_now


class ProcedureService:
    def __init__(self, database: Database, path: str | Path):
        self.database = database
        self.procedures = json.loads(Path(path).read_text(encoding="utf-8"))

    def list(self) -> list[dict[str, Any]]:
        return self.procedures

    def start(
        self, case_id: str, procedure_id: str, idempotency_key: str
    ) -> dict[str, Any]:
        cached = self.database.cached_response(idempotency_key)
        if cached:
            return cached
        template = next((item for item in self.procedures if item["id"] == procedure_id), None)
        if not template:
            raise ValueError("Unknown procedure")
        state = {
            **template,
            "steps": [{**step, "completed": False} for step in template["steps"]],
            "progress": 0,
        }
        run_id = str(uuid4())
        now = utc_now()
        result = {"run_id": run_id, **state}
        with self.database.unit_of_work() as connection:
            connection.execute(
                """
                INSERT INTO procedure_runs(id, case_id, procedure_id, state_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (run_id, case_id, procedure_id, Database.encode(state), now, now),
            )
            Database.store_response(
                connection, idempotency_key, "procedure.start", result
            )
        return result

    def update_step(
        self, run_id: str, step_id: str, completed: bool, idempotency_key: str
    ) -> dict[str, Any]:
        cached = self.database.cached_response(idempotency_key)
        if cached:
            return cached
        with self.database.unit_of_work() as connection:
            row = connection.execute(
                "SELECT state_json FROM procedure_runs WHERE id = ?", (run_id,)
            ).fetchone()
            if not row:
                raise ValueError("Procedure run not found")
            state = json.loads(row["state_json"])
            for step in state["steps"]:
                if step["id"] == step_id:
                    step["completed"] = completed
                    break
            else:
                raise ValueError("Procedure step not found")
            completed_count = sum(step["completed"] for step in state["steps"])
            state["progress"] = round(completed_count / len(state["steps"]) * 100)
            connection.execute(
                "UPDATE procedure_runs SET state_json = ?, updated_at = ? WHERE id = ?",
                (Database.encode(state), utc_now(), run_id),
            )
            result = {"run_id": run_id, **state}
            Database.store_response(
                connection, idempotency_key, "procedure.step", result
            )
        return result


