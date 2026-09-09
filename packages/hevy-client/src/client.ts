import { HevyApiError } from "./errors.js";
import { type HevyClientOptions, Http } from "./http.js";
import { fetchAll, MAX_PAGE_SIZE, MAX_TEMPLATE_PAGE_SIZE, type Page } from "./pagination.js";
import { mergeEvents, type WorkoutChanges } from "./sync.js";
import type {
  BodyMeasurement,
  BodyMeasurementInput,
  CreateExerciseTemplateInput,
  CreateRoutineInput,
  ExerciseHistoryEntry,
  ExerciseTemplate,
  PageParams,
  Routine,
  RoutineFolder,
  UpdateBodyMeasurementInput,
  UpdateRoutineInput,
  UserInfo,
  WebhookSubscription,
  WebhookSubscriptionInput,
  Workout,
  WorkoutEvent,
  WorkoutInput,
} from "./types.js";

const EPOCH = "1970-01-01T00:00:00Z";

type Listed<K extends string, T> = { page: number; page_count: number } & Record<K, T[]>;

export type HevyClient = ReturnType<typeof createHevyClient>;

export function createHevyClient(options: HevyClientOptions) {
  const http = new Http(options);
  const get = <T>(path: string, query?: Record<string, string | number | undefined>) =>
    http.request<T>({ method: "GET", path, query });

  const listAll = <K extends string, T>(
    path: string,
    key: K,
    pageSize: number,
    query: Record<string, string | number | undefined> = {},
  ) =>
    fetchAll<T>(async (page): Promise<Page<T>> => {
      const result = await get<Listed<K, T>>(path, { ...query, page, pageSize });
      return { page: result.page, page_count: result.page_count, items: result[key] };
    });

  return {
    user: {
      info: () => get<{ data: UserInfo }>("/user/info").then((r) => r.data),
    },

    workouts: {
      list: (params: PageParams = {}) => get<Listed<"workouts", Workout>>("/workouts", params),
      listAll: () => listAll<"workouts", Workout>("/workouts", "workouts", MAX_PAGE_SIZE),
      get: (workoutId: string) => get<Workout>(`/workouts/${workoutId}`),
      count: () => get<{ workout_count: number }>("/workouts/count").then((r) => r.workout_count),
      create: (workout: WorkoutInput) =>
        http.request<Workout>({ method: "POST", path: "/workouts", body: { workout } }),
      update: (workoutId: string, workout: WorkoutInput) =>
        http.request<Workout>({ method: "PUT", path: `/workouts/${workoutId}`, body: { workout } }),
      /** Raw events page. Use `changes()` for a merged delta. */
      events: (params: PageParams & { since?: string } = {}) =>
        get<Listed<"events", WorkoutEvent>>("/workouts/events", {
          since: params.since ?? EPOCH,
          page: params.page,
          pageSize: params.pageSize,
        }),
      /** Everything changed since `since` (ISO 8601), split into upserts and deletes. Omit `since` for a full sync. */
      changes: async (since?: string): Promise<WorkoutChanges> => {
        const events = await listAll<"events", WorkoutEvent>(
          "/workouts/events",
          "events",
          MAX_PAGE_SIZE,
          {
            since: since ?? EPOCH,
          },
        );
        return mergeEvents(events);
      },
    },

    routines: {
      list: (params: PageParams = {}) => get<Listed<"routines", Routine>>("/routines", params),
      listAll: () => listAll<"routines", Routine>("/routines", "routines", MAX_PAGE_SIZE),
      get: (routineId: string) =>
        get<{ routine: Routine }>(`/routines/${routineId}`).then((r) => r.routine),
      create: (routine: CreateRoutineInput) =>
        http
          .request<Routine | { routine: Routine }>({
            method: "POST",
            path: "/routines",
            body: { routine },
          })
          .then(unwrapRoutine),
      update: (routineId: string, routine: UpdateRoutineInput) =>
        http
          .request<Routine | { routine: Routine }>({
            method: "PUT",
            path: `/routines/${routineId}`,
            body: { routine },
          })
          .then(unwrapRoutine),
    },

    routineFolders: {
      list: (params: PageParams = {}) =>
        get<Listed<"routine_folders", RoutineFolder>>("/routine_folders", params),
      listAll: () =>
        listAll<"routine_folders", RoutineFolder>(
          "/routine_folders",
          "routine_folders",
          MAX_PAGE_SIZE,
        ),
      get: (folderId: number) => get<RoutineFolder>(`/routine_folders/${folderId}`),
      /** New folders are inserted at index 0. */
      create: (title: string) =>
        http.request<RoutineFolder>({
          method: "POST",
          path: "/routine_folders",
          body: { routine_folder: { title } },
        }),
    },

    exerciseTemplates: {
      list: (params: PageParams = {}) =>
        get<Listed<"exercise_templates", ExerciseTemplate>>("/exercise_templates", params),
      listAll: () =>
        listAll<"exercise_templates", ExerciseTemplate>(
          "/exercise_templates",
          "exercise_templates",
          MAX_TEMPLATE_PAGE_SIZE,
        ),
      get: (exerciseTemplateId: string) =>
        get<ExerciseTemplate>(`/exercise_templates/${exerciseTemplateId}`),
      create: (exercise: CreateExerciseTemplateInput) =>
        http.request<{ id: number }>({
          method: "POST",
          path: "/exercise_templates",
          body: { exercise },
        }),
    },

    exerciseHistory: {
      /** Flat, one entry per set, newest workout first. Dates accept YYYY-MM-DD or full ISO 8601. */
      get: (exerciseTemplateId: string, range: { startDate?: string; endDate?: string } = {}) =>
        get<{ exercise_history: ExerciseHistoryEntry[] }>(
          `/exercise_history/${exerciseTemplateId}`,
          {
            start_date: range.startDate,
            end_date: range.endDate,
          },
        ).then((r) => r.exercise_history),
    },

    bodyMeasurements: {
      list: (params: PageParams = {}) =>
        get<Listed<"body_measurements", BodyMeasurement>>("/body_measurements", params),
      listAll: () =>
        listAll<"body_measurements", BodyMeasurement>(
          "/body_measurements",
          "body_measurements",
          MAX_PAGE_SIZE,
        ),
      get: (date: string) => get<BodyMeasurement>(`/body_measurements/${date}`),
      /** 409 when a measurement already exists for that date. */
      create: (measurement: BodyMeasurementInput) =>
        http.request<void>({ method: "POST", path: "/body_measurements", body: measurement }),
      /** Overwrites every field; omitted fields are cleared. */
      update: (date: string, measurement: UpdateBodyMeasurementInput) =>
        http.request<void>({
          method: "PUT",
          path: `/body_measurements/${date}`,
          body: measurement,
        }),
      /** Create, or overwrite on 409. Safe to call repeatedly. */
      upsert: async ({ date, ...fields }: BodyMeasurementInput) => {
        try {
          await http.request<void>({
            method: "POST",
            path: "/body_measurements",
            body: { date, ...fields },
          });
        } catch (error) {
          if (!(error instanceof HevyApiError) || !error.isConflict) throw error;
          await http.request<void>({
            method: "PUT",
            path: `/body_measurements/${date}`,
            body: fields,
          });
        }
      },
    },

    /** Undocumented endpoint, verified live 2026-09-09. One subscription per API key; `set` replaces it. */
    webhook: {
      get: () => get<WebhookSubscription>("/webhook-subscription"),
      set: (input: WebhookSubscriptionInput) =>
        http.request<void>({ method: "POST", path: "/webhook-subscription", body: input }),
      delete: () => http.request<void>({ method: "DELETE", path: "/webhook-subscription" }),
    },
  };
}

// GET /routines/{id} wraps as {routine}; the spec says POST/PUT return a bare Routine. Accept both.
function unwrapRoutine(result: Routine | { routine: Routine }): Routine {
  return "routine" in result ? result.routine : result;
}
