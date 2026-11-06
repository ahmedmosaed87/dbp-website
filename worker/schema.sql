-- WHAT THIS DOES: The one table that holds COACTA early-access requests: who asked, their company and stage, what
-- they want first, and when they agreed to be contacted. One row per email address.
CREATE TABLE IF NOT EXISTS requests (
  email      TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  company    TEXT NOT NULL,
  role       TEXT,
  stage      TEXT,
  country    TEXT,
  wants      TEXT,
  note       TEXT,
  lang       TEXT,
  consent_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
