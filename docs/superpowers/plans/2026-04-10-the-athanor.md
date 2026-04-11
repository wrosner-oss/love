# The Athanor — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a web app where two people (Wes and Amelia) tend nine alchemical flames and see their combined connection rendered as living generative art.

**Architecture:** Python backend (Flask + SQLite) serves a single-page frontend. The frontend is vanilla JS with HTML Canvas for all generative visuals — particles, flames, vessel liquids, and the center Coniunctio. State persists via a simple REST API. No build tools, no bundler, no framework — just files served by Flask.

**Tech Stack:** Python 3 / Flask / SQLite (backend), Vanilla JS / HTML Canvas (frontend), Google Fonts for typography

---

## File Structure

```
love/
  server.py                  — Flask app, routes, DB init
  schema.sql                 — SQLite schema
  static/
    css/
      style.css              — Global styles, dark theme, typography
    js/
      app.js                 — Entry point, routing (entry vs main view)
      state.js               — API calls, local state management
      entry.js               — Entry screen (particles, Sol/Luna, first-visit message)
      vessels.js             — Vessel rendering, layout, flame interaction
      flame.js               — Flame drawing and drag physics
      liquid.js              — Vessel liquid simulation (two-color swirl)
      coniunctio.js          — Center generative visualization
      particles.js           — Background particle system (shared)
      history.js             — Vessel history view (sediment layers)
      constants.js           — Vessel definitions, colors, layout math
    fonts/                   — Self-hosted font files (if needed)
  templates/
    index.html               — Single HTML shell
  tests/
    test_server.py           — Backend API tests
  requirements.txt           — Python dependencies
```

**Responsibilities:**
- `server.py` — all backend: DB setup, REST endpoints, static file serving
- `app.js` — orchestrator: decides which screen to show, manages canvas lifecycle
- `entry.js` — everything about the entry screen: particles, symbol rendering, hover/click, first-visit fade-in
- `vessels.js` — nine vessels in a circle: positions, drawing, click targets, selecting a vessel
- `flame.js` — single flame: drawing at 5 levels, drag gesture, animation
- `liquid.js` — liquid inside a vessel: two-color simulation, blending/separation based on alignment
- `coniunctio.js` — the center visualization: two energy forms, alignment-driven behavior
- `particles.js` — reusable particle system for background dust (used by both entry and main screens)
- `history.js` — sediment/layer view when tapping a vessel
- `state.js` — fetch/post to API, cache current readings, expose to other modules
- `constants.js` — vessel names, colors, positions, shared config

---

## Chunk 1: Foundation — Backend + Entry Screen

### Task 1: Project Setup and Backend

**Files:**
- Create: `requirements.txt`
- Create: `schema.sql`
- Create: `server.py`
- Create: `tests/test_server.py`

- [ ] **Step 1: Initialize git repo and create requirements.txt**

```bash
cd /Users/wrosner/Projects/love
git init
```

```
# requirements.txt
flask==3.1.*
```

- [ ] **Step 2: Create the SQLite schema**

```sql
-- schema.sql
CREATE TABLE IF NOT EXISTS adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person TEXT NOT NULL CHECK(person IN ('wes', 'amelia')),
    vessel TEXT NOT NULL,
    level INTEGER NOT NULL CHECK(level BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_adjustments_person_vessel ON adjustments(person, vessel, created_at DESC);
```

- [ ] **Step 3: Write failing tests for the API**

```python
# tests/test_server.py
import json
import pytest
from server import app, init_db

@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['DATABASE'] = ':memory:'
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
    # Verify it shows up in state
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
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd /Users/wrosner/Projects/love && python3 -m pytest tests/test_server.py -v`
Expected: ImportError — server module doesn't exist yet

- [ ] **Step 5: Implement server.py**

```python
# server.py
import os
import sqlite3
from flask import Flask, g, jsonify, request, send_from_directory

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['DATABASE'] = os.path.join(app.root_path, 'athanor.db')

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
    app.run(debug=True, port=5000)
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `cd /Users/wrosner/Projects/love && python3 -m pytest tests/test_server.py -v`
Expected: All 5 tests PASS

- [ ] **Step 7: Commit**

```bash
git add requirements.txt schema.sql server.py tests/
git commit -m "feat: backend API with Flask + SQLite — state, adjustments, history"
```

### Task 2: HTML Shell and Base Styles

**Files:**
- Create: `templates/index.html`
- Create: `static/css/style.css`

- [ ] **Step 1: Create the HTML shell**

```html
<!-- templates/index.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>The Athanor</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Raleway:wght@200;300;400&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="/static/css/style.css">
</head>
<body>
    <canvas id="main-canvas"></canvas>
    <div id="ui-overlay"></div>
    <script type="module" src="/static/js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create base styles**

