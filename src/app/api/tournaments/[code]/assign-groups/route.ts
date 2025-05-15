import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Mérkőzések generálása a minta alapján bármekkora csoportméretre
function generateMatches(playerCount: number): { player1Idx: number; player2Idx: number; scorerIdx: number }[] {
  switch (playerCount) {
    default:
      return []; // Handle undefined playerCount cases
    case 2:
      return [
        { player1Idx: 0, player2Idx: 1, scorerIdx: 0 }, // 1-2(1)
      ];

    case 3:
      return [
        { player1Idx: 0, player2Idx: 1, scorerIdx: 2 }, // 1-2(3)
        { player1Idx: 1, player2Idx: 2, scorerIdx: 0 }, // 2-3(1)
        { player1Idx: 0, player2Idx: 2, scorerIdx: 1 }, // 1-3(2)
      ];

    case 4:
      return [
        { player1Idx: 0, player2Idx: 1, scorerIdx: 2 }, // 1-2(3)
        { player1Idx: 2, player2Idx: 3, scorerIdx: 0 }, // 3-4(1)
        { player1Idx: 1, player2Idx: 2, scorerIdx: 3 }, // 2-3(4)
        { player1Idx: 0, player2Idx: 3, scorerIdx: 1 }, // 1-4(2)
        { player1Idx: 1, player2Idx: 3, scorerIdx: 2 }, // 2-4(3)
        { player1Idx: 0, player2Idx: 2, scorerIdx: 1 }, // 1-3(2)
      ];

    case 5:
      return [
        { player1Idx: 0, player2Idx: 1, scorerIdx: 2 }, // 1-2(3)
        { player1Idx: 2, player2Idx: 3, scorerIdx: 4 }, // 3-4(5)
        { player1Idx: 1, player2Idx: 4, scorerIdx: 3 }, // 2-5(4)
        { player1Idx: 0, player2Idx: 3, scorerIdx: 1 }, // 1-4(2)
        { player1Idx: 2, player2Idx: 4, scorerIdx: 0 }, // 3-5(1)
        { player1Idx: 1, player2Idx: 3, scorerIdx: 2 }, // 2-4(3)
        { player1Idx: 0, player2Idx: 4, scorerIdx: 3 }, // 1-5(4)
        { player1Idx: 1, player2Idx: 2, scorerIdx: 0 }, // 2-3(1)
        { player1Idx: 3, player2Idx: 4, scorerIdx: 1 }, // 4-5(2)
        { player1Idx: 0, player2Idx: 2, scorerIdx: 4 }, // 1-3(5)
      ];

    case 6:
      return [
        { player1Idx: 0, player2Idx: 1, scorerIdx: 2 }, // 1-2(3)
        { player1Idx: 2, player2Idx: 3, scorerIdx: 4 }, // 3-4(5)
        { player1Idx: 4, player2Idx: 5, scorerIdx: 0 }, // 5-6(1)
        { player1Idx: 1, player2Idx: 2, scorerIdx: 3 }, // 2-3(4)
        { player1Idx: 3, player2Idx: 4, scorerIdx: 5 }, // 4-5(6)
        { player1Idx: 0, player2Idx: 5, scorerIdx: 1 }, // 1-6(2)
        { player1Idx: 1, player2Idx: 3, scorerIdx: 2 }, // 2-4(3)
        { player1Idx: 2, player2Idx: 5, scorerIdx: 4 }, // 3-6(5)
        { player1Idx: 0, player2Idx: 4, scorerIdx: 3 }, // 1-5(4)
        { player1Idx: 1, player2Idx: 5, scorerIdx: 0 }, // 2-6(1)
        { player1Idx: 0, player2Idx: 3, scorerIdx: 5 }, // 1-4(6)
        { player1Idx: 2, player2Idx: 4, scorerIdx: 1 }, // 3-5(2)
        { player1Idx: 0, player2Idx: 2, scorerIdx: 4 }, // 1-3(5)
        { player1Idx: 1, player2Idx: 4, scorerIdx: 3 }, // 2-5(4)
        { player1Idx: 3, player2Idx: 5, scorerIdx: 2 }, // 4-6(3)
      ];

    case 7:
      return [
        { player1Idx: 0, player2Idx: 1, scorerIdx: 2 }, // 1-2(3)
        { player1Idx: 2, player2Idx: 3, scorerIdx: 4 }, // 3-4(5)
        { player1Idx: 4, player2Idx: 5, scorerIdx: 6 }, // 5-6(7)
        { player1Idx: 1, player2Idx: 6, scorerIdx: 3 }, // 2-7(4)
        { player1Idx: 2, player2Idx: 5, scorerIdx: 0 }, // 3-6(1)
        { player1Idx: 3, player2Idx: 4, scorerIdx: 1 }, // 4-5(2)
        { player1Idx: 0, player2Idx: 6, scorerIdx: 5 }, // 1-7(6)
        { player1Idx: 1, player2Idx: 5, scorerIdx: 4 }, // 2-6(5)
        { player1Idx: 2, player2Idx: 4, scorerIdx: 3 }, // 3-5(4)
        { player1Idx: 0, player2Idx: 3, scorerIdx: 2 }, // 1-4(3)
        { player1Idx: 1, player2Idx: 4, scorerIdx: 6 }, // 2-5(7)
        { player1Idx: 5, player2Idx: 6, scorerIdx: 0 }, // 6-7(1)
        { player1Idx: 0, player2Idx: 2, scorerIdx: 1 }, // 1-3(2)
        { player1Idx: 3, player2Idx: 6, scorerIdx: 5 }, // 4-7(6)
        { player1Idx: 1, player2Idx: 3, scorerIdx: 4 }, // 2-4(5)
        { player1Idx: 4, player2Idx: 6, scorerIdx: 2 }, // 5-7(3)
        { player1Idx: 0, player2Idx: 5, scorerIdx: 3 }, // 1-6(4)
        { player1Idx: 2, player2Idx: 6, scorerIdx: 1 }, // 3-7(2)
        { player1Idx: 1, player2Idx: 2, scorerIdx: 5 }, // 2-3(6)
        { player1Idx: 0, player2Idx: 4, scorerIdx: 6 }, // 1-5(7)
        { player1Idx: 3, player2Idx: 5, scorerIdx: 0 }, // 4-6(1)
      ];

    case 8:
      return [
        { player1Idx: 0, player2Idx: 1, scorerIdx: 2 }, // 1-2(3)
        { player1Idx: 2, player2Idx: 3, scorerIdx: 4 }, // 3-4(5)
        { player1Idx: 4, player2Idx: 5, scorerIdx: 6 }, // 5-6(7)
        { player1Idx: 6, player2Idx: 7, scorerIdx: 0 }, // 7-8(1)
        { player1Idx: 1, player2Idx: 2, scorerIdx: 3 }, // 2-3(4)
        { player1Idx: 3, player2Idx: 4, scorerIdx: 5 }, // 4-5(6)
        { player1Idx: 5, player2Idx: 6, scorerIdx: 7 }, // 6-7(8)
        { player1Idx: 0, player2Idx: 7, scorerIdx: 1 }, // 1-8(2)
        { player1Idx: 1, player2Idx: 3, scorerIdx: 2 }, // 2-4(3)
        { player1Idx: 2, player2Idx: 5, scorerIdx: 4 }, // 3-6(5)
        { player1Idx: 4, player2Idx: 7, scorerIdx: 6 }, // 5-8(7)
        { player1Idx: 0, player2Idx: 6, scorerIdx: 5 }, // 1-7(6)
        { player1Idx: 1, player2Idx: 4, scorerIdx: 3 }, // 2-5(4)
        { player1Idx: 3, player2Idx: 6, scorerIdx: 2 }, // 4-7(3)
        { player1Idx: 2, player2Idx: 7, scorerIdx: 0 }, // 3-8(1)
        { player1Idx: 0, player2Idx: 5, scorerIdx: 4 }, // 1-6(5)
        { player1Idx: 1, player2Idx: 6, scorerIdx: 7 }, // 2-7(8)
        { player1Idx: 3, player2Idx: 5, scorerIdx: 1 }, // 4-6(2)
        { player1Idx: 0, player2Idx: 4, scorerIdx: 6 }, // 1-5(7)
        { player1Idx: 2, player2Idx: 6, scorerIdx: 5 }, // 3-7(6)
        { player1Idx: 1, player2Idx: 7, scorerIdx: 3 }, // 2-8(4)
        { player1Idx: 0, player2Idx: 3, scorerIdx: 2 }, // 1-4(3)
        { player1Idx: 4, player2Idx: 6, scorerIdx: 0 }, // 5-7(1)
        { player1Idx: 2, player2Idx: 4, scorerIdx: 7 }, // 3-5(8)
        { player1Idx: 1, player2Idx: 5, scorerIdx: 6 }, // 2-6(7)
        { player1Idx: 0, player2Idx: 2, scorerIdx: 4 }, // 1-3(5)
        { player1Idx: 3, player2Idx: 7, scorerIdx: 5 }, // 4-8(6)
        { player1Idx: 5, player2Idx: 7, scorerIdx: 1 }, // 6-8(2)
      ];

    case 9:
      return [
        { player1Idx: 0, player2Idx: 1, scorerIdx: 2 }, // 1-2(3)
        { player1Idx: 2, player2Idx: 3, scorerIdx: 4 }, // 3-4(5)
        { player1Idx: 4, player2Idx: 5, scorerIdx: 6 }, // 5-6(7)
        { player1Idx: 6, player2Idx: 7, scorerIdx: 8 }, // 7-8(9)
        { player1Idx: 1, player2Idx: 8, scorerIdx: 3 }, // 2-9(4)
        { player1Idx: 2, player2Idx: 5, scorerIdx: 7 }, // 3-6(8)
        { player1Idx: 3, player2Idx: 4, scorerIdx: 0 }, // 4-5(1)
        { player1Idx: 6, player2Idx: 8, scorerIdx: 1 }, // 7-9(2)
        { player1Idx: 0, player2Idx: 7, scorerIdx: 5 }, // 1-8(6)
        { player1Idx: 1, player2Idx: 3, scorerIdx: 4 }, // 2-4(5)
        { player1Idx: 2, player2Idx: 6, scorerIdx: 8 }, // 3-7(9)
        { player1Idx: 4, player2Idx: 8, scorerIdx: 2 }, // 5-9(3)
        { player1Idx: 5, player2Idx: 7, scorerIdx: 0 }, // 6-8(1)
        { player1Idx: 0, player2Idx: 3, scorerIdx: 6 }, // 1-4(7)
        { player1Idx: 1, player2Idx: 5, scorerIdx: 4 }, // 2-6(5)
        { player1Idx: 2, player2Idx: 8, scorerIdx: 7 }, // 3-9(8)
        { player1Idx: 4, player2Idx: 6, scorerIdx: 3 }, // 5-7(4)
        { player1Idx: 0, player2Idx: 2, scorerIdx: 1 }, // 1-3(2)
        { player1Idx: 3, player2Idx: 7, scorerIdx: 5 }, // 4-8(6)
        { player1Idx: 1, player2Idx: 4, scorerIdx: 8 }, // 2-5(9)
        { player1Idx: 5, player2Idx: 8, scorerIdx: 6 }, // 6-9(7)
        { player1Idx: 0, player2Idx: 6, scorerIdx: 2 }, // 1-7(3)
        { player1Idx: 2, player2Idx: 4, scorerIdx: 0 }, // 3-5(1)
        { player1Idx: 1, player2Idx: 7, scorerIdx: 3 }, // 2-8(4)
        { player1Idx: 3, player2Idx: 8, scorerIdx: 5 }, // 4-9(6)
        { player1Idx: 0, player2Idx: 5, scorerIdx: 4 }, // 1-6(5)
        { player1Idx: 2, player2Idx: 7, scorerIdx: 1 }, // 3-8(2)
        { player1Idx: 1, player2Idx: 6, scorerIdx: 8 }, // 2-7(9)
        { player1Idx: 0, player2Idx: 4, scorerIdx: 7 }, // 1-5(8)
        { player1Idx: 3, player2Idx: 6, scorerIdx: 2 }, // 4-7(3)
        { player1Idx: 5, player2Idx: 7, scorerIdx: 0 }, // 6-8(1)
        { player1Idx: 2, player2Idx: 5, scorerIdx: 3 }, // 3-6(4)
        { player1Idx: 1, player2Idx: 2, scorerIdx: 6 }, // 2-3(7)
        { player1Idx: 0, player2Idx: 8, scorerIdx: 4 }, // 1-9(5)
        { player1Idx: 4, player2Idx: 7, scorerIdx: 1 }, // 5-8(2)
        { player1Idx: 3, player2Idx: 5, scorerIdx: 8 }, // 4-6(9)
      ];

    case 10:
      return [
        { player1Idx: 0, player2Idx: 1, scorerIdx: 2 }, // 1-2(3)
        { player1Idx: 2, player2Idx: 3, scorerIdx: 4 }, // 3-4(5)
        { player1Idx: 4, player2Idx: 5, scorerIdx: 6 }, // 5-6(7)
        { player1Idx: 6, player2Idx: 7, scorerIdx: 8 }, // 7-8(9)
        { player1Idx: 8, player2Idx: 9, scorerIdx: 0 }, // 9-10(1)
        { player1Idx: 1, player2Idx: 2, scorerIdx: 3 }, // 2-3(4)
        { player1Idx: 3, player2Idx: 4, scorerIdx: 5 }, // 4-5(6)
        { player1Idx: 5, player2Idx: 6, scorerIdx: 7 }, // 6-7(8)
        { player1Idx: 7, player2Idx: 8, scorerIdx: 9 }, // 8-9(10)
        { player1Idx: 0, player2Idx: 9, scorerIdx: 1 }, // 1-10(2)
        { player1Idx: 1, player2Idx: 3, scorerIdx: 2 }, // 2-4(3)
        { player1Idx: 2, player2Idx: 5, scorerIdx: 4 }, // 3-6(5)
        { player1Idx: 4, player2Idx: 7, scorerIdx: 6 }, // 5-8(7)
        { player1Idx: 6, player2Idx: 9, scorerIdx: 8 }, // 7-10(9)
        { player1Idx: 0, player2Idx: 8, scorerIdx: 5 }, // 1-9(6)
        { player1Idx: 1, player2Idx: 4, scorerIdx: 3 }, // 2-5(4)
        { player1Idx: 3, player2Idx: 6, scorerIdx: 2 }, // 4-7(3)
        { player1Idx: 5, player2Idx: 8, scorerIdx: 7 }, // 6-9(8)
        { player1Idx: 7, player2Idx: 9, scorerIdx: 0 }, // 8-10(1)
        { player1Idx: 0, player2Idx: 7, scorerIdx: 4 }, // 1-8(5)
        { player1Idx: 1, player2Idx: 5, scorerIdx: 6 }, // 2-6(7)
        { player1Idx: 3, player2Idx: 8, scorerIdx: 9 }, // 4-9(10)
        { player1Idx: 2, player2Idx: 9, scorerIdx: 1 }, // 3-10(2)
        { player1Idx: 4, player2Idx: 6, scorerIdx: 3 }, // 5-7(4)
        { player1Idx: 0, player2Idx: 6, scorerIdx: 2 }, // 1-7(3)
        { player1Idx: 1, player2Idx: 8, scorerIdx: 5 }, // 2-9(6)
        { player1Idx: 3, player2Idx: 9, scorerIdx: 7 }, // 4-10(8)
        { player1Idx: 2, player2Idx: 7, scorerIdx: 0 }, // 3-8(1)
        { player1Idx: 4, player2Idx: 5, scorerIdx: 8 }, // 5-6(9)
        { player1Idx: 0, player2Idx: 5, scorerIdx: 1 }, // 1-6(2)
        { player1Idx: 1, player2Idx: 9, scorerIdx: 4 }, // 2-10(5)
        { player1Idx: 2, player2Idx: 6, scorerIdx: 3 }, // 3-7(4)
        { player1Idx: 4, player2Idx: 8, scorerIdx: 6 }, // 5-9(7)
        { player1Idx: 3, player2Idx: 7, scorerIdx: 2 }, // 4-8(3)
        { player1Idx: 0, player2Idx: 4, scorerIdx: 9 }, // 1-5(10)
        { player1Idx: 1, player2Idx: 7, scorerIdx: 8 }, // 2-8(9)
        { player1Idx: 2, player2Idx: 8, scorerIdx: 5 }, // 3-9(6)
        { player1Idx: 3, player2Idx: 5, scorerIdx: 0 }, // 4-6(1)
        { player1Idx: 6, player2Idx: 8, scorerIdx: 4 }, // 7-9(5)
        { player1Idx: 0, player2Idx: 3, scorerIdx: 6 }, // 1-4(7)
        { player1Idx: 1, player2Idx: 6, scorerIdx: 9 }, // 2-7(10)
        { player1Idx: 2, player2Idx: 4, scorerIdx: 7 }, // 3-5(8)
        { player1Idx: 5, player2Idx: 9, scorerIdx: 3 }, // 6-10(4)
        { player1Idx: 0, player2Idx: 2, scorerIdx: 8 }, // 1-3(9)
      ];

    case 11:
      return [
        { player1Idx: 0, player2Idx: 1, scorerIdx: 2 }, // 1-2(3)
        { player1Idx: 2, player2Idx: 3, scorerIdx: 4 }, // 3-4(5)
        { player1Idx: 4, player2Idx: 5, scorerIdx: 6 }, // 5-6(7)
        { player1Idx: 6, player2Idx: 7, scorerIdx: 8 }, // 7-8(9)
        { player1Idx: 8, player2Idx: 9, scorerIdx: 10 }, // 9-10(11)
        { player1Idx: 1, player2Idx: 10, scorerIdx: 3 }, // 2-11(4)
        { player1Idx: 2, player2Idx: 5, scorerIdx: 7 }, // 3-6(8)
        { player1Idx: 3, player2Idx: 4, scorerIdx: 9 }, // 4-5(10)
        { player1Idx: 6, player2Idx: 9, scorerIdx: 0 }, // 7-10(1)
        { player1Idx: 7, player2Idx: 8, scorerIdx: 1 }, // 8-9(2)
        { player1Idx: 0, player2Idx: 9, scorerIdx: 5 }, // 1-10(6)
        { player1Idx: 1, player2Idx: 3, scorerIdx: 4 }, // 2-4(5)
        { player1Idx: 2, player2Idx: 6, scorerIdx: 8 }, // 3-7(9)
        { player1Idx: 5, player2Idx: 10, scorerIdx: 7 }, // 6-11(8)
        { player1Idx: 4, player2Idx: 8, scorerIdx: 2 }, // 5-9(3)
        { player1Idx: 0, player2Idx: 7, scorerIdx: 6 }, // 1-8(7)
        { player1Idx: 1, player2Idx: 5, scorerIdx: 9 }, // 2-6(10)
        { player1Idx: 3, player2Idx: 9, scorerIdx: 10 }, // 4-10(11)
        { player1Idx: 2, player2Idx: 8, scorerIdx: 4 }, // 3-9(5)
        { player1Idx: 6, player2Idx: 10, scorerIdx: 0 }, // 7-11(1)
        { player1Idx: 0, player2Idx: 4, scorerIdx: 3 }, // 1-5(4)
        { player1Idx: 1, player2Idx: 6, scorerIdx: 2 }, // 2-7(3)
        { player1Idx: 5, player2Idx: 8, scorerIdx: 7 }, // 6-9(8)
        { player1Idx: 3, player2Idx: 10, scorerIdx: 9 }, // 4-11(10)
        { player1Idx: 2, player2Idx: 7, scorerIdx: 1 }, // 3-8(2)
        { player1Idx: 0, player2Idx: 3, scorerIdx: 8 }, // 1-4(9)
        { player1Idx: 4, player2Idx: 9, scorerIdx: 5 }, // 5-10(6)
        { player1Idx: 1, player2Idx: 8, scorerIdx: 10 }, // 2-9(11)
        { player1Idx: 2, player2Idx: 10, scorerIdx: 6 }, // 3-11(7)
        { player1Idx: 5, player2Idx: 7, scorerIdx: 0 }, // 6-8(1)
        { player1Idx: 0, player2Idx: 2, scorerIdx: 4 }, // 1-3(5)
        { player1Idx: 3, player2Idx: 8, scorerIdx: 1 }, // 4-9(2)
        { player1Idx: 4, player2Idx: 10, scorerIdx: 7 }, // 5-11(8)
        { player1Idx: 6, player2Idx: 8, scorerIdx: 9 }, // 7-9(10)
        { player1Idx: 1, player2Idx: 7, scorerIdx: 3 }, // 2-8(4)
        { player1Idx: 0, player2Idx: 5, scorerIdx: 2 }, // 1-6(3)
        { player1Idx: 2, player2Idx: 9, scorerIdx: 8 }, // 3-10(9)
        { player1Idx: 3, player2Idx: 7, scorerIdx: 10 }, // 4-8(11)
        { player1Idx: 4, player2Idx: 6, scorerIdx: 1 }, // 5-7(2)
        { player1Idx: 1, player2Idx: 2, scorerIdx: 5 }, // 2-3(6)
        { player1Idx: 0, player2Idx: 10, scorerIdx: 6 }, // 1-11(7)
        { player1Idx: 5, player2Idx: 9, scorerIdx: 4 }, // 6-10(5)
        { player1Idx: 3, player2Idx: 6, scorerIdx: 2 }, // 4-7(3)
        { player1Idx: 7, player2Idx: 10, scorerIdx: 8 }, // 8-11(9)
        { player1Idx: 1, player2Idx: 4, scorerIdx: 0 }, // 2-5(1)
        { player1Idx: 2, player2Idx: 5, scorerIdx: 3 }, // 3-6(4)
        { player1Idx: 0, player2Idx: 8, scorerIdx: 7 }, // 1-9(8)
        { player1Idx: 9, player2Idx: 10, scorerIdx: 1 }, // 10-11(2)
        { player1Idx: 3, player2Idx: 5, scorerIdx: 6 }, // 4-6(7)
        { player1Idx: 1, player2Idx: 9, scorerIdx: 2 }, // 2-10(3)
        { player1Idx: 4, player2Idx: 7, scorerIdx: 8 }, // 5-8(9)
        { player1Idx: 0, player2Idx: 6, scorerIdx: 10 }, // 1-7(11)
        { player1Idx: 2, player2Idx: 4, scorerIdx: 9 }, // 3-5(10)
        { player1Idx: 8, player2Idx: 10, scorerIdx: 5 }, // 9-11(6)
      ];

      case 12:
        return [
          { player1Idx: 0, player2Idx: 1, scorerIdx: 2 }, // 1-2(3)
          { player1Idx: 2, player2Idx: 3, scorerIdx: 4 }, // 3-4(5)
          { player1Idx: 4, player2Idx: 5, scorerIdx: 6 }, // 5-6(7)
          { player1Idx: 6, player2Idx: 7, scorerIdx: 8 }, // 7-8(9)
          { player1Idx: 8, player2Idx: 9, scorerIdx: 10 }, // 9-10(11)
          { player1Idx: 10, player2Idx: 11, scorerIdx: 0 }, // 11-12(1)
          { player1Idx: 1, player2Idx: 2, scorerIdx: 3 }, // 2-3(4)
          { player1Idx: 3, player2Idx: 4, scorerIdx: 5 }, // 4-5(6)
          { player1Idx: 5, player2Idx: 6, scorerIdx: 7 }, // 6-7(8)
          { player1Idx: 7, player2Idx: 8, scorerIdx: 9 }, // 8-9(10)
          { player1Idx: 9, player2Idx: 11, scorerIdx: 1 }, // 10-12(2)
          { player1Idx: 0, player2Idx: 10, scorerIdx: 5 }, // 1-11(6)
          { player1Idx: 1, player2Idx: 3, scorerIdx: 4 }, // 2-4(5)
          { player1Idx: 2, player2Idx: 7, scorerIdx: 6 }, // 3-8(7)
          { player1Idx: 4, player2Idx: 9, scorerIdx: 8 }, // 5-10(9)
          { player1Idx: 6, player2Idx: 11, scorerIdx: 0 }, // 7-12(1)
          { player1Idx: 8, player2Idx: 10, scorerIdx: 2 }, // 9-11(3)
          { player1Idx: 0, player2Idx: 9, scorerIdx: 7 }, // 1-10(8)
          { player1Idx: 1, player2Idx: 5, scorerIdx: 3 }, // 2-6(4)
          { player1Idx: 3, player2Idx: 10, scorerIdx: 9 }, // 4-11(10)
          { player1Idx: 2, player2Idx: 8, scorerIdx: 4 }, // 3-9(5)
          { player1Idx: 7, player2Idx: 11, scorerIdx: 1 }, // 8-12(2)
          { player1Idx: 0, player2Idx: 6, scorerIdx: 5 }, // 1-7(6)
          { player1Idx: 4, player2Idx: 8, scorerIdx: 10 }, // 5-9(11)
          { player1Idx: 2, player2Idx: 9, scorerIdx: 6 }, // 3-10(7)
          { player1Idx: 3, player2Idx: 5, scorerIdx: 0 }, // 4-6(1)
          { player1Idx: 1, player2Idx: 7, scorerIdx: 8 }, // 2-8(9)
          { player1Idx: 0, player2Idx: 3, scorerIdx: 4 }, // 1-4(5)
          { player1Idx: 6, player2Idx: 10, scorerIdx: 8 }, // 7-11(9)
          { player1Idx: 5, player2Idx: 11, scorerIdx: 0 }, // 6-12(1)
          { player1Idx: 8, player2Idx: 10, scorerIdx: 3 }, // 9-11(4)
          { player1Idx: 0, player2Idx: 4, scorerIdx: 7 }, // 1-5(8)
          { player1Idx: 2, player2Idx: 6, scorerIdx: 9 }, // 3-7(10)
          { player1Idx: 3, player2Idx: 11, scorerIdx: 5 }, // 4-12(6)
          { player1Idx: 7, player2Idx: 10, scorerIdx: 1 }, // 8-11(2)
          { player1Idx: 9, player2Idx: 11, scorerIdx: 6 }, // 10-12(7)
          { player1Idx: 0, player2Idx: 5, scorerIdx: 3 }, // 1-6(4)
          { player1Idx: 1, player2Idx: 8, scorerIdx: 2 }, // 2-9(3)
          { player1Idx: 4, player2Idx: 7, scorerIdx: 10 }, // 5-8(11)
          { player1Idx: 3, player2Idx: 9, scorerIdx: 0 }, // 4-10(1)
          { player1Idx: 1, player2Idx: 6, scorerIdx: 7 }, // 2-7(8)
          { player1Idx: 0, player2Idx: 2, scorerIdx: 9 }, // 1-3(10)
          { player1Idx: 5, player2Idx: 10, scorerIdx: 8 }, // 6-11(9)
          { player1Idx: 2, player2Idx: 4, scorerIdx: 11 }, // 3-5(12)
          { player1Idx: 7, player2Idx: 9, scorerIdx: 1 }, // 8-10(2)
          { player1Idx: 3, player2Idx: 8, scorerIdx: 6 }, // 4-9(7)
          { player1Idx: 0, player2Idx: 11, scorerIdx: 4 }, // 1-12(5)
          { player1Idx: 1, player2Idx: 10, scorerIdx: 5 }, // 2-11(6)
          { player1Idx: 6, player2Idx: 8, scorerIdx: 3 }, // 7-9(4)
          { player1Idx: 2, player2Idx: 5, scorerIdx: 0 }, // 3-6(1)
          { player1Idx: 4, player2Idx: 10, scorerIdx: 7 }, // 5-11(8)
          { player1Idx: 3, player2Idx: 7, scorerIdx: 2 }, // 4-8(3)
          { player1Idx: 1, player2Idx: 9, scorerIdx: 11 }, // 2-10(12)
          { player1Idx: 0, player2Idx: 6, scorerIdx: 8 }, // 1-7(9)
          { player1Idx: 5, player2Idx: 11, scorerIdx: 4 }, // 6-12(5)
          { player1Idx: 2, player2Idx: 3, scorerIdx: 10 }, // 3-4(11)
          { player1Idx: 7, player2Idx: 10, scorerIdx: 1 }, // 8-11(2)
          { player1Idx: 8, player2Idx: 9, scorerIdx: 6 }, // 9-10(7)
          { player1Idx: 0, player2Idx: 4, scorerIdx: 5 }, // 1-5(6)
          { player1Idx: 1, player2Idx: 3, scorerIdx: 2 }, // 2-4(3)
          { player1Idx: 6, player2Idx: 9, scorerIdx: 7 }, // 7-10(8)
          { player1Idx: 5, player2Idx: 11, scorerIdx: 0 }, // 6-12(1)
          { player1Idx: 2, player2Idx: 8, scorerIdx: 3 }, // 3-9(4)
          { player1Idx: 4, player2Idx: 10, scorerIdx: 1 }, // 5-11(2)
          { player1Idx: 7, player2Idx: 11, scorerIdx: 8 }, // 8-12(9)
          { player1Idx: 3, player2Idx: 10, scorerIdx: 6 }, // 4-11(7)
          { player1Idx: 1, player2Idx: 5, scorerIdx: 9 }, // 2-6(10)
          { player1Idx: 0, player2Idx: 2, scorerIdx: 4 }, // 1-3(5)
          { player1Idx: 3, player2Idx: 6, scorerIdx: 11 }, // 4-7(12)
          { player1Idx: 8, player2Idx: 10, scorerIdx: 0 }, // 9-11(1)
          { player1Idx: 9, player2Idx: 11, scorerIdx: 5 }, //10-12(6)
          { player1Idx: 2, player2Idx: 7, scorerIdx: 3 }, // 3-8(4)
          { player1Idx: 1, player2Idx: 4, scorerIdx: 10 }, // 2-5(11)
          { player1Idx: 0, player2Idx: 8, scorerIdx: 7 }, // 1-9(8)
          { player1Idx: 5, player2Idx: 9, scorerIdx: 6 }, // 6-10(7)
        ]}}

