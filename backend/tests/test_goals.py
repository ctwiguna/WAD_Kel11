import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_goals_unauthorized():
    response = client.get("/api/v1/goals?household_id=00000000-0000-0000-0000-000000000000")
    assert response.status_code == 401


def test_get_contributions_unauthorized():
    response = client.get("/api/v1/goal_contributions")
    assert response.status_code == 401


def test_create_goal_unauthorized():
    payload = {
        "household_id": "00000000-0000-0000-0000-000000000000",
        "name": "Beli Mobil",
        "target_amount": 100000000,
    }
    response = client.post("/api/v1/goals", json=payload)
    assert response.status_code == 401


def test_create_goal_invalid_payload():
    payload = {"name": "Beli Mobil"}
    response = client.post("/api/v1/goals", json=payload)
    assert response.status_code in [401, 422]