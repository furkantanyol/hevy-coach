import axios, { type AxiosInstance } from "axios";

const HEVY_API_BASE = "https://api.hevyapp.com/v1";

// --- Response Types ---

export interface HevySet {
  index: number;
  type: "warmup" | "normal" | "failure" | "dropset";
  weight_kg: number | null;
  reps: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  rpe: number | null;
  custom_metric: number | null;
}

export interface HevyExercise {
  index: number;
  title: string;
  exercise_template_id: string;
  superset_id: number | null;
  notes: string | null;
  sets: HevySet[];
}

export interface HevyWorkout {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  is_private: boolean;
  exercises: HevyExercise[];
  created_at: string;
  updated_at: string;
}

export interface HevyRoutine {
  id: string;
  title: string;
  folder_id: number | null;
  notes: string | null;
  exercises: HevyExercise[];
  created_at: string;
  updated_at: string;
}

export interface HevyExerciseTemplate {
  id: string;
  title: string;
  type: string;
  primary_muscle_group: string;
  secondary_muscle_groups: string[];
  equipment: string;
  is_custom: boolean;
}

export interface HevyWorkoutEvent {
  id: string;
  type: "created" | "updated" | "deleted";
  workout: HevyWorkout | null;
  occurred_at: string;
}

// Flat: one entry per set, newest workout first (verified live 2026-09-09).
export interface HevyExerciseHistoryEntry {
  workout_id: string;
  workout_title: string;
  workout_start_time: string;
  workout_end_time: string;
  exercise_template_id: string;
  weight_kg: number | null;
  reps: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  rpe: number | null;
  custom_metric: number | null;
  set_type: "warmup" | "normal" | "failure" | "dropset";
}

export interface HevyRoutineFolder {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface HevyUserInfo {
  id: string;
  name: string;
  url: string;
}

// --- Input Types ---

export interface RoutineSetInput {
  type?: string;
  weight_kg?: number | null;
  reps?: number | null;
  distance_meters?: number | null;
  duration_seconds?: number | null;
  custom_metric?: number | null;
  rpe?: number | null;
  rep_range?: { start: number; end: number } | null;
}

export interface RoutineExerciseInput {
  exercise_template_id: string;
  superset_id?: number | null;
  rest_seconds?: number | null;
  notes?: string;
  sets: RoutineSetInput[];
}

export interface RoutineInput {
  title: string;
  folder_id?: number;
  notes?: string;
  exercises: RoutineExerciseInput[];
}

export interface RoutineUpdateInput {
  title: string;
  notes?: string;
  exercises: RoutineExerciseInput[];
}

export type CustomExerciseType =
  | "weight_reps"
  | "reps_only"
  | "bodyweight_reps"
  | "bodyweight_assisted_reps"
  | "duration"
  | "weight_duration"
  | "distance_duration"
  | "short_distance_weight";

export type EquipmentCategory =
  | "none"
  | "barbell"
  | "dumbbell"
  | "kettlebell"
  | "machine"
  | "plate"
  | "resistance_band"
  | "suspension"
  | "other";

export type MuscleGroup =
  | "abdominals"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "quadriceps"
  | "hamstrings"
  | "calves"
  | "glutes"
  | "abductors"
  | "adductors"
  | "lats"
  | "upper_back"
  | "traps"
  | "lower_back"
  | "chest"
  | "cardio"
  | "neck"
  | "full_body"
  | "other";

export interface CustomExerciseInput {
  title: string;
  exercise_type: CustomExerciseType;
  equipment_category: EquipmentCategory;
  muscle_group: MuscleGroup;
  other_muscles?: MuscleGroup[];
}

export interface HevyBodyMeasurement {
  date: string;
  weight_kg?: number | null;
  lean_mass_kg?: number | null;
  fat_percent?: number | null;
  neck_cm?: number | null;
  shoulder_cm?: number | null;
  chest_cm?: number | null;
  left_bicep_cm?: number | null;
  right_bicep_cm?: number | null;
  left_forearm_cm?: number | null;
  right_forearm_cm?: number | null;
  abdomen?: number | null;
  waist?: number | null;
  hips?: number | null;
  left_thigh?: number | null;
  right_thigh?: number | null;
  left_calf?: number | null;
  right_calf?: number | null;
}

export type BodyMeasurementUpdateInput = Omit<HevyBodyMeasurement, "date">;

export interface WorkoutSetInput {
  type?: string;
  weight_kg?: number | null;
  reps?: number | null;
  distance_meters?: number | null;
  duration_seconds?: number | null;
  custom_metric?: number | null;
  rpe?: number | null;
}

export interface WorkoutExerciseInput {
  exercise_template_id: string;
  superset_id?: number | null;
  notes?: string;
  sets: WorkoutSetInput[];
}

export interface WorkoutInput {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_private?: boolean;
  exercises: WorkoutExerciseInput[];
}

interface Paginated<T> {
  page_count: number;
  data: T[];
}

// --- Client ---

export class HevyClient {
  private client: AxiosInstance;

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: HEVY_API_BASE,
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  // --- Workouts ---

