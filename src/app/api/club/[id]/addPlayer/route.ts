import { NextResponse, NextRequest } from "next/server";
import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { id } = await params;
  await connectMongo();
  const { ClubModel, PlayerModel } = getModels();

  const clubExist = await ClubModel.findById(id);
  if (!clubExist) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  const { name } = await req.json();
  if (!name) {
    return NextResponse.json({ error: "Missing player name" }, { status: 400 });
  }

  try {
    const player = await PlayerModel.create({ name, clubId: id });
    if (!clubExist.players) {
      clubExist.players = []; // Initialize players array if undefined
    }
    clubExist.players.push(player._id);
    await clubExist.save();
    return NextResponse.json({ message: "Player added successfully", playerId: player._id }, { status: 201 });
  } catch (error) {
    console.error("Error adding player:", error);
    return NextResponse.json({ error: "Failed to add player" }, { status: 500 });
  }
}