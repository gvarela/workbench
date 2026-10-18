from pathlib import Path

import pytest


@pytest.fixture
def wizard_url():
    return (Path(__file__).resolve().parents[1] / "wizard" / "wizard.html").as_uri()