```css
/* static/css/style.css */
*, *::before, *::after {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background: #0a0a1a;
    color: #e8dcc8;
    font-family: 'Cormorant Garamond', serif;
    overflow: hidden;
    width: 100vw;
    height: 100vh;
    cursor: default;
    user-select: none;
}

#main-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
}

#ui-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
    pointer-events: none;
}

#ui-overlay > * {
    pointer-events: auto;
}

.entry-text {
    position: absolute;
    top: 40%;
    left: 50%;
    transform: translate(-50%, -50%);
    font-size: 1.6rem;
    font-weight: 300;
    font-style: italic;
    letter-spacing: 0.05em;
    color: #c8b07a;
    opacity: 0;
    transition: opacity 2s ease-in;
    text-align: center;
}

.entry-text.visible {
    opacity: 1;
}

.entry-symbols {
    position: absolute;
    top: 55%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    gap: 6rem;
    opacity: 0;
    transition: opacity 1.5s ease-in;
}

.entry-symbols.visible {
    opacity: 1;
}

.entry-symbol {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    transition: transform 0.3s ease;
}

.entry-symbol:hover {
    transform: scale(1.1);
}

.entry-symbol .glyph {
    font-size: 4rem;
    line-height: 1;
    margin-bottom: 0.5rem;
}

.entry-symbol .name {
    font-family: 'Raleway', sans-serif;
    font-weight: 200;
    font-size: 1rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
}

.symbol-sol .glyph { color: #d4a742; }
.symbol-sol .name { color: #d4a742; }
.symbol-luna .glyph { color: #a8b4c8; }
.symbol-luna .name { color: #a8b4c8; }
```

- [ ] **Step 3: Commit**

```bash
git add templates/ static/css/
git commit -m "feat: HTML shell and base dark theme styles"
```

### Task 3: Background Particles and Entry Screen

**Files:**
- Create: `static/js/particles.js`
- Create: `static/js/entry.js`
- Create: `static/js/app.js`
- Create: `static/js/constants.js`
- Create: `static/js/state.js`

- [ ] **Step 1: Create constants.js with vessel definitions and colors**

```javascript
// static/js/constants.js
export const VESSELS = [
    { id: 'clear-mercury', name: 'Clear Mercury', essence: 'Are we saying the real thing?', hue: 190 },
    { id: 'the-foundation-stone', name: 'The Foundation Stone', essence: 'Do I believe you?', hue: 30 },
    { id: 'the-still-point', name: 'The Still Point', essence: 'Are we actually here?', hue: 260 },
    { id: 'the-red-lion', name: 'The Red Lion', essence: 'The pull between us', hue: 0 },
    { id: 'sacred-fire', name: 'Sacred Fire', essence: 'Bodies, touch, embodiment', hue: 15 },
    { id: 'quicksilver', name: 'Quicksilver', essence: 'Lightness, mischief, fun', hue: 55 },
    { id: 'the-open-vessel', name: 'The Open Vessel', essence: 'Showing what\'s unfinished', hue: 280 },
    { id: 'sovereign-gold', name: 'Sovereign Gold', essence: 'Healthy space, selfhood', hue: 45 },
    { id: 'prima-materia', name: 'Prima Materia', essence: 'Making each other more alive', hue: 320 },
];

export const COLORS = {
    background: '#0a0a1a',
    sol: { primary: '#d4a742', glow: '#f0c860', particle: '#c8983a' },
    luna: { primary: '#a8b4c8', glow: '#c8d4e8', particle: '#8898b0' },
    gold: '#c8b07a',
    text: '#e8dcc8',
};

export const LEVELS = ['Ember', 'Flickering', 'Kindling', 'Burning', 'Blazing'];
```

- [ ] **Step 2: Create particles.js — reusable background particle system**

```javascript
// static/js/particles.js
export class ParticleSystem {
    constructor(canvas, ctx, options = {}) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.particles = [];
        this.count = options.count || 80;
        this.color = options.color || '#c8b07a';
        this.maxAlpha = options.maxAlpha || 0.3;
        this.speed = options.speed || 0.3;
        this.init();
    }

    init() {
        this.particles = [];
        for (let i = 0; i < this.count; i++) {
            this.particles.push(this.createParticle());
        }
    }

    createParticle() {
        return {
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            size: Math.random() * 2 + 0.5,
            alpha: Math.random() * this.maxAlpha,
            alphaDir: (Math.random() - 0.5) * 0.005,
            vx: (Math.random() - 0.5) * this.speed,
            vy: (Math.random() - 0.5) * this.speed - 0.1,
        };
    }

    update() {
        for (const p of this.particles) {
            p.x += p.vx;
            p.y += p.vy;
            p.alpha += p.alphaDir;

            if (p.alpha <= 0 || p.alpha >= this.maxAlpha) p.alphaDir *= -1;
            p.alpha = Math.max(0, Math.min(this.maxAlpha, p.alpha));

            if (p.x < 0 || p.x > this.canvas.width || p.y < 0 || p.y > this.canvas.height) {
                Object.assign(p, this.createParticle());
                p.y = p.vy < 0 ? this.canvas.height : 0;
            }
        }
    }

    draw() {
        const ctx = this.ctx;
        for (const p of this.particles) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.globalAlpha = p.alpha;
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}
```

- [ ] **Step 3: Create state.js — API communication**

