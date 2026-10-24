import { createAuthClient } from "better-auth/react";
import { twoFactorClient } from "better-auth/client/plugins";

// Browser client for the admin sign-in and 2FA screens. Requests go to /api/auth,
// where Better Auth applies rate limits and sets the session cookie.
export const authClient = createAuthClient({
  plugins: [twoFactorClient()],
});
