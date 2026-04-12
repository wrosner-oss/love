import os
import sqlite3
from flask import Flask, g, jsonify, request, send_from_directory

app = Flask(__name__, static_folder='static', template_folder='templates')
DATA_DIR = os.environ.get('DATA_DIR', app.root_path)
os.makedirs(DATA_DIR, exist_ok=True)
app.config['DATABASE'] = os.path.join(DATA_DIR, 'athanor.db')

VALID_PERSONS = {'wes', 'amelia'}
VALID_VESSELS = {
    'clear-mercury', 'the-foundation-stone', 'the-still-point',
    'the-red-lion', 'sacred-fire', 'quicksilver',
    'the-open-vessel', 'sovereign-gold', 'prima-materia'
}


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(app.config['DATABASE'])
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    db = get_db()
    with app.open_resource('schema.sql') as f:
        db.executescript(f.read().decode('utf8'))


# Auto-initialize DB on startup (works with gunicorn)
with app.app_context():
    init_db()


@app.route('/')
def index():
    return send_from_directory('templates', 'index.html')


@app.route('/api/state')
def get_state():
    db = get_db()
    state = {'wes': {}, 'amelia': {}}
    for person in VALID_PERSONS:
        for vessel in VALID_VESSELS:
            row = db.execute(
                'SELECT level FROM adjustments WHERE person = ? AND vessel = ? ORDER BY created_at DESC LIMIT 1',
                (person, vessel)
            ).fetchone()
            if row:
                state[person][vessel] = row['level']
    return jsonify(state)


@app.route('/api/adjust', methods=['POST'])
def post_adjustment():
    data = request.get_json()
    person = data.get('person')
    vessel = data.get('vessel')
    level = data.get('level')

    if person not in VALID_PERSONS:
        return jsonify({'error': 'Invalid person'}), 400
    if vessel not in VALID_VESSELS:
        return jsonify({'error': 'Invalid vessel'}), 400
    if not isinstance(level, int) or level < 1 or level > 5:
        return jsonify({'error': 'Level must be 1-5'}), 400

    db = get_db()
    db.execute(
        'INSERT INTO adjustments (person, vessel, level) VALUES (?, ?, ?)',
        (person, vessel, level)
    )
    db.commit()
    return jsonify({'ok': True})


@app.route('/api/history/<vessel>')
def get_history(vessel):
    if vessel not in VALID_VESSELS:
        return jsonify({'error': 'Invalid vessel'}), 400
    db = get_db()
    rows = db.execute(
        'SELECT person, level, created_at FROM adjustments WHERE vessel = ? ORDER BY created_at ASC',
        (vessel,)
    ).fetchall()
    return jsonify([{'person': r['person'], 'level': r['level'], 'created_at': r['created_at']} for r in rows])


if __name__ == '__main__':
    with app.app_context():
        init_db()
    port = int(os.environ.get('PORT', 5555))
    app.run(debug=True, port=port)
