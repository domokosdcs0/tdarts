import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { Tournament } from "@/types/tournamentSchema";

export async function POST(request: Request) {
  try {
    await connectMongo();
    const { TournamentModel, PlayerModel, PlayerTournamentHistoryModel } = getModels();
    const body = await request.json();

    const { name, boardCount, description, startTime, players, tournamentPassword } = body;

    // Validáció
    if (!name || !boardCount || !tournamentPassword) {
      return NextResponse.json(
        { error: "A torna neve, a táblák száma és a jelszó kötelező" },
        { status: 400 }
      );
    }

    // Duplikált játékosok kiszűrése
   // Duplikált játékosok kiszűrése
        const uniquePlayerNames = [
            ...new Set((players || []).map((name: string) => name.trim()))
        ].filter((name): name is string => !!name);
    if (uniquePlayerNames.length !== (players || []).length) {
      return NextResponse.json(
        { error: "Duplikált játékosnevek nem megengedettek" },
        { status: 400 }
      );
    }

    // Egyedi kód generálása
    const code = uuidv4().slice(0, 8).toUpperCase();

    // Játékosok kezelése
    const playerIds: string[] = [];
    for (const playerName of uniquePlayerNames) {
      let player = await PlayerModel.findOne({ name: playerName });
      if (!player) {
        player = await PlayerModel.create({ name: playerName });
      }
      playerIds.push(player._id.toString());
    }

    // Torna létrehozása
    const tournament = await TournamentModel.create({
      code,
      name,
      boardCount: parseInt(boardCount),
      description: description || "",
      startTime: startTime ? new Date(startTime) : undefined,
      players: playerIds,
      status: "created",
      tournamentPassword,
    });

    // PlayerTournamentHistory létrehozása csak akkor, ha még nem létezik
    for (const playerId of playerIds) {
      const existingHistory = await PlayerTournamentHistoryModel.findOne({
        playerId,
        tournamentId: tournament._id,
      });
      if (!existingHistory) {
        await PlayerTournamentHistoryModel.create({
          playerId,
          tournamentId: tournament._id,
          stats: {
            average: 0,
            checkoutRate: 0,
            legsWon: 0,
            legsPlayed: 0,
            matchesWon: 0,
            matchesPlayed: 0,
          },
        });
      }
    }

    return NextResponse.json(
      { message: "Torna sikeresen létrehozva", tournament },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Hiba a torna létrehozásakor:", error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: "Hiba: Egy játékos már hozzá van adva ehhez a tornához" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Nem sikerült a torna létrehozása" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    await connectMongo();
    const { TournamentModel, ClubModel } = getModels();
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name")?.trim();
    const club = searchParams.get("club")?.trim();
    const date = searchParams.get("date")?.trim();

    const query: any = {};

    if (name) {
      query.name = { $regex: name, $options: "i" };
    }

    if (club) {
      const clubs = await ClubModel.find({
        name: { $regex: club, $options: "i" },
      }).select("_id");
      const clubIds = clubs.map((c) => c._id);
      if (clubIds.length > 0) {
        query.clubId = { $in: clubIds };
      } else {
        return NextResponse.json({ tournaments: [] });
      }
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 1);
      query.startTime = {
        $gte: startDate,
        $lt: endDate,
      };
    }

    const tournaments = await TournamentModel.find(query)
      .populate("clubId", "name")
      .sort({ createdAt: -1 })
      .lean<Tournament[]>();

    return NextResponse.json({ tournaments });
  } catch (error) {
    console.error("Hiba a tornák lekérésekor:", error);
    return NextResponse.json({ error: "Nem sikerült a tornák lekérése" }, { status: 500 });
  }
}