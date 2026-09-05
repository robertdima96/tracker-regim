// Based on docs/blueprint/07_DATA_MODEL.md §5, including the fixes made
// during the blueprint upgrade pass (the `relation` column on
// `constraints`, and the six tables added beyond the original four).
//
// Deviation from that doc: `event_templates` gains `preferred_earliest`,
// `preferred_latest`, and `fixed_local_time`. The blueprint's schema had
// nowhere to persist an anchor's own preferred window (meal/wake/sleep)
// or a medication's plain fixed time — both are required inputs to
// `EventTemplate` in src/domain/types.ts and the scheduler can't seed
// anchors without them. Worth folding back into the blueprint doc later.
export const SCHEMA_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS treatment_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT,
    status TEXT NOT NULL,
    timezone_policy TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS medications (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    strength_value REAL,
    strength_unit TEXT,
    form TEXT,
    notes TEXT,
    active_from TEXT NOT NULL,
    active_until TEXT,
    FOREIGN KEY(plan_id) REFERENCES treatment_plans(id)
  )`,
  `CREATE TABLE IF NOT EXISTS event_templates (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    medication_id TEXT,
    kind TEXT NOT NULL,
    label TEXT NOT NULL,
    recurrence_json TEXT NOT NULL,
    preferred_earliest TEXT,
    preferred_latest TEXT,
    fixed_local_time TEXT,
    active_from TEXT NOT NULL,
    active_until TEXT,
    FOREIGN KEY(plan_id) REFERENCES treatment_plans(id),
    FOREIGN KEY(medication_id) REFERENCES medications(id)
  )`,
  `CREATE TABLE IF NOT EXISTS constraints (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    source_template_id TEXT NOT NULL,
    target_template_id TEXT NOT NULL,
    relation TEXT NOT NULL,
    min_offset_minutes INTEGER,
    max_offset_minutes INTEGER,
    fixed_local_time TEXT,
    hardness TEXT NOT NULL,
    source_type TEXT NOT NULL,
    note TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(plan_id) REFERENCES treatment_plans(id),
    FOREIGN KEY(source_template_id) REFERENCES event_templates(id),
    FOREIGN KEY(target_template_id) REFERENCES event_templates(id)
  )`,
  `CREATE TABLE IF NOT EXISTS user_profiles (
    id TEXT PRIMARY KEY,
    locale TEXT NOT NULL,
    timezone TEXT NOT NULL,
    week_start TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS instruction_sets (
    id TEXT PRIMARY KEY,
    medication_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_label TEXT,
    notes TEXT,
    confirmed_at TEXT NOT NULL,
    FOREIGN KEY(medication_id) REFERENCES medications(id)
  )`,
  `CREATE TABLE IF NOT EXISTS schedule_revisions (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    local_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    reason TEXT NOT NULL,
    trigger_event_id TEXT,
    engine_version TEXT NOT NULL,
    FOREIGN KEY(plan_id) REFERENCES treatment_plans(id)
  )`,
  `CREATE TABLE IF NOT EXISTS daily_events (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    local_date TEXT NOT NULL,
    planned_earliest TEXT NOT NULL,
    planned_latest TEXT NOT NULL,
    current_earliest TEXT NOT NULL,
    current_latest TEXT NOT NULL,
    status TEXT NOT NULL,
    revision_id TEXT NOT NULL,
    FOREIGN KEY(template_id) REFERENCES event_templates(id),
    FOREIGN KEY(revision_id) REFERENCES schedule_revisions(id)
  )`,
  `CREATE TABLE IF NOT EXISTS administration_records (
    id TEXT PRIMARY KEY,
    daily_event_id TEXT NOT NULL,
    action TEXT NOT NULL,
    actual_at TEXT,
    recorded_at TEXT NOT NULL,
    source TEXT NOT NULL,
    note TEXT,
    FOREIGN KEY(daily_event_id) REFERENCES daily_events(id)
  )`,
  `CREATE TABLE IF NOT EXISTS notification_records (
    id TEXT PRIMARY KEY,
    daily_event_id TEXT NOT NULL,
    platform_notification_id TEXT NOT NULL,
    scheduled_at TEXT NOT NULL,
    fire_at TEXT NOT NULL,
    state TEXT NOT NULL,
    schedule_revision_id TEXT NOT NULL,
    FOREIGN KEY(daily_event_id) REFERENCES daily_events(id),
    FOREIGN KEY(schedule_revision_id) REFERENCES schedule_revisions(id)
  )`,
]
