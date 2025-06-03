import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { getModels } from '@/lib/models';

export async function GET(req: Request, { params }: { params: Promise<{ playerId: string }>  }) {
  try {
    await connectMongo();
    const { PlayerModel } = getModels();
    const { playerId } = await params;
    const player = await PlayerModel.findById(playerId).select('name overallStats').lean();
    if (!player) {
      return NextResponse.json({ error: 'Player not found' }, { status: 404 });
    }
    return NextResponse.json(player);
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return NextResponse.json({ error: 'Failed to fetch player stats' }, { status: 500 });
  }
}