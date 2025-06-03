import mongoose from 'mongoose';

export const PlayerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  overallStats: {
    average: { type: Number, default: 0 },
    checkoutRate: { type: Number, default: 0 },
    totalLegsWon: { type: Number, default: 0 },
    totalLegsPlayed: { type: Number, default: 0 },
    totalMatchesWon: { type: Number, default: 0 },
    totalMatchesPlayed: { type: Number, default: 0 },
    totalTournamentsPlayed: { type: Number, default: 0 },
    totalTournamentsWon: { type: Number, default: 0 },
    totalOneEighties: { type: Number, default: 0 },
    totalHighestCheckout: { type: Number, default: 0 },
    bestPlacement: { type: Number, default: 0 }, // Legjobb helyezés a tornákon
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  clubId: { type: mongoose.Schema.Types.ObjectId, ref: 'Club' }, // Hivatkozás a klubra
}, { collection: 'players' });

// Indexek
PlayerSchema.index({ name: 1 });

// Middleware az updatedAt frissítéséhez
PlayerSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export interface Player {
  name: string;
  club?: {
    name: string
    _id: mongoose.Types.ObjectId;
  }
  overallStats: {
    average: number;
    checkoutRate: number;
    totalLegsWon: number;
    totalLegsPlayed: number;
    totalMatchesWon: number;
    totalMatchesPlayed: number;
    totalTournamentsPlayed: number;
    totalTournamentsWon: number;
    totalOneEighties: number;
    highestCheckout: number;
    bestPlacement: number;
  };
  createdAt: Date;
  updatedAt: Date;
}