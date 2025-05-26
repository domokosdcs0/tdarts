import { NextResponse, NextRequest } from "next/server";
import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import mongoose from "mongoose";
import { PopulatedTournament } from "@/types/tournamentSchema";
import { PopulatedMatch } from "@/types/tournamentSchema";

export async function POST(req: NextRequest, { params }: { params: { code: string } }) {
  try {
    await connectMongo();
    const { code } = params;
    const { TournamentModel, PlayerModel, PlayerTournamentHistoryModel, MatchModel } = getModels();

    // Find tournament with populated fields
    const tournament = await TournamentModel.findOne({ code })
      .populate("players")
      .populate({
        path: "groups.matches",
        model: MatchModel,
        populate: [
          { path: "player1", model: PlayerModel, select: "_id name" },
          { path: "player2", model: PlayerModel, select: "_id name" },
          { path: "winner", model: PlayerModel, select: "_id" },
        ],
      })
      .populate({
        path: "knockout.rounds.matches.matchReference",
        model: MatchModel,
        populate: [
          { path: "player1", model: PlayerModel, select: "_id name" },
          { path: "player2", model: PlayerModel, select: "_id name" },
          { path: "winner", model: PlayerModel, select: "_id" },
        ],
      })
      .lean<PopulatedTournament>();

    if (!tournament) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }

    if (tournament.status !== "knockout") {
      return NextResponse.json(
        { error: "Tournament must be in knockout stage to finish" },
        { status: 400 }
      );
    }

    // Compute final standings
    const standings: { playerId: string; rank: number }[] = [];
    const playerEliminations: Map<string, number> = new Map();

    // Step 1: Identify group stage eliminations
    const totalPlayers = tournament.players.length;
    const nearestPowerOf2 = Math.pow(2, Math.floor(Math.log2(totalPlayers))); // e.g., 16 for 24
    const playersToEliminate = totalPlayers - nearestPowerOf2; // e.g., 8 for 24
    const groupCount = tournament.groups.length;
    const playersPerGroup = Math.ceil(totalPlayers / groupCount); // Approximate players per group
    const eliminationsPerGroup = Math.ceil(playersToEliminate / groupCount); // Distribute eliminations

    const playersAdvanced = new Set<string>();
    for (const group of tournament.groups) {
      const sortedStandings = group.standings.sort(
        (a, b) => (b.points - a.points) || (b.legDifference - a.legDifference)
      );
      const advanceCount = Math.max(0, playersPerGroup - eliminationsPerGroup); // Players to advance per group
      sortedStandings.slice(0, advanceCount).forEach((s) => {
        playersAdvanced.add(s.playerId.toString());
      });
    }

    // Ensure exactly nearestPowerOf2 players advance
    if (playersAdvanced.size > nearestPowerOf2) {
      // If too many advanced, trim based on points and legDifference across all groups
      const allStandings = tournament.groups
        .flatMap((group) => group.standings)
        .sort((a, b) => (b.points - a.points) || (b.legDifference - a.legDifference))
        .slice(0, nearestPowerOf2);
      playersAdvanced.clear();
      for (const s of allStandings) {
        playersAdvanced.add(s.playerId.toString());
      }
    } else if (playersAdvanced.size < nearestPowerOf2) {
      return NextResponse.json(
        { error: "Not enough players advanced from groups" },
        { status: 400 }
      );
    }

    // Assign ranks to eliminated players (e.g., 17–24 for 24 players)
    const groupEliminated = tournament.players
      .map((p) => p._id.toString())
      .filter((p) => !playersAdvanced.has(p));
    groupEliminated.forEach((playerId, index) => {
      playerEliminations.set(playerId, nearestPowerOf2 + 1 + index); // Ranks 17–24 for 8 eliminated
    });

    // Step 2: Process knockout rounds
    const knockoutRounds = tournament.knockout.rounds;
    let currentRank = nearestPowerOf2; // Start at 16 for 8 advancing players

    for (let roundIndex = 0; roundIndex < knockoutRounds.length; roundIndex++) {
      const matches = knockoutRounds[roundIndex].matches;
      const isFinalRound = roundIndex === knockoutRounds.length - 1;

      for (const match of matches) {
        const matchRef = match.matchReference;
        if (!matchRef || !matchRef.winner) {
          return NextResponse.json(
            { error: `Incomplete match in round ${roundIndex + 1}` },
            { status: 400 }
          );
        }

        if (!match.player1 || !match.player2) {
          return NextResponse.json(
            { error: `Invalid players in match in round ${roundIndex + 1}` },
            { status: 400 }
          );
        }

        const winnerId = matchRef.winner._id.toString();
        const loserId =
          winnerId === match.player1._id.toString()
            ? match.player2._id.toString()
            : match.player1._id.toString();

        if (!playerEliminations.has(loserId)) {
          if (isFinalRound) {
            // Runner-up: rank 2
            playerEliminations.set(loserId, 2);
          } else {
            // Eliminated in earlier rounds (e.g., 3–4, 5–8)
            const playersInRound = nearestPowerOf2 / Math.pow(2, roundIndex);
            const rankStart = playersInRound / 2 + 1;
            const rankEnd = playersInRound;
            playerEliminations.set(
              loserId,
              rankStart + (playerEliminations.size % (rankEnd - rankStart + 1))
            );
          }
        }
      }

      if (isFinalRound) {
        // Winner: rank 1
        const finalMatch = matches[0];
        if (finalMatch.matchReference && finalMatch.matchReference.winner) {
          const winnerId = finalMatch.matchReference.winner._id.toString();
          playerEliminations.set(winnerId, 1);
        } else {
          return NextResponse.json(
            { error: "Final match is incomplete" },
            { status: 400 }
          );
        }
      }
    }

    // Verify all players have ranks
    tournament.players.forEach((player) => {
      const playerId = player._id.toString();
      if (!playerEliminations.has(playerId)) {
        playerEliminations.set(playerId, nearestPowerOf2); // Fallback rank
      }
      standings.push({ playerId, rank: playerEliminations.get(playerId)! });
    });

    // Step 3: Compute stats for each player
    const playerStats = new Map<
      string,
      {
        average: number;
        checkoutRate: number;
        legsWon: number;
        legsPlayed: number;
        matchesWon: number;
        matchesPlayed: number;
      }
    >();

    // Initialize stats
    tournament.players.forEach((player) => {
      playerStats.set(player._id.toString(), {
        average: 0,
        checkoutRate: 0,
        legsWon: 0,
        legsPlayed: 0,
        matchesWon: 0,
        matchesPlayed: 0,
      });
    });

    // Aggregate stats from matches
    const allMatches = [
      ...tournament.groups.flatMap((group) => group.matches),
      ...tournament.knockout.rounds.flatMap((round) =>
        round.matches
          .map((m) => m.matchReference)
          .filter((m): m is PopulatedMatch => m !== null)
      ),
    ];

    for (const match of allMatches) {
      const player1Id = match.player1._id.toString();
      const player2Id = match.player2._id.toString();

      // Update match stats
      const p1Stats = playerStats.get(player1Id)!;
      const p2Stats = playerStats.get(player2Id)!;

      p1Stats.matchesPlayed += 1;
      p2Stats.matchesPlayed += 1;

      if (match.winner) {
        const winnerId = match.winner._id.toString();
        if (winnerId === player1Id) p1Stats.matchesWon += 1;
        else if (winnerId === player2Id) p2Stats.matchesWon += 1;
      }

      // Process legs
      for (const leg of match.legs) {
        p1Stats.legsPlayed += 1;
        p2Stats.legsPlayed += 1;

        if (leg.winnerId) {
          const legWinnerId = leg.winnerId.toString();
          if (legWinnerId === player1Id) p1Stats.legsWon += 1;
          else if (legWinnerId === player2Id) p2Stats.legsWon += 1;
        }

        // Compute average and checkout rate
        const p1Throws = leg.player1Throws || [];
        const p2Throws = leg.player2Throws || [];
        const p1TotalScore = p1Throws.reduce((sum, t) => sum + (t.score || 0), 0);
        const p2TotalScore = p2Throws.reduce((sum, t) => sum + (t.score || 0), 0);
        const p1Darts = p1Throws.reduce((sum, t) => sum + (t.darts || 0), 0);
        const p2Darts = p2Throws.reduce((sum, t) => sum + (t.darts || 0), 0);

        if (p1Darts > 0) {
          const legAverage = p1TotalScore / (p1Darts / 3);
          p1Stats.average =
            p1Stats.legsPlayed > 1
              ? (p1Stats.average * (p1Stats.legsPlayed - 1) + legAverage) /
                p1Stats.legsPlayed
              : legAverage;
        }
        if (p2Darts > 0) {
          const legAverage = p2TotalScore / (p2Darts / 3);
          p2Stats.average =
            p2Stats.legsPlayed > 1
              ? (p2Stats.average * (p2Stats.legsPlayed - 1) + legAverage) /
                p2Stats.legsPlayed
              : legAverage;
        }

        if (leg.checkoutDarts && leg.doubleAttempts) {
          const checkoutPlayerId = leg.highestCheckout?.playerId.toString();
          const checkoutRate = leg.checkoutDarts / leg.doubleAttempts;
          if (checkoutPlayerId === player1Id) {
            p1Stats.checkoutRate =
              p1Stats.legsPlayed > 1
                ? (p1Stats.checkoutRate * (p1Stats.legsPlayed - 1) + checkoutRate) /
                  p1Stats.legsPlayed
                : checkoutRate;
          } else if (checkoutPlayerId === player2Id) {
            p2Stats.checkoutRate =
              p2Stats.legsPlayed > 1
                ? (p2Stats.checkoutRate * (p2Stats.legsPlayed - 1) + checkoutRate) /
                  p2Stats.legsPlayed
                : checkoutRate;
          }
        }
      }
    }

    // Step 4: Update PlayerTournamentHistory
    for (const player of tournament.players) {
      const playerId = player._id.toString();
      const stats = playerStats.get(playerId)!;
      const placement = playerEliminations.get(playerId)!;

      await PlayerTournamentHistoryModel.updateOne(
        { playerId: new mongoose.Types.ObjectId(playerId), tournamentId: tournament._id },
        {
          $set: {
            placement,
            stats: {
              average: stats.average,
              checkoutRate: stats.checkoutRate,
              legsWon: stats.legsWon,
              legsPlayed: stats.legsPlayed,
              matchesWon: stats.matchesWon,
              matchesPlayed: stats.matchesPlayed,
            },
            updatedAt: new Date(),
          },
        }
      );
    }

    // Step 5: Update Player overallStats
    for (const player of tournament.players) {
      const playerId = player._id.toString();
      const stats = playerStats.get(playerId)!;

      const playerDoc = await PlayerModel.findById(playerId);
      if (playerDoc) {
        const prevStats = playerDoc.overallStats;
        const prevMatches = prevStats.totalMatchesPlayed || 0;
        const newMatches = stats.matchesPlayed;

        // Weighted average for stats
        const newAverage =
          prevMatches > 0
            ? (prevStats.average * prevMatches + stats.average * newMatches) /
              (prevMatches + newMatches)
            : stats.average;

        const newCheckoutRate =
          prevMatches > 0
            ? (prevStats.checkoutRate * prevMatches + stats.checkoutRate * newMatches) /
              (prevMatches + newMatches)
            : stats.checkoutRate;

        await PlayerModel.updateOne(
          { _id: playerId },
          {
            $set: {
              overallStats: {
                average: newAverage,
                checkoutRate: newCheckoutRate,
                totalLegsWon: (prevStats.totalLegsWon || 0) + stats.legsWon,
                totalLegsPlayed: (prevStats.totalLegsPlayed || 0) + stats.legsPlayed,
                totalMatchesWon: (prevStats.totalMatchesWon || 0) + stats.matchesWon,
                totalMatchesPlayed: prevMatches + newMatches,
              },
              updatedAt: new Date(),
            },
          }
        );
      }
    }

    // Step 6: Update tournament
    await TournamentModel.updateOne(
      { _id: tournament._id },
      {
        $set: {
          status: "finished",
          standing: standings,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json(
      { message: "Tournament finished successfully", standings },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error finishing tournament:", error);
    return NextResponse.json(
      { error: "Failed to finish tournament" },
      { status: 500 }
    );
  }
}