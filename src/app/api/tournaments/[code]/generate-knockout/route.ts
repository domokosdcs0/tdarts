import { NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import mongoose from "mongoose";

// Local Tournament interface for non-populated data
interface Tournament {
  _id: string;
  tournamentPassword: string;
  code: string;
  name: string;
  boardCount: number;
  status: "created" | "group" | "knockout" | "finished";
  players: string[];
  startTime: Date;
  groups: {
    _id: string;
    players: {
      playerId: string;
      number: number;
    }[];
    matches: string[];
    standings: {
      playerId: string | mongoose.Types.ObjectId | null;
      points: number;
      legsWon: number;
      legsLost: number;
      legDifference: number;
      rank: number;
    }[];
  }[];
  knockout: {
    rounds: {
      matches: {
        _id: string;
        player1: string | null;
        player2: string | null;
        matchReference: string | null;
      }[];
    }[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    await connectMongo();
    const { TournamentModel, MatchModel, BoardModel } = getModels();
    const { code } = await params;

    const tournament: Tournament | null = await TournamentModel.findOne({ code }).lean<Tournament>();
    if (!tournament) {
      return NextResponse.json({ error: "Torna nem található" }, { status: 404 });
    }


    // Log raw standings for debugging
    console.log("Raw standings:", tournament.groups.map((g) => g.standings));

    // Calculate qualifying players
    const totalPlayers = tournament.players.length;
    const qualifyingPlayersCount = Math.pow(2, Math.floor(Math.log2(totalPlayers)));
    const eliminatedPlayersCount = totalPlayers - qualifyingPlayersCount;

    // Get all standings, validate playerId
    const allStandings = tournament.groups.flatMap((group) =>
      group.standings
        .filter(
          (standing): standing is {
            playerId: string;
            points: number;
            legsWon: number;
            legsLost: number;
            legDifference: number;
            rank: number;
          } =>
            standing.playerId != null &&
            (typeof standing.playerId === "string" || standing.playerId instanceof mongoose.Types.ObjectId) &&
            mongoose.Types.ObjectId.isValid(standing.playerId.toString())
        )
        .map((standing) => ({
          ...standing,
          playerId: standing.playerId.toString(),
          groupId: group._id,
        }))
    );

    console.log("Filtered standings:", allStandings);

    if (allStandings.length < qualifyingPlayersCount) {
      console.error("Insufficient valid standings:", {
        count: allStandings.length,
        required: qualifyingPlayersCount,
        standings: allStandings,
      });
      return NextResponse.json(
        { error: "Nem elegendő érvényes játékos adat a csoportkörben" },
        { status: 400 }
      );
    }

    // Calculate eliminated players
    const groupsCount = tournament.groups.length;
    const groupSizes = tournament.groups.map((group) => group.players?.length || 0);
    const totalGroupPlayers = groupSizes.reduce((sum: number, size: number) => sum + size, 0);

    const eliminationsPerGroup = groupSizes.map((size: number) =>
      Math.round((size / totalGroupPlayers) * eliminatedPlayersCount)
    );

    let currentTotal = eliminationsPerGroup.reduce((sum: number, count: number) => sum + count, 0);
    while (currentTotal !== eliminatedPlayersCount) {
      const diff = eliminatedPlayersCount - currentTotal;
      const indexToAdjust =
        diff > 0
          ? groupSizes.findIndex((size: number, i: number) => eliminationsPerGroup[i] < size)
          : groupSizes.findIndex((size: number, i: number) => eliminationsPerGroup[i] > 0);
      if (indexToAdjust === -1) break;
      eliminationsPerGroup[indexToAdjust] += diff > 0 ? 1 : -1;
      currentTotal += diff > 0 ? 1 : -1;
    }

    // Collect eliminated player IDs
    const eliminatedPlayerIds: string[] = tournament.groups.reduce(
      (acc: string[], group, index: number) => {
        const eliminatedInGroup = eliminationsPerGroup[index] || 0;
        if (eliminatedInGroup <= 0 || !group.standings) return acc;
        const sortedStandings = [...group.standings]
          .filter(
            (s): s is {
              playerId: string | mongoose.Types.ObjectId;
              points: number;
              legsWon: number;
              legsLost: number;
              legDifference: number;
              rank: number;
            } =>
              s.playerId != null &&
              (typeof s.playerId === "string" || s.playerId instanceof mongoose.Types.ObjectId) &&
              mongoose.Types.ObjectId.isValid(s.playerId.toString())
          )
          .sort((a, b) => (a.rank || 0) - (b.rank || 0));
        const groupEliminated = sortedStandings
          .slice(-eliminatedInGroup)
          .map((s) => s.playerId.toString());
        return [...acc, ...groupEliminated];
      },
      []
    );

    // Get qualifying standings
    const qualifyingStandings = allStandings
      .filter((standing) => !eliminatedPlayerIds.includes(standing.playerId))
      .sort((a, b) => {
        if (a.groupId !== b.groupId) return a.groupId < b.groupId ? -1 : 1;
        return (a.rank || 0) - (b.rank || 0);
      });

    if (qualifyingStandings.length < qualifyingPlayersCount) {
      console.error("Insufficient qualifying players:", {
        count: qualifyingStandings.length,
        required: qualifyingPlayersCount,
        players: qualifyingStandings,
      });
      return NextResponse.json(
        { error: "Nem elegendő kvalifikált játékos a kieséses szakaszhoz" },
        { status: 400 }
      );
    }

    // Group standings by group and sort by rank
    const groupStandings = tournament.groups.map((group) => ({
      groupId: group._id,
      standings: qualifyingStandings
        .filter((s) => s.groupId === group._id)
        .slice(0, Math.ceil(qualifyingPlayersCount / groupsCount))
        .sort((a, b) => (a.rank || 0) - (b.rank || 0)),
    }));

    // Create pairings: Group 1's 1st vs Group 2's last, etc.
    const pairings: { player1: string; player2: string }[] = [];
    const group1 = groupStandings[0].standings;
    const group2 = groupStandings[1].standings.reverse();
    for (let i = 0; i < Math.min(group1.length, group2.length); i++) {
      if (group1[i] && group2[i]) {
        pairings.push({
          player1: group1[i].playerId,
          player2: group2[i].playerId,
        });
      }
    }

    // Get boards
    const boards = await BoardModel.find({ tournamentId: tournament._id }).lean();
    if (boards.length < tournament.boardCount) {
      return NextResponse.json({ error: "Nem elegendő tábla található" }, { status: 400 });
    }

    // Generate first-round matches
    const matches = [];
    const knockoutMatches: any[] = [];
    for (let i = 0; i < pairings.length; i++) {
      const { player1, player2 } = pairings[i];
      const boardId = boards[i % boards.length].boardId;
      const scorer = eliminatedPlayerIds[i % eliminatedPlayerIds.length] || null;
      const match = new MatchModel({
        tournamentId: new mongoose.Types.ObjectId(tournament._id),
        boardId,
        player1: new mongoose.Types.ObjectId(player1),
        player2: new mongoose.Types.ObjectId(player2),
        scorer: scorer ? new mongoose.Types.ObjectId(scorer) : null,
        status: "pending",
        round: 1,
        isKnockout: true,
        stats: { player1: { legsWon: 0 }, player2: { legsWon: 0 } },
      });
      matches.push(match);
      knockoutMatches.push({
        _id: new mongoose.Types.ObjectId(),
        player1,
        player2,
        matchReference: match._id,
      });
    }

    if (matches.length === 0) {
      console.error("No matches generated:", { pairings });
      return NextResponse.json(
        { error: "Nem sikerült mérkőzéseket generálni" },
        { status: 400 }
      );
    }

    // Save matches
    await MatchModel.insertMany(matches);

    // Initialize knockout rounds
    const roundsCount = Math.log2(qualifyingPlayersCount);
    const knockoutRounds = Array.from({ length: roundsCount }, (_, i) => {
      if (i === 0) {
        return { matches: knockoutMatches as any[] };
      }
      // Pre-create matches for future rounds with no players
      const matchCount = qualifyingPlayersCount / Math.pow(2, i + 1);
      return {
        matches: Array.from({ length: matchCount }, () => ({
          _id: new mongoose.Types.ObjectId(),
          player1: null,
          player2: null,
          matchReference: null,
        })),
      };
    });

    // Update tournament
    await TournamentModel.updateOne(
      { code },
      {
        $set: {
          knockout: { rounds: knockoutRounds },
          status: "knockout",
        },
      }
    );

    // Update board statuses
    await Promise.all(
      boards.slice(0, Math.min(matches.length, boards.length)).map((board) =>
        BoardModel.updateOne(
          { _id: board._id },
          { status: "waiting", updatedAt: new Date() }
        )
      )
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error generating knockout matches:", error, {
      tournamentCode: (await params).code,
    });
    return NextResponse.json(
      { error: error.message || "Nem sikerült a kieséses szakasz generálása" },
      { status: 500 }
    );
  }
}