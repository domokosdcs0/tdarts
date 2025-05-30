import mongoose from "mongoose";

export const TournamentSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    boardCount: { type: Number, required: true },
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
    tournamentPassword: { type: String, required: true },
    moderatorPassword: { type: String, required: true },
    startTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ["created", "group", "knockout", "finished"],
      default: "created",
    },
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: "Player" }],
    groups: [
      {
        players: [
          {
            playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
            number: { type: Number, required: true },
          },
        ],
        boardNumber: { type: Number, required: true },
        matches: [{ type: mongoose.Schema.Types.ObjectId, ref: "Match" }],
        standings: [
          {
            playerId: { type: mongoose.Schema.Types.ObjectId, ref: "Player" },
            points: { type: Number, default: 0 },
            legsWon: { type: Number, default: 0 },
            legsLost: { type: Number, default: 0 },
            legDifference: { type: Number, default: 0 },
            rank: { type: Number },
          },
        ],
      },
    ],
    knockout: {
      rounds: [
        {
          matches: [
            {
              _id: {
                type: mongoose.Schema.Types.ObjectId,
                default: () => new mongoose.Types.ObjectId(),
              },
              player1: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Player",
                default: null,
              },
              player2: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Player",
                default: null,
              },
              matchReference: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Match",
                default: null,
              },
            },
          ],
        },
      ],
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    standing: [
      {
        playerId: { type: String, required: true },
        rank: { type: Number, required: true },
      },
    ],
  },
  { timestamps: true }
);

TournamentSchema.index({ code: 1 });

TournamentSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Base Player interface
export interface Player {
  _id: mongoose.Types.ObjectId;
  name: string;
}

// Base Match interface
export interface Match {
  _id: mongoose.Types.ObjectId;
  player1: mongoose.Types.ObjectId;
  player2: mongoose.Types.ObjectId;
  winner?: mongoose.Types.ObjectId;
  legs: {
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
  }[];
  stats: {
    player1: { average: number; dartsThrown: number; legsWon: number };
    player2: { average: number; dartsThrown: number; legsWon: number };
  };
}

// Populated Match interface
export interface PopulatedMatch extends Omit<Match, "player1" | "player2" | "winner"> {
  player1: Player;
  player2: Player;
  winner?: Player;
}

// Base Tournament interface
export interface Tournament {
  _id: mongoose.Types.ObjectId;
  tournamentPassword: string;
  code: string;
  name: string;
  moderatorPassword: string;
  clubId: string;
  boardCount: number;
  status: "created" | "group" | "knockout" | "finished";
  players: mongoose.Types.ObjectId[];
  startTime: Date;
  groups: {
    players: {
      playerId: mongoose.Types.ObjectId;
      number: number;
    }[];
    boardNumber: number
    matches: mongoose.Types.ObjectId[];
    standings: {
      playerId: mongoose.Types.ObjectId;
      points: number;
      legsWon: number;
      legsLost: number;
      legDifference: number;
      rank?: number;
    }[];
  }[];
  knockout: {
    rounds: {
      matches: {
        _id: mongoose.Types.ObjectId;
        player1: mongoose.Types.ObjectId | null;
        player2: mongoose.Types.ObjectId | null;
        matchReference: mongoose.Types.ObjectId | null;
      }[];
    }[];
  };
  createdAt: Date;
  updatedAt: Date;
  standing: {
    playerId: string;
    rank: number;
  }[];
}

// Populated Tournament interface
export interface PopulatedTournament extends Omit<Tournament, "players" | "groups" | "knockout"> {
  players: Player[];
  groups: {
    players: {
      playerId: mongoose.Types.ObjectId;
      number: number;
    }[];
    matches: PopulatedMatch[];
    boardNumber: number;
    standings: {
      playerId: mongoose.Types.ObjectId;
      points: number;
      legsWon: number;
      legsLost: number;
      legDifference: number;
      rank?: number;
    }[];
  }[];
  knockout: {
    rounds: {
      matches: {
        _id: mongoose.Types.ObjectId;
        player1: mongoose.Types.ObjectId | null;
        player2: mongoose.Types.ObjectId | null;
        matchReference: PopulatedMatch | null;
      }[];
    }[];
  };
}