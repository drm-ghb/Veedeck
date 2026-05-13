/**
 * One-time migration: hash existing plaintext share passwords with bcrypt.
 * Run: npx tsx scripts/migrate-share-passwords.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env BEFORE Prisma constructs the pool (reads DATABASE_URL at init time)
try {
  const envPath = resolve(process.cwd(), ".env");
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
    if (match) process.env[match[1].trim()] ??= match[2].trim().replace(/^["']|["']$/g, "");
  }
  console.log("Loaded .env");
} catch {
  console.log("No .env file — relying on shell environment");
}

async function main() {
  // All imports inside main so Prisma client is constructed after env is set
  const { Pool } = await import("pg");
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const bcrypt = await import("bcryptjs");

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool as any);
  const prisma = new PrismaClient({ adapter } as any);

  try {
    const projects = await prisma.project.findMany({
      where: { sharePassword: { not: null } },
      select: { id: true, sharePassword: true },
    });

    console.log(`\nFound ${projects.length} project(s) with a share password.`);

    let migrated = 0;
    let skipped = 0;

    for (const p of projects) {
      if (!p.sharePassword) continue;

      if (p.sharePassword.startsWith("$2")) {
        console.log(`  [skip]    ${p.id} — already hashed`);
        skipped++;
        continue;
      }

      const hashed = await bcrypt.hash(p.sharePassword, 10);
      await prisma.project.update({
        where: { id: p.id },
        data: { sharePassword: hashed },
      });
      console.log(`  [migrated] ${p.id}`);
      migrated++;
    }

    console.log(`\nDone. Migrated: ${migrated}, skipped (already hashed): ${skipped}.`);
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
