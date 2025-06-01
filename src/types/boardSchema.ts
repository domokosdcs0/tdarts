import mongoose from 'mongoose';

export const BoardSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  boardId: { type: String, required: true },
  currentMatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
  boardNumber: { type: Number },
  status: { type: String, enum: ['idle', 'waiting', 'playing'], default: 'idle' },
  waitingPlayers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  updatedAt: { type: Date, default: Date.now },
}, { collection: 'boards' });

// Indexek
BoardSchema.index({ tournamentId: 1, boardId: 1 }, { unique: true });

// Middleware az updatedAt frissítéséhez
BoardSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export interface Board {
  _id: mongoose.Types.ObjectId;
  tournamentId: mongoose.Types.ObjectId;
  boardNumber?: number;
  boardId: string;
  currentMatch?: mongoose.Types.ObjectId;
  status: 'idle' | 'waiting' | 'playing';
  waitingPlayers: mongoose.Types.ObjectId[];
  updatedAt: Date;
}