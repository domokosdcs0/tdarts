import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { Tournament } from "@/types/tournamentSchema";

// Interfész a populált Match objektumhoz
interface PopulatedMatch {
  _id: string;
  tournamentId: string;
  round?: number;
  isKnockout: boolean;
  boardId?: string;
  player1Number?: number;
  player2Number?: number;
  scribeNumber?: number;
  status: "pending" | "ongoing" | "finished";
  player1: { _id: string; name: string };
  player2: { _id: string; name: string };
  player1Status: "unready" | "ready";
  player2Status: "unready" | "ready";
  scorer?: { _id: string; name: string };
  stats: {
    player1: { legsWon: number; average: number; checkoutRate: number; dartsThrown: number };
    player2: { legsWon: number; average: number; checkoutRate: number; dartsThrown: number };
  };
  winner?: { _id: string; name: string };
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

// Populated Tournament interface for response
interface PopulatedTournament extends Omit<Tournament, "players" | "groups" | "knockout" | "standing"> {
  players: {
    _id: mongoose.Types.ObjectId;
    name: string;
    stats?: {
      matchesWon: number;
      oneEightiesCount: number;
      highestCheckout: number;
    };
  }[];
  groups: {
    players: {
      playerId: { _id: string; name: string };
      number: number;
    }[];
    matches: PopulatedMatch[];
    standings: {
      playerId: { _id: string; name: string };
      points: number;
      legsWon: number;
      legsLost: number;
      legDifference: number;
      rank?: number;
    }[];
    boardNumber: number;
  }[];
  knockout: {
    rounds: {
      matches: {
        _id: string;
        player1: { _id: string; name: string } | null;
        player2: { _id: string; name: string } | null;
        matchReference: PopulatedMatch | null;
      }[];
    }[];
  };
  standing?: {
    playerId: string;
    rank: number;
  }[];
}

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
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
          { path: "winner", select: "name" },
        ],
      })
      .populate({
        path: "groups.standings.playerId",
        select: "name",
      })
      .populate({
        path: "knockout.rounds.matches.player1",
        select: "name",
      })
      .populate({
        path: "knockout.rounds.matches.player2",
        select: "name",
      })
      .populate({
        path: "knockout.rounds.matches.matchReference",
        populate: [
          { path: "player1", select: "name" },
          { path: "player2", select: "name" },
          { path: "scorer", select: "name" },
          { path: "winner", select: "name" },
        ],
      })
      .lean<PopulatedTournament>();

    if (!tournament) {
      return NextResponse.json({ error: "Torna nem található" }, { status: 404 });
    }

    // Aggregate oneEighties and highestCheckout from legs in finished matches
    const matches = await MatchModel.find({
      tournamentId: tournament._id,
      status: "finished",
    })
      .select("player1 player2 legs winner")
      .populate("player1", "name")
      .populate("player2", "name")
      .populate("winner", "name")
      .lean<PopulatedMatch[]>();

    const playerStats: { [key: string]: { oneEightiesCount: number; highestCheckout: number; matchesWon: number } } = {};

    // Initialize stats for each player
    tournament.players.forEach((player) => {
      playerStats[player._id.toString()] = {
        oneEightiesCount: 0,
        highestCheckout: 0,
        matchesWon: 0,
      };
    });

    // Aggregate stats from legs and matches
    matches.forEach((match) => {
      const player1Id = match.player1._id.toString();
      const player2Id = match.player2._id.toString();

      // Count matches won
      if (match.winner) {
        const winnerId = match.winner._id.toString();
        if (winnerId === player1Id) playerStats[player1Id].matchesWon += 1;
        else if (winnerId === player2Id) playerStats[player2Id].matchesWon += 1;
      }

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
    const updatedTournament: PopulatedTournament = {
      ...tournament,
      players: tournament.players.map((player) => ({
        ...player,
        stats: {
          matchesWon: playerStats[player._id.toString()].matchesWon,
          oneEightiesCount: playerStats[player._id.toString()].oneEightiesCount,
          highestCheckout: playerStats[player._id.toString()].highestCheckout,
        },
      })),
      standing: tournament.standing || [],
    };

    const boards = await BoardModel.find({ tournamentId: tournament._id })
      .populate({
        path: "waitingPlayers",
        select: "name",
      })
      .lean();

    const boardsWithMatches = await Promise.all(
      boards.map(async (board) => {
        // Find the group corresponding to the board
        const boardIndex = board.boardNumber - 1;
        const group = updatedTournament.groups.find(g => g.boardNumber === board.boardNumber);

        if (board.status === "waiting") {
          const nextMatch = await MatchModel.findOne({
            tournamentId: tournament._id,
            boardId: board.boardId,
            status: "pending",
          })
            .populate("player1", "name")
            .populate("player2", "name")
            .populate("scorer", "name")
            .lean<PopulatedMatch>();

          if (nextMatch && group?.matches) {
            const groupMatch = group.matches.find(m => m._id.toString() === nextMatch._id.toString());
            console.log(`Board ${board.boardNumber} nextMatch:`, {
              matchId: nextMatch._id,
              groupMatchFound: !!groupMatch,
              player1Status: groupMatch?.player1Status,
              player2Status: groupMatch?.player2Status,
            });

            return {
              ...board,
              nextMatch: {
                matchId: nextMatch._id.toString(),
                player1Name: nextMatch.player1.name,
                player2Name: nextMatch.player2.name,
                player1Status: groupMatch?.player1Status || "unready",
                player2Status: groupMatch?.player2Status || "unready",
                scribeName: nextMatch.scorer?.name || "Nincs",
              },
              currentMatch: null,
            };
          }
          return { ...board, nextMatch: null, currentMatch: null };
        } else if (board.status === "playing") {
          const currentMatch = await MatchModel.findOne({
            tournamentId: tournament._id,
            boardId: board.boardId,
            status: "ongoing",
          })
            .populate("player1", "name")
            .populate("player2", "name")
            .populate("scorer", "name")
            .lean<PopulatedMatch>();

          if (currentMatch && group?.matches) {
            const groupMatch = group.matches.find(m => m._id.toString() === currentMatch._id.toString());
            console.log(`Board ${board.boardNumber} currentMatch:`, {
              matchId: currentMatch._id,
              groupMatchFound: !!groupMatch,
              player1Status: groupMatch?.player1Status,
              player2Status: groupMatch?.player2Status,
            });

            return {
              ...board,
              currentMatch: {
                matchId: currentMatch._id.toString(),
                player1Name: currentMatch.player1.name,
                player2Name: currentMatch.player2.name,
                player1Status: groupMatch?.player1Status || "unready",
                player2Status: groupMatch?.player2Status || "unready",
                scribeName: currentMatch.scorer?.name || "Nincs",
                stats: {
                  player1Legs: currentMatch.stats?.player1?.legsWon || 0,
                  player2Legs: currentMatch.stats?.player2?.legsWon || 0,
                },
              },
              nextMatch: null,
            };
          }
          return { ...board, currentMatch: null, nextMatch: null };
        }
        return { ...board, currentMatch: null, nextMatch: null };
      })
    );

    return NextResponse.json({ tournament: updatedTournament, boards: boardsWithMatches });
  } catch (error) {
    console.error("Hiba a torna lekérésekor:", error);
    return NextResponse.json({ error: "Nem sikerült a torna lekérése" }, { status: 500 });
  }
}