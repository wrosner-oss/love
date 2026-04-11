import json
import pytest
from server import app, init_db


@pytest.fixture
def client(tmp_path):
    db_path = str(tmp_path / 'test.db')
    app.config['TESTING'] = True
    app.config['DATABASE'] = db_path
    with app.test_client() as client:
        with app.app_context():
            init_db()
        yield client


def test_get_state_empty(client):
    resp = client.get('/api/state')
    data = json.loads(resp.data)
    assert resp.status_code == 200
    assert data['wes'] == {}
    assert data['amelia'] == {}


def test_post_adjustment(client):
    resp = client.post('/api/adjust', json={
        'person': 'wes',
        'vessel': 'clear-mercury',
        'level': 3
    })
    assert resp.status_code == 200
    state = json.loads(client.get('/api/state').data)
    assert state['wes']['clear-mercury'] == 3


def test_post_adjustment_rejects_invalid_person(client):
    resp = client.post('/api/adjust', json={
        'person': 'stranger',
        'vessel': 'clear-mercury',
        'level': 3
    })
    assert resp.status_code == 400


def test_post_adjustment_rejects_invalid_level(client):
    resp = client.post('/api/adjust', json={
        'person': 'wes',
        'vessel': 'clear-mercury',
        'level': 6
    })
    assert resp.status_code == 400


def test_get_history(client):
    client.post('/api/adjust', json={'person': 'wes', 'vessel': 'clear-mercury', 'level': 2})
    client.post('/api/adjust', json={'person': 'wes', 'vessel': 'clear-mercury', 'level': 4})
    resp = client.get('/api/history/clear-mercury')
    data = json.loads(resp.data)
    assert len(data) == 2
    assert data[0]['level'] == 2
    assert data[1]['level'] == 4
