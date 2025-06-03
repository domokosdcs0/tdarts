import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";
import { Match } from "@/types/matchSchema";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get("tournamentId");
  try {
    await connectMongo();
    const { MatchModel } = getModels();

    if (!tournamentId) {
      return NextResponse.json({ error: "Hiányzó tournamentId paraméter" }, { status: 400 });
    }

    // Meccsek lekérdezése a tournamentId alapján
    const matches = await MatchModel.find({ tournamentId })
      .populate("player1", "name")
      .populate("player2", "name")
      .populate("scorer", "name")
      .populate("winner", "name")
      .lean<Match[]>();

    // Meccsek formázása a Match interfésznek megfelelően
    const formattedMatches = matches.map((match: any) => ({
      _id: match._id.toString(),
      player1: match.player1 ? { _id: match.player1._id.toString(), name: match.player1.name } : null,
      player2: match.player2 ? { _id: match.player2._id.toString(), name: match.player2.name } : null,
      matchReference: {
        _id: match._id.toString(),
        status: match.status,
        player1: match.player1 ? { _id: match.player1._id.toString(), name: match.player1.name } : null,
        player2: match.player2 ? { _id: match.player2._id.toString(), name: match.player2.name } : null,
        scorer: match.scorer ? { _id: match.scorer._id.toString(), name: match.scorer.name } : undefined,
        winner: match.winner ? { _id: match.winner._id.toString(), name: match.winner.name } : undefined,
        stats: {
          player1: {
            legsWon: match.stats.player1.legsWon || 0,
            average: match.stats.player1.average || 0,
            checkoutRate: match.stats.player1.checkoutRate || 0,
            dartsThrown: match.stats.player1.dartsThrown || 0,
          },
          player2: {
            legsWon: match.stats.player2.legsWon || 0,
            average: match.stats.player2.average || 0,
            checkoutRate: match.stats.player2.checkoutRate || 0,
            dartsThrown: match.stats.player2.dartsThrown || 0,
          },
        },
        round: match.round,
        isKnockout: match.isKnockout || false,
      },
    }));

    return NextResponse.json({ matches: formattedMatches });
  } catch (error: any) {
    console.error(`Error fetching matches for tournamentId: ${tournamentId}`, error);
    return NextResponse.json(
      { error: error.message || "Nem sikerült a meccsek lekérése" },
      { status: 500 }
    );
  }
}