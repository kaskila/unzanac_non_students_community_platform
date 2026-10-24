// Test-only: print an invite link for any role, without the bootstrap script's "first owner"
// check, so spec files can each create their own admins in the shared test database.
import { createInvite } from "../../src/server/services/admins";
import { prisma } from "../../src/server/db";

const [email, name, role] = process.argv.slice(2);
createInvite(null, { email, name, role: role as never })
  .then((link) => console.log(link))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