  async getWorkouts(page = 1, pageSize = 5): Promise<{ workouts: HevyWorkout[]; page_count: number }> {
    const { data } = await this.client.get("/workouts", { params: { page, pageSize } });
    return { workouts: data.workouts ?? [], page_count: data.page_count ?? 1 };
  }

  async getWorkout(workoutId: string): Promise<HevyWorkout | null> {
    const { data } = await this.client.get(`/workouts/${workoutId}`);
    return data.workout ?? null;
  }

  async getWorkoutCount(): Promise<number> {
    const { data } = await this.client.get("/workouts/count");
    return data.workout_count ?? 0;
  }

  async createWorkout(workout: WorkoutInput): Promise<HevyWorkout> {
    const { data } = await this.client.post("/workouts", { workout: this.formatWorkoutBody(workout) });
    return data;
  }

  async updateWorkout(workoutId: string, workout: WorkoutInput): Promise<HevyWorkout> {
    const { data } = await this.client.put(`/workouts/${workoutId}`, { workout: this.formatWorkoutBody(workout) });
    return data;
  }

  async getWorkoutEvents(page = 1, pageSize = 5, since = "1970-01-01T00:00:00Z"): Promise<{ events: HevyWorkoutEvent[]; page_count: number }> {
    const { data } = await this.client.get("/workouts/events", { params: { page, pageSize, since } });
    return { events: data.events ?? [], page_count: data.page_count ?? 1 };
  }

  // --- User ---

  async getUserInfo(): Promise<HevyUserInfo> {
    const { data } = await this.client.get("/user/info");
    return data.data;
  }

  // --- Routines ---

  async getRoutines(page = 1, pageSize = 5): Promise<{ routines: HevyRoutine[]; page_count: number }> {
    const { data } = await this.client.get("/routines", { params: { page, pageSize } });
    return { routines: data.routines ?? [], page_count: data.page_count ?? 1 };
  }

  async getRoutine(routineId: string): Promise<HevyRoutine | null> {
    const { data } = await this.client.get(`/routines/${routineId}`);
    return data.routine ?? null;
  }

  async createRoutine(routine: RoutineInput): Promise<HevyRoutine> {
    const { data } = await this.client.post("/routines", { routine: this.formatRoutineBody(routine) });
    return data.routine;
  }

  async updateRoutine(routineId: string, routine: RoutineUpdateInput): Promise<HevyRoutine> {
    const { data } = await this.client.put(`/routines/${routineId}`, { routine: this.formatRoutinePutBody(routine) });
    return data.routine;
  }

  // --- Exercise Templates ---

  async getExerciseTemplates(page = 1, pageSize = 100): Promise<{ exercise_templates: HevyExerciseTemplate[]; page_count: number }> {
    const { data } = await this.client.get("/exercise_templates", { params: { page, pageSize } });
    return { exercise_templates: data.exercise_templates ?? [], page_count: data.page_count ?? 1 };
  }

  async getExerciseTemplate(templateId: string): Promise<HevyExerciseTemplate | null> {
    const { data } = await this.client.get(`/exercise_templates/${templateId}`);
    return data.exercise_template ?? null;
  }

  async getExerciseHistory(templateId: string, startDate?: string, endDate?: string): Promise<{ exercise_history: HevyExerciseHistoryEntry[] }> {
    const params: Record<string, string> = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const { data } = await this.client.get(`/exercise_history/${templateId}`, { params });
    return { exercise_history: data.exercise_history ?? [] };
  }

