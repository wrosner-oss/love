// Ambient sound system for The Athanor
// Uses Web Audio API — sound mirrors the coniunctio state
//
// Harmonious: rich, warm, consonant — octaves and fifths, smooth sine waves
// Balanced:   pleasant movement — intervals shift slowly, gentle tension
// Searching:  sparse, minor intervals — ache and longing, rougher texture
// Dormant:    barely there — single low pulse, felt more than heard

let audioCtx = null;
let masterGain = null;
let initialized = false;
let muted = false;

// --- Drone layers ---
// Each layer has: oscillator, gain, filter
// We crossfade layers based on alignment state
let layers = {};
let droneGain = null; // master drone gain

// Current smooth alignment for sound (tracks separately for audio smoothing)
let soundAlignment = 0.5;

// Musical constants
const A2 = 110;
const E3 = 164.81;  // perfect fifth
const C3 = 130.81;  // minor third above A
const D3 = 146.83;  // fourth
const A3 = 220;
const F3 = 174.61;  // minor sixth — yearning interval

export function initSound() {}

function ensureContext() {
    if (initialized) return true;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.07;
        masterGain.connect(audioCtx.destination);

        droneGain = audioCtx.createGain();
        droneGain.gain.value = 0;
        droneGain.connect(masterGain);

        // --- LFO for breathing ---
        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.06; // ~16 second breath cycle
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 0.2;
        lfo.connect(lfoGain);
        lfoGain.connect(droneGain.gain);
        lfo.start();

        // --- HARMONIOUS layer ---
        // Rich, warm: root + fifth + octave, pure sine waves
        layers.harmonious = createLayer([
            { freq: A2, type: 'sine', gain: 0.35 },
            { freq: E3, type: 'sine', gain: 0.25 },      // perfect fifth
            { freq: A3, type: 'sine', gain: 0.15 },      // octave
            { freq: A2 / 2, type: 'sine', gain: 0.2 },   // sub octave — deep warmth
        ], 350, 0.7);

        // --- BALANCED layer ---
        // Movement and gentle tension: root + fourth + shifting tone
        layers.balanced = createLayer([
            { freq: A2, type: 'sine', gain: 0.3 },
            { freq: D3, type: 'triangle', gain: 0.2 },   // fourth — stable but not resolved
            { freq: E3, type: 'sine', gain: 0.12 },      // fifth fading in and out
            { freq: A2 * 1.01, type: 'sine', gain: 0.1 }, // very slight detune — shimmer
        ], 320, 0.5);

        // --- SEARCHING layer ---
        // Sparse, minor, aching: root + minor sixth + rougher texture
        layers.searching = createLayer([
            { freq: A2, type: 'triangle', gain: 0.25 },   // triangle — more overtones, rougher
            { freq: F3, type: 'triangle', gain: 0.2 },    // minor sixth — yearning
            { freq: C3, type: 'sine', gain: 0.12 },       // minor third — melancholy
            { freq: A2 * 0.995, type: 'sine', gain: 0.08 }, // slight detune down — unease
        ], 250, 0.4);

        // --- DORMANT layer ---
        // Almost nothing: single sub tone, very filtered
        layers.dormant = createLayer([
            { freq: A2 / 2, type: 'sine', gain: 0.3 },   // deep sub
            { freq: A2, type: 'sine', gain: 0.05 },       // whisper of root
        ], 150, 0.3);

        initialized = true;
        return true;
    } catch (e) {
        return false;
    }
}

function createLayer(oscillators, filterFreq, filterQ) {
    const layerGain = audioCtx.createGain();
    layerGain.gain.value = 0; // starts silent
    layerGain.connect(droneGain);

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = filterQ;
    filter.connect(layerGain);

    const oscs = [];
    for (const def of oscillators) {
        const osc = audioCtx.createOscillator();
        osc.type = def.type;
        osc.frequency.value = def.freq;
        const g = audioCtx.createGain();
        g.gain.value = def.gain;
        osc.connect(g);
        g.connect(filter);
        osc.start();
        oscs.push({ osc, gain: g, basFreq: def.freq });
    }

    return { gain: layerGain, filter, oscs };
}

