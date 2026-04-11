let currentState = { wes: {}, amelia: {} };
let currentPerson = null;
let adjustmentListeners = [];

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
    const oldLevel = currentState[currentPerson]?.[vessel] || 0;
    await fetch('/api/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ person: currentPerson, vessel, level }),
    });
    currentState[currentPerson][vessel] = level;

    // Emit adjustment event
    const magnitude = Math.abs(level - oldLevel);
    const event = { person: currentPerson, vessel, oldLevel, newLevel: level, magnitude };
    for (const fn of adjustmentListeners) fn(event);
}

export function onAdjustment(callback) {
    adjustmentListeners.push(callback);
}

export async function fetchHistory(vessel) {
    const resp = await fetch(`/api/history/${vessel}`);
    return resp.json();
}