export async function POST(request: Request, { params }: { params: { code: string } }) {
  try {
    await connectMongo();
    const { TournamentModel, BoardModel, MatchModel } = getModels();
    const { code } = await params;

    const tournament = await TournamentModel.findOne({ code });
    if (!tournament) {
      return NextResponse.json({ error: "Torna nem található" }, { status: 404 });
    }

    if (tournament.status !== "created") {
      return NextResponse.json({ error: "A torna már elindult vagy befejeződött" }, { status: 400 });
    }

    const players = [...tournament.players];
    const boardCount = tournament.boardCount;
    const playersPerGroup = Math.ceil(players.length / boardCount);

    for (let i = players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [players[i], players[j]] = [players[j], players[i]];
    }

    const groups = [];
    for (let groupIndex = 0; groupIndex < boardCount; groupIndex++) {
      const groupPlayers = players.slice(groupIndex * playersPerGroup, (groupIndex + 1) * playersPerGroup);
      if (groupPlayers.length === 0) continue;

      const numberedPlayers = groupPlayers.map((playerId, index) => ({
        playerId,
        number: index + 1,
      }));

      const orderedMatches = generateMatches(numberedPlayers.length);

      const matches = [];
      for (const { player1Idx, player2Idx, scorerIdx } of orderedMatches) {
        const match = await MatchModel.create({
          tournamentId: tournament._id,
          groupIndex,
          player1Number: numberedPlayers[player1Idx].number,
          player2Number: numberedPlayers[player2Idx].number,
          scribeNumber: numberedPlayers[scorerIdx].number,
          player1: numberedPlayers[player1Idx].playerId,
          player2: numberedPlayers[player2Idx].playerId,
          scorer: numberedPlayers[scorerIdx].playerId,
          status: 'pending',
        });

        matches.push(match._id);
      }

      groups.push({
        players: numberedPlayers,
        matches,
      });
    }

    await BoardModel.deleteMany({ tournamentId: tournament._id });
    const boards = [];
    for (let i = 1; i <= boardCount; i++) {
      boards.push({
        tournamentId: tournament._id,
        boardId: uuidv4(),
        boardNumber: i,
        status: "idle",
        waitingPlayers: [],
      });
    }
    await BoardModel.insertMany(boards);

    tournament.groups = groups;
    tournament.status = "group";
    await tournament.save();

    return NextResponse.json({ message: "Csoportok és mérkőzések sikeresen kiosztva" });
  } catch (error) {
    console.error("Hiba a csoportok kiosztásakor:", error);
    return NextResponse.json({ error: "Nem sikerült a csoportok kiosztása" }, { status: 500 });
  }
}