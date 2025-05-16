import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";
import { Tournament } from "@/types/tournamentSchema";
import mongoose from "mongoose";

// Interfész a populált Match objektumhoz
interface PopulatedMatch {
  _id: string;
  tournamentId: string;
  groupIndex: number;
  status: string;
  player1: { _id: string; name: string };
  player2: { _id: string; name: string };
  scorer?: { _id: string; name: string };
  stats: {
    player1: { legsWon: number; average: number; checkoutRate: number; dartsThrown: number };
    player2: { legsWon: number; average: number; checkoutRate: number; dartsThrown: number };
  };
  winner?: string;
  legs: {
    player1Throws: { score: number; darts: number }[];
    player2Throws: { score: number; darts: number }[];
    winnerId?: mongoose.Types.ObjectId;
    checkoutDarts?: number;
    doubleAttempts?: number;
    highestCheckout?: {
      score: number;
      darts: number;
      playerId: mongoose.Types.ObjectId;
    };
    oneEighties: {
      player1: number[];
      player2: number[];
    };
    createdAt: Date;
  }[];
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

    // Aggregate oneEighties and highestCheckout from legs in finished matches
    const matches = await MatchModel.find({
      tournamentId: tournament._id,
      status: "finished",
    })
      .select("player1 player2 legs")
      .populate("player1", "name")
      .populate("player2", "name")
      .lean<PopulatedMatch[]>();

    const playerStats: { [key: string]: { oneEightiesCount: number; highestCheckout: number } } = {};

    // Initialize stats for each player
    tournament.players.forEach((player) => {
      playerStats[player._id.toString()] = { 
        oneEightiesCount: 0, 
        highestCheckout: 0 
      };
    });

    // Aggregate stats from legs in matches
    matches.forEach((match) => {
      const player1Id = match.player1._id.toString();
      const player2Id = match.player2._id.toString();

      match.legs.forEach((leg) => {
        // Count 180s
        if (leg.oneEighties) {
          playerStats[player1Id].oneEightiesCount += leg.oneEighties.player1.length || 0;
          playerStats[player2Id].oneEightiesCount += leg.oneEighties.player2.length || 0;
        }
        // Find highest checkout
        if (leg.highestCheckout && leg.highestCheckout.playerId) {
          const checkoutPlayerId = leg.highestCheckout.playerId.toString();
          const checkoutScore = leg.highestCheckout.score || 0;
          if (checkoutPlayerId === player1Id) {
            playerStats[player1Id].highestCheckout = Math.max(
              playerStats[player1Id].highestCheckout,
              checkoutScore
            );
          } else if (checkoutPlayerId === player2Id) {
            playerStats[player2Id].highestCheckout = Math.max(
              playerStats[player2Id].highestCheckout,
              checkoutScore
            );
          }
        }
      });
    });

    // Update tournament players with aggregated stats
    const updatedTournament = {
      ...tournament,
      players: tournament.players.map((player) => ({
        ...player,
        stats: {
          matchesWon: 0, // Default, as matchesWon isn't provided in matches.stats
          oneEightiesCount: playerStats[player._id.toString()].oneEightiesCount,
          highestCheckout: playerStats[player._id.toString()].highestCheckout,
        },
      })),
    };

    const boards = await BoardModel.find({ tournamentId: tournament._id })
      .populate({
        path: "waitingPlayers",
        select: "name",
      })
      .lean();

    const boardsWithMatches = await Promise.all(
      boards.map(async (board, index) => {
        if (board.status === "waiting") {
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
        } else if (board.status === "playing") {
          const currentMatch = await MatchModel.findOne({
            tournamentId: tournament._id,
            groupIndex: index,
            status: "ongoing",
          })
            .populate("player1", "name")
            .populate("player2", "name")
            .populate("scorer", "name")
            .lean<PopulatedMatch>();

          return {
            ...board,
            currentMatch: currentMatch
              ? {
                  player1Name: currentMatch.player1.name,
                  player2Name: currentMatch.player2.name,
                  scribeName: currentMatch.scorer?.name || "Nincs",
                  stats: {
                    player1Legs: currentMatch.stats?.player1?.legsWon || 0,
                    player2Legs: currentMatch.stats?.player2?.legsWon || 0,
                  },
                }
              : null,
          };
        }
        return board;
      })
    );

    return NextResponse.json({ tournament: updatedTournament, boards: boardsWithMatches });
  } catch (error) {
    console.error("Hiba a torna lekérésekor:", error);
    return NextResponse.json({ error: "Nem sikerült a torna lekérése" }, { status: 500 });
  }
}