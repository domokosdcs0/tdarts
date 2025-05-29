import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
export async function POST(request: NextRequest, { params }: { params: Promise<{ boardId: string }> }) {
  
  try {
    await connectMongo();
    const { BoardModel } = getModels();
    const { boardId } = await params;
    const { status } = await request.json();

    if (!["idle", "waiting", "playing"].includes(status)) {
      return NextResponse.json({ error: "Érvénytelen állapot" }, { status: 400 });
    }

    const board = await BoardModel.findOneAndUpdate(
      { boardId },
      { status, updatedAt: new Date() },
      { new: true }
    ).lean();

    if (!board) {
      return NextResponse.json({ error: "Tábla nem található" }, { status: 404 });
    }

    return NextResponse.json({ message: "Tábla állapota frissítve", board });
  } catch (error) {
    console.error("Hiba a tábla állapotának frissítésekor:", error);
    return NextResponse.json({ error: "Nem sikerült a tábla állapotának frissítése" }, { status: 500 });
  }
}