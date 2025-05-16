import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";
import mongoose from "mongoose";

interface PopulatedMatch {
  _id: string;
  tournamentId: string;
  groupIndex: number;
  status: string;
  player1: { _id: string; name: string };
  player2: { _id: string; name: string };
  scorer?: { _id: string; name: string };
  stats: {
    player1: { legsWon: number; dartsThrown: number; average: number };
    player2: { legsWon: number; dartsThrown: number; average: number };
  };
  highestCheckout: { player1: number; player2: number };
  oneEighties: {
    player1: { count: number; darts: number[] };
    player2: { count: number; darts: number[] };
  };
  legs?: {
    player1Throws: { score: number; darts: number }[];
    player2Throws: { score: number; darts: number }[];
    winnerId: string;
    checkoutDarts?: number;
    doubleAttempts?: number;
    highestCheckout?: { score: number; darts: number; playerId: string };
    oneEighties?: { player1: number[]; player2: number[] };
  }[];
  winner?: string;
}

export async function PATCH(request: Request, { params }: { params: { matchId: string } }) {
  try {
    await connectMongo();
    const { MatchModel, TournamentModel, BoardModel } = getModels();
    const { matchId } = params;
    const { winnerId, player1LegsWon, player2LegsWon, stats, highestCheckout, oneEighties } = await request.json();
    console.log("Received data:", { matchId, winnerId, player1LegsWon, player2LegsWon, stats, highestCheckout, oneEighties });

    // Validate required fields
    if (!winnerId || player1LegsWon == null || player2LegsWon == null || !stats || !highestCheckout || !oneEighties) {
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

    const match = await MatchModel.findById(matchId).populate("player1 player2 scorer");
    if (!match) return NextResponse.json({ error: "Mérkőzés nem található" }, { status: 404 });
    if (match.status !== "ongoing") return NextResponse.json({ error: "A mérkőzés nem játszható állapotban van" }, { status: 400 });

    console.log("Match players:", {
      player1Id: match.player1._id.toString(),
      player2Id: match.player2._id.toString(),
      winnerId,
    });

    // Validate winnerId
    if (![match.player1._id.toString(), match.player2._id.toString()].includes(winnerId)) {
      console.error("Invalid winnerId:", { winnerId, player1Id: match.player1._id.toString(), player2Id: match.player2._id.toString() });
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

    // Ensure legs array exists
    if (!match.legs) {
      match.legs = [];
    }

    console.log("Match before save:", {
      status: match.status,
      winner: match.winner?.toString(),
      stats: match.stats,
      highestCheckout: match.highestCheckout,
      oneEighties: match.oneEighties,
      legs: match.legs,
    });

    await match.save();

    // Update tournament standings
    const tournament = await TournamentModel.findById(match.tournamentId);
    if (!tournament) return NextResponse.json({ error: "Torna nem található" }, { status: 404 });

    const group = tournament.groups[match.groupIndex];
    if (!group) return NextResponse.json({ error: "Csoport nem található" }, { status: 404 });

    console.log("Group players:", group.players.map((p: any) => p.playerId.toString()));

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
      if (!group.standings.some((s: any) => s.playerId.toString() === match.player1._id.toString())) {
        group.standings.push({ playerId: match.player1._id, points: 0, legsWon: 0, legsLost: 0, legDifference: 0, rank: 0 });
      }
      if (!group.standings.some((s: any) => s.playerId.toString() === match.player2._id.toString())) {
        group.standings.push({ playerId: match.player2._id, points: 0, legsWon: 0, legsLost: 0, legDifference: 0, rank: 0 });
      }
      console.log("Initialized standings:", group.standings.map((s: any) => s.playerId.toString()));
    }

    const player1Standing = group.standings.find((s: any) => s.playerId.toString() === match.player1._id.toString());
    const player2Standing = group.standings.find((s: any) => s.playerId.toString() === match.player2._id.toString());

    if (player1Standing && player2Standing) {
      if (winnerId === match.player1._id.toString()) player1Standing.points = (player1Standing.points || 0) + 2;
      else if (winnerId === match.player2._id.toString()) player2Standing.points = (player2Standing.points || 0) + 2;

      player1Standing.legsWon = (player1Standing.legsWon || 0) + player1LegsWon;
      player1Standing.legsLost = (player1Standing.legsLost || 0) + player2LegsWon;
      player1Standing.legDifference = player1Standing.legsWon - player1Standing.legsLost;

      player2Standing.legsWon = (player2Standing.legsWon || 0) + player2LegsWon;
      player2Standing.legsLost = (player2Standing.legsLost || 0) + player1LegsWon;
      player2Standing.legDifference = player2Standing.legsWon - player2Standing.legsLost;
    } else {
      console.error("Standings not found for players:", { player1Standing, player2Standing });
      return NextResponse.json({ error: "Nem sikerült a csoport állás frissítése" }, { status: 500 });
    }

    // Sort standings
    group.standings.sort((a: any, b: any) => {
      if (a.points !== b.points) return (b.points || 0) - (a.points || 0);
      if (a.legDifference !== b.legDifference) return (b.legDifference || 0) - (a.legDifference || 0);
      return (b.legsWon || 0) - (a.legsWon || 0);
    });

    group.standings.forEach((s: any, index: number) => { s.rank = index + 1; });

    // Update board status
    const boards = await BoardModel.find({ tournamentId: match.tournamentId }).lean();
    const boardToUpdate = boards[match.groupIndex]?._id;
    if (boardToUpdate) {
      await BoardModel.findOneAndUpdate({ _id: boardToUpdate }, { status: "waiting", updatedAt: new Date() });
    }

    await tournament.save();

    // Fetch next match
    const nextMatch = await MatchModel.findOne({
      tournamentId: match.tournamentId,
      groupIndex: match.groupIndex,
      status: "pending",
    })
      .populate("player1", "name")
      .populate("player2", "name")
      .populate("scorer", "name")
      .lean<PopulatedMatch>();

    return NextResponse.json({
      message: "Mérkőzés befejezve",
      nextMatch: nextMatch
        ? {
            matchId: nextMatch._id,
            player1Id: nextMatch.player1._id,
            player2Id: nextMatch.player2._id,
            player1Name: nextMatch.player1.name,
            player2Name: nextMatch.player2.name,
            scribeName: nextMatch.scorer?.name || "Nincs",
            stats: nextMatch.stats || {
              player1: { average: 0, dartsThrown: 0, legsWon: 0 },
              player2: { average: 0, dartsThrown: 0, legsWon: 0 },
            },
          }
        : { noMatch: true },
    });
  } catch (error) {
    console.error("Hiba a mérkőzés befejezésekor:", error);
    return NextResponse.json({ error: "Nem sikerült a mérkőzés befejezése" }, { status: 500 });
  }
}