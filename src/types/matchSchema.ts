import mongoose from 'mongoose';

export const LegSchema = new mongoose.Schema({
  player1Score: { type: Number, default: 501, min: 0 },
  player2Score: { type: Number, default: 501, min: 0 },
  player1Darts: [{ score: Number, darts: Number }],
  player2Darts: [{ score: Number, darts: Number }],
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  checkout: {
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    score: { type: Number },
    darts: { type: Number },
  },
  createdAt: { type: Date, default: Date.now },
});

export const MatchSchema = new mongoose.Schema({
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
    boardId: { type: String },
    groupIndex: { type: Number, required: true },
    player1Number: { type: Number, required: true },
    player2Number: { type: Number, required: true },
    scribeNumber: { type: Number, required: true },
    player1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    player2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    scorer: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    status: { type: String, enum: ['pending', 'ongoing', 'finished'], default: 'pending' },
    legs: {
      type: [LegSchema],
      validate: {
        validator: (v: any[]) => v.length <= 7,
        message: 'Too many legs (maximum 7 allowed)',
      },
    },
    stats: {
      player1: {
        average: { type: Number, default: 0 },
        checkoutRate: { type: Number, default: 0 },
        dartsThrown: { type: Number, default: 0 },
        legsWon: { type: Number, default: 0 },
      },
      player2: {
        average: { type: Number, default: 0 },
        checkoutRate: { type: Number, default: 0 },
        dartsThrown: { type: Number, default: 0 },
        legsWon: { type: Number, default: 0 },
      },
    },
    winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  }, { collection: 'matches' });
  
  // Indexek
  MatchSchema.index({ tournamentId: 1, status: 1 });
  
  // Middleware
  MatchSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    if (this.winner && ![this.player1.toString(), this.player2.toString()].includes(this.winner.toString())) {
      next(new Error('Winner must be one of the players'));
    }
    next();
  });
  
  // Interfészek
  export interface Player {
    _id: mongoose.Types.ObjectId;
    name: string;
  }
  
  export interface Match {
    _id: mongoose.Types.ObjectId;
    tournamentId: mongoose.Types.ObjectId;
    boardId?: string;
    groupIndex: number;
    player1Number: number;
    player2Number: number;
    scribeNumber: number;
    player1: mongoose.Types.ObjectId;
    player2: mongoose.Types.ObjectId;
    scorer?: mongoose.Types.ObjectId;
    status: 'pending' | 'ongoing' | 'finished';
    legs: Leg[];
    stats: {
      player1: {
        average: number;
        checkoutRate: number;
        dartsThrown: number;
        legsWon: number;
      };
      player2: {
        average: number;
        checkoutRate: number;
        dartsThrown: number;
        legsWon: number;
      };
    };
    winner?: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface PopulatedMatch extends Omit<Match, 'player1' | 'player2' | 'scorer'> {
    player1: Player;
    player2: Player;
    scorer?: Player;
}

export interface Leg {
  player1Score: number;
  player2Score: number;
  player1Darts: { score: number; darts: number }[];
  player2Darts: { score: number; darts: number }[];
  winner?: mongoose.Types.ObjectId;
  checkout?: {
    player?: mongoose.Types.ObjectId;
    score?: number;
    darts?: number;
  };
  createdAt: Date;
}

