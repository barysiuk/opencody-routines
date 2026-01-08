import Bree, { type JobOptions } from "bree";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { LoadedRoutine } from "./config/types.js";
import { logger } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface SchedulerOptions {
  serverUrl: string;
  routines: LoadedRoutine[];
}

/**
 * Create and configure the Bree scheduler
 */
export function createScheduler(options: SchedulerOptions): Bree {
  const jobs: JobOptions[] = options.routines
    .filter((routine) => routine.config.triggers.schedule)
    .map((routine) => {
      const schedule = routine.config.triggers.schedule!;
      
      // Determine if `when` is a cron expression or human-readable
      // Bree accepts both via the `cron` or `interval` properties
      // For simplicity, we'll use `interval` for human-readable text
      // and detect cron patterns
      const isCron = /^[\d*,\-\/\s]+$/.test(schedule.when.trim());

      const job: JobOptions = {
        name: routine.id,
        // Path to the worker script
        path: join(__dirname, "jobs", "execute-routine.js"),
        // Pass routine data to the worker
        worker: {
          workerData: {
            routine: {
              id: routine.id,
              name: routine.config.name,
              action: routine.config.action,
              timezone: schedule.timezone,
            },
            serverUrl: options.serverUrl,
          },
        },
      };

      if (isCron) {
        job.cron = schedule.when;
      } else {
        // Human-readable schedule (later.js text parser)
        job.interval = schedule.when;
      }

      if (schedule.timezone) {
        job.timezone = schedule.timezone;
      }

      return job;
    });

  const bree = new Bree({
    jobs,
    root: false, // We're providing full paths
    defaultExtension: "js",
    errorHandler: (error, workerMetadata) => {
      logger.error(`Job ${workerMetadata.name} failed: ${error.message}`);
    },
    workerMessageHandler: (message, workerMetadata) => {
      if (typeof message === "object" && message !== null) {
        const msg = message as { type?: string; message?: string };
        if (msg.type === "log") {
          logger.info(`[${workerMetadata.name}] ${msg.message}`);
        } else if (msg.type === "error") {
          logger.error(`[${workerMetadata.name}] ${msg.message}`);
        }
      }
    },
  });

  return bree;
}

/**
 * Get next run times for all scheduled jobs
 */
export function getNextRunTimes(bree: Bree): Map<string, Date | null> {
  const times = new Map<string, Date | null>();
  
  // Bree doesn't expose next run times directly in a simple way
  // We'll need to compute them from the job configurations
  // For now, return empty map - could be enhanced later
  
  return times;
}
