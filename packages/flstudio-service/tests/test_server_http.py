import pytest
from fastapi.testclient import TestClient

@pytest.fixture
def client():
    from tekton_flstudio.server import create_app
    app = create_app()
    return TestClient(app)

def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "tekton-flstudio"
    assert "fl_studio_connected" in data

def test_transport_missing_tempo(client):
    response = client.post("/transport", json={"action": "set_tempo"})
    assert response.status_code == 400
