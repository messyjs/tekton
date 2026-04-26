import pytest
from fastapi.testclient import TestClient

@pytest.fixture
def client():
    from tekton_ableton.server import create_app
    app = create_app()
    return TestClient(app)

def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "tekton-ableton"
    assert "ableton_connected" in data
