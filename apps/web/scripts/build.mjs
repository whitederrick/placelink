import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = resolve(webRoot, "../..");

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: "inherit",
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (process.env.VERCEL_ENV === "production") {
  run(
    process.execPath,
    [
      join(workspaceRoot, "packages/database/node_modules/prisma/build/index.js"),
      "migrate",
      "deploy",
      "--config",
      join(workspaceRoot, "packages/database/prisma.config.ts"),
    ],
    workspaceRoot,
  );
}

run(
  process.execPath,
  [join(webRoot, "node_modules/next/dist/bin/next"), "build"],
  webRoot,
);
