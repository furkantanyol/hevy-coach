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

export interface HevyExerciseHistoryEntry {
  workout_id: string;
  start_time: string;
  exercise_template_id: string;
  sets: Array<{
    type: string;
    weight_kg: number | null;
    reps: number | null;
    rpe: number | null;
    distance_meters: number | null;
    duration_seconds: number | null;
  }>;
}

export interface HevyRoutineFolder {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

// --- Input Types ---

export interface RoutineSetInput {
  type?: string;
  weight_kg?: number | null;
  reps?: number | null;
  distance_meters?: number | null;
  duration_seconds?: number | null;
  rpe?: number | null;
}

export interface RoutineExerciseInput {
  exercise_template_id: string;
  superset_id?: number | null;
  notes?: string;
  sets: RoutineSetInput[];
}

export interface RoutineInput {
  title: string;
  folder_id?: number;
  notes?: string;
  exercises: RoutineExerciseInput[];
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

  async getWorkoutEvents(page = 1, pageSize = 5, since = "1970-01-01T00:00:00Z"): Promise<{ events: HevyWorkoutEvent[]; page_count: number }> {
    const { data } = await this.client.get("/workouts/events", { params: { page, pageSize, since } });
    return { events: data.events ?? [], page_count: data.page_count ?? 1 };
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

  async updateRoutine(routineId: string, routine: RoutineInput): Promise<HevyRoutine> {
    const { data } = await this.client.put(`/routines/${routineId}`, { routine: this.formatRoutineBody(routine) });
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

  async getExerciseHistory(templateId: string, page = 1, pageSize = 5): Promise<{ exercise_history: HevyExerciseHistoryEntry[]; page_count: number }> {
    const { data } = await this.client.get(`/exercise_templates/${templateId}/history`, { params: { page, pageSize } });
    return { exercise_history: data.exercise_history ?? [], page_count: data.page_count ?? 1 };
  }

  async createExerciseTemplate(template: {
    title: string;
    type: string;
    primary_muscle_group: string;
    secondary_muscle_groups?: string[];
    equipment?: string;
  }): Promise<HevyExerciseTemplate> {
    const { data } = await this.client.post("/exercise_templates", { exercise_template: template });
    return data.exercise_template;
  }

  // --- Routine Folders ---

  async getRoutineFolders(page = 1, pageSize = 5): Promise<{ routine_folders: HevyRoutineFolder[]; page_count: number }> {
    const { data } = await this.client.get("/routine_folders", { params: { page, pageSize } });
    return { routine_folders: data.routine_folders ?? [], page_count: data.page_count ?? 1 };
  }

  async createRoutineFolder(title: string): Promise<HevyRoutineFolder> {
    const { data } = await this.client.post("/routine_folders", { routine_folder: { title } });
    return data.routine_folder;
  }

  // --- Private ---

  private formatRoutineBody(routine: RoutineInput) {
    return {
      ...routine,
      exercises: routine.exercises.map((ex, i) => ({
        ...ex,
        index: i,
        sets: ex.sets.map((s, j) => ({ ...s, index: j, type: s.type ?? "normal" })),
      })),
    };
  }
}
