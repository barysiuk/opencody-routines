import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { glob } from "glob";
import { parse as parseYaml } from "yaml";
import { validateRoutine } from "./schema.js";
import type { LoadedRoutine, RoutineError, LoadResult } from "./types.js";

interface LoadFileResult {
  routine: LoadedRoutine | null;
  error: RoutineError | null;
}

/**
 * Load a single routine from a YAML file
 * Returns either the loaded routine or an error (never both)
 */
export function loadRoutineFromFile(filePath: string): LoadFileResult {
  try {
    const content = readFileSync(filePath, "utf-8");
    const parsed = parseYaml(content);
    const validation = validateRoutine(parsed);

    if (!validation.success) {
      const errorMessages = validation.error!.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");
      return {
        routine: null,
        error: { file: basename(filePath), error: errorMessages },
      };
    }

    // Generate ID from filename (without extension)
    const id = basename(filePath).replace(/\.ya?ml$/i, "");

    return {
      routine: {
        id,
        filePath,
        config: validation.data!,
      },
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      routine: null,
      error: { file: basename(filePath), error: message },
    };
  }
}

/**
 * Load all routines from a directory
 * Returns both successfully loaded routines and any errors encountered
 */
export async function loadRoutinesFromDirectory(
  directory: string
): Promise<LoadResult> {
  const pattern = `${directory}/**/*.{yaml,yml}`;
  const files = await glob(pattern);

  const routines: LoadedRoutine[] = [];
  const errors: RoutineError[] = [];

  for (const file of files) {
    const result = loadRoutineFromFile(file);

    if (result.error) {
      errors.push(result.error);
      continue;
    }

    if (result.routine) {
      if (result.routine.config.enabled) {
        routines.push(result.routine);
      }
      // Disabled routines are silently skipped (not an error)
    }
  }

  return { routines, errors };
}
