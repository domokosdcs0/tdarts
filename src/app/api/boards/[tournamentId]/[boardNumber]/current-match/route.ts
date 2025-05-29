import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";
import { PopulatedMatch } from "@/types/matchSchema";
import { Tournament } from "@/types/tournamentSchema";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string, boardNumber: string }> }
) {
  try {
    await connectMongo();
    const { TournamentModel, MatchModel, PlayerModel } = getModels();
    const { tournamentId, boardNumber } = await params;

    const tournament = await TournamentModel.findById(tournamentId).lean<Tournament>();
    if (!tournament) {
      return NextResponse.json({ error: "Torna nem található" }, { status: 404 });
    }

    const groupIndex = parseInt(boardNumber) - 1;
    if (groupIndex < 0 || groupIndex >= tournament.groups.length) {
      return NextResponse.json({ error: "Érvénytelen tábla szám" }, { status: 400 });
    }

    // Keresünk egy folyamatban lévő mérkőzést az adott csoportban
    const match = await MatchModel.findOne({
      tournamentId,
      round: groupIndex,
      status: "ongoing",
    })
      .populate("player1", "name", PlayerModel)
      .populate("player2", "name", PlayerModel)
      .populate("scorer", "name", PlayerModel)
      .lean() as PopulatedMatch | null;

    if (!match) {
      return NextResponse.json({ error: "Nincs folyamatban lévő mérkőzés" }, { status: 404 });
    }

    return NextResponse.json({
      matchId: match._id,
      player1Id: match.player1._id,
      player2Id: match.player2._id,
      player1Name: match.player1.name,
      player2Name: match.player2.name,
      scribeName: match.scorer?.name || "Nincs",
      stats: match.stats || {
        player1: { average: 0, dartsThrown: 0, legsWon: 0 },
        player2: { average: 0, dartsThrown: 0, legsWon: 0 },
      },
    });
  } catch (error) {
    console.error("Hiba a folyamatban lévő mérkőzés lekérésekor:", error);
    return NextResponse.json({ error: "Nem sikerült a mérkőzés lekérése" }, { status: 500 });
  }
}