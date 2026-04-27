import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envFiles = [".env", ".env.local"];
const command = process.argv[2];
const args = process.argv.slice(3);

if (!command) {
  console.error("Usage: node scripts/with-workspace-env.mjs <command> [...args]");
  process.exit(1);
}

for (const envFile of envFiles) {
  loadEnvFile(join(workspaceRoot, envFile));
}

const child = spawn(command, args, {
  cwd: process.cwd(),
  env: process.env,
  shell: true,
  stdio: "inherit"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  }

  process.exit(code ?? 1);
});

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf("=");

    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}
