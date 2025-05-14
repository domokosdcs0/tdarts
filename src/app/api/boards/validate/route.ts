import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";
import { Tournament } from "@/types/tournamentSchema";


export async function POST(request: Request) {
  try {
    await connectMongo();
    const { TournamentModel } = getModels();
    const { code, password } = await request.json();

    if (!code || !password) {
      return NextResponse.json({ error: "Kód és jelszó megadása kötelező" }, { status: 400 });
    }

    const tournament = await TournamentModel.findOne({ code }).lean<Tournament>();
    if (!tournament) {
      return NextResponse.json({ error: "Torna nem található" }, { status: 404 });
    }

    if (tournament.status === "created" || tournament.status === "finished") {
      return NextResponse.json({ error: "A torna nem aktív (még nem indult vagy már befejeződött)" }, { status: 400 });
    }

    const isPasswordValid = password === tournament.tournamentPassword;
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Helytelen jelszó" }, { status: 401 });
    }

    return NextResponse.json({
      tournamentId: tournament._id,
      boardCount: tournament.boardCount,
    });
  } catch (error) {
    console.error("Hiba a torna validálásakor:", error);
    return NextResponse.json({ error: "Nem sikerült a validáció" }, { status: 500 });
  }
}