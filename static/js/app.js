import { setPerson, fetchState } from './state.js';
import { initEntry, resizeEntry, updateEntry, drawEntry, handleEntryClick, handleEntryMouseMove } from './entry.js';
import { initVessels, layoutVessels, updateVessels, drawVessels, handleVesselMouseMove, handleVesselClick, getVesselPosition } from './vessels.js';
import { showFlame, hideFlame, isFlameActive, getFlameVesselId, updateFlame, drawFlame, handleFlameMouseDown, handleFlameDrag, handleFlameMouseUp, isDragging } from './flame.js';
import { initConiunctio, layoutConiunctio, updateConiunctio, drawConiunctio } from './coniunctio.js';
import { showHistory, hideHistory, isHistoryVisible, updateHistory, drawHistory } from './history.js';
import { ParticleSystem } from './particles.js';
import { COLORS } from './constants.js';

const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');

let currentScreen = 'entry'; // 'entry' | 'transition' | 'athanor'
let w = 0;
let h = 0;
let transitionAlpha = 0;
let transitionTarget = null;
let lastWallTime = 0;
let athanorParticles = null;

function resize() {
    const dpr = window.devicePixelRatio || 1;
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (currentScreen === 'entry') resizeEntry(w, h);
    if (currentScreen === 'athanor') {
        layoutVessels(w, h);
        layoutConiunctio(w, h);
        if (athanorParticles) athanorParticles.resize(w, h);
    }
}

function onPersonSelected(person) {
    setPerson(person);
    transitionTarget = 'athanor';
    currentScreen = 'transition';
    transitionAlpha = 0;

    fetchState().then(() => {
        initVessels(w, h, onVesselSelected);
        initConiunctio(w, h);
        athanorParticles = new ParticleSystem({
            count: 50,
            color: '#c8b07a',
            maxAlpha: 0.2,
            speed: 0.15,
        });
        athanorParticles.resize(w, h);
    });
}

function onVesselSelected(vesselId) {
    const pos = getVesselPosition(vesselId);
    if (pos) {
        // If clicking the same vessel that already has a flame, hide it
        if (isFlameActive() && getFlameVesselId() === vesselId) {
            hideFlame();
        } else {
            showFlame(vesselId, pos.x, pos.y);
        }
    }
}

function tick() {
    const now = performance.now();
    const dt = lastWallTime === 0 ? 0.016 : Math.min((now - lastWallTime) / 1000, 2.0);
    lastWallTime = now;

    if (currentScreen === 'entry') {
        updateEntry(dt);
        drawEntry(ctx, w, h);
    } else if (currentScreen === 'transition') {
        transitionAlpha = Math.min(1, transitionAlpha + dt * 1.5);
        updateEntry(dt);
        drawEntry(ctx, w, h);
        ctx.fillStyle = `rgba(10, 10, 26, ${transitionAlpha})`;
        ctx.fillRect(0, 0, w, h);

        if (transitionAlpha >= 1) {
            currentScreen = transitionTarget || 'athanor';
            transitionAlpha = 1;
        }
    } else if (currentScreen === 'athanor') {
        if (transitionAlpha > 0) {
            transitionAlpha = Math.max(0, transitionAlpha - dt * 1.0);
        }
        drawAthanor(ctx, w, h, dt);
        if (transitionAlpha > 0) {
            ctx.fillStyle = `rgba(10, 10, 26, ${transitionAlpha})`;
            ctx.fillRect(0, 0, w, h);
        }
    }
}

function drawAthanor(ctx, w, h, dt) {
    // Background
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, w, h);

    // Subtle center warmth
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h * 0.45);
    grad.addColorStop(0, 'rgba(35, 28, 45, 0.4)');
    grad.addColorStop(1, 'rgba(10, 10, 26, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Background particles
    if (athanorParticles) {
        athanorParticles.update();
        athanorParticles.draw(ctx);
    }

    // Center visualization
    updateConiunctio(dt);
    drawConiunctio(ctx);

    // Vessels on top
    updateVessels(dt);
    drawVessels(ctx, w, h);

    // Update & draw flame
    updateFlame(dt);
    drawFlame(ctx);

    // History overlay (on top of everything)
    updateHistory(dt);
    drawHistory(ctx, w, h);
}

function init() {
    resize();
    window.addEventListener('resize', resize);

    // Click handler
    canvas.addEventListener('click', (e) => {
        const x = e.clientX;
        const y = e.clientY;
        if (currentScreen === 'entry') {
            handleEntryClick(x, y);
        } else if (currentScreen === 'athanor' && !isDragging()) {
            if (isHistoryVisible()) {
                hideHistory();
            } else {
                handleVesselClick(x, y);
            }
        }
    });

    // Mouse move
    canvas.addEventListener('mousemove', (e) => {
        const x = e.clientX;
        const y = e.clientY;
        if (currentScreen === 'entry') {
            handleEntryMouseMove(x, y, canvas);
        } else if (currentScreen === 'athanor') {
            if (isDragging()) {
                handleFlameDrag(x, y);
                canvas.style.cursor = 'grabbing';
            } else {
                const hovered = handleVesselMouseMove(x, y);
                canvas.style.cursor = hovered ? 'pointer' : 'default';
            }
        }
    });

    // Double-click for history
    canvas.addEventListener('dblclick', (e) => {
        if (currentScreen === 'athanor') {
            if (isHistoryVisible()) {
                hideHistory();
            } else {
                const hit = handleVesselMouseMove(e.clientX, e.clientY);
                if (hit) showHistory(hit);
            }
        }
    });

    // Mouse down for flame drag
    canvas.addEventListener('mousedown', (e) => {
        if (currentScreen === 'athanor') {
            if (handleFlameMouseDown(e.clientX, e.clientY)) {
                canvas.style.cursor = 'grabbing';
            }
        }
    });

    // Mouse up to release flame
    canvas.addEventListener('mouseup', () => {
        if (currentScreen === 'athanor') {
            handleFlameMouseUp();
            canvas.style.cursor = 'default';
        }
    });

    initEntry(w, h, onPersonSelected);

    // Primary: requestAnimationFrame
    function rafLoop() {
        tick();
        requestAnimationFrame(rafLoop);
    }
    requestAnimationFrame(rafLoop);

    // Fallback for background tabs
    setInterval(() => { tick(); }, 100);
}

init();
