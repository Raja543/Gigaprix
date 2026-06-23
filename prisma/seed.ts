import {
  PrismaClient,
  type CompetitionType,
  type RaceType,
} from "@prisma/client";
import { generateHeatBracket } from "../src/lib/tournament/single-elimination";
import { distanceForRaceType } from "../src/lib/competition";

const prisma = new PrismaClient();

const NAMES = [
  "NeonRunner", "TurboTess", "CyberDash", "VoltViper",
  "PixelPaws", "GhostGear", "NitroNova", "QuantumQuokka",
  "ApexAria", "BlazeByte", "ChromeChase", "DriftDuke",
  "EchoEdge", "FluxFang", "GlitchGale", "HyperHare",
];

// Build a 64-name roster so we can seed a full multi-stage championship.
const ROSTER = Array.from({ length: 64 }, (_, i) =>
  i < NAMES.length ? NAMES[i] : `Racer${String(i + 1).padStart(2, "0")}`
);

// Real Gigaverse gigling IDs (varied rarities) so spectate/cards show real art.
const REAL_PETS = [
  13667, 27490, 9141, 18813, 18323, 20650, 6000, 6862,
  14541, 14536, 23255, 6411, 2417, 26236, 479, 5427,
].map((n) => BigInt(n));

const petFor = (i: number) => REAL_PETS[i % REAL_PETS.length];
const wallet = (i: number) => `0x${(i + 1).toString(16).padStart(40, "0")}`;

