import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";
import { Board } from "@/types/boardSchema";

export async function GET(request: Request) {
  try {
    await connectMongo();
    const { BoardModel } = getModels();
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get("tournamentId");
    const boardNumber = searchParams.get("boardNumber");

    if (!tournamentId || !boardNumber) {
      return NextResponse.json({ error: "tournamentId és boardNumber megadása kötelező" }, { status: 400 });
    }
    console.log("tournamentId:", tournamentId);
    console.log("boardNumber:", boardNumber);
    const board = await BoardModel.find({
      tournamentId,
      boardNumber: parseInt(boardNumber)
    }).lean<Board[]>()
    if (!board) {
      return NextResponse.json({ error: "Tábla nem található" }, { status: 404 });
    }

    console.log(board)

    return NextResponse.json({ boardId: board[0].boardId, boardNumber: board[0].boardNumber });
  } catch (error) {
    console.error("Hiba a tábla lekérésekor:", error);
    return NextResponse.json({ error: "Nem sikerült a tábla lekérése" }, { status: 500 });
  }
}