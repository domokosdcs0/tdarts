import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Mérkőzések generálása a minta alapján bármekkora csoportméretre
function generateMatches(playerCount: number): { player1Idx: number; player2Idx: number; scorerIdx: number }[] {
  if (playerCount === 2) {
    return [{ player1Idx: 0, player2Idx: 1, scorerIdx: 0 }]; // Csak egy meccs, scorer az első játékos
  }

  if (playerCount === 3) {
    return [
      { player1Idx: 0, player2Idx: 1, scorerIdx: 2 }, // 1-2(3)
      { player1Idx: 1, player2Idx: 2, scorerIdx: 0 }, // 2-3(1)
      { player1Idx: 0, player2Idx: 2, scorerIdx: 1 }, // 1-3(2)
    ];
  }

  const matches: { player1Idx: number; player2Idx: number; scorerIdx: number }[] = [];

  if (playerCount === 4) {
    // Pontosan a megadott sorrend 4 játékosra
    return [
      { player1Idx: 0, player2Idx: 1, scorerIdx: 2 }, // 1-2(3)
      { player1Idx: 2, player2Idx: 3, scorerIdx: 0 }, // 3-4(1)
      { player1Idx: 1, player2Idx: 2, scorerIdx: 3 }, // 2-3(4)
      { player1Idx: 0, player2Idx: 3, scorerIdx: 1 }, // 1-4(2)
      { player1Idx: 1, player2Idx: 3, scorerIdx: 2 }, // 2-4(3)
      { player1Idx: 0, player2Idx: 2, scorerIdx: 1 }, // 1-3(2)
    ];
  }

  // Általános eset: kiterjesztés bármekkora n-re
  const usedPairs = new Set<string>();
  
  // Első fázis: páronkénti párosítások (pl. 1-2, 3-4, majd 2-3, 4-5, stb.)
  for (let offset = 1; offset < playerCount; offset++) {
    for (let i = 0; i < playerCount; i += 2) {
      // Első párosítás: i vs. i+offset
      let player1Idx = i % playerCount;
      let player2Idx = (i + offset) % playerCount;
      let scorerIdx = (i + offset + 1) % playerCount;
      let pairKey = `${Math.min(player1Idx, player2Idx)}-${Math.max(player1Idx, player2Idx)}`;

      if (!usedPairs.has(pairKey) && player1Idx !== player2Idx) {
        matches.push({ player1Idx, player2Idx, scorerIdx });
        usedPairs.add(pairKey);
      }

      // Második párosítás: i+1 vs. i+offset+1
      if (i + 1 < playerCount) {
        player1Idx = (i + 1) % playerCount;
        player2Idx = (i + 1 + offset) % playerCount;
        scorerIdx = i % playerCount;
        pairKey = `${Math.min(player1Idx, player2Idx)}-${Math.max(player1Idx, player2Idx)}`;

        if (!usedPairs.has(pairKey) && player1Idx !== player2Idx) {
          matches.push({ player1Idx, player2Idx, scorerIdx });
          usedPairs.add(pairKey);
        }
      }
    }
  }

  // Második fázis: maradék párosítások (ha szükséges)
  for (let i = 0; i < playerCount && usedPairs.size < (playerCount * (playerCount - 1)) / 2; i++) {
    for (let j = i + 1; j < playerCount; j++) {
      const pairKey = `${i}-${j}`;
      if (!usedPairs.has(pairKey)) {
        const scorerIdx = (j + 1) % playerCount;
        matches.push({ player1Idx: i, player2Idx: j, scorerIdx });
        usedPairs.add(pairKey);
      }
    }
  }

  return matches;
}

export async function POST(request: Request, { params }: { params: { code: string } }) {
  try {
    await connectMongo();
    const { TournamentModel, BoardModel, MatchModel } = getModels();
    const { code } = await params;

    const tournament = await TournamentModel.findOne({ code });
    if (!tournament) {
      return NextResponse.json({ error: "Torna nem található" }, { status: 404 });
    }

    if (tournament.status !== "created") {
      return NextResponse.json({ error: "A torna már elindult vagy befejeződött" }, { status: 400 });
    }

    const players = [...tournament.players];
    const boardCount = tournament.boardCount;
    const playersPerGroup = Math.ceil(players.length / boardCount);

    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }

    const groups = [];
    for (let groupIndex = 0; groupIndex < boardCount; groupIndex++) {
      const groupPlayers = players.slice(groupIndex * playersPerGroup, (groupIndex + 1) * playersPerGroup);
      if (groupPlayers.length === 0) continue;

      const numberedPlayers = groupPlayers.map((playerId, index) => ({
        playerId,
        number: index + 1,
      }));

      const orderedMatches = generateMatches(numberedPlayers.length);

      const matches = [];
      for (const { player1Idx, player2Idx, scorerIdx } of orderedMatches) {
        const match = await MatchModel.create({
          tournamentId: tournament._id,
          groupIndex,
          player1Number: numberedPlayers[player1Idx].number,
          player2Number: numberedPlayers[player2Idx].number,
          scribeNumber: numberedPlayers[scorerIdx].number,
          player1: numberedPlayers[player1Idx].playerId,
          player2: numberedPlayers[player2Idx].playerId,
          scorer: numberedPlayers[scorerIdx].playerId,
          status: 'pending',
        });

        matches.push(match._id);
      }

      groups.push({
        players: numberedPlayers,
        matches,
      });
    }

    await BoardModel.deleteMany({ tournamentId: tournament._id });
    const boards = [];
    for (let i = 1; i <= boardCount; i++) {
      boards.push({
        tournamentId: tournament._id,
        boardId: uuidv4(),
        boardNumber: i,
        status: "idle",
        waitingPlayers: [],
      });
    }
    await BoardModel.insertMany(boards);

    tournament.groups = groups;
    tournament.status = "group";
    await tournament.save();

    return NextResponse.json({ message: "Csoportok és mérkőzések sikeresen kiosztva" });
  } catch (error) {
    console.error("Hiba a csoportok kiosztásakor:", error);
    return NextResponse.json({ error: "Nem sikerült a csoportok kiosztása" }, { status: 500 });
  }
}