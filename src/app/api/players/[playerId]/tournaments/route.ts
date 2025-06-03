import { NextResponse } from 'next/server';
import { connectMongo } from '@/lib/mongoose';
import { getModels } from '@/lib/models';
import { Tournament } from '@/types/tournamentSchema';

export async function GET(req: Request, { params }: { params: Promise<{ playerId: string }>  }) {
  try {
    await connectMongo();
    const { PlayerTournamentHistoryModel, TournamentModel } = getModels();
    const { playerId } = await params;
    const history = await PlayerTournamentHistoryModel.find({ playerId: playerId }).lean();
    const tournamentIds = history.map((h) => h.tournamentId);
    const tournaments = await TournamentModel.find({ _id: { $in: tournamentIds } })
      .select('name')
      .lean<Tournament[]>();

    const tournamentMap = new Map(tournaments.map((t) => [t._id.toString(), t.name]));
    const result = history.map((h) => ({
      tournamentId: h.tournamentId.toString(),
      tournamentName: tournamentMap.get(h.tournamentId.toString()) || 'Unknown Tournament',
      placement: h.placement,
      stats: h.stats,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching tournament history:', error);
    return NextResponse.json({ error: 'Failed to fetch tournament history' }, { status: 500 });
  }
}