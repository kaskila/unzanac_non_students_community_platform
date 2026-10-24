import "dotenv/config";
import { prisma } from "../src/server/db";
import { COMMITTEES } from "../src/lib/committees";

async function main() {
  for (const [index, committee] of COMMITTEES.entries()) {
    await prisma.committee.upsert({
      where: { slug: committee.slug },
      update: {},
      create: { ...committee, sortOrder: index },
    });
  }
  console.log(`Seeded ${COMMITTEES.length} committees.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
