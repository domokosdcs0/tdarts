import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { Match } from "@/types/matchSchema";
import { Tournament } from "@/types/tournamentSchema";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tournamentId: string; matchId: string }> }
) {
  try {
    await connectMongo();
    const { MatchModel, TournamentModel, BoardModel } = getModels();
    const { tournamentId, matchId } = await params;
    const { winnerId, player1LegsWon, player2LegsWon, stats, highestCheckout, oneEighties } =
      await request.json();

    console.log("Received data:", {
      tournamentId,
      matchId,
      winnerId,
      player1LegsWon,
      player2LegsWon,
      stats,
      highestCheckout,
      oneEighties,
    });

    // Validate required fields
    if (
      !winnerId ||
      player1LegsWon == null ||
      player2LegsWon == null ||
      !stats ||
      !highestCheckout ||
      !oneEighties
    ) {
      return NextResponse.json({ error: "Hiányzó adatok" }, { status: 400 });
    }

    // Validate highestCheckout and oneEighties structure
    if (
      typeof highestCheckout.player1 !== "number" ||
      typeof highestCheckout.player2 !== "number" ||
      !Number.isInteger(highestCheckout.player1) ||
      !Number.isInteger(highestCheckout.player2) ||
      highestCheckout.player1 < 0 ||
      highestCheckout.player2 < 0
    ) {
      return NextResponse.json({ error: "Érvénytelen highestCheckout adat" }, { status: 400 });
    }

    if (
      typeof oneEighties.player1.count !== "number" ||
      typeof oneEighties.player2.count !== "number" ||
      !Array.isArray(oneEighties.player1.darts) ||
      !Array.isArray(oneEighties.player2.darts) ||
      !oneEighties.player1.darts.every((d: any) => Number.isInteger(d) && d > 0) ||
      !oneEighties.player2.darts.every((d: any) => Number.isInteger(d) && d > 0)
    ) {
      return NextResponse.json({ error: "Érvénytelen oneEighties adat" }, { status: 400 });
    }

    // Find the match
    const match = await MatchModel.findById(matchId)
      .populate("player1", "name")
      .populate("player2", "name")
      .populate("scorer", "name");
    if (!match) {
      return NextResponse.json({ error: "Mérkőzés nem található" }, { status: 404 });
    }
    if (match.status !== "ongoing") {
      return NextResponse.json(
        { error: "A mérkőzés nem játszható állapotban van" },
        { status: 400 }
      );
    }

    console.log("Match players:", {
      player1Id: match.player1._id.toString(),
      player2Id: match.player2._id.toString(),
      winnerId,
    });

    // Validate winnerId
    if (![match.player1._id.toString(), match.player2._id.toString()].includes(winnerId)) {
      console.error("Invalid winnerId:", {
        winnerId,
        player1Id: match.player1._id.toString(),
        player2Id: match.player2._id.toString(),
      });
      return NextResponse.json({ error: "Érvénytelen győztes ID" }, { status: 400 });
    }

    // Update match details
    match.status = "finished";
    match.winner = new mongoose.Types.ObjectId(winnerId);
    match.stats = {
      player1: {
        legsWon: player1LegsWon,
        dartsThrown: stats.player1.dartsThrown || 0,
        average: stats.player1.average || 0,
      },
      player2: {
        legsWon: player2LegsWon,
        dartsThrown: stats.player2.dartsThrown || 0,
        average: stats.player2.average || 0,
      },
    };
    match.highestCheckout = {
      player1: highestCheckout.player1 || 0,
      player2: highestCheckout.player2 || 0,
    };
    match.oneEighties = {
      player1: {
        count: oneEighties.player1.count || 0,
        darts: oneEighties.player1.darts || [],
      },
      player2: {
        count: oneEighties.player2.count || 0,
        darts: oneEighties.player2.darts || [],
      },
    };

    if (!match.legs) {
      match.legs = [];
    }

    await match.save();

    // Fetch tournament using tournamentCode
    const tournament = await TournamentModel.findOne({ _id: tournamentId });
    if (!tournament) {
      return NextResponse.json({ error: "Torna nem található" }, { status: 404 });
    }

    if (match.isKnockout) {
      // Handle knockout stage
      const currentRoundIndex = (match.round || 1) - 1; // 1-based to 0-based
      const currentRound = tournament.knockout.rounds[currentRoundIndex] as Tournament["knockout"]["rounds"][number];
      if (!currentRound) {
        return NextResponse.json({ error: "Érvénytelen kör" }, { status: 400 });
      }

      // Find the current match in knockout structure
      const knockoutMatch = currentRound.matches.find(
        (m) => m.matchReference?.toString() === matchId
      );
      if (!knockoutMatch) {
        return NextResponse.json(
          { error: "Mérkőzés nem található a kieséses körben" },
          { status: 400 }
        );
      }

      // Determine next round and match position
      const nextRoundIndex = currentRoundIndex + 1;
      const matchIndex = currentRound.matches.findIndex(
        (m) => m.matchReference?.toString() === matchId
      );
      const nextMatchIndex = Math.floor(matchIndex / 2); // Two matches feed into one
      const isFirstWinner = matchIndex % 2 === 0; // Even index -> player1, odd -> player2

      if (nextRoundIndex < tournament.knockout.rounds.length) {
        const nextRound = tournament.knockout.rounds[nextRoundIndex];
        if (!nextRound.matches[nextMatchIndex]) {
          nextRound.matches[nextMatchIndex] = {
            _id: new mongoose.Types.ObjectId(),
            player1: null,
            player2: null,
            matchReference: null,
          };
        }

        const nextKnockoutMatch = nextRound.matches[nextMatchIndex];
        if (isFirstWinner) {
          nextKnockoutMatch.player1 = new mongoose.Types.ObjectId(winnerId);
        } else {
          nextKnockoutMatch.player2 = new mongoose.Types.ObjectId(winnerId);
        }

        // If both players are assigned, create a new match
        if (nextKnockoutMatch.player1 && nextKnockoutMatch.player2) {
          const boards = await BoardModel.find({ tournamentId: match.tournamentId }).lean();
          if (boards.length < tournament.boardCount) {
            return NextResponse.json({ error: "Nem elegendő tábla található" }, { status: 400 });
          }

          // Assign board: odd rounds (1, 3, ...) on board 1, even rounds (2, 4, ...) on board 2
          const boardIndex = nextRoundIndex % 2 === 0 ? 1 : 0;
          const boardId = boards[boardIndex]?.boardId;
          if (!boardId) {
            return NextResponse.json({ error: "Nincs elérhető tábla" }, { status: 400 });
          }

          const newMatch = new MatchModel({
            tournamentId: match.tournamentId,
            boardId,
            player1: nextKnockoutMatch.player1,
            player2: nextKnockoutMatch.player2,
            scorer: null,
            status: "pending",
            round: nextRoundIndex + 1,
            isKnockout: true,
            stats: { player1: { legsWon: 0 }, player2: { legsWon: 0 } },
          });

          const savedMatch = await newMatch.save();
          nextKnockoutMatch.matchReference = savedMatch._id;

          const status = await MatchModel.findOne({
            boardId,
            status: "pending",
          });
          if (!status) {
            await BoardModel.findOneAndUpdate(
              { boardId },
              { status: "idle", updatedAt: new Date() }
            );
          } else {
            await BoardModel.findOneAndUpdate(
              { boardId },
              { status: "waiting", updatedAt: new Date() }
            );
          }
        }

        await tournament.save();
      }

      // Check if tournament is finished
      const finalRound = tournament.knockout.rounds[tournament.knockout.rounds.length - 1];
      if (finalRound.matches.length === 1 && finalRound.matches[0].matchReference) {
        const finalMatch = await MatchModel.findById(
          finalRound.matches[0].matchReference
        ).lean<Match>();
        if (finalMatch && finalMatch.status === "finished") {
          await TournamentModel.updateOne(
            { _id: match.tournamentId },
            { $set: { status: "finished" } }
          );
        }
      }
    } else {
      // Handle group stage
      const groupIndex = match.round || 0;
      const group = tournament.groups[groupIndex];
      if (!group) {
        return NextResponse.json({ error: "Csoport nem található" }, { status: 404 });
      }

      // Initialize standings if empty
      if (!group.standings || group.standings.length === 0) {
        group.standings = group.players.map((p: any) => ({
          playerId: p.playerId,
          points: 0,
          legsWon: 0,
          legsLost: 0,
          legDifference: 0,
          rank: 0,
        }));
        if (
          !group.standings.some(
            (s: any) => s.playerId.toString() === match.player1._id.toString()
          )
        ) {
          group.standings.push({
            playerId: match.player1._id,
            points: 0,
            legsWon: 0,
            legsLost: 0,
            legDifference: 0,
            rank: 0,
          });
        }
        if (
          !group.standings.some(
            (s: any) => s.playerId.toString() === match.player2._id.toString()
          )
        ) {
          group.standings.push({
            playerId: match.player2._id,
            points: 0,
            legsWon: 0,
            legsLost: 0,
            legDifference: 0,
            rank: 0,
          });
        }
      }

      // Update standings
      const player1Standing = group.standings.find(
        (s: any) => s.playerId.toString() === match.player1._id.toString()
      );
      const player2Standing = group.standings.find(
        (s: any) => s.playerId.toString() === match.player2._id.toString()
      );

      if (player1Standing && player2Standing) {
        // Update points
        if (winnerId === match.player1._id.toString()) {
          player1Standing.points = (player1Standing.points || 0) + 2;
        } else if (winnerId === match.player2._id.toString()) {
          player2Standing.points = (player2Standing.points || 0) + 2;
        }

        // Update legs and leg difference
        player1Standing.legsWon = (player1Standing.legsWon || 0) + player1LegsWon;
        player1Standing.legsLost = (player1Standing.legsLost || 0) + player2LegsWon;
        player1Standing.legDifference = player1Standing.legsWon - player1Standing.legsLost;

        player2Standing.legsWon = (player2Standing.legsWon || 0) + player2LegsWon;
        player2Standing.legsLost = (player2Standing.legsLost || 0) + player1LegsWon;
        player2Standing.legDifference = player2Standing.legsWon - player2Standing.legsLost;

        // Fetch match history for head-to-head results
        const groupMatches = await MatchModel.find({
          tournamentId: match.tournamentId,
          round: groupIndex,
          status: "finished",
          $or: [
            { player1: { $in: group.players.map((p: any) => p.playerId) } },
            { player2: { $in: group.players.map((p: any) => p.playerId) } },
          ],
        }).lean();

        // Sort standings and assign ranks
        const sortedStandings = [...group.standings].sort((a: any, b: any) => {
          // Sort by points
          if (a.points !== b.points) {
            return b.points - a.points; // Descending
          }

          // Sort by leg difference
          if (a.legDifference !== b.legDifference) {
            return b.legDifference - a.legDifference; // Descending
          }

          // Check head-to-head result
          const headToHeadMatch = groupMatches.find(
            (m: any) =>
              (m.player1.toString() === a.playerId.toString() &&
                m.player2.toString() === b.playerId.toString()) ||
              (m.player1.toString() === b.playerId.toString() &&
                m.player2.toString() === a.playerId.toString())
          );

          if (headToHeadMatch) {
            if (headToHeadMatch.winner.toString() === a.playerId.toString()) {
              return -1; // a beat b
            } else if (headToHeadMatch.winner.toString() === b.playerId.toString()) {
              return 1; // b beat a
            }
          }

          // No head-to-head or no winner, consider equal
          return 0;
        });

        // Assign ranks, preserving ties
        let currentRank = 1;
        for (let i = 0; i < sortedStandings.length; i++) {
          if (i > 0) {
            const prev = sortedStandings[i - 1];
            const curr = sortedStandings[i];

            // Check if points, legDifference, and head-to-head are equal
            const areEqual =
              prev.points === curr.points &&
              prev.legDifference === curr.legDifference;

            let headToHeadEqual = true;
            if (areEqual) {
              const headToHeadMatch = groupMatches.find(
                (m: any) =>
                  (m.player1.toString() === prev.playerId.toString() &&
                    m.player2.toString() === curr.playerId.toString()) ||
                  (m.player1.toString() === curr.playerId.toString() &&
                    m.player2.toString() === prev.playerId.toString())
              );
              headToHeadEqual = !headToHeadMatch || !headToHeadMatch.winner;
            }

            if (!areEqual || !headToHeadEqual) {
              currentRank = i + 1;
            }
          }
          sortedStandings[i].rank = currentRank;
        }

        // Update group standings
        group.standings = sortedStandings;

        const boardId = match.boardId;
        
        //if no more matches on the board, set it to idle
        const status = await MatchModel.findOne({
          boardId,
          status: "pending",
        });
        if (!status) {
          await BoardModel.findOneAndUpdate(
            { boardId },
            { status: "idle", updatedAt: new Date() }
          );
        } else {
          await BoardModel.findOneAndUpdate(
            { boardId },
            { status: "waiting", updatedAt: new Date() }
          );
        }
      
        await tournament.save();
      } else {
        console.error("Standings not found for players:", {
          player1Standing,
          player2Standing,
        });
        return NextResponse.json(
          { error: "Nem sikerült a csoport állás frissítése" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`Error finishing match (tournamentCode: ${(await params).tournamentId}, matchId: ${(await params).matchId}):`, error);
    return NextResponse.json(
      { error: error.message || "Nem sikerült a mérkőzés befejezése" },
      { status: 500 }
    );
  }
}