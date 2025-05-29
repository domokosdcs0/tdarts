'use client';

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { Match } from "@/components/tournament/TournamentDetailsPage";

interface MatchResultEditorProps {
  tournamentId: string;
  isModerator: boolean;
  loading: boolean;
}

interface MatchResultForm {
  matchId: string;
  winnerId: string;
  player1LegsWon: number;
  player2LegsWon: number;
  stats: {
    player1: { legsWon: number; dartsThrown: number; average: number };
    player2: { legsWon: number; dartsThrown: number; average: number };
  };
}

export default function MatchResultEditor({ tournamentId, isModerator, loading }: MatchResultEditorProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [formData, setFormData] = useState<MatchResultForm | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Meccsek lekérése
  useEffect(() => {
    if (!isModerator) return;

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

    fetchMatches();
  }, [tournamentId, isModerator]);

  // Keresés szűrése
  const filteredMatches = matches.filter((match) =>
    match.matchReference
      ? `${match.matchReference.player1.name} ${match.matchReference.player2.name} ${match.matchReference._id}`
          .toLowerCase()
          .includes(searchQuery.toLowerCase())
      : false
  );

  // Meccs kiválasztása
  const handleSelectMatch = (match: Match) => {
    if (!match.matchReference) return;
    setSelectedMatch(match);
    setFormData({
      matchId: match.matchReference._id,
      winnerId: match.matchReference.winner?._id || "",
      player1LegsWon: match.matchReference.stats.player1.legsWon || 0,
      player2LegsWon: match.matchReference.stats.player2.legsWon || 0,
      stats: {
        player1: {
          legsWon: match.matchReference.stats.player1.legsWon || 0,
          dartsThrown: match.matchReference.stats.player1.dartsThrown || 0,
          average: match.matchReference.stats.player1.average || 0,
        },
        player2: {
          legsWon: match.matchReference.stats.player2.legsWon || 0,
          dartsThrown: match.matchReference.stats.player2.dartsThrown || 0,
          average: match.matchReference.stats.player2.average || 0,
        },
      },
    });
  };

  // Űrlap mentése
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData || !selectedMatch || !selectedMatch.matchReference) return;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/matches/${selectedMatch.matchReference._id}/${tournamentId}/update-result`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          winnerId: formData.winnerId,
          player1LegsWon: parseInt(formData.player1LegsWon.toString()),
          player2LegsWon: parseInt(formData.player2LegsWon.toString()),
          stats: {
            player1: {
              legsWon: parseInt(formData.player1LegsWon.toString()),
              dartsThrown: parseInt(formData.stats.player1.dartsThrown.toString()),
              average: parseFloat(formData.stats.player1.average.toString()),
            },
            player2: {
              legsWon: parseInt(formData.player2LegsWon.toString()),
              dartsThrown: parseInt(formData.stats.player2.dartsThrown.toString()),
              average: parseFloat(formData.stats.player2.average.toString()),
            },
          },
          highestCheckout: { player1: 0, player2: 0 }, // Üres értékek, opcionális
          oneEighties: {
            player1: { count: 0, darts: [] },
            player2: { count: 0, darts: [] },
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Nem sikerült a meccs eredményének mentése");
      }

      toast.success("Meccs eredménye sikeresen mentve");
      setSelectedMatch(null);
      setFormData(null);

      // Meccsek frissítése
      const updatedRes = await fetch(`/api/matches?tournamentId=${tournamentId}`);
      if (updatedRes.ok) {
        const data = await updatedRes.json();
        setMatches(data.matches || []);
      }
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
        {/* Keresőmező */}
        <input
          type="text"
          placeholder="Keresés (játékos neve, meccs ID)"
          className="input input-bordered w-full mb-4"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={loading || isLoading}
        />

        {/* Meccsek táblázata */}
        <div className="overflow-x-auto">
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
                  <td>{match.matchReference?.round || "Ismeretlen"}</td>
                  <td>
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
        </div>

        {/* Szerkesztő űrlap */}
        {selectedMatch && formData && selectedMatch.matchReference && (
          <form onSubmit={handleSubmit} className="mt-4">
            <h4 className="text-lg font-semibold mb-2">
              {selectedMatch.matchReference.player1.name} vs {selectedMatch.matchReference.player2.name}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
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
                <label className="label">Játékos 1 Legek</label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={formData.player1LegsWon}
                  onChange={(e) =>
                    setFormData({ ...formData, player1LegsWon: parseInt(e.target.value) || 0 })
                  }
                  min="0"
                  disabled={loading || isLoading}
                />
              </div>
              <div>
                <label className="label">Játékos 2 Legek</label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={formData.player2LegsWon}
                  onChange={(e) =>
                    setFormData({ ...formData, player2LegsWon: parseInt(e.target.value) || 0 })
                  }
                  min="0"
                  disabled={loading || isLoading}
                />
              </div>
              <div>
                <label className="label">Játékos 1 Átlag</label>
                <input
                  type="number"
                  step="0.01"
                  className="input input-bordered w-full"
                  value={formData.stats.player1.average}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stats: {
                        ...formData.stats,
                        player1: { ...formData.stats.player1, average: parseFloat(e.target.value) || 0 },
                      },
                    })
                  }
                  min="0"
                  disabled={loading || isLoading}
                />
              </div>
              <div>
                <label className="label">Játékos 2 Átlag</label>
                <input
                  type="number"
                  step="0.01"
                  className="input input-bordered w-full"
                  value={formData.stats.player2.average}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stats: {
                        ...formData.stats,
                        player2: { ...formData.stats.player2, average: parseFloat(e.target.value) || 0 },
                      },
                    })
                  }
                  min="0"
                  disabled={loading || isLoading}
                />
              </div>
              <div>
                <label className="label">Játékos 1 Dobások</label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={formData.stats.player1.dartsThrown}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stats: {
                        ...formData.stats,
                        player1: {
                          ...formData.stats.player1,
                          dartsThrown: parseInt(e.target.value) || 0,
                        },
                      },
                    })
                  }
                  min="0"
                  disabled={loading || isLoading}
                />
              </div>
              <div>
                <label className="label">Játékos 2 Dobások</label>
                <input
                  type="number"
                  className="input input-bordered w-full"
                  value={formData.stats.player2.dartsThrown}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      stats: {
                        ...formData.stats,
                        player2: {
                          ...formData.stats.player2,
                          dartsThrown: parseInt(e.target.value) || 0,
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
                className="btn btn-secondary"
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