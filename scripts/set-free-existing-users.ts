/**
 * Jednorazowy skrypt migracyjny.
 * Ustaw isFree=true dla wszystkich userów którzy nie mają ustawionego trialEndsAt
 * (czyli zarejestrowali się przed wdrożeniem systemu trialu).
 *
 * Uruchom po `prisma db push`:
 *   npx tsx scripts/set-free-existing-users.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.user.updateMany({
    where: { trialEndsAt: null, isFree: false },
    data: { isFree: true },
  });
  console.log(`Zaktualizowano ${result.count} użytkowników — ustawiono isFree=true.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
