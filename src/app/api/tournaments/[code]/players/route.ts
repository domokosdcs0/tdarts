import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: { code: string } }) {
  try {
    await connectMongo();
    const { TournamentModel, PlayerModel, PlayerTournamentHistoryModel } = getModels();
    const { code } = await params;
    const { playerName } = await request.json();

    if (!playerName) {
      return NextResponse.json({ error: "Játékos neve kötelező" }, { status: 400 });
    }

    const tournament = await TournamentModel.findOne({ code });
    if (!tournament) {
      return NextResponse.json({ error: "Torna nem található" }, { status: 404 });
    }

    let player = await PlayerModel.findOne({ name: playerName.trim() });
    if (!player) {
      player = await PlayerModel.create({ name: playerName.trim() });
    }

    if (tournament.players.includes(player._id)) {
      return NextResponse.json({ error: "A játékos már hozzá van adva" }, { status: 400 });
    }

    tournament.players.push(player._id);
    await tournament.save();

    const existingHistory = await PlayerTournamentHistoryModel.findOne({
      playerId: player._id,
      tournamentId: tournament._id,
    });
    if (!existingHistory) {
      await PlayerTournamentHistoryModel.create({
        playerId: player._id,
        tournamentId: tournament._id,
        stats: {
          average: 0,
          checkoutRate: 0,
          legsWon: 0,
          legsPlayed: 0,
          matchesWon: 0,
          matchesPlayed: 0,
        },
      });
    }

    return NextResponse.json({ message: "Játékos sikeresen hozzáadva" });
  } catch (error) {
    console.error("Hiba a játékos hozzáadásakor:", error);
    return NextResponse.json({ error: "Nem sikerült a játékos hozzáadása" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { code: string } }) {
    try {
      await connectMongo();
      const { TournamentModel, PlayerModel, PlayerTournamentHistoryModel } = getModels();
      const { code } = params;
      const { playerId } = await request.json();
  
      if (!playerId) {
        return NextResponse.json({ error: "Játékos azonosítója kötelező" }, { status: 400 });
      }
  
      const tournament = await TournamentModel.findOne({ code });
      if (!tournament) {
        return NextResponse.json({ error: "Torna nem található" }, { status: 404 });
      }
  
      if (!tournament.players.includes(playerId)) {
        return NextResponse.json({ error: "A játékos nincs a tornán" }, { status: 400 });
      }
  
      tournament.players = tournament.players.filter((id: string) => id.toString() !== playerId);
      await tournament.save();
  
      await PlayerTournamentHistoryModel.deleteOne({
        playerId,
        tournamentId: tournament._id,
      });
  
      return NextResponse.json({ message: "Játékos sikeresen törölve" });
    } catch (error) {
      console.error("Hiba a játékos törlésekor:", error);
      return NextResponse.json({ error: "Nem sikerült a játékos törlése" }, { status: 500 });
    }
  }