```javascript
// static/js/state.js
let currentState = { wes: {}, amelia: {} };
let currentPerson = null;

export function setPerson(person) {
    currentPerson = person;
}

export function getPerson() {
    return currentPerson;
}

export function getState() {
    return currentState;
}

export async function fetchState() {
    const resp = await fetch('/api/state');
    currentState = await resp.json();
    return currentState;
}

export async function postAdjustment(vessel, level) {
    if (!currentPerson) throw new Error('No person selected');
    await fetch('/api/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person: currentPerson, vessel, level }),
    });
    currentState[currentPerson][vessel] = level;
}

export async function fetchHistory(vessel) {
    const resp = await fetch(`/api/history/${vessel}`);
    return resp.json();
}
```

- [ ] **Step 4: Create entry.js — entry screen**

```javascript
// static/js/entry.js
import { ParticleSystem } from './particles.js';
import { COLORS } from './constants.js';

let particles;
let fadeState = 'waiting'; // waiting -> text -> symbols -> done
let fadeTimer = 0;
let selectedSymbol = null;
let onSelect = null;

const symbols = [
    { id: 'wes', glyph: '\u2609', name: 'Wes', color: COLORS.sol.primary, x: 0, y: 0 },
    { id: 'amelia', glyph: '\u263D', name: 'Amelia', color: COLORS.luna.primary, x: 0, y: 0 },
];

let textAlpha = 0;
let symbolsAlpha = 0;
let hoverSymbol = null;
let hoverScale = {};

export function initEntry(canvas, ctx, callback) {
    onSelect = callback;
    particles = new ParticleSystem(canvas, ctx, {
        count: 60,
        color: COLORS.gold,
        maxAlpha: 0.25,
        speed: 0.2,
    });
    fadeState = 'waiting';
    fadeTimer = 0;
    textAlpha = 0;
    symbolsAlpha = 0;
    selectedSymbol = null;
    hoverSymbol = null;
    hoverScale = { wes: 1, amelia: 1 };

    // Position symbols
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.58;
    const gap = 120;
    symbols[0].x = cx - gap;
    symbols[0].y = cy;
    symbols[1].x = cx + gap;
    symbols[1].y = cy;
}

export function updateEntry(dt) {
    fadeTimer += dt;
    particles.update();

    if (fadeState === 'waiting' && fadeTimer > 1.0) {
        fadeState = 'text';
        fadeTimer = 0;
    }
    if (fadeState === 'text') {
        textAlpha = Math.min(1, textAlpha + dt * 0.5);
        if (fadeTimer > 3.0) {
            fadeState = 'symbols';
            fadeTimer = 0;
        }
    }
    if (fadeState === 'symbols') {
        symbolsAlpha = Math.min(1, symbolsAlpha + dt * 0.7);
    }

    // Smooth hover scale
    for (const s of symbols) {
        const target = hoverSymbol === s.id ? 1.15 : 1.0;
        hoverScale[s.id] += (target - hoverScale[s.id]) * 0.1;
    }
}

export function drawEntry(canvas, ctx) {
    // Background
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    particles.draw();

    // Title text
    if (textAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = textAlpha;
        ctx.font = 'italic 300 28px "Cormorant Garamond", serif';
        ctx.fillStyle = COLORS.gold;
        ctx.textAlign = 'center';
        ctx.fillText('For the alchemy between us.', canvas.width / 2, canvas.height * 0.40);
        ctx.restore();
    }

    // Symbols
    if (symbolsAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = symbolsAlpha;
        for (const s of symbols) {
            const scale = hoverScale[s.id];
            ctx.save();
            ctx.translate(s.x, s.y);
            ctx.scale(scale, scale);

            // Glyph
            ctx.font = '64px serif';
            ctx.fillStyle = s.color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(s.glyph, 0, -10);

            // Name
            ctx.font = '200 14px "Raleway", sans-serif';
            ctx.letterSpacing = '3px';
            ctx.fillText(s.name.toUpperCase(), 0, 35);

            ctx.restore();
        }
        ctx.restore();
    }
}

export function handleEntryClick(x, y) {
    if (symbolsAlpha < 0.5) return;
    for (const s of symbols) {
        const dx = x - s.x;
        const dy = y - s.y;
        if (Math.sqrt(dx * dx + dy * dy) < 50) {
            selectedSymbol = s.id;
            if (onSelect) onSelect(s.id);
            return;
        }
    }
}

export function handleEntryMouseMove(x, y) {
    if (symbolsAlpha < 0.5) { hoverSymbol = null; return; }
    hoverSymbol = null;
    for (const s of symbols) {
        const dx = x - s.x;
        const dy = y - s.y;
        if (Math.sqrt(dx * dx + dy * dy) < 50) {
            hoverSymbol = s.id;
            return;
        }
    }
}
```

- [ ] **Step 5: Create app.js — orchestrator**

