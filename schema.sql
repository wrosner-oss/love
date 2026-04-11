CREATE TABLE IF NOT EXISTS adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person TEXT NOT NULL CHECK(person IN ('wes', 'amelia')),
    vessel TEXT NOT NULL,
    level INTEGER NOT NULL CHECK(level BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_adjustments_person_vessel ON adjustments(person, vessel, created_at DESC);
