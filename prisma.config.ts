import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // The Prisma CLI (migrations) needs a direct connection. On Neon that is the non-pooled URL;
    // locally both URLs are the same, so DIRECT_URL can be left unset.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