```javascript
// static/js/app.js
import { setPerson, fetchState } from './state.js';
import { initEntry, updateEntry, drawEntry, handleEntryClick, handleEntryMouseMove } from './entry.js';

const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');

let currentScreen = 'entry'; // 'entry' | 'athanor'
let lastTime = 0;

function resize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
}

function onPersonSelected(person) {
    setPerson(person);
    fetchState().then(() => {
        currentScreen = 'athanor';
    });
}

function init() {
    resize();
    window.addEventListener('resize', () => {
        resize();
        if (currentScreen === 'entry') {
            initEntry(canvas, ctx, onPersonSelected);
        }
    });

    canvas.addEventListener('click', (e) => {
        const x = e.clientX;
        const y = e.clientY;
        if (currentScreen === 'entry') handleEntryClick(x, y);
    });

    canvas.addEventListener('mousemove', (e) => {
        const x = e.clientX;
        const y = e.clientY;
        if (currentScreen === 'entry') handleEntryMouseMove(x, y);
    });

    initEntry(canvas, ctx, onPersonSelected);
    requestAnimationFrame(loop);
}

function loop(time) {
    const dt = Math.min((time - lastTime) / 1000, 0.1);
    lastTime = time;

    // Use logical (CSS) dimensions for drawing
    const w = window.innerWidth;
    const h = window.innerHeight;

    if (currentScreen === 'entry') {
        updateEntry(dt);
        drawEntry(canvas, ctx);
    } else if (currentScreen === 'athanor') {
        // Placeholder — will be built in Task 4+
        ctx.fillStyle = '#0a0a1a';
        ctx.fillRect(0, 0, w, h);
        ctx.font = 'italic 24px "Cormorant Garamond", serif';
        ctx.fillStyle = '#c8b07a';
        ctx.textAlign = 'center';
        ctx.fillText('The Athanor awakens...', w / 2, h / 2);
    }

    requestAnimationFrame(loop);
}

init();
```

- [ ] **Step 6: Test manually — run server and verify entry screen**

```bash
cd /Users/wrosner/Projects/love
pip3 install flask
python3 server.py
```

Open `http://localhost:5000` — verify:
- Dark background with golden drifting particles
- "For the alchemy between us." fades in after ~1 second
- Sol and Luna symbols fade in after ~3 seconds
- Hover scales the symbols
- Clicking a symbol transitions (shows placeholder text)

- [ ] **Step 7: Commit**

```bash
git add static/js/ templates/
git commit -m "feat: entry screen with particles, Sol/Luna symbols, fade-in sequence"
```

---

## Chunk 2: The Vessels — Drawing and Layout

### Task 4: Vessel Drawing and Circle Layout

**Files:**
- Create: `static/js/vessels.js`

- [ ] **Step 1: Create vessels.js — draw nine vessels in a circle**

The vessels are drawn on canvas as stylized alchemical flask outlines. Each has a unique silhouette variation. They're arranged in an organic circle around the center of the screen.