  async createExerciseTemplate(template: CustomExerciseInput): Promise<HevyExerciseTemplate> {
    const { data } = await this.client.post("/exercise_templates", {
      exercise: {
        title: template.title,
        exercise_type: template.exercise_type,
        equipment_category: template.equipment_category,
        muscle_group: template.muscle_group,
        other_muscles: template.other_muscles ?? [],
      },
    });
    return data.exercise_template ?? data;
  }

  // --- Routine Folders ---

  async getRoutineFolders(page = 1, pageSize = 5): Promise<{ routine_folders: HevyRoutineFolder[]; page_count: number }> {
    const { data } = await this.client.get("/routine_folders", { params: { page, pageSize } });
    return { routine_folders: data.routine_folders ?? [], page_count: data.page_count ?? 1 };
  }

  async getRoutineFolder(folderId: number): Promise<HevyRoutineFolder | null> {
    const { data } = await this.client.get(`/routine_folders/${folderId}`);
    return data.routine_folder ?? null;
  }

  async createRoutineFolder(title: string): Promise<HevyRoutineFolder> {
    const { data } = await this.client.post("/routine_folders", { routine_folder: { title } });
    return data.routine_folder;
  }

  // --- Body Measurements ---

  async getBodyMeasurements(page = 1, pageSize = 5): Promise<{ body_measurements: HevyBodyMeasurement[]; page_count: number }> {
    const { data } = await this.client.get("/body_measurements", { params: { page, pageSize } });
    return { body_measurements: data.body_measurements ?? [], page_count: data.page_count ?? 1 };
  }

  async getBodyMeasurement(date: string): Promise<HevyBodyMeasurement | null> {
    const { data } = await this.client.get(`/body_measurements/${date}`);
    return data ?? null;
  }

  async createBodyMeasurement(measurement: HevyBodyMeasurement): Promise<void> {
    await this.client.post("/body_measurements", measurement);
  }

  async updateBodyMeasurement(date: string, measurement: BodyMeasurementUpdateInput): Promise<void> {
    await this.client.put(`/body_measurements/${date}`, measurement);
  }

  // --- Private ---

  private formatWorkoutBody(workout: WorkoutInput) {
    return {
      ...workout,
      is_private: workout.is_private ?? false,
      exercises: workout.exercises.map((ex, i) => ({
        ...ex,
        index: i,
        sets: ex.sets.map((s, j) => ({ ...s, index: j, type: s.type ?? "normal" })),
      })),
    };
  }

  private formatRoutineBody(routine: RoutineInput) {
    return {
      title: routine.title,
      folder_id: routine.folder_id ?? null,
      notes: routine.notes ?? null,
      exercises: routine.exercises.map((ex) => ({
        exercise_template_id: ex.exercise_template_id,
        superset_id: ex.superset_id ?? null,
        rest_seconds: ex.rest_seconds ?? null,
        notes: ex.notes ?? null,
        sets: ex.sets.map((s) => ({
          type: s.type ?? "normal",
          weight_kg: s.weight_kg ?? null,
          reps: s.reps ?? null,
          distance_meters: s.distance_meters ?? null,
          duration_seconds: s.duration_seconds ?? null,
          custom_metric: s.custom_metric ?? null,
          ...(s.rep_range ? { rep_range: s.rep_range } : {}),
        })),
      })),
    };
  }

  // PUT /routines/{id} does not accept folder_id (unlike POST).
  private formatRoutinePutBody(routine: RoutineUpdateInput) {
    return {
      title: routine.title,
      notes: routine.notes ?? null,
      exercises: routine.exercises.map((ex) => ({
        exercise_template_id: ex.exercise_template_id,
        superset_id: ex.superset_id ?? null,
        rest_seconds: ex.rest_seconds ?? null,
        notes: ex.notes ?? null,
        sets: ex.sets.map((s) => ({
          type: s.type ?? "normal",
          weight_kg: s.weight_kg ?? null,
          reps: s.reps ?? null,
          distance_meters: s.distance_meters ?? null,
          duration_seconds: s.duration_seconds ?? null,
          custom_metric: s.custom_metric ?? null,
          ...(s.rep_range ? { rep_range: s.rep_range } : {}),
        })),
      })),
    };
  }
}
