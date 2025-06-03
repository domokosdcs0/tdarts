'use client';

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Match } from "@/components/tournament/TournamentDetailsPage";
import { motion, AnimatePresence } from "framer-motion";

interface MatchResultEditorProps {
  tournamentId: string;
  isModerator: boolean;
  loading: boolean;
}

interface MatchResultForm {
  matchId: string;
  winnerId: string;
  winnerLegsWon: number;
  loserLegsWon: number;
  stats: {
    winner: { legsWon: number; dartsThrown: number; average: number; highestCheckout: number; oneEighties: number };
    loser: { legsWon: number; dartsThrown: number; average: number; highestCheckout: number; oneEighties: number };
  };
}

export default function MatchResultEditor({ tournamentId, isModerator, loading }: MatchResultEditorProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [formData, setFormData] = useState<MatchResultForm | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTableOpen, setIsTableOpen] = useState(false);

  // Fetch matches
  const fetchMatches = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/matches?tournamentId=${tournamentId}`);
      if (!res.ok) throw new Error("Nem sikerült a meccsek betöltése");
      const data = await res.json();
      setMatches(data.matches || []);
    } catch (error: any) {
      toast.error(error.message || "Hiba a meccsek betöltése során");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isModerator) return;
    fetchMatches();
  }, [tournamentId, isModerator]);

  // Auto-open table on search
  useEffect(() => {
    if (searchQuery.trim()) {
      setIsTableOpen(true);
    }
  }, [searchQuery]);

  // Filtered matches
  const filteredMatches = matches.filter((match) =>
    match.matchReference
      ? `${match.matchReference.player1.name} ${match.matchReference.player2.name} ${match.matchReference._id}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      : false
  );

  // Select match
  const handleSelectMatch = (match: Match) => {
    if (!match.matchReference) return;
    const winnerId = match.matchReference.winner?._id || "";
    const player1IsWinner = winnerId === match.matchReference.player1._id;
    setSelectedMatch(match);
    setFormData({
      matchId: match.matchReference._id,
      winnerId,
      winnerLegsWon: player1IsWinner
        ? match.matchReference.stats.player1.legsWon || 0
        : match.matchReference.stats.player2.legsWon || 0,
      loserLegsWon: player1IsWinner
        ? match.matchReference.stats.player2.legsWon || 0
        : match.matchReference.stats.player1.legsWon || 0,
      stats: {
        winner: {
          legsWon: player1IsWinner
            ? match.matchReference.stats.player1.legsWon || 0
            : match.matchReference.stats.player2.legsWon || 0,
          dartsThrown: match.matchReference.stats[player1IsWinner ? "player1" : "player2"].dartsThrown || 40,
          average: match.matchReference.stats[player1IsWinner ? "player1" : "player2"].average || 50,
          highestCheckout: 0,
          oneEighties: 0,
        },
        loser: {
          legsWon: player1IsWinner
            ? match.matchReference.stats.player2.legsWon || 0
            : match.matchReference.stats.player1.legsWon || 0,
          dartsThrown: match.matchReference.stats[player1IsWinner ? "player2" : "player1"].dartsThrown || 40,
          average: match.matchReference.stats[player1IsWinner ? "player2" : "player1"].average || 50,
          highestCheckout: 0,
          oneEighties: 0,
        },
      },
    });
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !selectedMatch || !selectedMatch.matchReference) return;

    setIsLoading(true);
    try {
      const player1IsWinner = formData.winnerId === selectedMatch.matchReference.player1._id;
      const payload = {
        winnerId: formData.winnerId,
        player1LegsWon: player1IsWinner ? formData.winnerLegsWon : formData.loserLegsWon,
        player2LegsWon: player1IsWinner ? formData.loserLegsWon : formData.winnerLegsWon,
        stats: {
          player1: {
            legsWon: player1IsWinner ? formData.winnerLegsWon : formData.loserLegsWon,
            dartsThrown: player1IsWinner
              ? formData.stats.winner.dartsThrown
              : formData.stats.loser.dartsThrown,
            average: player1IsWinner ? formData.stats.winner.average : formData.stats.loser.average,
          },
          player2: {
            legsWon: player1IsWinner ? formData.loserLegsWon : formData.winnerLegsWon,
            dartsThrown: player1IsWinner
              ? formData.stats.loser.dartsThrown
              : formData.stats.winner.dartsThrown,
            average: player1IsWinner ? formData.stats.loser.average : formData.stats.winner.average,
          },
        },
        highestCheckout: {
          player1: player1IsWinner
            ? formData.stats.winner.highestCheckout
            : formData.stats.loser.highestCheckout,
          player2: player1IsWinner
            ? formData.stats.loser.highestCheckout
            : formData.stats.winner.highestCheckout,
        },
        oneEighties: {
          player1: {
            count: player1IsWinner ? formData.stats.winner.oneEighties : formData.stats.loser.oneEighties,
            darts: [],
          },
          player2: {
            count: player1IsWinner ? formData.stats.loser.oneEighties : formData.stats.winner.oneEighties,
            darts: [],
          },
        },
      };

      const res = await fetch(`/api/matches/${selectedMatch.matchReference._id}/${tournamentId}/update-result`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Nem sikerült a meccs eredményének mentése");
      }

      toast.success("Meccs eredménye sikeresen mentve");
      setSelectedMatch(null);
      setFormData(null);
      await fetchMatches();
    } catch (error: any) {
      toast.error(error.message || "Hiba a mentés során");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isModerator) return null;

  return (
    <div className="mt-4">
      <h3 className="text-2xl font-bold text-gray-800 mb-4">Meccs Eredmények Kezelése</h3>
      <div className="card bg-base-100 shadow-xl p-4">
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            placeholder="Keresés (játékos neve, meccs ID)"
            className="input input-bordered w-full max-w-md"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loading || isLoading}
          />
          <button
            className="btn btn-primary"
            onClick={fetchMatches}
            disabled={loading || isLoading}
          >
            {isLoading ? <span className="loading loading-spinner"></span> : "Meccsek frissítése"}
          </button>
          <button
          className="btn btn-outline "
          onClick={() => setIsTableOpen(!isTableOpen)}
          disabled={loading || isLoading}
        >
          {isTableOpen ? "Táblázat bezárása" : "Táblázat kinyitása"}
        </button>
        </div>

        <AnimatePresence>
          {isTableOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-x-auto"
            >
              <table className="table w-full">
                <thead>
                  <tr>
                    <th>Játékos 1</th>
                    <th>Játékos 2</th>
                    <th>Kör/Csoport</th>
                    <th>Állapot</th>
                    <th>Eredmény</th>
                    <th>Művelet</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMatches.map((match) => (
                    <tr key={match._id}>
                      <td>{match.matchReference?.player1.name || "-"}</td>
                      <td>{match.matchReference?.player2.name || "-"}</td>
                      <td>
                        {match.matchReference?.isKnockout 
                            ? `${match.matchReference?.round}. Kör` 
                            : `${(match.matchReference?.round ?? 0) + 1}. Csoport`}
                        </td>
                        <td
                            className={
                                match.matchReference?.status === "finished"
                                ? "text-green-500"
                                : match.matchReference?.status === "ongoing"
                                ? "text-blue-500"
                                : "text-yellow-500"
                            }
                            >
                            {match.matchReference?.status === "finished"
                                ? "Befejezve"
                                : match.matchReference?.status === "ongoing"
                                ? "Folyamatban"
                                : "Függőben"}
                            </td>
                      <td>
                        {match.matchReference?.status === "finished"
                          ? `${match.matchReference.stats.player1.legsWon} - ${match.matchReference.stats.player2.legsWon}`
                          : "-"}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleSelectMatch(match)}
                          disabled={loading || isLoading || !match.matchReference}
                        >
                          Szerkesztés
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>

        {selectedMatch && formData && selectedMatch.matchReference && (
          <form onSubmit={handleSubmit} className="mt-4">
            <h4 className="text-lg font-semibold mb-2">
              {selectedMatch.matchReference.player1.name} vs {selectedMatch.matchReference.player2.name}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Győztes</label>
                <select
                  className="select select-bordered w-full"
                  value={formData.winnerId}
                  onChange={(e) => setFormData({ ...formData, winnerId: e.target.value })}
                  disabled={loading || isLoading}
                >
                  <option value="">Válassz győztest</option>
                  <option value={selectedMatch.matchReference.player1._id}>
                    {selectedMatch.matchReference.player1.name}
                  </option>
                  <option value={selectedMatch.matchReference.player2._id}>
                    {selectedMatch.matchReference.player2.name}
                  </option>
                </select>
              </div>
              <div>
                <label className="label">Győztes Legek</label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={formData.winnerLegsWon}
                  onChange={(e) =>
                    setFormData({ ...formData, winnerLegsWon: parseInt(e.target.value) || 0 })
                  }
                  min="0"
                  disabled={loading || isLoading}
                />
              </div>
              <div>
                <label className="label">Vesztes Legek</label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={formData.loserLegsWon}
                  onChange={(e) =>
                    setFormData({ ...formData, loserLegsWon: parseInt(e.target.value) || 0 })
                  }
                  min="0"
                  disabled={loading || isLoading}
                />
              </div>
              <div>
                <label className="label">Győztes Átlag</label>
                <input
                  type="number"
                  step="0.01"
                  className="input input-bordered w-full"
                  value={formData.stats.winner.average}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stats: {
                        ...formData.stats,
                        winner: { ...formData.stats.winner, average: parseFloat(e.target.value) || 50 },
                      },
                    })
                  }
                  min="0"
                  disabled={loading || isLoading}
                />
              </div>
              <div>
                <label className="label">Vesztes Átlag</label>
                <input
                  type="number"
                  step="0.01"
                  className="input input-bordered w-full"
                  value={formData.stats.loser.average}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stats: {
                        ...formData.stats,
                        loser: { ...formData.stats.loser, average: parseFloat(e.target.value) || 50 },
                      },
                    })
                  }
                  min="0"
                  disabled={loading || isLoading}
                />
              </div>
              <div>
                <label className="label">Győztes Dobások</label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={formData.stats.winner.dartsThrown}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stats: {
                        ...formData.stats,
                        winner: {
                          ...formData.stats.winner,
                          dartsThrown: parseInt(e.target.value) || 40,
                        },
                      },
                    })
                  }
                  min="0"
                  disabled={loading || isLoading}
                />
              </div>
              <div>
                <label className="label">Vesztes Dobások</label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={formData.stats.loser.dartsThrown}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stats: {
                        ...formData.stats,
                        loser: {
                          ...formData.stats.loser,
                          dartsThrown: parseInt(e.target.value) || 40,
                        },
                      },
                    })
                  }
                  min="0"
                  disabled={loading || isLoading}
                />
              </div>
              <div>
                <label className="label">Győztes Legmagasabb Kiszálló</label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={formData.stats.winner.highestCheckout}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stats: {
                        ...formData.stats,
                        winner: {
                          ...formData.stats.winner,
                          highestCheckout: parseInt(e.target.value) || 0,
                        },
                      },
                    })
                  }
                  min="0"
                  disabled={loading || isLoading}
                />
              </div>
              <div>
                <label className="label">Vesztes Legmagasabb Kiszálló</label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={formData.stats.loser.highestCheckout}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stats: {
                        ...formData.stats,
                        loser: {
                          ...formData.stats.loser,
                          highestCheckout: parseInt(e.target.value) || 0,
                        },
                      },
                    })
                  }
                  min="0"
                  disabled={loading || isLoading}
                />
              </div>
              <div>
                <label className="label">Győztes 180-ak</label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={formData.stats.winner.oneEighties}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stats: {
                        ...formData.stats,
                        winner: {
                          ...formData.stats.winner,
                          oneEighties: parseInt(e.target.value) || 0,
                        },
                      },
                    })
                  }
                  min="0"
                  disabled={loading || isLoading}
                />
              </div>
              <div>
                <label className="label">Vesztes 180-ak</label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={formData.stats.loser.oneEighties}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stats: {
                        ...formData.stats,
                        loser: {
                          ...formData.stats.loser,
                          oneEighties: parseInt(e.target.value) || 0,
                        },
                      },
                    })
                  }
                  min="0"
                  disabled={loading || isLoading}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="submit"
                className="btn btn-success"
                disabled={loading || isLoading}
              >
                {isLoading ? <span className="loading loading-spinner"></span> : "Mentés"}
              </button>
              <button
                type="button"
                className="btn btn-error"
                onClick={() => {
                  setSelectedMatch(null);
                  setFormData(null);
                }}
                disabled={loading || isLoading}
              >
                Mégse
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}