export function startAudio() {
    if (!ensureContext()) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

export function toggleMute() {
    muted = !muted;
    if (masterGain) {
        masterGain.gain.setTargetAtTime(muted ? 0 : 0.07, audioCtx.currentTime, 0.3);
    }
    return muted;
}

export function isMuted() { return muted; }

export function startDrone() {
    if (!initialized || muted) return;
    droneGain.gain.setTargetAtTime(1.0, audioCtx.currentTime, 2.0);
}

export function stopDrone() {
    if (!initialized) return;
    droneGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
}

// --- Core: update drone to mirror coniunctio alignment ---
export function updateDrone(alignment) {
    if (!initialized || muted) return;

    // Smooth the alignment for audio (faster than visual so sound feels responsive)
    soundAlignment += (alignment - soundAlignment) * 0.05;
    const a = soundAlignment;

    const t = audioCtx.currentTime;
    const ramp = 2.0; // seconds to crossfade

    // Compute layer volumes based on alignment
    // Same zones as coniunctio crossfade
    let dormantVol = 0, searchingVol = 0, balancedVol = 0, harmoniousVol = 0;

    if (a < 0.35) {
        const blend = a / 0.35;
        searchingVol = 1 - blend * 0.4;
        balancedVol = blend * 0.4;
        dormantVol = Math.max(0, 0.3 - a);
    } else if (a < 0.65) {
        const blend = (a - 0.35) / 0.3;
        searchingVol = Math.max(0, 0.3 - blend * 0.3);
        balancedVol = 0.7;
        harmoniousVol = blend * 0.3;
    } else {
        const blend = (a - 0.65) / 0.35;
        balancedVol = 1 - blend;
        harmoniousVol = blend;
    }

    // Apply volumes with smooth ramp
    layers.dormant.gain.gain.setTargetAtTime(dormantVol, t, ramp);
    layers.searching.gain.gain.setTargetAtTime(searchingVol, t, ramp);
    layers.balanced.gain.gain.setTargetAtTime(balancedVol, t, ramp);
    layers.harmonious.gain.gain.setTargetAtTime(harmoniousVol, t, ramp);

    // Modulate filter frequencies based on alignment — brighter when harmonious
    const filterShift = a * 80; // 0-80 Hz boost
    layers.searching.filter.frequency.setTargetAtTime(220 + filterShift * 0.3, t, ramp);
    layers.balanced.filter.frequency.setTargetAtTime(280 + filterShift * 0.5, t, ramp);
    layers.harmonious.filter.frequency.setTargetAtTime(300 + filterShift, t, ramp);

    // Subtle pitch drift on the searching layer — tones slowly wander
    if (layers.searching.oscs.length >= 2) {
        const drift = Math.sin(t * 0.1) * 3; // ±3 Hz slow wander
        layers.searching.oscs[1].osc.frequency.setTargetAtTime(F3 + drift, t, 1.0);
    }

    // Balanced layer: fourth oscillator shimmer varies with alignment
    if (layers.balanced.oscs.length >= 4) {
        const shimmer = 1 + (1 - a) * 0.02; // more detune when less aligned
        layers.balanced.oscs[3].osc.frequency.setTargetAtTime(A2 * shimmer, t, 1.0);
    }
}

// --- Interaction sounds ---

export function playChime(hue) {
    if (!initialized || muted) return;

    const freq = 400 + (hue / 360) * 400;
    const t = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.12;
    gain.gain.setTargetAtTime(0, t + 0.1, 0.4);

    // Shimmer — fifth above
    const osc2 = audioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 1.5;
    const gain2 = audioCtx.createGain();
    gain2.gain.value = 0.05;
    gain2.gain.setTargetAtTime(0, t + 0.15, 0.5);

    // Soft reverb-like tail — octave below, very quiet
    const osc3 = audioCtx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.value = freq * 0.5;
    const gain3 = audioCtx.createGain();
    gain3.gain.value = 0.03;
    gain3.gain.setTargetAtTime(0, t + 0.2, 0.8);

    osc.connect(gain); gain.connect(masterGain);
    osc2.connect(gain2); gain2.connect(masterGain);
    osc3.connect(gain3); gain3.connect(masterGain);

    osc.start(); osc2.start(); osc3.start();
    osc.stop(t + 2); osc2.stop(t + 2.5); osc3.stop(t + 3);
}

export function playFlameLevel(level) {
    if (!initialized || muted) return;

    // Pentatonic scale — always sounds good
    const notes = [220, 261.63, 293.66, 349.23, 392]; // A3, C4, D4, F4, G4
    const freq = notes[Math.min(level - 1, notes.length - 1)];
    const t = audioCtx.currentTime;

    const osc = audioCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.07;
    gain.gain.setTargetAtTime(0, t + 0.05, 0.12);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(t + 0.4);
}

export function playBurst(magnitude) {
    if (!initialized || muted) return;

    const t = audioCtx.currentTime;
    const baseFreq = 55 + magnitude * 8;
    const volume = 0.06 + magnitude * 0.03;
    const duration = 0.5 + magnitude * 0.5;

    // Deep fundamental
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = baseFreq;
    osc.frequency.setTargetAtTime(baseFreq * 0.6, t, duration * 0.4);
    const gain = audioCtx.createGain();
    gain.gain.value = volume;
    gain.gain.setTargetAtTime(0, t + 0.1, duration * 0.3);

    // Harmonic shimmer
    const osc2 = audioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = baseFreq * 3;
    const gain2 = audioCtx.createGain();
    gain2.gain.value = volume * 0.25;
    gain2.gain.setTargetAtTime(0, t + 0.05, duration * 0.2);

    // Noise-like high transient for impact
    const osc3 = audioCtx.createOscillator();
    osc3.type = 'sawtooth';
    osc3.frequency.value = baseFreq * 6;
    const gain3 = audioCtx.createGain();
    gain3.gain.value = volume * 0.1;
    gain3.gain.setTargetAtTime(0, t + 0.02, 0.05);
    const burstFilter = audioCtx.createBiquadFilter();
    burstFilter.type = 'lowpass';
    burstFilter.frequency.value = 300 + magnitude * 150;

    osc.connect(gain); gain.connect(masterGain);
    osc2.connect(gain2); gain2.connect(masterGain);
    osc3.connect(burstFilter); burstFilter.connect(gain3); gain3.connect(masterGain);

    osc.start(); osc2.start(); osc3.start();
    osc.stop(t + duration + 1);
    osc2.stop(t + duration + 0.5);
    osc3.stop(t + 0.3);
}

export function playEntryAmbient() {
    if (!initialized || muted) return;

    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = A2;
    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(0.04, audioCtx.currentTime, 2.0);

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 250;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start();

    return {
        stop: () => {
            gain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
            setTimeout(() => osc.stop(), 2000);
        }
    };
}
