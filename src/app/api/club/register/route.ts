import { NextResponse, NextRequest } from "next/server";
import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";

export async function POST(req: NextRequest){
    const {name, description, location, password } = await req.json();
    if (!name || !location || !password) {
        return NextResponse.json({ error: "Hiányzó mezők" }, { status: 400 });
    }
    await connectMongo();
    const { ClubModel } = getModels();
    const code = Math.random().toString(36).substring(2, 8); // Generate a random code
    try {
        const club = await ClubModel.create({
            name,
            description,
            location,
            password,
            code,
            players: []
        });
        return NextResponse.json({ message: "Club created successfully", clubId: club._id }, { status: 201 });
    } catch (error) {
        console.error("Error creating club:", error);
        return NextResponse.json({ error: "Failed to create club" }, { status: 500 });
    }
}