import { parentPort, workerData } from "node:worker_threads";
import { OpenCodeClient } from "../client/opencode.js";
import { processTemplates } from "../utils/templates.js";
import { sendNotification } from "../utils/notify.js";
import type { NotifyConfig } from "../config/types.js";

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
      notify?: NotifyConfig;
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

      const result = await client.createSessionWithMessage({
        title,
        model: routine.action.model,
        agent: routine.action.agent,
        message,
      });

      log(`Routine ${routine.name} completed successfully`);

      // Send notification if configured
      if (routine.action.notify) {
        const extraContext = {
          session_id: result.sessionId,
          routine_name: routine.name,
        };

        const notifyTitle = processTemplates(
          routine.action.notify.title,
          routine.timezone,
          extraContext
        );
        const notifyBody = processTemplates(
          routine.action.notify.body,
          routine.timezone,
          extraContext
        );
        const notifyDeeplink = routine.action.notify.deeplink
          ? processTemplates(routine.action.notify.deeplink, routine.timezone, extraContext)
          : undefined;

        const success = await sendNotification({
          title: notifyTitle,
          body: notifyBody,
          deeplink: notifyDeeplink,
        });

        if (success) {
          log(`Notification sent for routine ${routine.name}`);
        } else {
          logError(`Failed to send notification for routine ${routine.name}`);
        }
      }
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
