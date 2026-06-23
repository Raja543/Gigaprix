import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { serializeBigInt } from "@/lib/utils";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const matches = await prisma.match.findMany({
    where: { tournamentId: id },
    include: {
      winner: true,
      entries: { include: { user: true }, orderBy: { finishPosition: "asc" } },
    },
    orderBy: [{ round: "asc" }, { position: "asc" }],
  });
  return NextResponse.json(serializeBigInt({ matches }));
}
