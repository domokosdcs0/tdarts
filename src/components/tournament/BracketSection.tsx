'use client';

import { useMemo } from "react";
import { Bracket } from "react-brackets";
import { Tournament, Match } from "@/components/tournament/TournamentDetailsPage";

interface BracketSectionProps {
  tournament: Tournament;
}

function BracketSection({ tournament }: BracketSectionProps) {
  // Memoize bracketData to avoid unnecessary recalculations
  const bracketData = useMemo(() => {
    if (tournament.status !== "knockout" || !tournament.knockout?.rounds) {
      return { rounds: [] };
    }

   console.log("Tournament data:",  tournament.knockout.rounds)

    return {
      rounds: tournament.knockout.rounds.map((round, index) => ({
        title:
          index === tournament.knockout.rounds.length - 1
            ? "Döntő"
            : index === tournament.knockout.rounds.length - 2
            ? "Elődöntő"
            : `Kör ${index + 1}`,
        seeds: (round.matches || []).map((match: Match) => ({
          id: match._id || `placeholder-${index}`,
          teams: [
            {
              name: match.player1?.name || "TBD",
              score: match.status === "finished" && match.stats ? match.stats.player1.legsWon : null,
            },
            {
              name: match.player2?.name || "TBD",
              score: match.status === "finished" && match.stats ? match.stats.player2.legsWon : null,
            },
          ],
        })),
      })),
    };
  }, [tournament]);

  console.log("Bracket data:", JSON.stringify(bracketData, null, 2));

  if (tournament.status !== "knockout") {
    return (
      <div className="mt-6">
        <h2 className="text-xl font-bold">Főtábla</h2>
        <p>Jelenleg nincs főtábla. (Kieséses szakasz a /board/[code] oldalon követhető.)</p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold">Főtábla</h2>
      <div className="w-full overflow-x-auto">
        <Bracket rounds={bracketData.rounds} />
      </div>
    </div>
  );
}

export default BracketSection;