// api/matches/[matchId]/start/route.ts (példa, ha nem létezik)
import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: { matchId: string } }) {
  try {
    await connectMongo();
    const { MatchModel, BoardModel } = getModels();
    const { matchId } = await params;
    const { boardId } = await request.json();

    const match = await MatchModel.findById(matchId);
    if (!match) {
      return NextResponse.json({ error: "Mérkőzés nem található" }, { status: 404 });
    }

    if (match.status !== "pending") {
      return NextResponse.json({ error: "A mérkőzés nem indítható" }, { status: 400 });
    }

    const board = await BoardModel.findOneAndUpdate(
      { boardId },
      { status: "playing", currentMatch: matchId, updatedAt: new Date() },
      { new: true }
    );
    if (!board) {
      return NextResponse.json({ error: "Tábla nem található" }, { status: 404 });
    }

    match.status = "ongoing";
    match.boardId = boardId;
    await match.save();

    return NextResponse.json({ message: "Mérkőzés elindítva" });
  } catch (error) {
    console.error("Hiba a mérkőzés indításakor:", error);
    return NextResponse.json({ error: "Nem sikerült a mérkőzés indítása" }, { status: 500 });
  }
}