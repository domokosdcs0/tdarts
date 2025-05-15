import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

function generateMatches(playerCount: number): { player1Idx: number; player2Idx: number; scorerIdx: number }[] {
  // Összes lehetséges pár generálása
  const matches: { player1Idx: number; player2Idx: number }[] = [];
  for (let i = 0; i < playerCount; i++) {
      for (let j = i + 1; j < playerCount; j++) {
          matches.push({ player1Idx: i, player2Idx: j });
      }
  }

  // Fisher-Yates keverés
  function shuffle(array: any[]): void {
      for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
      }
  }

  // Ellenőrzi, hogy egy játékosnak hány egymást követő mérkőzése van
  function countConsecutiveMatches(matches: { player1Idx: number; player2Idx: number }[]): { player: number; count: number }[] {
      const consecutiveCounts: { [key: number]: number } = {};
      for (let i = 0; i < playerCount; i++) {
          consecutiveCounts[i] = 0;
      }

      for (let i = 1; i < matches.length; i++) {
          const prevMatch = matches[i - 1];
          const currMatch = matches[i];
          const prevPlayers = new Set([prevMatch.player1Idx, prevMatch.player2Idx]);
          const currPlayers = new Set([currMatch.player1Idx, currMatch.player2Idx]);

          for (const player of prevPlayers) {
              if (currPlayers.has(player)) {
                  consecutiveCounts[player]++;
              }
          }
      }

      return Object.entries(consecutiveCounts).map(([player, count]) => ({
          player: parseInt(player),
          count
      }));
  }

  // Próbálkozások a megfelelő mérkőzéssorrend megtalálására
  const maxAttempts = 1000;
  let attempts = 0;
  let validOrder = false;

  while (!validOrder && attempts < maxAttempts) {
      shuffle(matches);
      const consecutiveMatches = countConsecutiveMatches(matches);
      const hasInvalidConsecutive = consecutiveMatches.some(cm => cm.count > 1);
      const totalConsecutive = consecutiveMatches.reduce((sum, cm) => sum + cm.count, 0);

      // A sorrend érvényes, ha minden játékosnak max 1 egymást követő mérkőzése van,
      // és összesen max 1 ilyen eset van
      if (!hasInvalidConsecutive && totalConsecutive <= 1) {
          validOrder = true;
      }
      attempts++;
  }

  if (!validOrder) {
      console.warn(`Nem sikerült ${maxAttempts} próbálkozás alatt érvényes mérkőzéssorrendet találni.`);
  }

  // Pontozók kiosztása egyenletes eloszlással
  const scorerCounts: { [key: number]: number } = {};
  for (let i = 0; i < playerCount; i++) {
      scorerCounts[i] = 0;
  }

  const finalMatches: { player1Idx: number; player2Idx: number; scorerIdx: number }[] = matches.map(match => {
      // Lehetséges írók (nem játszó játékosok)
      const possibleScorers: number[] = [];
      for (let k = 0; k < playerCount; k++) {
          if (k !== match.player1Idx && k !== match.player2Idx) {
              possibleScorers.push(k);
          }
      }

      // Író választása: először azok, akik még nem voltak írók, majd a legkevesebb írói szereppel rendelkező
      let selectedScorer = -1;
      let minScorerCount = Infinity;
      const neverScored = possibleScorers.filter(s => scorerCounts[s] === 0);

      if (neverScored.length > 0) {
          // Ha van olyan, aki még nem volt író, véletlenszerűen választunk közülük
          selectedScorer = neverScored[Math.floor(Math.random() * neverScored.length)];
      } else {
          // Különben a legkevesebb írói szereppel rendelkező közül választunk
          possibleScorers.forEach(s => {
              if (scorerCounts[s] < minScorerCount) {
                  minScorerCount = scorerCounts[s];
                  selectedScorer = s;
              } else if (scorerCounts[s] === minScorerCount && Math.random() < 0.5) {
                  selectedScorer = s;
              }
          });
      }

      // Frissítjük az írói számlálót
      scorerCounts[selectedScorer]++;
      return { ...match, scorerIdx: selectedScorer };
  });

  // Ellenőrizzük, hogy minden játékos legalább egyszer író-e
  const allScored = Object.values(scorerCounts).every(count => count >= 1);
  if (!allScored) {
      console.warn("Nem minden játékos volt legalább egyszer író:", scorerCounts);
  }

  return finalMatches;
}

export async function POST(request: Request, { params }: { params: { code: string } }) {
  try {
    await connectMongo();
    const { TournamentModel, BoardModel, MatchModel } = getModels();
    const { code } = params;

    const tournament = await TournamentModel.findOne({ code });
    if (!tournament) {
      return NextResponse.json({ error: "Torna nem található" }, { status: 404 });
    }

    if (tournament.status === "finished") {
      return NextResponse.json({ error: "A torna már befejeződött" }, { status: 400 });
    }

    // Töröljük az összes meglévő mérkőzést
    await MatchModel.deleteMany({ tournamentId: tournament._id });

    // Töröljük a meglévő csoportokat
    tournament.groups = [];
    await tournament.save();

    const players = [...tournament.players];
    const boardCount = tournament.boardCount;
    const playersPerGroup = Math.ceil(players.length / boardCount);

    // Játékosok véletlenszerű keverése
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
          status: "pending",
        });

        matches.push(match._id);
      }

      groups.push({
        players: numberedPlayers,
        matches,
        standings: [], // Inicializáljuk üresen, ha szükséges
      });
    }

    // Töröljük és újrageneráljuk a táblákat
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

    return NextResponse.json({ message: "Csoportok és mérkőzések sikeresen újragenerálva" });
  } catch (error) {
    console.error("Hiba a csoportok újragenerálásakor:", error);
    return NextResponse.json({ error: "Nem sikerült a csoportok újragenerálása" }, { status: 500 });
  }
}