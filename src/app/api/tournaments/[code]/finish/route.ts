import { NextResponse, NextRequest } from "next/server";
import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import mongoose from "mongoose";
import { PopulatedTournament } from "@/types/tournamentSchema";
import { PopulatedMatch } from "@/types/matchSchema";

export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  try {
    await connectMongo();
    const { code } = await params;
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
          { path: "winner", model: PlayerModel, select: "_id name" },
        ],
      })
      .populate({
        path: "knockout.rounds.matches.matchReference",
        model: MatchModel,
        populate: [
          { path: "player1", model: PlayerModel, select: "_id name" },
          { path: "player2", model: PlayerModel, select: "_id name" },
          { path: "winner", model: PlayerModel, select: "_id name" },
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
    const nearestPowerOf2 = Math.pow(2, Math.floor(Math.log2(totalPlayers)));
    const playersToEliminate = totalPlayers - nearestPowerOf2;
    const groupCount = tournament.groups.length;
    const playersPerGroup = Math.ceil(totalPlayers / groupCount);
    const eliminationsPerGroup = Math.ceil(playersToEliminate / groupCount);

    const playersAdvanced = new Set<string>();
    for (const group of tournament.groups) {
      const sortedStandings = group.standings.sort(
        (a, b) => (b.points - a.points) || (b.legDifference - a.legDifference)
      );
      const advanceCount = Math.max(0, playersPerGroup - eliminationsPerGroup);
      sortedStandings.slice(0, advanceCount).forEach((s) => {
        playersAdvanced.add(s.playerId.toString());
      });
    }

    // Ensure exactly nearestPowerOf2 players advance
    if (playersAdvanced.size > nearestPowerOf2) {
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

    // Assign ranks to eliminated players
    const groupEliminated = tournament.players
      .map((p) => p._id.toString())
      .filter((p) => !playersAdvanced.has(p));
    groupEliminated.forEach((playerId, index) => {
      playerEliminations.set(playerId, nearestPowerOf2 + 1 + index);
    });

    // Step 2: Process knockout rounds
    const knockoutRounds = tournament.knockout.rounds;

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
            playerEliminations.set(loserId, 2);
          } else {
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
        playerEliminations.set(playerId, nearestPowerOf2);
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
        highestCheckout: number;
        oneEighties: number;
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
        highestCheckout: 0,
        oneEighties: 0,
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
    ] as PopulatedMatch[];

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

      // Initialize stats from match.stats as fallback
      p1Stats.average = match.stats.player1.average || 0;
      p2Stats.average = match.stats.player2.average || 0;
      p1Stats.highestCheckout = match.stats.player1.highestCheckout || 0;
      p2Stats.highestCheckout = match.stats.player2.highestCheckout || 0;
      p1Stats.oneEighties = match.stats.player1.oneEighties || 0;
      p2Stats.oneEighties = match.stats.player2.oneEighties || 0;

      // Aggregate stats from legs, overriding fallbacks where applicable
      if (match.legs && match.legs.length > 0) {
        let p1LegAverageSum = 0;
        let p2LegAverageSum = 0;
        let p1LegCount = 0;
        let p2LegCount = 0;

        for (const leg of match.legs) {
          // Highest checkout
          if (leg.highestCheckout) {
            const checkoutPlayerId = leg.highestCheckout.playerId?.toString();
            if (checkoutPlayerId === player1Id) {
              p1Stats.highestCheckout = Math.max(
                p1Stats.highestCheckout,
                leg.highestCheckout.score || 0
              );
            } else if (checkoutPlayerId === player2Id) {
              p2Stats.highestCheckout = Math.max(
                p2Stats.highestCheckout,
                leg.highestCheckout.score || 0
              );
            }
          }

          // One-eighties
          if (leg.oneEighties) {
            p1Stats.oneEighties = Math.max(
              p1Stats.oneEighties,
              leg.oneEighties.player1?.length || 0
            );
            p2Stats.oneEighties = Math.max(
              p2Stats.oneEighties,
              leg.oneEighties.player2?.length || 0
            );
          }

          p1Stats.legsPlayed += 1;
          p2Stats.legsPlayed += 1;

          if (leg.winnerId) {
            const legWinnerId = leg.winnerId.toString();
            if (legWinnerId === player1Id) p1Stats.legsWon += 1;
            else if (legWinnerId === player2Id) p2Stats.legsWon += 1;
          }

          // Compute average from throws
          const p1Throws = leg.player1Throws || [];
          const p2Throws = leg.player2Throws || [];
          const p1TotalScore = p1Throws.reduce((sum, t) => sum + (t.score || 0), 0);
          const p2TotalScore = p2Throws.reduce((sum, t) => sum + (t.score || 0), 0);
          const p1Darts = p1Throws.reduce((sum, t) => sum + (t.darts || 0), 0);
          const p2Darts = p2Throws.reduce((sum, t) => sum + (t.darts || 0), 0);

          if (p1Darts > 0) {
            const legAverage = p1TotalScore / (p1Darts / 3);
            p1LegAverageSum += legAverage;
            p1LegCount += 1;
          }
          if (p2Darts > 0) {
            const legAverage = p2TotalScore / (p2Darts / 3);
            p2LegAverageSum += legAverage;
            p2LegCount += 1;
          }

          // Checkout rate
          if (leg.checkoutDarts && leg.doubleAttempts) {
            const checkoutPlayerId = leg.highestCheckout?.playerId?.toString();
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

        // Update average from legs if available
        if (p1LegCount > 0) {
          p1Stats.average = p1LegAverageSum / p1LegCount;
        }
        if (p2LegCount > 0) {
          p2Stats.average = p2LegAverageSum / p2LegCount;
        }
      }

      // Update match stats
      await MatchModel.updateOne(
        { _id: match._id },
        {
          $set: {
            'stats.player1.average': p1Stats.average,
            'stats.player1.highestCheckout': p1Stats.highestCheckout,
            'stats.player1.oneEighties': p1Stats.oneEighties,
            'stats.player2.average': p2Stats.average,
            'stats.player2.highestCheckout': p2Stats.highestCheckout,
            'stats.player2.oneEighties': p2Stats.oneEighties,
          },
        }
      );
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
              oneEighties: stats.oneEighties,
              highestCheckout: stats.highestCheckout,
            },
            updatedAt: new Date(),
          },
        },
        { upsert: true } // Ensure document is created if it doesn't exist
      );
    }

    // Step 5: Update Player overallStats and bestPlacement
    for (const player of tournament.players) {
      const playerId = player._id.toString();
      const stats = playerStats.get(playerId)!;
      const placement = playerEliminations.get(playerId)!;
      const isWinner = placement === 1;

      const playerDoc = await PlayerModel.findById(playerId);
      if (playerDoc) {
        const prevStats = playerDoc.overallStats || {};
        const prevMatches = prevStats.totalMatchesPlayed || 0;

        // Weighted average for stats
        const newAverage =
          prevMatches > 0
            ? (prevStats.average * prevMatches + stats.average * stats.matchesPlayed) /
              (prevMatches + stats.matchesPlayed)
            : stats.average;

        const newCheckoutRate =
          prevMatches > 0
            ? (prevStats.checkoutRate * prevMatches + stats.checkoutRate * stats.matchesPlayed) /
              (prevMatches + stats.matchesPlayed)
            : stats.checkoutRate;

        // Update bestPlacement
        const currentBestPlacement = prevStats.bestPlacement || Number.MAX_SAFE_INTEGER;
        const newBestPlacement = Math.min(currentBestPlacement, placement);

        await PlayerModel.updateOne(
          { _id: playerId },
          {
            $set: {
              bestPlacement: newBestPlacement,
              overallStats: {
                average: newAverage,
                checkoutRate: newCheckoutRate,
                totalLegsWon: (prevStats.totalLegsWon || 0) + stats.legsWon,
                totalLegsPlayed: (prevStats.totalLegsPlayed || 0) + stats.legsPlayed,
                totalMatchesWon: (prevStats.totalMatchesWon || 0) + stats.matchesWon,
                totalMatchesPlayed: prevMatches + stats.matchesPlayed,
                totalTournamentsPlayed: (prevStats.totalTournamentsPlayed || 0) + 1,
                totalTournamentsWon: (prevStats.totalTournamentsWon || 0) + (isWinner ? 1 : 0),
                totalHighestCheckout: Math.max(
                  prevStats.totalHighestCheckout || 0,
                  stats.highestCheckout
                ),
                totalOneEighties: (prevStats.totalOneEighties || 0) + stats.oneEighties,
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