```javascript
// static/js/vessels.js
import { VESSELS, COLORS } from './constants.js';
import { getState, getPerson } from './state.js';

let vesselPositions = [];
let hoveredVessel = null;
let selectedVessel = null;
let onVesselSelect = null;

export function initVessels(canvas, callback) {
    onVesselSelect = callback;
    layoutVessels(canvas);
}

export function layoutVessels(canvas) {
    const cx = canvas.width / (2 * devicePixelRatio);
    const cy = canvas.height / (2 * devicePixelRatio);
    const radius = Math.min(cx, cy) * 0.6;

    vesselPositions = VESSELS.map((v, i) => {
        const angle = (i / VESSELS.length) * Math.PI * 2 - Math.PI / 2;
        // Add slight organic wobble
        const wobble = Math.sin(i * 2.7) * 8;
        return {
            ...v,
            x: cx + Math.cos(angle) * (radius + wobble),
            y: cy + Math.sin(angle) * (radius + wobble),
            radius: 36,
            angle,
        };
    });
}

function drawFlask(ctx, x, y, size, hue, fillLevel, myLevel, theirLevel) {
    ctx.save();
    ctx.translate(x, y);

    // Flask body outline — glowing
    const glowAlpha = 0.15 + (fillLevel / 5) * 0.25;
    ctx.shadowColor = `hsla(${hue}, 60%, 60%, ${glowAlpha})`;
    ctx.shadowBlur = 15 + fillLevel * 5;

    // Flask shape — rounded bottom, narrow neck
    ctx.beginPath();
    ctx.moveTo(-8, -size * 0.6);    // neck top left
    ctx.lineTo(-8, -size * 0.3);    // neck bottom left
    ctx.quadraticCurveTo(-size * 0.5, -size * 0.1, -size * 0.5, size * 0.15);  // left shoulder
    ctx.quadraticCurveTo(-size * 0.5, size * 0.5, 0, size * 0.55);              // bottom left
    ctx.quadraticCurveTo(size * 0.5, size * 0.5, size * 0.5, size * 0.15);      // bottom right
    ctx.quadraticCurveTo(size * 0.5, -size * 0.1, 8, -size * 0.3);              // right shoulder
    ctx.lineTo(8, -size * 0.6);     // neck top right
    ctx.closePath();

    // Fill with liquid levels
    if (myLevel > 0 || theirLevel > 0) {
        ctx.save();
        ctx.clip();
        const maxLevel = Math.max(myLevel, theirLevel);
        const liquidTop = size * 0.55 - (maxLevel / 5) * size * 0.9;

        // My color (solar gold or lunar silver based on who I am)
        const person = getPerson();
        const myColor = person === 'wes' ? COLORS.sol.primary : COLORS.luna.primary;
        const theirColor = person === 'wes' ? COLORS.luna.primary : COLORS.sol.primary;

        if (myLevel > 0) {
            const myTop = size * 0.55 - (myLevel / 5) * size * 0.9;
            ctx.fillStyle = myColor;
            ctx.globalAlpha = 0.4;
            ctx.fillRect(-size * 0.5, myTop, size, size * 0.55 - myTop + size * 0.1);
        }
        if (theirLevel > 0) {
            const theirTop = size * 0.55 - (theirLevel / 5) * size * 0.9;
            ctx.fillStyle = theirColor;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(-size * 0.5, theirTop, size, size * 0.55 - theirTop + size * 0.1);
        }
        ctx.globalAlpha = 1;
        ctx.restore();
    }

    // Stroke outline
    ctx.strokeStyle = `hsla(${hue}, 40%, 50%, 0.6)`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
}

export function drawVessels(canvas, ctx) {
    const state = getState();
    const person = getPerson();
    const other = person === 'wes' ? 'amelia' : 'wes';

    for (const v of vesselPositions) {
        const myLevel = state[person]?.[v.id] || 0;
        const theirLevel = state[other]?.[v.id] || 0;
        const fillLevel = Math.max(myLevel, theirLevel);
        const isHovered = hoveredVessel === v.id;

        drawFlask(ctx, v.x, v.y, isHovered ? 40 : 36, v.hue, fillLevel, myLevel, theirLevel);

        // Label
        ctx.save();
        ctx.font = `${isHovered ? '14px' : '12px'} "Cormorant Garamond", serif`;
        ctx.fillStyle = isHovered ? COLORS.text : `hsla(${v.hue}, 30%, 65%, 0.7)`;
        ctx.textAlign = 'center';
        ctx.fillText(v.name, v.x, v.y + 52);
        if (isHovered) {
            ctx.font = 'italic 11px "Cormorant Garamond", serif';
            ctx.fillStyle = `hsla(${v.hue}, 30%, 65%, 0.5)`;
            ctx.fillText(v.essence, v.x, v.y + 67);
        }
        ctx.restore();
    }
}

export function handleVesselMouseMove(x, y) {
    hoveredVessel = null;
    for (const v of vesselPositions) {
        const dx = x - v.x;
        const dy = y - v.y;
        if (Math.sqrt(dx * dx + dy * dy) < v.radius + 10) {
            hoveredVessel = v.id;
            return v.id;
        }
    }
    return null;
}

export function handleVesselClick(x, y) {
    const hit = handleVesselMouseMove(x, y);
    if (hit && onVesselSelect) {
        selectedVessel = hit;
        onVesselSelect(hit);
    }
    return hit;
}

export function getSelectedVessel() { return selectedVessel; }
export function clearSelectedVessel() { selectedVessel = null; }
```

- [ ] **Step 2: Wire vessels into app.js athanor screen**

Update `app.js` to import and call vessel functions in the athanor screen. Replace the placeholder text block in the `loop` function's `athanor` branch:

```javascript
// Add imports at top of app.js:
import { initVessels, drawVessels, handleVesselMouseMove, handleVesselClick, layoutVessels } from './vessels.js';

// In onPersonSelected, after fetchState:
initVessels(canvas, (vesselId) => { console.log('selected:', vesselId); });

// In the resize handler, add:
if (currentScreen === 'athanor') layoutVessels(canvas);

// In the athanor branch of loop:
ctx.fillStyle = '#0a0a1a';
ctx.fillRect(0, 0, w, h);
// (particles drawn here later)
drawVessels(canvas, ctx);

// In click handler add athanor branch:
if (currentScreen === 'athanor') handleVesselClick(x, y);

// In mousemove handler add athanor branch:
if (currentScreen === 'athanor') handleVesselMouseMove(x, y);
```

- [ ] **Step 3: Test manually — verify vessels render in a circle**

Run server, click a symbol, see nine labeled flasks in a circle. Hover to see essence text and glow.

- [ ] **Step 4: Commit**

```bash
git add static/js/
git commit -m "feat: vessel drawing, circle layout, hover interaction"
```

### Task 5: Flame Interaction

**Files:**
- Create: `static/js/flame.js`

- [ ] **Step 1: Create flame.js — draggable flame beneath selected vessel**

When a vessel is selected, a flame appears beneath it. The user drags vertically to adjust the flame intensity (1-5). The flame animates procedurally — flickering, swaying. The drag snaps to the nearest level on release.

