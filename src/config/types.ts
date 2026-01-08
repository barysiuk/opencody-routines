import type { z } from "zod";
import type { routineSchema, routineConfigSchema } from "./schema.js";

export type ScheduleTrigger = {
  when: string;
  timezone?: string;
};

export type Triggers = {
  schedule?: ScheduleTrigger;
  // Future trigger types can be added here:
  // file_watch?: FileWatchTrigger;
  // webhook?: WebhookTrigger;
};

export type NewSessionAction = {
  type: "new_session";
  title?: string;
  model?: string;
  agent?: string;
  message: string;
};

export type Action = NewSessionAction;

export type Routine = z.infer<typeof routineSchema>;

export type RoutineConfig = z.infer<typeof routineConfigSchema>;

export interface LoadedRoutine {
  /** Unique identifier derived from filename */
  id: string;
  /** Original file path */
  filePath: string;
  /** Parsed routine configuration */
  config: Routine;
}

export interface RoutineError {
  /** File path that failed to load */
  file: string;
  /** Error message */
  error: string;
}

export interface LoadResult {
  /** Successfully loaded routines */
  routines: LoadedRoutine[];
  /** Errors encountered during loading */
  errors: RoutineError[];
}
