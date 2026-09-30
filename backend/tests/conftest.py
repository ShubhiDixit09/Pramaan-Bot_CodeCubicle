from pathlib import Path

import pytest

from app.database import Database


@pytest.fixture()
def database(tmp_path: Path) -> Database:
    db = Database(tmp_path / "test.db")
    db.migrate()
    return db


