import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";

export async function PATCH(request: Request, { params }: { params: { code: string } }) {
  try {
    await connectMongo();
    const { TournamentModel } = getModels();
    const { code } = await params;
    const { status } = await request.json();

    if (!["created", "started", "paused", "finished", "knockout"].includes(status)) {
      return NextResponse.json({ error: "Érvénytelen állapot" }, { status: 400 });
    }

    const tournament = await TournamentModel.findOne({ code });
    if (!tournament) {
      return NextResponse.json({ error: "Torna nem található" }, { status: 404 });
    }

    tournament.status = status;
    await tournament.save();

    return NextResponse.json({ message: "Torna állapota sikeresen módosítva" });
  } catch (error) {
    console.error("Hiba a torna állapotának módosításakor:", error);
    return NextResponse.json({ error: "Nem sikerült a torna állapotának módosítása" }, { status: 500 });
  }
}