import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const DEPLOY_COMMAND =
  process.env.DEPLOY_COMMAND ?? "echo 'Set DEPLOY_COMMAND in .env'";
const DEPLOY_CWD = process.env.DEPLOY_CWD ?? process.cwd();
const DEPLOY_TIMEOUT_MS = Number(process.env.DEPLOY_TIMEOUT_MS ?? 120000);

/**
 * Runs the configured deploy command and returns combined stdout/stderr.
 * Throws if the command exits with a non-zero code or times out.
 */
export async function runDeploy(): Promise<string> {
  const { stdout, stderr } = await execAsync(DEPLOY_COMMAND, {
    cwd: DEPLOY_CWD,
    timeout: DEPLOY_TIMEOUT_MS,
    maxBuffer: 10 * 1024 * 1024, // 10 MB of output
  });

  return [stdout, stderr].filter(Boolean).join("\n").trim() || "(no output)";
}
