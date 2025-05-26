import { NextResponse, NextRequest } from "next/server";
import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { Club } from "@/types/clubSchema";

export async function POST(req: NextRequest,  { params }: { params: { id: string } }) {
    await connectMongo();
    const { id } = await params;
    const {password} = await req.json();
    const { ClubModel } = getModels();
    // Check if Club exist with this password
    const club = await ClubModel.findOne({ _id: id, password }).lean<Club>();
    if (!club) {
        return NextResponse.json({ error: "Invalid club ID or password" }, { status: 401 });
    }
    return NextResponse.json({ club });
}