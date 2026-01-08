#!/usr/bin/env node

import { Command } from "commander";
import { resolve } from "node:path";
import { startDaemon, listRoutines, validateRoutines, runRoutine } from "./daemon.js";

const program = new Command();

program
  .name("opencody-routines")
  .description("Automation engine for OpenCode - schedule routines to run sessions automatically")
  .version("0.0.1");

program
  .command("start")
  .description("Start the routines daemon")
  .requiredOption("-r, --routines <path>", "Path to routines directory")
  .option("-s, --server <url>", "OpenCode server URL", "http://localhost:4096")
  .option("-w, --watch", "Watch routines directory for changes", false)
  .action(async (options) => {
    await startDaemon({
      routinesDir: resolve(options.routines),
      serverUrl: options.server,
      watch: options.watch,
    });
  });

program
  .command("list")
  .description("List all routines and their schedules")
  .requiredOption("-r, --routines <path>", "Path to routines directory")
  .action(async (options) => {
    await listRoutines(resolve(options.routines));
  });

program
  .command("validate")
  .description("Validate all routine files")
  .requiredOption("-r, --routines <path>", "Path to routines directory")
  .action(async (options) => {
    const valid = await validateRoutines(resolve(options.routines));
    process.exit(valid ? 0 : 1);
  });

program
  .command("run <name>")
  .description("Run a specific routine immediately")
  .requiredOption("-r, --routines <path>", "Path to routines directory")
  .option("-s, --server <url>", "OpenCode server URL", "http://localhost:4096")
  .option("--dry-run", "Show what would be sent without executing", false)
  .action(async (name, options) => {
    await runRoutine(
      resolve(options.routines),
      options.server,
      name,
      options.dryRun
    );
  });

program.parse();
