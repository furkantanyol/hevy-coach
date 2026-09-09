import type { DeletedWorkoutEvent, Workout, WorkoutEvent } from "./types.js";

export interface WorkoutChanges {
  /** Workouts created or updated since the cursor, newest first. Deduplicated by id. */
  upserts: Workout[];
  /** Workouts deleted since the cursor. A workout deleted after an update appears only here. */
  deletes: DeletedWorkoutEvent[];
  /** Newest event timestamp seen. Pass it back as `since` on the next call. Undefined when no events. */
  cursor: string | undefined;
}

/**
 * Folds an events list (newest first, as Hevy returns it) into upserts and deletes.
 * The first event seen per workout id wins, so the latest state is kept.
 */
export function mergeEvents(events: WorkoutEvent[]): WorkoutChanges {
  const seen = new Set<string>();
  const changes: WorkoutChanges = { upserts: [], deletes: [], cursor: undefined };

  for (const event of events) {
    const id = event.type === "deleted" ? event.id : event.workout.id;
    const occurredAt = event.type === "deleted" ? event.deleted_at : event.workout.updated_at;
    if (occurredAt && (!changes.cursor || occurredAt > changes.cursor)) changes.cursor = occurredAt;
    if (id === undefined || seen.has(id)) continue;
    seen.add(id);
    if (event.type === "deleted") changes.deletes.push(event);
    else changes.upserts.push(event.workout);
  }
  return changes;
}
