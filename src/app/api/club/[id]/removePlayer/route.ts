import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    await connectMongo();
    const { id } = params;
    const { playerId } = await req.json();
    const { PlayerModel } = getModels();
    const player = await PlayerModel.findByIdAndDelete(playerId);
    if (!player) {
      return NextResponse.json({ error: "Játékos nem található" }, { status: 404 });
    }
    return NextResponse.json({ message: "Játékos törölve" });
  }