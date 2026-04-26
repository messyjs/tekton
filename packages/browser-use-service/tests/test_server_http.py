import pytest
from fastapi.testclient import TestClient

@pytest.fixture
def client():
    from tekton_browser_use.server import create_app
    app = create_app()
    return TestClient(app)

def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "tekton-browser-use"
    assert "browser_available" in data
    assert "llm" in data

def test_submit_task_missing_field(client):
    response = client.post("/task", json={})
    assert response.status_code == 400

def test_cancel_no_task(client):
    response = client.post("/cancel")
    assert response.status_code == 200

def test_list_tasks_empty(client):
    response = client.get("/tasks")
    assert response.status_code == 200
    data = response.json()
    assert "tasks" in data
