import mongoose from 'mongoose';

export const TournamentSchema = new mongoose.Schema({
  tournamentPassword: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  boardCount: { type: Number, required: true, min: 1 },
  status: { type: String, enum: ['created', 'group', 'knockout', 'finished'], default: 'created' },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  groups: [{
    players: [{
        playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
        number: { type: Number, required: true }, // Játékos sorszáma a csoporton belül
      }],
    matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
  }],
  knockout: {
    rounds: [{
      matches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Match' }],
    }],
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'tournaments' });

// Indexek
TournamentSchema.index({ code: 1 });

// Middleware az updatedAt frissítéséhez
TournamentSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export interface Tournament {
    _id: mongoose.Types.ObjectId;
    tournamentPassword: string;
  code: string;
  name: string;
  boardCount: number;
  status: 'created' | 'group' | 'knockout' | 'finished';
  players: mongoose.Types.ObjectId[];
  groups: {
    players: {
        playerId: mongoose.Types.ObjectId;
        number: number; // Játékos sorszáma a csoporton belül
        }[];
    matches: mongoose.Types.ObjectId[];
  }[];
  knockout: {
    rounds: {
      matches: mongoose.Types.ObjectId[];
    }[];
  };
  createdAt: Date;
  updatedAt: Date;
}