async function seedChampionship(opts: {
  name: string;
  description: string;
  competitionType: CompetitionType;
  raceType: RaceType;
  accent: string;
  hostId: string;
  users: { id: string; walletAddress: string }[];
}) {
  const { users } = opts;
  const cup = await prisma.tournament.create({
    data: {
      name: opts.name,
      description: opts.description,
      format: "SINGLE_ELIMINATION",
      competitionType: opts.competitionType,
      raceType: opts.raceType,
      status: "IN_PROGRESS",
      maxParticipants: users.length,
      heatSize: 8,
      advanceCount: 4,
      testMode: true,
      trackLength: distanceForRaceType(opts.raceType),
      accentColor: opts.accent,
      hostId: opts.hostId,
      startedAt: new Date(),
    },
  });

  const participants = await Promise.all(
    users.map((u, i) =>
      prisma.participant.create({
        data: { tournamentId: cup.id, userId: u.id, seed: i + 1, petId: petFor(i) },
      })
    )
  );
  const seeded = participants.map((p, i) => ({
    participantId: p.id,
    userId: p.userId,
    petId: petFor(i),
    seed: i + 1,
  }));
  const { heats, totalRounds } = generateHeatBracket(seeded, 8, 4);

  const idByKey = new Map<string, string>();
  for (const h of heats) {
    const m = await prisma.match.create({
      data: {
        tournamentId: cup.id,
        round: h.round,
        position: h.position,
        heatSize: h.entries.length || 8,
        advanceCount: h.advanceCount,
        status: h.status,
        entries: {
          create: h.entries.map((e) => ({
            participantId: e.participantId,
            userId: e.userId,
            petId: e.petId,
            seed: e.seed,
          })),
        },
      },
    });
    idByKey.set(`${h.round}:${h.position}`, m.id);
  }
  await prisma.tournament.update({
    where: { id: cup.id },
    data: { totalRounds, currentRound: 1 },
  });

  // Resolve stage-1 groups with realistic finish times; promote qualifiers.
  const stage1 = heats.filter((h) => h.round === 1);
  const advancers: {
    participantId: string;
    userId: string;
    petId: bigint | null;
    seed: number;
  }[] = [];
  for (const h of stage1) {
    const heatId = idByKey.get(`${h.round}:${h.position}`)!;
    const ranked = [...h.entries].sort((a, b) => a.seed - b.seed);
    for (let pos = 0; pos < ranked.length; pos++) {
      const e = ranked[pos];
      const advanced = pos < h.advanceCount;
      await prisma.matchEntry.updateMany({
        where: { matchId: heatId, participantId: e.participantId },
        data: {
          finishPosition: pos + 1,
          finishTime: BigInt(11800 + pos * 260 + h.position * 40 + Math.floor(Math.random() * 90)),
          advanced,
        },
      });
      if (advanced) advancers.push(e);
    }
    await prisma.match.update({
      where: { id: heatId },
      data: {
        status: "COMPLETED",
        winnerId: ranked[0].userId,
        winnerPetId: ranked[0].petId,
        raceId: BigInt(990000 + h.position),
        racePhase: 3,
        finalRanking: ranked.map((e) => e.petId?.toString() ?? "0"),
        completedAt: new Date(),
      },
    });
  }

  // Seed the stage-2 groups from the qualifiers (balanced snake fill).
  if (totalRounds > 1) {
    const stage2 = heats
      .filter((h) => h.round === 2)
      .sort((a, b) => a.position - b.position);
    if (stage2.length > 0) {
      for (let i = 0; i < advancers.length; i++) {
        const a = advancers[i];
        const target = stage2[i % stage2.length];
        const heatId = idByKey.get(`2:${target.position}`)!;
        await prisma.matchEntry
          .create({
            data: {
              matchId: heatId,
              participantId: a.participantId,
              userId: a.userId,
              petId: a.petId,
              seed: a.seed,
            },
          })
          .catch(() => {});
      }
    }
  }
  await prisma.tournament.update({
    where: { id: cup.id },
    data: { currentRound: Math.min(2, totalRounds) },
  });

  // Standings.
  for (const u of users) {
    const entries = await prisma.matchEntry.findMany({
      where: { userId: u.id, match: { tournamentId: cup.id }, finishPosition: { not: null } },
    });
    if (entries.length === 0) continue;
    const wins = entries.filter((e) => e.finishPosition === 1).length;
    const points = entries.reduce(
      (s, e) => s + Math.max(1, 8 - ((e.finishPosition ?? 8) - 1)),
      0
    );
    await prisma.standing.create({
      data: {
        tournamentId: cup.id,
        userId: u.id,
        walletAddress: u.walletAddress,
        wins,
        racesPlayed: entries.length,
        points,
      },
    });
  }
  const ranked = await prisma.standing.findMany({
    where: { tournamentId: cup.id },
    orderBy: { points: "desc" },
  });
  await prisma.$transaction(
    ranked.map((s, i) =>
      prisma.standing.update({ where: { id: s.id }, data: { rank: i + 1 } })
    )
  );
  return cup;
}