```javascript
// static/js/flame.js
import { COLORS } from './constants.js';
import { getPerson, postAdjustment, getState } from './state.js';

let active = false;
let vesselId = null;
let vesselX = 0;
let vesselY = 0;
let currentLevel = 0;
let displayLevel = 0; // smoothed for animation
let dragging = false;
let dragLevel = 0;
let time = 0;

export function showFlame(id, x, y) {
    vesselId = id;
    vesselX = x;
    vesselY = y;
    const state = getState();
    const person = getPerson();
    currentLevel = state[person]?.[id] || 0;
    displayLevel = currentLevel;
    active = true;
    dragging = false;
}

export function hideFlame() {
    active = false;
    vesselId = null;
}

export function isFlameActive() { return active; }

export function updateFlame(dt) {
    if (!active) return;
    time += dt;
    // Smooth display level toward target
    const target = dragging ? dragLevel : currentLevel;
    displayLevel += (target - displayLevel) * 0.15;
}

export function drawFlame(ctx) {
    if (!active || displayLevel < 0.1) return;

    const x = vesselX;
    const baseY = vesselY + 42; // below the flask
    const intensity = displayLevel / 5;
    const height = 10 + intensity * 35;
    const width = 6 + intensity * 14;
    const person = getPerson();
    const color = person === 'wes' ? COLORS.sol : COLORS.luna;

    ctx.save();
    ctx.translate(x, baseY);

    // Draw multiple flame layers for richness
    for (let layer = 0; layer < 3; layer++) {
        const layerOffset = layer * 0.3;
        const flicker = Math.sin(time * (4 + layer) + layer * 2) * (2 + intensity * 3);
        const sway = Math.sin(time * (1.5 + layer * 0.5)) * (1 + intensity * 2);

        const h = height * (1 - layer * 0.2);
        const w = width * (1 - layer * 0.25);

        ctx.beginPath();
        ctx.moveTo(-w / 2 + sway, 0);
        ctx.quadraticCurveTo(
            -w / 3 + flicker + sway, -h * 0.5,
            sway, -h + flicker * 0.5
        );
        ctx.quadraticCurveTo(
            w / 3 - flicker + sway, -h * 0.5,
            w / 2 + sway, 0
        );
        ctx.closePath();

        const alpha = (0.3 - layer * 0.08) * (0.3 + intensity * 0.7);
        ctx.fillStyle = layer === 0 ? color.primary :
                       layer === 1 ? color.glow : '#fff';
        ctx.globalAlpha = alpha;
        ctx.fill();
    }

    // Glow
    ctx.globalAlpha = intensity * 0.3;
    ctx.shadowColor = color.glow;
    ctx.shadowBlur = 20 + intensity * 20;
    ctx.beginPath();
    ctx.arc(0, -height * 0.3, width * 0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    // Level indicator (subtle dots)
    for (let i = 1; i <= 5; i++) {
        const dotY = -i * 10 + 5;
        ctx.beginPath();
        ctx.arc(width / 2 + 12, dotY, 2, 0, Math.PI * 2);
        ctx.fillStyle = i <= Math.round(displayLevel) ? color.primary : 'rgba(255,255,255,0.15)';
        ctx.globalAlpha = i <= Math.round(displayLevel) ? 0.8 : 0.3;
        ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}

export function handleFlameMouseDown(x, y) {
    if (!active) return false;
    const fx = vesselX;
    const fy = vesselY + 42;
    const dx = x - fx;
    const dy = y - fy;
    if (Math.abs(dx) < 30 && dy > -60 && dy < 15) {
        dragging = true;
        return true;
    }
    return false;
}

export function handleFlameDrag(x, y) {
    if (!dragging) return;
    const fy = vesselY + 42;
    const dy = fy - y; // positive = up = higher level
    dragLevel = Math.max(1, Math.min(5, Math.round(dy / 10)));
}

export async function handleFlameMouseUp() {
    if (!dragging) return;
    dragging = false;
    const newLevel = Math.max(1, Math.min(5, Math.round(dragLevel)));
    currentLevel = newLevel;
    await postAdjustment(vesselId, newLevel);
}
```

- [ ] **Step 2: Wire flame into app.js**

Add imports and integrate flame lifecycle: show flame when vessel is clicked, update/draw in loop, handle mouse events for drag.

- [ ] **Step 3: Test manually — select a vessel, drag flame, verify adjustment persists**

After dragging and releasing, reload the page, re-enter — the vessel should show the persisted level.

- [ ] **Step 4: Commit**

```bash
git add static/js/
git commit -m "feat: interactive flame with drag gesture and 5 intensity levels"
```

---

## Chunk 3: The Coniunctio — Center Visualization

### Task 6: Center Generative Visualization

**Files:**
- Create: `static/js/coniunctio.js`

- [ ] **Step 1: Create coniunctio.js — two energy forms dancing**

The Coniunctio is drawn in the center of the vessel circle. Two particle/flow systems — solar (gold, structured) and lunar (silver, fluid) — whose behavior is driven by the alignment of the nine vessels. High alignment = they weave together. Low alignment = they drift apart.

