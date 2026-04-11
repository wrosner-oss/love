import { setPerson, fetchState, getState } from './state.js';
import { initEntry, resizeEntry, updateEntry, drawEntry, handleEntryClick, handleEntryMouseMove } from './entry.js';
import { initVessels, layoutVessels, updateVessels, drawVessels, handleVesselMouseMove, handleVesselClick, getVesselPosition } from './vessels.js';
import { showFlame, hideFlame, isFlameActive, getFlameVesselId, updateFlame, drawFlame, handleFlameMouseDown, handleFlameDrag, handleFlameMouseUp, isDragging } from './flame.js';
import { initConiunctio, layoutConiunctio, updateConiunctio, drawConiunctio } from './coniunctio.js';
import { showHistory, hideHistory, isHistoryVisible, updateHistory, drawHistory } from './history.js';
import { showDetail, hideDetail, isDetailVisible, updateDetail, drawDetail } from './detail.js';
import { initAtmosphere, layoutAtmosphere, updateAtmosphere, drawAtmosphere } from './atmosphere.js';
import { startAudio, startDrone, updateDrone, playChime, playBurst, toggleMute, isMuted } from './sound.js';
import { ParticleSystem } from './particles.js';
import { COLORS, VESSELS } from './constants.js';

const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');

let currentScreen = 'entry'; // 'entry' | 'transition' | 'athanor'
let w = 0;
let h = 0;
let transitionAlpha = 0;
let transitionTarget = null;
let lastWallTime = 0;
let athanorParticles = null;
let bgImage = null;
let bgImageReady = false;

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
        layoutAtmosphere(w, h);
        if (athanorParticles) athanorParticles.resize(w, h);
    }
}

function onPersonSelected(person) {
    startAudio(); // User gesture — safe to init audio
    setPerson(person);
    transitionTarget = 'athanor';
    currentScreen = 'transition';
    transitionAlpha = 0;

    fetchState().then(() => {
        startDrone();
        initVessels(w, h, onVesselSelected);
        initConiunctio(w, h);
        initAtmosphere(w, h);
        // Load static background for athanor
        if (!bgImage) {
            bgImage = new Image();
            bgImage.onload = () => { bgImageReady = true; };
            bgImage.src = '/static/images/background.png';
        }
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
        showFlame(vesselId, pos.x, pos.y);
        showDetail(vesselId);
        // Play chime tuned to this vessel's hue
        const vessel = VESSELS.find(v => v.id === vesselId);
        if (vessel) playChime(vessel.hue);
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
    // Background — static Midjourney image or fallback
    if (bgImageReady && bgImage) {
        const iw = bgImage.naturalWidth;
        const ih = bgImage.naturalHeight;
        const scale = Math.max(w / iw, h / ih);
        const dw = iw * scale;
        const dh = ih * scale;
        ctx.drawImage(bgImage, (w - dw) / 2, (h - dh) / 2, dw, dh);
        ctx.fillStyle = 'rgba(6, 6, 18, 0.5)';
        ctx.fillRect(0, 0, w, h);
    } else {
        ctx.fillStyle = COLORS.background;
        ctx.fillRect(0, 0, w, h);
    }

    // Subtle center warmth (on top of background)
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h * 0.45);
    grad.addColorStop(0, 'rgba(35, 28, 45, 0.3)');
    grad.addColorStop(1, 'rgba(10, 10, 26, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Background particles
    if (athanorParticles) {
        athanorParticles.update();
        athanorParticles.draw(ctx);
    }

    // Atmospheric energy field
    updateAtmosphere(dt);
    drawAtmosphere(ctx, w, h);

    // Update drone sound based on alignment
    const state = getState();
    let totalDiff = 0, count = 0;
    for (const v of VESSELS) {
        const wl = state.wes?.[v.id] || 0;
        const al = state.amelia?.[v.id] || 0;
        if (wl > 0 && al > 0) { totalDiff += Math.abs(wl - al); count++; }
    }
    const alignment = count > 0 ? 1 - (totalDiff / (count * 4)) : 0.5;
    updateDrone(alignment);

    // Center visualization
    updateConiunctio(dt);
    drawConiunctio(ctx);

    // Vessels on top
    updateVessels(dt);
    drawVessels(ctx, w, h);

    // Update & draw flame
    updateFlame(dt);
    drawFlame(ctx);

    // Overlays (on top of everything)
    updateHistory(dt);
    drawHistory(ctx, w, h);

    updateDetail(dt);
    drawDetail(ctx, w, h);
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
            } else if (isDetailVisible()) {
                // Check if clicking a different vessel while detail is open
                const hit = handleVesselMouseMove(x, y);
                if (hit && hit !== getFlameVesselId()) {
                    // Switch to the new vessel
                    handleVesselClick(x, y);
                } else if (!hit) {
                    // Clicked empty space — close the panel
                    hideDetail();
                    hideFlame();
                }
                // If clicking the same vessel, do nothing (flame is already there)
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
                if (hovered) {
                    canvas.style.cursor = 'pointer';
                } else if (isFlameActive()) {
                    // Check if hovering over flame area
                    canvas.style.cursor = 'grab';
                } else {
                    canvas.style.cursor = 'default';
                }
            }
        }
    });

    // Double-click for history
    canvas.addEventListener('dblclick', (e) => {
        if (currentScreen === 'athanor' && !isDetailVisible()) {
            if (isHistoryVisible()) {
                hideHistory();
            } else {
                const hit = handleVesselMouseMove(e.clientX, e.clientY);
                if (hit) showHistory(hit);
            }
        }
    });

    // Mouse down for flame drag — works even when detail panel is open
    canvas.addEventListener('mousedown', (e) => {
        if (currentScreen === 'athanor' && !isHistoryVisible()) {
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
