import Bree from "bree";
import { loadRoutinesFromDirectory } from "./config/loader.js";
import { createScheduler } from "./scheduler.js";
import { OpenCodeClient } from "./client/opencode.js";
import { processTemplates } from "./utils/templates.js";
import { logger } from "./utils/logger.js";
import { createWatcher } from "./utils/watcher.js";
import type { LoadedRoutine } from "./config/types.js";

export interface DaemonOptions {
  routinesDir: string;
  serverUrl: string;
  watch?: boolean;
}

/**
 * Log the summary of loaded routines
 */
function logRoutinesSummary(routines: LoadedRoutine[]): void {
  if (routines.length === 0) {
    logger.warn("No routines to schedule");
    return;
  }

  logger.info("Scheduled routines:");
  for (const r of routines) {
    const schedule = r.config.triggers.schedule?.when || "no schedule";
    logger.info(`  - ${r.id} (${schedule})`);
  }
}

/**
 * Start the daemon
 */
export async function startDaemon(options: DaemonOptions): Promise<void> {
  logger.info("Starting OpenCody Routines daemon...");
  logger.info(`Routines directory: ${options.routinesDir}`);
  logger.info(`OpenCode server: ${options.serverUrl}`);

  // Check server health
  const client = new OpenCodeClient(options.serverUrl);
  try {
    const health = await client.health();
    if (health.healthy) {
      logger.info(`Connected to OpenCode server (version ${health.version})`);
    } else {
      logger.error("OpenCode server is not healthy");
      process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Failed to connect to OpenCode server: ${message}`);
    process.exit(1);
  }

  // Track current scheduler for reload
  let scheduler: Bree | null = null;

  /**
   * Load routines and (re)start scheduler
   */
  const reload = async () => {
    // Stop existing scheduler if running
    if (scheduler) {
      logger.info("Stopping current scheduler...");
      await scheduler.stop();
      scheduler = null;
    }

    // Load routines
    const { routines, errors } = await loadRoutinesFromDirectory(options.routinesDir);

    // Log summary
    const invalidCount = errors.length;
    const validCount = routines.length;
    logger.info(
      `Loaded ${validCount} routine(s)${invalidCount > 0 ? `, ${invalidCount} invalid` : ""}`
    );

    // Log errors
    for (const { file, error } of errors) {
      logger.error(`${file}: ${error}`);
    }

    // Log scheduled routines
    logRoutinesSummary(routines);

    // Create and start new scheduler
    if (routines.length > 0) {
      scheduler = createScheduler({
        serverUrl: options.serverUrl,
        routines,
      });
      await scheduler.start();
      logger.info("Scheduler started");
    }
  };

  // Initial load
  await reload();

  // Watch mode
  if (options.watch) {
    logger.info(`Watching ${options.routinesDir} for changes...`);
    createWatcher({
      directory: options.routinesDir,
      debounceMs: 2000,
      onChange: reload,
    });
  }

  // Handle shutdown
  const shutdown = async () => {
    logger.info("Shutting down...");
    if (scheduler) {
      await scheduler.stop();
    }
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Keep the process running
  logger.info("Daemon is running. Press Ctrl+C to stop.");
}

/**
 * List all routines and their schedules
 */
export async function listRoutines(routinesDir: string): Promise<void> {
  const { routines, errors } = await loadRoutinesFromDirectory(routinesDir);

  if (routines.length === 0 && errors.length === 0) {
    console.log("No routines found.");
    return;
  }

  console.log("\nLoaded Routines:");
  console.log("================\n");

  for (const routine of routines) {
    const schedule = routine.config.triggers.schedule;
    console.log(`  ${routine.config.name}`);
    console.log(`    ID: ${routine.id}`);
    console.log(`    File: ${routine.filePath}`);
    console.log(`    Enabled: ${routine.config.enabled}`);
    if (schedule) {
      console.log(`    Schedule: ${schedule.when}`);
      if (schedule.timezone) {
        console.log(`    Timezone: ${schedule.timezone}`);
      }
    }
    console.log(`    Action: ${routine.config.action.type}`);
    if (routine.config.description) {
      console.log(`    Description: ${routine.config.description}`);
    }
    console.log();
  }

  if (errors.length > 0) {
    console.log("\nInvalid Routines:");
    console.log("=================\n");
    for (const { file, error } of errors) {
      console.log(`  ${file}: ${error}`);
    }
    console.log();
  }
}

/**
 * Validate all routines in a directory
 */
export async function validateRoutines(routinesDir: string): Promise<boolean> {
  logger.info(`Validating routines in ${routinesDir}...`);

  const { routines, errors } = await loadRoutinesFromDirectory(routinesDir);

  // Log errors
  for (const { file, error } of errors) {
    logger.error(`${file}: ${error}`);
  }

  if (routines.length === 0 && errors.length === 0) {
    logger.warn("No routine files found");
    return false;
  }

  if (errors.length > 0) {
    logger.error(`Validation failed: ${errors.length} invalid routine(s)`);
    return false;
  }

  logger.info(`Validation complete: ${routines.length} valid routine(s)`);
  return true;
}

/**
 * Run a specific routine immediately
 */
export async function runRoutine(
  routinesDir: string,
  serverUrl: string,
  routineName: string,
  dryRun: boolean = false
): Promise<void> {
  const { routines, errors } = await loadRoutinesFromDirectory(routinesDir);

  // Log any errors encountered during loading
  for (const { file, error } of errors) {
    logger.warn(`Skipped ${file}: ${error}`);
  }

  const routine = routines.find(
    (r) => r.id === routineName || r.config.name === routineName
  );

  if (!routine) {
    logger.error(`Routine not found: ${routineName}`);
    logger.info("Available routines:");
    for (const r of routines) {
      logger.info(`  - ${r.id} (${r.config.name})`);
    }
    process.exit(1);
  }

  logger.info(`Running routine: ${routine.config.name}`);

  const action = routine.config.action;
  const timezone = routine.config.triggers.schedule?.timezone;

  if (action.type === "new_session") {
    const message = processTemplates(action.message, timezone);
    const title = action.title ? processTemplates(action.title, timezone) : undefined;

    if (dryRun) {
      console.log("\n[DRY RUN] Would create session with:\n");
      console.log(`  Title: ${title || "(none)"}`);
      console.log(`  Model: ${action.model || "(default)"}`);
      console.log(`  Agent: ${action.agent || "(default)"}`);
      console.log(`  Message:\n`);
      console.log(message.split("\n").map((line) => `    ${line}`).join("\n"));
      console.log();
      return;
    }

    const client = new OpenCodeClient(serverUrl);

    try {
      await client.createSessionWithMessage({
        title,
        model: action.model,
        agent: action.agent,
        message,
      });
      logger.info("Routine completed successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Routine failed: ${errorMessage}`);
      process.exit(1);
    }
  }
}
