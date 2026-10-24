// Bootstrap: print an invite link for the first owner.
//   npm run admin:invite-owner -- someone@example.com "Full Name"
// Refuses when an active owner already exists; owners invite everyone else from /admin/users.
import "dotenv/config";
import { createInvite, hasActiveOwner } from "../src/server/services/admins";
import { prisma } from "../src/server/db";

async function main() {
  const [email, name] = process.argv.slice(2);
  if (!email || !name) {
    console.error('Usage: npm run admin:invite-owner -- someone@example.com "Full Name"');
    process.exitCode = 1;
    return;
  }
  if (await hasActiveOwner()) {
    console.error("An owner already exists. Ask them to send an invite from /admin/users.");
    process.exitCode = 1;
    return;
  }
  const link = await createInvite(null, { email, name, role: "owner" });
  console.log(`Owner invite for ${email} (valid 7 days, use once):\n${link}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
