// Environment for E2E runs. Tests use a separate database so they never touch development data.
export const E2E_PORT = 3100;
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`;
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgresql://unzanac:unzanac_dev@localhost:5432/unzanac_test?schema=public";

export const e2eEnv = {
  DATABASE_URL: E2E_DATABASE_URL,
  DIRECT_URL: E2E_DATABASE_URL,
  BETTER_AUTH_URL: E2E_BASE_URL,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? "e2e-only-secret-not-for-real-use-0123456789",
  // Uploads go to .storage/ through /api/dev-storage; `next start` runs in production mode,
  // where the local driver must be allowed explicitly (src/server/storage/index.ts).
  STORAGE_DRIVER: "local",
  ALLOW_LOCAL_STORAGE: "1",
  CRON_SECRET: "e2e-cron-secret",
};

/** Refuse to reset anything that isn't clearly a test database. */
export function assertTestDatabase(url: string) {
  const name = new URL(url).pathname.replace(/^\//, "");
  if (!name.endsWith("_test")) {
    throw new Error(`E2E tests reset their database; "${name}" doesn't end in _test. Set E2E_DATABASE_URL.`);
  }
}