async function main() {
  const reset = process.env.SEED_RESET === "true";
  const existing = await prisma.tournament.count();

  // Safety: never wipe a database that already has data unless explicitly told.
  // This prevents `npm run db:seed` from destroying real tournaments.
  if (existing > 0 && !reset) {
    console.log(
      `⚠️  Found ${existing} existing competition(s). Skipping seed to protect your data.\n` +
        `   To wipe everything and load fresh demo data, run:\n` +
        `   SEED_RESET=true npm run db:seed`
    );
    return;
  }

  if (reset) {
    console.log("🧹 SEED_RESET=true → wiping all data…");
    await prisma.matchEntry.deleteMany();
    await prisma.standing.deleteMany();
    await prisma.match.deleteMany();
    await prisma.participant.deleteMany();
    await prisma.whitelistEntry.deleteMany();
    await prisma.tournament.deleteMany();
    await prisma.user.deleteMany();
  }

  console.log("🌱 Seeding demo data…");

  const users = await Promise.all(
    ROSTER.map((name, i) =>
      prisma.user.create({
        data: {
          walletAddress: wallet(i),
          username: name,
          elo: 2200 - i * 18,
          totalRaces: 240 - i * 3,
        },
      })
    )
  );
  const host = users[0];

  // 1. Open-registration championship — fills 64, qualifies down to one champion.
  await prisma.tournament.create({
    data: {
      name: "Season One Championship",
      description:
        "64 racers · groups of 8 · top 4 qualify each stage. Three stages from the opening groups to the grand final.",
      format: "SINGLE_ELIMINATION",
      competitionType: "CHAMPIONSHIP",
      raceType: "SPRINT",
      status: "REGISTRATION",
      maxParticipants: 64,
      heatSize: 8,
      advanceCount: 4,
      testMode: true,
      trackLength: distanceForRaceType("SPRINT"),
      accentColor: "#19f7a4",
      hostId: host.id,
      participants: {
        create: users.slice(0, 24).map((u) => ({ userId: u.id })),
      },
    },
  });

  // 2. Live championship (Sprint) — opening stage resolved.
  await seedChampionship({
    name: "Gigaverse Grand Prix",
    description:
      "16 real giglings · groups of 8 · top 4 qualify. Opening stage done — spectate the replays.",
    competitionType: "CHAMPIONSHIP",
    raceType: "SPRINT",
    accent: "#22d3ee",
    hostId: host.id,
    users: users.slice(0, 16),
  });

  // 3. Live Creator Cup on the Marathon distance.
  await seedChampionship({
    name: "Creator Marathon Cup",
    description:
      "Creator-hosted Marathon cup · groups of 8 · top 4 qualify. Opening stage resolved.",
    competitionType: "CREATOR_CUP",
    raceType: "MARATHON",
    accent: "#f59e0b",
    hostId: host.id,
    users: users.slice(0, 16),
  });

  // 4. Open Community Cup (registration), Dash distance.
  await prisma.tournament.create({
    data: {
      name: "Community Dash Cup",
      description:
        "Open community Dash · short 500m heats of 8 · top 4 qualify. Jump in!",
      format: "SINGLE_ELIMINATION",
      competitionType: "COMMUNITY_CUP",
      raceType: "DASH",
      status: "REGISTRATION",
      maxParticipants: 32,
      heatSize: 8,
      advanceCount: 4,
      testMode: true,
      trackLength: distanceForRaceType("DASH"),
      accentColor: "#38bdf8",
      hostId: host.id,
      participants: {
        create: users.slice(0, 12).map((u) => ({ userId: u.id })),
      },
    },
  });

  // 5. Open League (round-robin), Sprint distance.
  await prisma.tournament.create({
    data: {
      name: "Creator Sprint League",
      description:
        "Round-robin Sprint league · race several matchdays in groups of 8 · ranked by points, no elimination.",
      format: "ROUND_ROBIN",
      competitionType: "CREATOR_CUP",
      raceType: "SPRINT",
      status: "REGISTRATION",
      maxParticipants: 24,
      heatSize: 8,
      advanceCount: 0,
      testMode: true,
      trackLength: distanceForRaceType("SPRINT"),
      accentColor: "#22d3ee",
      hostId: host.id,
      participants: {
        create: users.slice(0, 16).map((u) => ({ userId: u.id })),
      },
    },
  });

  // 6. A completed championship for the champions section.
  await prisma.tournament.create({
    data: {
      name: "Founders Invitational",
      description: "The inaugural Gigling championship.",
      format: "SINGLE_ELIMINATION",
      competitionType: "CHAMPIONSHIP",
      raceType: "GRAND_PRIX",
      status: "COMPLETED",
      maxParticipants: 8,
      heatSize: 8,
      advanceCount: 4,
      trackLength: distanceForRaceType("GRAND_PRIX"),
      accentColor: "#FFD700",
      hostId: host.id,
      startedAt: new Date(Date.now() - 7 * 86400_000),
      completedAt: new Date(Date.now() - 6 * 86400_000),
      championId: users[1].id,
      totalRounds: 1,
      participants: {
        create: users.slice(0, 8).map((u, i) => ({ userId: u.id, seed: i + 1, petId: petFor(i) })),
      },
    },
  });

  console.log("✅ Seed complete:", { users: users.length, competitions: 6 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