```javascript
// static/js/coniunctio.js
import { COLORS, VESSELS } from './constants.js';
import { getState } from './state.js';

const PARTICLE_COUNT = 120;
let solarParticles = [];
let lunarParticles = [];
let time = 0;
let centerX = 0;
let centerY = 0;
let radius = 80;

export function initConiunctio(canvas) {
    centerX = canvas.width / (2 * devicePixelRatio);
    centerY = canvas.height / (2 * devicePixelRatio);
    radius = Math.min(centerX, centerY) * 0.25;

    solarParticles = [];
    lunarParticles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        solarParticles.push(createParticle('solar'));
        lunarParticles.push(createParticle('lunar'));
    }
}

function createParticle(type) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;
    return {
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        angle: angle,
        dist: dist,
        speed: 0.2 + Math.random() * 0.5,
        size: 1 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
        type,
    };
}

function computeAlignment() {
    const state = getState();
    let totalDiff = 0;
    let count = 0;

    for (const v of VESSELS) {
        const wes = state.wes?.[v.id] || 0;
        const amelia = state.amelia?.[v.id] || 0;
        if (wes > 0 && amelia > 0) {
            totalDiff += Math.abs(wes - amelia);
            count++;
        }
    }

    if (count === 0) return 0.5; // neutral when no data
    const maxDiff = count * 4; // max possible difference
    const alignment = 1 - (totalDiff / maxDiff);
    return alignment; // 0 = total dissonance, 1 = perfect alignment
}

function computeIntensity() {
    const state = getState();
    let total = 0;
    let count = 0;
    for (const v of VESSELS) {
        const wes = state.wes?.[v.id] || 0;
        const amelia = state.amelia?.[v.id] || 0;
        total += wes + amelia;
        if (wes > 0) count++;
        if (amelia > 0) count++;
    }
    if (count === 0) return 0.2;
    return 0.2 + (total / (count * 5)) * 0.8;
}

export function updateConiunctio(dt) {
    time += dt;
    const alignment = computeAlignment();
    const intensity = computeIntensity();

    // Shared orbit speed — higher alignment = more synchronized
    const baseSpeed = 0.3 + intensity * 0.4;
    const syncFactor = alignment; // 1 = same direction, 0 = independent

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        updateParticle(solarParticles[i], baseSpeed, syncFactor, 1, intensity);
        updateParticle(lunarParticles[i], baseSpeed, syncFactor, -1, intensity);
    }
}

function updateParticle(p, baseSpeed, syncFactor, direction, intensity) {
    // Orbital motion — direction determines clockwise/counter
    const orbitSpeed = baseSpeed * p.speed * direction;

    // When alignment is high, both types orbit in similar patterns
    // When low, they go their own way with more chaos
    const chaos = (1 - syncFactor) * 0.5;
    const wobble = Math.sin(time * 2 + p.phase) * chaos * 30;

    p.angle += orbitSpeed * 0.02;
    const targetDist = p.dist + Math.sin(time * 1.5 + p.phase) * radius * 0.3 * intensity;

    p.x = centerX + Math.cos(p.angle) * (targetDist + wobble);
    p.y = centerY + Math.sin(p.angle) * (targetDist + wobble * 0.6);
}

export function drawConiunctio(ctx) {
    const alignment = computeAlignment();
    const intensity = computeIntensity();

    // Central glow
    const glowRadius = radius * (0.5 + alignment * 0.5);
    const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
    grad.addColorStop(0, `rgba(200, 176, 122, ${0.05 + alignment * 0.08})`);
    grad.addColorStop(1, 'rgba(200, 176, 122, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Solar particles
    drawParticleSet(ctx, solarParticles, COLORS.sol, intensity);
    // Lunar particles
    drawParticleSet(ctx, lunarParticles, COLORS.luna, intensity);
}

function drawParticleSet(ctx, particles, colors, intensity) {
    for (const p of particles) {
        const dx = p.x - centerX;
        const dy = p.y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const alpha = (0.1 + intensity * 0.5) * Math.max(0, 1 - dist / (radius * 2));

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * intensity, 0, Math.PI * 2);
        ctx.fillStyle = colors.primary;
        ctx.globalAlpha = alpha;
        ctx.fill();

        // Soft glow on larger particles
        if (p.size > 1.5) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 2 * intensity, 0, Math.PI * 2);
            ctx.fillStyle = colors.glow;
            ctx.globalAlpha = alpha * 0.3;
            ctx.fill();
        }
    }
    ctx.globalAlpha = 1;
}

export function layoutConiunctio(canvas) {
    centerX = canvas.width / (2 * devicePixelRatio);
    centerY = canvas.height / (2 * devicePixelRatio);
    radius = Math.min(centerX, centerY) * 0.25;
}
```

- [ ] **Step 2: Wire coniunctio into app.js**

Import and call `initConiunctio`, `updateConiunctio`, `drawConiunctio` in the athanor screen. Draw it before vessels so vessels render on top.

- [ ] **Step 3: Test manually — adjust flames for both users, observe center visualization change**

Use two browser tabs (one as Wes, one as Amelia). Set matching levels — see energies converge. Set different levels — see them diverge.

- [ ] **Step 4: Commit**

```bash
git add static/js/
git commit -m "feat: coniunctio center visualization — alignment-driven particle dance"
```

---

## Chunk 4: Background Particles for Main View + History

### Task 7: Background Particles on Athanor Screen

**Files:**
- Modify: `static/js/app.js`

- [ ] **Step 1: Add particle system to athanor screen**

Initialize a ParticleSystem when entering the athanor view. Draw it behind vessels and coniunctio.

- [ ] **Step 2: Commit**

```bash
git add static/js/app.js
git commit -m "feat: add background particle dust to athanor screen"
```

