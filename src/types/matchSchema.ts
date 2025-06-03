import mongoose, { Document } from 'mongoose';

// Player Interface
export interface Player {
  _id: mongoose.Types.ObjectId;
  name: string;
}

// Leg Interface
export interface Leg {
  player1Throws: { score: number; darts: number }[];
  player2Throws: { score: number; darts: number }[];
  winnerId?: mongoose.Types.ObjectId;
  checkoutDarts?: number;
  doubleAttempts?: number;
  highestCheckout?: {
    score: number;
    darts: number;
    playerId: mongoose.Types.ObjectId;
  };
  oneEighties?: {
    player1: number[];
    player2: number[];
  };
  createdAt: Date;
}

// Match Interface
export interface Match extends Document {
  _id: mongoose.Types.ObjectId;
  tournamentId: mongoose.Types.ObjectId;
  boardId?: string;
  player1Number: number;
  player2Number: number;
  scribeNumber: number;
  player1Status: string;
  player2Status: string;
  player1: mongoose.Types.ObjectId | Player;
  player2: mongoose.Types.ObjectId | Player;
  scorer?: mongoose.Types.ObjectId | Player;
  status: 'pending' | 'ongoing' | 'finished';
  legs: Leg[];
  stats: {
    player1: {
      average: number;
      checkoutRate: number;
      dartsThrown: number;
      legsWon: number;
      oneEighties: number;
      highestCheckout: number
    };
    player2: {
      average: number;
      checkoutRate: number;
      dartsThrown: number;
      legsWon: number;
      oneEighties: number;
      highestCheckout: number
    };
  };
  winner?: mongoose.Types.ObjectId | Player;
  createdAt: Date;
  updatedAt: Date;
  round?: number;
  isKnockout: boolean;
}

// Populated Match Interface
export interface PopulatedMatch extends Omit<Match, 'player1' | 'player2' | 'scorer' | 'winner'> {
  player1: Player;
  player2: Player;
  scorer?: Player;
  winner?: Player;
}

// MatchSchema
export const MatchSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  boardId: { type: String },
  player1Number: { type: Number, default: 1 },
  player2Number: { type: Number, default: 2 },
  scribeNumber: { type: Number, default: 0 },
  player1Status: { type: String, default: "unready" },
  player2Status: { type: String, default: "unready" },
  player1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  player2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  scorer: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  status: { type: String, enum: ['pending', 'ongoing', 'finished'], default: 'pending' },
  legs: {
    type: [{
      player1Throws: [{ score: Number, darts: Number }],
      player2Throws: [{ score: Number, darts: Number }],
      winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      checkoutDarts: Number,
      doubleAttempts: Number,
      highestCheckout: {
        score: Number,
        darts: Number,
        playerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      },
      oneEighties: { player1: [Number], player2: [Number] },
      createdAt: { type: Date, default: Date.now },
    }],
    validate: { validator: (v: any[]) => v.length <= 7, message: 'Too many legs (maximum 7 allowed)' },
  },
  stats: {
    player1: {
      average: { type: Number, default: 0 },
      checkoutRate: { type: Number, default: 0 },
      dartsThrown: { type: Number, default: 0 },
      legsWon: { type: Number, default: 0 },
      oneEighties: { type: Number, default: 0 },
      highestCheckout: { type: Number, default: 0 },
    },
    player2: {
      average: { type: Number, default: 0 },
      checkoutRate: { type: Number, default: 0 },
      dartsThrown: { type: Number, default: 0 },
      legsWon: { type: Number, default: 0 },
      oneEighties: { type: Number, default: 0 },
      highestCheckout: { type: Number, default: 0 },
    },
  },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  round: { type: Number },
  isKnockout: { type: Boolean, default: false },
}, { collection: 'matches' });

MatchSchema.pre('save', async function (this: Match, next) {
  try {
    this.updatedAt = new Date();

    if (this.winner) {
      if (!this.populated('player1') || !this.populated('player2')) {
        await this.populate('player1 player2');
      }

      const player1Id = this.player1 instanceof mongoose.Types.ObjectId 
        ? this.player1.toString() 
        : (this.player1 as Player)._id?.toString();
      const player2Id = this.player2 instanceof mongoose.Types.ObjectId 
        ? this.player2.toString() 
        : (this.player2 as Player)._id?.toString();
      const winnerId = this.winner instanceof mongoose.Types.ObjectId
        ? this.winner.toString()
        : (this.winner as Player)._id?.toString();

      if (!player1Id || !player2Id || !winnerId) {
        console.error('Player ID extraction failed:', {
          player1: this.player1,
          player2: this.player2,
          winner: this.winner,
        });
        return next(new Error('Failed to extract player IDs'));
      }

      if (![player1Id, player2Id].includes(winnerId)) {
        return next(new Error('Winner must be one of the players'));
      }
    }
    next();
  } catch (error) {
    console.error('Error in pre-save middleware:', error);
    next(error instanceof Error ? error : new Error('Unknown error in pre-save middleware'));
  }
});

MatchSchema.index({ tournamentId: 1, status: 1 });