import { parentPort, workerData } from "node:worker_threads";
import { OpenCodeClient } from "../client/opencode.js";
import { processTemplates } from "../utils/templates.js";

interface WorkerData {
  routine: {
    id: string;
    name: string;
    action: {
      type: "new_session";
      title?: string;
      model?: string;
      agent?: string;
      message: string;
    };
    timezone?: string;
  };
  serverUrl: string;
}

function log(message: string): void {
  parentPort?.postMessage({ type: "log", message });
}

function logError(message: string): void {
  parentPort?.postMessage({ type: "error", message });
}

async function executeRoutine(): Promise<void> {
  const data = workerData as WorkerData;
  const { routine, serverUrl } = data;

  log(`Executing routine: ${routine.name}`);

  try {
    const client = new OpenCodeClient(serverUrl);

    if (routine.action.type === "new_session") {
      // Process template variables in message and title
      const message = processTemplates(routine.action.message, routine.timezone);
      const title = routine.action.title
        ? processTemplates(routine.action.title, routine.timezone)
        : undefined;

      await client.createSessionWithMessage({
        title,
        model: routine.action.model,
        agent: routine.action.agent,
        message,
      });

      log(`Routine ${routine.name} completed successfully`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError(`Routine ${routine.name} failed: ${errorMessage}`);
  }
}

// Execute the routine
executeRoutine()
  .then(() => {
    // Signal completion
    if (parentPort) {
      parentPort.postMessage("done");
    }
    process.exit(0);
  })
  .catch((error) => {
    logError(`Unexpected error: ${error.message}`);
    process.exit(1);
  });
