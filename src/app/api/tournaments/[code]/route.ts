import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";
import { Tournament } from "@/types/tournamentSchema";

export async function GET(request: Request, { params }: { params: { code: string } }) {
  try {
    await connectMongo();
    const { TournamentModel, PlayerModel, BoardModel, MatchModel } = getModels();
    const { code } = await params;

    const tournament = await TournamentModel.findOne({ code })
      .populate({
        path: "players",
        select: "name",
        model: PlayerModel,
      })
      .populate({
        path: "groups.players.playerId",
        select: "name",
        model: PlayerModel,
      })
      .populate({
        path: "groups.matches",
        select: "player1Number player2Number scribeNumber status player1 player2 scorer",
        populate: [
          { path: "player1", select: "name", model: PlayerModel },
          { path: "player2", select: "name", model: PlayerModel },
          { path: "scorer", select: "name", model: PlayerModel },
        ],
        model: MatchModel,
      })
      .lean<Tournament>();

    if (!tournament) {
      return NextResponse.json({ error: "Torna nem található" }, { status: 404 });
    }

    // Átalakítjuk a groups.players-t és groups.matches-t a frontend számára
    tournament.groups = tournament.groups.map((group: any) => ({
      ...group,
      players: group.players.map((p: any) => ({
        playerId: p.playerId._id,
        name: p.playerId.name,
        number: p.number,
      })),
      matches: group.matches.map((match: any) => ({
        player1Number: match.player1Number,
        player2Number: match.player2Number,
        scribeNumber: match.scribeNumber,
        player1Name: match.player1.name,
        player2Name: match.player2.name,
        scribeName: match.scorer?.name || null,
        status: match.status,
      })),
    }));

    const boards = await BoardModel.find({ tournamentId: tournament._id })
      .populate({
        path: "waitingPlayers",
        select: "name",
        model: PlayerModel,
      })
      .lean();

    return NextResponse.json({ tournament, boards });
  } catch (error) {
    console.error("Hiba a torna lekérésekor:", error);
    return NextResponse.json({ error: "Nem sikerült a torna lekérése" }, { status: 500 });
  }
}