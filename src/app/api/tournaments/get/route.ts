import { NextRequest, NextResponse } from "next/server";
import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { Tournament } from "@/types/tournamentSchema";

