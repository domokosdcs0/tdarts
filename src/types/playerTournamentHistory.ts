import mongoose from 'mongoose';

export const PlayerTournamentHistorySchema = new mongoose.Schema({
  playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  placement: { type: Number, min: 1 },
  stats: {
    average: { type: Number, default: 0 },
    checkoutRate: { type: Number, default: 0 },
    legsWon: { type: Number, default: 0 },
    legsPlayed: { type: Number, default: 0 },
    matchesWon: { type: Number, default: 0 },
    matchesPlayed: { type: Number, default: 0 },
    oneEighties: { type: Number, default: 0 },
    highestCheckout: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'player_tournament_history' });

// Indexek
PlayerTournamentHistorySchema.index({ playerId: 1, tournamentId: 1 }, { unique: true });

// Middleware az updatedAt frissítéséhez
PlayerTournamentHistorySchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export interface PlayerTournamentHistory {
  playerId: mongoose.Types.ObjectId;
  tournamentId: mongoose.Types.ObjectId;
  placement?: number;
  stats: {
    average: number;
    checkoutRate: number;
    legsWon: number;
    legsPlayed: number;
    matchesWon: number;
    matchesPlayed: number;
    oneEighties: number
    highestCheckout: number
  };
  createdAt: Date;
  updatedAt: Date;
}