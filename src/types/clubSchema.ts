import mongoose from "mongoose";

export const ClubSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String },
    location: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    password: { type: String, required: true },
    tournaments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' }],
    players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }], // Added players field
  },
  { timestamps: true }
);

export interface Club {
  _id: string;
  code: string;
  name: string;
  description?: string;
  location: string;
  createdAt: Date;
  updatedAt: Date;
  tournaments: string[];
  players: string[];
}