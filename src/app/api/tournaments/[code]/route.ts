// app/api/tournaments/[code]/route.ts
import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";
import { Tournament } from "@/types/tournamentSchema";

// Interfész a populált Match objektumhoz
interface PopulatedMatch {
  _id: string;
  tournamentId: string;
  groupIndex: number;
  status: string;
  player1: { _id: string; name: string };
  player2: { _id: string; name: string };
  scorer?: { _id: string; name: string };
  stats: { player1: { legsWon: number }; player2: { legsWon: number } };
  winner?: string;
}

export async function GET(request: Request, { params }: { params: { code: string } }) {
  try {
    await connectMongo();
    const { TournamentModel, BoardModel, MatchModel } = getModels();
    const { code } = await params;

    const tournament = await TournamentModel.findOne({ code })
      .populate({
        path: "players",
        select: "name",
      })
      .populate({
        path: "groups.players.playerId",
        select: "name",
      })
      .populate({
        path: "groups.matches",
        populate: [
          { path: "player1", select: "name" },
          { path: "player2", select: "name" },
          { path: "scorer", select: "name" },
        ],
      })
      .populate({
        path: "groups.standings.playerId",
        select: "name",
      })
      .lean<Tournament>();

    if (!tournament) {
      return NextResponse.json({ error: "Torna nem található" }, { status: 404 });
    }

    const boards = await BoardModel.find({ tournamentId: tournament._id })
      .populate({
        path: "waitingPlayers",
        select: "name",
      })
      .lean();

    // Csatoljuk a következő mérkőzést minden waiting állapotú táblához
    const boardsWithNextMatch = await Promise.all(
      boards.map(async (board, index) => {
        if (board.status !== "waiting") {
          return board;
        }

        console.log("board:", board);
        const nextMatch = await MatchModel.findOne({
          tournamentId: tournament._id,
          groupIndex: index,
          status: "pending",
        })
          .populate("player1", "name")
          .populate("player2", "name")
          .populate("scorer", "name")
          .lean<PopulatedMatch>();

        return {
          ...board,
          nextMatch: nextMatch
            ? {
                player1Name: nextMatch.player1.name,
                player2Name: nextMatch.player2.name,
                scribeName: nextMatch.scorer?.name || "Nincs",
              }
            : null,
        };
      })
    );

    console.log(tournament.groups[0])

    return NextResponse.json({ tournament, boards: boardsWithNextMatch });
  } catch (error) {
    console.error("Hiba a torna lekérésekor:", error);
    return NextResponse.json({ error: "Nem sikerült a torna lekérése" }, { status: 500 });
  }
}