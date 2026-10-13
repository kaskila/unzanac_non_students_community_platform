import { execSync } from "node:child_process";
import { assertTestDatabase, e2eEnv, E2E_DATABASE_URL } from "./env";

// Fresh test database for every run: drop, re-apply migrations, seed.
export default function globalSetup() {
  assertTestDatabase(E2E_DATABASE_URL);
  const env = { ...process.env, ...e2eEnv };
  execSync("npx prisma migrate reset --force", { env, stdio: "inherit" });
  execSync("npx prisma db seed", { env, stdio: "inherit" });
}
