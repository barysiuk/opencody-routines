import { format } from "date-fns";

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_COLORS = {
  debug: "\x1b[90m", // gray
  info: "\x1b[36m", // cyan
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
  reset: "\x1b[0m",
};

function formatTimestamp(): string {
  return format(new Date(), "yyyy-MM-dd HH:mm:ss");
}

function log(level: LogLevel, message: string): void {
  const timestamp = formatTimestamp();
  const levelUpper = level.toUpperCase().padEnd(5);
  const color = LOG_COLORS[level];
  const reset = LOG_COLORS.reset;

  console.log(`${color}[${timestamp}] ${levelUpper}${reset} ${message}`);
}

export const logger = {
  debug: (message: string) => log("debug", message),
  info: (message: string) => log("info", message),
  warn: (message: string) => log("warn", message),
  error: (message: string) => log("error", message),
};
