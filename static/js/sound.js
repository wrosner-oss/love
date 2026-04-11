// Ambient sound system for The Athanor
// Uses Web Audio API — no audio files needed

let audioCtx = null;
let masterGain = null;
let droneOsc1 = null;
let droneOsc2 = null;
let droneGain = null;
let initialized = false;
let muted = false;

// Drone frequencies based on alignment
const DRONE_BASE = 110; // A2 — warm, grounding
const DRONE_FIFTH = 165; // E3 — perfect fifth, harmonious

export function initSound() {
    // Audio context must be created from a user gesture
    // We'll initialize on first interaction
}

function ensureContext() {
    if (initialized) return true;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0.08; // Very quiet — ambient background
        masterGain.connect(audioCtx.destination);

        // Drone — two oscillators with LFO modulation for breathing feel
        droneGain = audioCtx.createGain();
        droneGain.gain.value = 0;
        droneGain.connect(masterGain);

        // LFO to modulate drone volume — slow breathing
        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.08; // Very slow — one breath every ~12 seconds
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 0.3; // Modulation depth — 30% volume swing
        lfo.connect(lfoGain);
        lfoGain.connect(droneGain.gain);
        lfo.start();

        droneOsc1 = audioCtx.createOscillator();
        droneOsc1.type = 'sine';
        droneOsc1.frequency.value = DRONE_BASE;
        const droneFilter1 = audioCtx.createBiquadFilter();
        droneFilter1.type = 'lowpass';
        droneFilter1.frequency.value = 300; // Warmer, less buzzy
        droneFilter1.Q.value = 0.5;
        droneOsc1.connect(droneFilter1);
        droneFilter1.connect(droneGain);
        droneOsc1.start();

        droneOsc2 = audioCtx.createOscillator();
        droneOsc2.type = 'sine';
        droneOsc2.frequency.value = DRONE_FIFTH;
        const droneFilter2 = audioCtx.createBiquadFilter();
        droneFilter2.type = 'lowpass';
        droneFilter2.frequency.value = 280;
        droneFilter2.Q.value = 0.5;
        droneOsc2.connect(droneFilter2);
        droneFilter2.connect(droneGain);
        droneOsc2.start();

        // Third oscillator — sub octave for depth, very quiet
        const droneOsc3 = audioCtx.createOscillator();
        droneOsc3.type = 'sine';
        droneOsc3.frequency.value = DRONE_BASE / 2; // Sub octave
        const subGain = audioCtx.createGain();
        subGain.gain.value = 0.3;
        droneOsc3.connect(subGain);
        subGain.connect(droneGain);
        droneOsc3.start();

        initialized = true;
        return true;
    } catch (e) {
        return false;
    }
}

// Call this from any user interaction to start the audio context
export function startAudio() {
    if (!ensureContext()) return;
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

export function toggleMute() {
    muted = !muted;
    if (masterGain) {
        masterGain.gain.setTargetAtTime(muted ? 0 : 0.08, audioCtx.currentTime, 0.3);
    }
    return muted;
}

export function isMuted() { return muted; }

// Fade drone in/out
export function startDrone() {
    if (!initialized || muted) return;
    droneGain.gain.setTargetAtTime(1.0, audioCtx.currentTime, 1.5);
}

export function stopDrone() {
    if (!initialized) return;
    droneGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
}

// Update drone based on alignment (0-1)
export function updateDrone(alignment) {
    if (!initialized || muted) return;

    // When aligned: perfect fifth interval, consonant
    // When dissonant: slightly detuned, creating beats
    const detune = (1 - alignment) * 30; // up to 30 cents detuning
    const secondFreq = DRONE_FIFTH + (1 - alignment) * 8; // slight frequency shift

    droneOsc1.frequency.setTargetAtTime(DRONE_BASE, audioCtx.currentTime, 0.5);
    droneOsc2.frequency.setTargetAtTime(secondFreq, audioCtx.currentTime, 0.5);
    droneOsc2.detune.setTargetAtTime(detune, audioCtx.currentTime, 0.5);
}

// Crystalline chime — vessel click
export function playChime(hue) {
    if (!initialized || muted) return;

    // Map hue to a frequency in a pleasant range
    const freq = 400 + (hue / 360) * 400; // 400-800 Hz range

    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const gain = audioCtx.createGain();
    gain.gain.value = 0.15;
    gain.gain.setTargetAtTime(0, audioCtx.currentTime + 0.1, 0.3);

    // Add a shimmer — second oscillator slightly detuned
    const osc2 = audioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 1.5; // fifth above
    const gain2 = audioCtx.createGain();
    gain2.gain.value = 0.06;
    gain2.gain.setTargetAtTime(0, audioCtx.currentTime + 0.15, 0.4);

    osc.connect(gain);
    gain.connect(masterGain);
    osc2.connect(gain2);
    gain2.connect(masterGain);

    osc.start();
    osc2.start();
    osc.stop(audioCtx.currentTime + 1.5);
    osc2.stop(audioCtx.currentTime + 2);
}

// Flame adjustment tone — pitch rises/falls with level
export function playFlameLevel(level) {
    if (!initialized || muted) return;

    // Low rumble for ember, bright tone for blazing
    const freq = 150 + level * 80; // 150-550 Hz

    const osc = audioCtx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;

    const gain = audioCtx.createGain();
    gain.gain.value = 0.08;
    gain.gain.setTargetAtTime(0, audioCtx.currentTime + 0.05, 0.15);

    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

// Burst event sound — magnitude 1-3+
export function playBurst(magnitude) {
    if (!initialized || muted) return;

    // Deep resonant boom, bigger for larger magnitudes
    const baseFreq = 60 + magnitude * 10;
    const volume = 0.08 + magnitude * 0.04;
    const duration = 0.5 + magnitude * 0.5;

    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = baseFreq;
    osc.frequency.setTargetAtTime(baseFreq * 0.5, audioCtx.currentTime, duration * 0.5);

    const gain = audioCtx.createGain();
    gain.gain.value = volume;
    gain.gain.setTargetAtTime(0, audioCtx.currentTime + 0.1, duration * 0.4);

    // Add harmonic overtone
    const osc2 = audioCtx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = baseFreq * 3;
    const gain2 = audioCtx.createGain();
    gain2.gain.value = volume * 0.3;
    gain2.gain.setTargetAtTime(0, audioCtx.currentTime + 0.05, duration * 0.2);

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200 + magnitude * 100;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc2.connect(gain2);
    gain2.connect(masterGain);

    osc.start();
    osc2.start();
    osc.stop(audioCtx.currentTime + duration + 1);
    osc2.stop(audioCtx.currentTime + duration + 0.5);
}

// Entry screen ambient — subtle high shimmer
export function playEntryAmbient() {
    if (!initialized || muted) return;

    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 220; // A3

    const gain = audioCtx.createGain();
    gain.gain.value = 0;
    gain.gain.setTargetAtTime(0.06, audioCtx.currentTime, 2.0);

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 300;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    osc.start();

    // Return a handle to stop it
    return {
        stop: () => {
            gain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.5);
            setTimeout(() => osc.stop(), 2000);
        }
    };
}
