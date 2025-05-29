import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await connectMongo();
    const { id } = await params;
    const { PlayerModel } = getModels();
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";

    const players = await PlayerModel.find({
      name: { $regex: query, $options: "i" },
        clubId: id, // Filter by club ID
    })
      .select("name")
      .limit(10)
      .lean();

    return NextResponse.json({ players });
  } catch (error) {
    console.error("Error searching players:", error);
    return NextResponse.json(
      { error: "Failed to search players" },
      { status: 500 }
    );
  }
}