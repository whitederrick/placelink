import { execSync } from "node:child_process";
import { resolve } from "node:path";

const workspaceRoot = resolve(process.cwd(), "../..");

export function seedDatabase() {
  execSync("pnpm --filter @placelink/database db:seed", {
    cwd: workspaceRoot,
    stdio: "inherit",
  });
}
