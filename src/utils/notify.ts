import { spawn } from "node:child_process";
import { logger } from "./logger.js";

export interface NotifyOptions {
  title: string;
  body: string;
  deeplink?: string;
}

/**
 * Send a push notification via opencody-relay
 * Returns true if successful, false otherwise
 */
export async function sendNotification(options: NotifyOptions): Promise<boolean> {
  const { title, body, deeplink } = options;

  const args = ["notify", title, body];
  if (deeplink) {
    args.push("--deeplink", deeplink);
  }

  return new Promise((resolve) => {
    const proc = spawn("opencody-relay", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stderr = "";

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("error", (error) => {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        logger.error("Notification failed: opencody-relay command not found");
      } else {
        logger.error(`Notification failed: ${error.message}`);
      }
      resolve(false);
    });

    proc.on("close", (code) => {
      if (code === 0) {
        logger.info("Notification sent successfully");
        resolve(true);
      } else {
        logger.error(`Notification failed: opencody-relay exited with code ${code}`);
        if (stderr) {
          logger.error(`  ${stderr.trim()}`);
        }
        resolve(false);
      }
    });
  });
}
