import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.api.v1.goals import calculate_progress

client = TestClient(app)


def test_calculate_progress_logic():
    goal = {"target_amount": 1000000, "name": "Beli Laptop"}
    res = calculate_progress(goal, 500000)

    assert res["saved_amount"] == 500000
    assert res["remaining"] == 500000
    assert res["progress_percent"] == 50


def test_calculate_progress_zero_target():
    goal = {"target_amount": 0, "name": "Tujuan Tanpa Target"}
    res = calculate_progress(goal, 0)

    assert res["progress_percent"] == 0
    assert res["remaining"] == 0


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
    assert response.status_code in [400, 401, 422]


def test_get_goal_not_found_unauthorized():
    response = client.get("/api/v1/goals/00000000-0000-0000-0000-000000000000")
    assert response.status_code == 401