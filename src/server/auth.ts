import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, createAccessControl, twoFactor } from "better-auth/plugins";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";
import { prisma } from "@/server/db";
import { audit } from "@/server/audit";

// Better Auth's own admin endpoints (ban, set role, …) are only usable by owners.
// Everything else is governed by src/server/policy.ts.
const ac = createAccessControl(defaultStatements);
const roles = {
  owner: ac.newRole(adminAc.statements),
  register_officer: ac.newRole({}),
  editor: ac.newRole({}),
};

const EIGHT_HOURS = 60 * 60 * 8;

export const auth = betterAuth({
  appName: "UNZANAC",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    // Invite-only: accounts are created by src/server/services/admins.ts, never by public sign-up.
    disableSignUp: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  session: {
    // Sliding 8-hour session: refreshed every 15 minutes of activity, ends after 8 hours idle.
    expiresIn: EIGHT_HOURS,
    updateAge: 60 * 15,
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 60,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/two-factor/*": { window: 60, max: 5 },
    },
  },
  databaseHooks: {
    session: {
      create: {
        after: async (session) => {
          await audit({ actorId: session.userId, action: "auth.sign_in", entityType: "user", entityId: session.userId });
        },
      },
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-in/email" && ctx.context.returned instanceof APIError) {
        const email = typeof ctx.body?.email === "string" ? ctx.body.email.toLowerCase() : null;
        await audit({ action: "auth.sign_in_failed", entityType: "user", meta: { email } });
      }
    }),
  },
  plugins: [
    twoFactor({ issuer: "UNZANAC Admin" }),
    admin({ ac, roles, defaultRole: "editor" }),
    nextCookies(), // must be last: lets server actions set auth cookies
  ],
});
