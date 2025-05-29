import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ tournamentId: string; matchId: string }> }) {
  try {
    await connectMongo();
    const { MatchModel } = getModels();
    const { matchId } = await params;
    const { stats, boardId, legs } = await request.json();

    console.log("Frissítési kérés érkezett:", { matchId, stats, boardId, legs });

    // Validáció
    if (!stats || !boardId) {
      return NextResponse.json({ error: "Hiányzó adatok" }, { status: 400 });
    }

    // Mérkőzés keresése
    const match = await MatchModel.findById(matchId);
    if (!match) {
      return NextResponse.json({ error: "Mérkőzés nem található" }, { status: 404 });
    }

    if (match.status !== "ongoing") {
      return NextResponse.json({ error: "A mérkőzés nem folyamatban van" }, { status: 400 });
    }

    // Statisztikák frissítése
    match.stats = {
      player1: {
        average: stats.player1.average || match.stats.player1.average || 0,
        checkoutRate: stats.player1.checkoutRate || match.stats.player1.checkoutRate || 0,
        dartsThrown: stats.player1.dartsThrown || match.stats.player1.dartsThrown || 0,
        legsWon: stats.player1.legsWon || match.stats.player1.legsWon || 0,
      },
      player2: {
        average: stats.player2.average || match.stats.player2.average || 0,
        checkoutRate: stats.player2.checkoutRate || match.stats.player2.checkoutRate || 0,
        dartsThrown: stats.player2.dartsThrown || match.stats.player2.dartsThrown || 0,
        legsWon: stats.player2.legsWon || match.stats.player2.legsWon || 0,
      },
    };

    // Ha van új leg adat, azt is mentjük
    if (legs) {
      match.legs = legs;
    }

    await match.save();

    return NextResponse.json({ message: "Statisztikák frissítve" });
  } catch (error) {
    console.error("Hiba a statisztikák frissítésekor:", error);
    return NextResponse.json({ error: "Nem sikerült a statisztikák frissítése" }, { status: 500 });
  }
}