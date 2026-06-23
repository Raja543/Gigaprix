import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Remove ONLY the synthetic demo data (seeded users have zero-padded wallets
 * like 0x000…0001). Real wallets never have 36+ leading zeros, so this can't
 * touch genuine competitions.
 */
async function main() {
  const demoUsers = await prisma.user.findMany({
    where: {
      walletAddress: { startsWith: "0x000000000000000000000000000000000000" },
    },
    select: { id: true },
  });
  const userIds = demoUsers.map((u) => u.id);

  const demoTournaments = await prisma.tournament.findMany({
    where: { hostId: { in: userIds } },
    select: { id: true },
  });
  const tIds = demoTournaments.map((t) => t.id);

  // Delete tournament-scoped rows, then the tournaments.
  await prisma.matchEntry.deleteMany({
    where: { match: { tournamentId: { in: tIds } } },
  });
  await prisma.standing.deleteMany({ where: { tournamentId: { in: tIds } } });
  await prisma.match.deleteMany({ where: { tournamentId: { in: tIds } } });
  await prisma.participant.deleteMany({ where: { tournamentId: { in: tIds } } });
  await prisma.whitelistEntry.deleteMany({ where: { tournamentId: { in: tIds } } });
  await prisma.tournament.deleteMany({ where: { id: { in: tIds } } });

  // Detach demo users from any remaining rows, then remove them.
  await prisma.matchEntry.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.standing.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.participant.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  console.log(
    `🧹 Removed ${tIds.length} demo competition(s) and ${userIds.length} demo user(s).`
  );

  const remaining = await prisma.tournament.count();
  console.log(`Remaining competitions in DB: ${remaining}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
