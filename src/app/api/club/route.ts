import { NextResponse, NextRequest } from "next/server";
import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { Club } from "@/types/clubSchema";

export async function GET(req: NextRequest){
    await connectMongo();
    const { ClubModel } = getModels();
    const clubs = await ClubModel.find({}).lean<Club[]>();
    
    return NextResponse.json({ clubs });
}