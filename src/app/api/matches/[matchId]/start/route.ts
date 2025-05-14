import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { matchId: string } }
) {
  try {
    await connectMongo();
    const { MatchModel, BoardModel } = getModels();
    const { matchId } = params;
    const { boardId } = await request.json();

    const board = await BoardModel.findOne({ boardId }).lean();
    if (!board) {
      return NextResponse.json({ error: "Tábla nem található" }, { status: 404 });
    }

    const match = await MatchModel.findById(matchId);
    if (!match) {
      return NextResponse.json({ error: "Mérkőzés nem található" }, { status: 404 });
    }

    if (match.status !== "pending") {
      return NextResponse.json({ error: "A mérkőzés nem indítható" }, { status: 400 });
    }

    match.status = "ongoing";
    match.boardId = boardId;
    await match.save();

    return NextResponse.json(match);
  } catch (error) {
    console.error("Hiba a mérkőzés indításakor:", error);
    return NextResponse.json({ error: "Nem sikerült a mérkőzés indítása" }, { status: 500 });
  }
}