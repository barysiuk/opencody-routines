import chokidar from "chokidar";
import { logger } from "./logger.js";

export interface WatcherOptions {
  directory: string;
  debounceMs?: number;
  onChange: () => void | Promise<void>;
}

/**
 * Create a file watcher for routine YAML files with debouncing
 */
export function createWatcher(options: WatcherOptions): chokidar.FSWatcher {
  const { directory, debounceMs = 2000, onChange } = options;

  let timeout: NodeJS.Timeout | null = null;

  const debouncedOnChange = () => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(async () => {
      logger.info("File change detected, reloading...");
      try {
        await onChange();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`Reload failed: ${message}`);
      }
    }, debounceMs);
  };

  const watcher = chokidar.watch(`${directory}/**/*.{yaml,yml}`, {
    ignoreInitial: true,
    persistent: true,
  });

  watcher
    .on("add", (path: string) => {
      logger.debug(`File added: ${path}`);
      debouncedOnChange();
    })
    .on("change", (path: string) => {
      logger.debug(`File changed: ${path}`);
      debouncedOnChange();
    })
    .on("unlink", (path: string) => {
      logger.debug(`File removed: ${path}`);
      debouncedOnChange();
    })
    .on("error", (error: Error) => {
      logger.error(`Watcher error: ${error.message}`);
    });

  return watcher;
}
