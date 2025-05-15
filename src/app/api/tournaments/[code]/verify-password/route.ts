import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";
import { Tournament } from "@/types/tournamentSchema";

export async function POST(request: Request, { params }: { params: { code: string } }) {
  try {
    await connectMongo();
    const { TournamentModel } = getModels();
    const { code } = await params;
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json({ error: "Jelszó megadása kötelező" }, { status: 400 });
    }

    const tournament = await TournamentModel.findOne({ code }).select("tournamentPassword").lean<Tournament>();
    if (!tournament) {
      return NextResponse.json({ error: "Torna nem található" }, { status: 404 });
    }
    if (tournament.tournamentPassword !== password) {
      return NextResponse.json({ error: "Helytelen jelszó" }, { status: 401 });
    }

    return NextResponse.json({ message: "Sikeres hitelesítés" });
  } catch (error) {
    console.error("Hiba a jelszó ellenőrzésekor:", error);
    return NextResponse.json({ error: "Nem sikerült a jelszó ellenőrzése" }, { status: 500 });
  }
}