### Task 8: Vessel History View

**Files:**
- Create: `static/js/history.js`

- [ ] **Step 1: Create history.js — sediment layer visualization**

When a vessel is tapped a second time (or a dedicated gesture), it expands to show its history. The history is rendered as horizontal color bands — each band represents a time period, with color reflecting the blend of both people's readings. Early volatile periods show many thin shifting bands. Stable periods show thick consistent bands.

```javascript
// static/js/history.js
import { COLORS } from './constants.js';
import { fetchHistory, getPerson } from './state.js';

let visible = false;
let historyData = [];
let vesselId = null;
let fadeAlpha = 0;

export async function showHistory(id, x, y) {
    vesselId = id;
    historyData = await fetchHistory(id);
    visible = true;
    fadeAlpha = 0;
}

export function hideHistory() {
    visible = false;
    fadeAlpha = 0;
}

export function isHistoryVisible() { return visible; }

export function updateHistory(dt) {
    if (!visible) return;
    fadeAlpha = Math.min(1, fadeAlpha + dt * 2);
}

export function drawHistory(ctx, canvasW, canvasH) {
    if (!visible || historyData.length === 0) return;

    const w = canvasW * 0.4;
    const h = canvasH * 0.6;
    const x = (canvasW - w) / 2;
    const y = (canvasH - h) / 2;

    ctx.save();
    ctx.globalAlpha = fadeAlpha;

    // Dark overlay
    ctx.fillStyle = 'rgba(10, 10, 26, 0.85)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // History panel
    ctx.fillStyle = 'rgba(20, 20, 40, 0.9)';
    ctx.strokeStyle = 'rgba(200, 176, 122, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.font = '20px "Cormorant Garamond", serif';
    ctx.fillStyle = COLORS.gold;
    ctx.textAlign = 'center';
    ctx.fillText('Layers of ' + (vesselId || '').replace(/-/g, ' '), x + w / 2, y + 30);

    // Draw sediment bands
    const bandArea = { x: x + 20, y: y + 50, w: w - 40, h: h - 70 };
    const bandHeight = Math.max(2, bandArea.h / Math.max(historyData.length, 1));

    for (let i = 0; i < historyData.length; i++) {
        const entry = historyData[i];
        const by = bandArea.y + bandArea.h - (i + 1) * bandHeight;
        const color = entry.person === 'wes' ? COLORS.sol.primary : COLORS.luna.primary;
        const intensity = entry.level / 5;

        ctx.fillStyle = color;
        ctx.globalAlpha = fadeAlpha * (0.15 + intensity * 0.5);
        ctx.fillRect(bandArea.x, by, bandArea.w, bandHeight - 1);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}
```

- [ ] **Step 2: Wire history into app.js — double-click or long-press a vessel to see history**

- [ ] **Step 3: Test manually — make several adjustments, view history, verify sediment bands**

- [ ] **Step 4: Commit**

```bash
git add static/js/
git commit -m "feat: vessel history view with sediment layer visualization"
```

---

## Chunk 5: Polish and Finishing

### Task 9: Liquid Simulation in Vessels

**Files:**
- Create: `static/js/liquid.js`

- [ ] **Step 1: Create liquid.js — animated liquid swirl inside vessels**

Replace the simple colored rectangles in vessels.js with an animated liquid that swirls. Two colors blend when aligned, separate when divergent. Uses simple sine-wave distortion for a fluid feel.

- [ ] **Step 2: Integrate liquid.js into vessel drawing**

- [ ] **Step 3: Commit**

```bash
git add static/js/
git commit -m "feat: animated liquid simulation in vessels with two-color blending"
```

### Task 10: Visual Polish Pass

**Files:**
- Modify: various JS files

- [ ] **Step 1: Add cursor changes** — pointer on interactive elements, grab/grabbing on flame drag

- [ ] **Step 2: Add transition when moving from entry to athanor** — fade through black

- [ ] **Step 3: Add subtle vessel pulse** — vessels breathe slightly even when idle

- [ ] **Step 4: Tune the coniunctio** — make the alignment-to-visual mapping feel right. Test with various states. Ensure low alignment is beautiful (searching) not ugly.

- [ ] **Step 5: Add .gitignore**

```
# .gitignore
athanor.db
__pycache__/
*.pyc
.superpowers/
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: visual polish — transitions, cursor states, vessel breathing, coniunctio tuning"
```

### Task 11: Final Integration Test

- [ ] **Step 1: Full walkthrough as Wes**
- Open localhost:5000
- See entry screen with particles and fade-in
- Click Sol/Wes
- See nine vessels in a circle with center coniunctio
- Click a vessel, drag flame to Blazing
- See vessel liquid respond, coniunctio shift
- Adjust several vessels
- View history on a vessel

- [ ] **Step 2: Full walkthrough as Amelia (second browser/incognito)**
- Same flow but click Luna/Amelia
- Verify Wes's readings are visible (gold liquid) but not adjustable
- Adjust Amelia's flames
- Observe coniunctio respond to combined state

- [ ] **Step 3: Couch test** — both open simultaneously, adjust, watch the center dance respond

- [ ] **Step 4: Commit any final fixes**
