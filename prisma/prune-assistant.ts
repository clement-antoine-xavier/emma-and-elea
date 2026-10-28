import "dotenv/config";
import {PrismaPg} from "@prisma/adapter-pg";
import {PrismaClient} from "../src/generated/prisma/client";

/**
 * Removes old assistant conversations and expires stale approvals. Run it from
 * cron or a scheduled job; the app itself never deletes history implicitly.
 */
async function main() {
  const retentionDays = Number(process.env.ASSISTANT_RETENTION_DAYS ?? 30);
  const cutoff = new Date(
    Date.now() - Math.max(retentionDays, 1) * 24 * 60 * 60 * 1000,
  );

  const prisma = new PrismaClient({
    adapter: new PrismaPg({connectionString: process.env.DATABASE_URL}),
  });

  try {
    const expired = await prisma.agentApproval.updateMany({
      where: {status: "PENDING", expiresAt: {lt: new Date()}},
      data: {status: "EXPIRED", decidedAt: new Date()},
    });

    const conversations = await prisma.agentConversation.deleteMany({
      where: {updatedAt: {lt: cutoff}},
    });

    console.log(
      `Expired ${expired.count} approval(s); removed ${conversations.count} conversation(s) older than ${retentionDays} day(s).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
