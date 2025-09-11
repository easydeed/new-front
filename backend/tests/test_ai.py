import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


@pytest.mark.asyncio
async def test_chain_of_title():
    resp = client.post("/api/ai/chain-of-title", json={"address": "123 Main St, Los Angeles, CA"})
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_profile_request():
    resp = client.post("/api/ai/profile-request", json={"profile": "test"})
    assert resp.status_code == 200


