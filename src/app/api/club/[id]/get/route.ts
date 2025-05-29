import { NextResponse, NextRequest } from "next/server";
import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";

interface Club {
  _id: string;
  id: string;
  name: string;
  description?: string;
  location: string;
  createdAt: Date;
  updatedAt: Date;
  tournaments: Tournament[];
  players: Player[];
}

interface Player {
  _id: string;
  name: string;
}

interface Tournament {
  _id: string;
  name: string;
  status: string;
  createdAt: Date;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await connectMongo();
  const { id } = await params;
  const { ClubModel, PlayerModel, TournamentModel } = getModels();

  const club = await ClubModel.findOne({ code: id })
    .populate({
      path: 'tournaments',
      model: TournamentModel,
      select: '_id name status createdAt code',
    })
    .lean<Club>();

  if (!club) {
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  // Fetch players with clubId
  const players = await PlayerModel.find({ clubId: club._id })
    .select('_id name')
    .lean<Player[]>();

  return NextResponse.json({ club: { ...club, players } });
}