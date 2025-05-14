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
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
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
  overallStats: {
    average: number;
    checkoutRate: number;
    totalLegsWon: number;
    totalLegsPlayed: number;
    totalMatchesWon: number;
    totalMatchesPlayed: number;
  };
  createdAt: Date;
  updatedAt: Date;
}