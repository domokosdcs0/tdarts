'use client';

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "react-hot-toast";
import { useParams } from "next/navigation";

const passwordSchema = z.object({
  password: z.string().min(1, "A jelszó megadása kötelező"),
});

const playerSchema = z.object({
  playerInput: z.string().min(1, "A játékos neve kötelező"),
});

type PasswordForm = z.infer<typeof passwordSchema>;
type PlayerForm = z.infer<typeof playerSchema>;

interface Player {
  _id: string;
  name: string;
  stats?: {
    matchesWon: number;
  };
}

interface Standing {
  playerId: { _id: string; name: string };
  points: number;
  legsWon: number;
  legsLost: number;
  legDifference: number;
  rank: number;
}

interface GroupPlayer {
  playerId: {
    _id: string;
    name: string;
  };
  number: number;
}

interface Match {
  _id: string;
  player1: { _id: string; name: string };
  player2: { _id: string; name: string };
  scorer?: { _id: string; name: string };
  status: "pending" | "ongoing" | "finished";
}

interface Group {
  _id: string;
  players: GroupPlayer[];
  standings: Standing[];
  matches: Match[];
}

interface Tournament {
  _id: string;
  code: string;
  name: string;
  status: "created" | "group" | "knockout" | "finished";
  boardCount: number;
  description?: string;
  createdAt: string;
  players: Player[];
  groups: Group[];
}

interface Board {
  _id: string;
  boardNumber: number;
  status: "idle" | "waiting" | "playing";
  waitingPlayers: Player[];
  nextMatch?: {
    player1: { _id: string; name: string };
    player2: { _id: string; name: string };
    scorer?: { _id: string; name: string };
  };
}

export default function TournamentDetailsPage() {
  const { code } = useParams();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [boards, setBoards] = useState<Board[]>([]);
  const [isModerator, setIsModerator] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "ranking">("name");
  const [playerSuggestions, setPlayerSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  });

  const playerForm = useForm<PlayerForm>({
    resolver: zodResolver(playerSchema),
    defaultValues: { playerInput: "" },
  });

  // Torna adatainak lekérése
  const fetchTournament = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${code}`);
      if (!res.ok) throw new Error("Nem sikerült a torna lekérése");
      const data = await res.json();
      console.log("API Response:", data);
      setTournament(data.tournament);
      setBoards(data.boards);
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a torna lekérése");
    } finally {
      setLoading(false);
    }
  };

  // Polling és kezdeti adatlekérés
  useEffect(() => {
    fetchTournament();

    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/tournaments/${code}`);
        if (!res.ok) return;
        const data = await res.json();
        console.log("Polling Response:", data);
        setTournament(data.tournament);
        setBoards(data.boards);
      } catch (error) {
        console.error("Hiba a táblák pollingja során:", error);
      }
    }, 10000); // Reduced to 10 seconds for faster testing
    return () => clearInterval(intervalId);
  }, [code]);

  // Jelszó ellenőrzése
  const handlePasswordSubmit = async (data: PasswordForm) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${code}/verify-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: data.password }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Helytelen jelszó");
      }
      setIsModerator(true);
      toast.success("Sikeresen hitelesítve mint moderátor");
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a hitelesítés");
    } finally {
      setLoading(false);
    }
  };

  // Játékos keresés
  const handlePlayerSearch = async (query: string) => {
    if (query.length < 2) {
      setPlayerSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/players/search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      setPlayerSuggestions(data.players.map((p: { name: string }) => p.name));
    } catch (error) {
      console.error("Hiba a játékosok keresésekor:", error);
    }
  };

  // Játékos hozzáadása
  const addPlayer = async (name: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${code}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName: name }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Nem sikerült a játékos hozzáadása");
      }
      await fetchTournament();
      toast.success("Játékos sikeresen hozzáadva");
      playerForm.reset();
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a játékos hozzáadása");
    } finally {
      setLoading(false);
    }
  };

  // Játékos törlése
  const removePlayer = async (playerId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${code}/players`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Nem sikerült a játékos törlése");
      }
      await fetchTournament();
      toast.success("Játékos sikeresen törölve");
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a játékos törlése");
    } finally {
      setLoading(false);
    }
  };

  // Csoportok kiosztása
  const assignGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${code}/assign-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Nem sikerült a csoportok kiosztása");
      }
      await fetchTournament();
      toast.success("Csoportok és mérkőzések sikeresen kiosztva");
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a csoportok kiosztása");
    } finally {
      setLoading(false);
    }
  };

  // Torna állapotának módosítása
  const updateStatus = async (status: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${code}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Nem sikerült az állapot módosítása");
      }
      await fetchTournament();
      toast.success("Torna állapota sikeresen módosítva");
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült az állapot módosítása");
    } finally {
      setLoading(false);
    }
  };

  // Kieső játékosok meghatározása
  const getEliminatedPlayers = (groupIndex: number): string[] => {
    if (!tournament || !tournament.groups || !tournament.players) return [];
    const totalPlayers = tournament.players.length;
    const groupsCount = tournament.groups.length;
    if (groupsCount === 0) return [];
  
    // Calculate qualifying players (closest power of 2 <= totalPlayers)
    const qualifyingPlayers = Math.pow(2, Math.floor(Math.log2(totalPlayers)));
    const eliminatedPlayersCount = totalPlayers - qualifyingPlayers;
  
    // Get group sizes
    const groupSizes = tournament.groups.map((group) => group.players?.length || 0);
    const totalGroupPlayers = groupSizes.reduce((sum, size) => sum + size, 0);
  
    // Distribute eliminations based on group size proportion
    const eliminationsPerGroup = groupSizes.map((size) =>
      Math.round((size / totalGroupPlayers) * eliminatedPlayersCount)
    );
  
    // Adjust to ensure total eliminations match eliminatedPlayersCount
    let currentTotal = eliminationsPerGroup.reduce((sum, count) => sum + count, 0);
    while (currentTotal !== eliminatedPlayersCount) {
      const diff = eliminatedPlayersCount - currentTotal;
      const indexToAdjust = diff > 0 ? 
        groupSizes.findIndex((size, i) => eliminationsPerGroup[i] < size) : 
        groupSizes.findIndex((size, i) => eliminationsPerGroup[i] > 0);
      if (indexToAdjust === -1) break;
      eliminationsPerGroup[indexToAdjust] += diff > 0 ? 1 : -1;
      currentTotal += diff > 0 ? 1 : -1;
    }
  
    const group = tournament.groups[groupIndex];
    const eliminatedInGroup = eliminationsPerGroup[groupIndex] || 0;
  
    if (!group.standings || eliminatedInGroup <= 0) return [];
  
    // Sort standings by rank and get bottom players
    const sortedStandings = [...group.standings].sort((a, b) => (a.rank || 0) - (b.rank || 0));
    const eliminatedPlayers = sortedStandings.slice(-eliminatedInGroup).map((s) => s.playerId._id);
  
    console.log(
      `Eliminated players for group ${groupIndex + 1} (eliminate ${eliminatedInGroup}):`,
      eliminatedPlayers
    );
  
    return eliminatedPlayers;
  };

  if (!tournament) {
    return (
      <div className="min-h-screen bg-base-200 w-full flex items-center justify-center">
        <div className="spinner loading loading-spinner bg-red-800"></div>
      </div>
    );
  }

  // Játékosok rendezése
  const sortedPlayers = [...tournament.players].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name, "hu", { sensitivity: "base" });
    }
    return (b.stats?.matchesWon || 0) - (a.stats?.matchesWon || 0);
  });

  return (
    <main className="min-h-screen bg-base-200 w-full">
      <div className="container mx-auto p-4 flex flex-col md:flex-row gap-4">
        {/* Sidebar */}
        <div className={`drawer md:drawer-open ${isSidebarOpen ? "drawer-open" : ""} md:w-1/3`}>
          <input id="sidebar" type="checkbox" className="drawer-toggle" checked={isSidebarOpen} />
          <div className="drawer-content md:hidden">
            <label htmlFor="sidebar" className="btn btn-primary drawer-button">
              Sidebar {isSidebarOpen ? "bezárása" : "megnyitása"}
            </label>
          </div>
          <div className="drawer-side">
            <label htmlFor="sidebar" className="drawer-overlay" onClick={() => setIsSidebarOpen(false)}></label>
            <div className="bg-base-100 p-4 h-full">
              <h2 className="text-xl font-bold mb-4">Játékosok</h2>
              <div className="flex gap-2 mb-4">
                <button
                  className={`btn btn-sm ${sortBy === "name" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setSortBy("name")}
                >
                  Betűrend
                </button>
                <button
                  className={`btn btn-sm ${sortBy === "ranking" ? "btn-primary" : "btn-outline"}`}
                  onClick={() => setSortBy("ranking")}
                >
                  Helyezés
                </button>
              </div>
              <ul className="space-y-2">
                {sortedPlayers.map((player) => (
                  <li key={player._id} className="flex justify-between items-center">
                    <span>{player.name}</span>
                    {isModerator && (
                      <button
                        className="btn btn-error btn-xs"
                        onClick={() => removePlayer(player._id)}
                        disabled={loading}
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Fő tartalom */}
        <div className="flex-1">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <h1 className="card-title text-2xl">{tournament.name}</h1>
                <button className="btn btn-primary" onClick={fetchTournament} disabled={loading}>
                  {loading ? <span className="loading loading-spinner"></span> : "Frissítés"}
                </button>
              </div>
              <p>
                Állapot:{" "}
                {tournament.status === "created"
                  ? "Létrehozva"
                  : tournament.status === "group"
                  ? "Csoportkör"
                  : tournament.status === "knockout"
                  ? "Kieséses szakasz"
                  : "Befejezve"}
              </p>
              <p>Táblák száma: {tournament.boardCount}</p>
              {tournament.description && <p>Leírás: {tournament.description}</p>}
              {tournament.createdAt && (
                <p>Létrehozva: {new Date(tournament.createdAt).toLocaleString("hu-HU")}</p>
              )}

              {/* Moderátor hitelesítés */}
              {!isModerator && (
                <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="mt-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Moderátor jelszó</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        {...passwordForm.register("password")}
                        className="input input-bordered w-full"
                        placeholder="Add meg a torna jelszavát"
                      />
                      <button type="submit" className="btn btn-primary" disabled={loading}>
                        {loading ? <span className="loading loading-spinner"></span> : "Hitelesítés"}
                      </button>
                    </div>
                    {passwordForm.formState.errors.password && (
                      <span className="text-error text-sm">
                        {passwordForm.formState.errors.password.message}
                      </span>
                    )}
                  </div>
                </form>
              )}

              {/* Moderátor funkciók */}
              {isModerator && (
                <div className="mt-4 space-y-4">
                  <form
                    onSubmit={playerForm.handleSubmit((data) => addPlayer(data.playerInput))}
                    className="form-control"
                  >
                    <label className="label">
                      <span className="label-text">Játékos hozzáadása</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          {...playerForm.register("playerInput")}
                          className="input input-bordered w-full"
                          placeholder="Add meg a játékos nevét"
                          onChange={(e) => handlePlayerSearch(e.target.value)}
                        />
                        {playerSuggestions.length > 0 && (
                          <ul className="absolute z-10 bg-base-100 border border-base-300 rounded-md mt-1 w-full max-h-40 overflow-auto">
                            {playerSuggestions.map((suggestion) => (
                              <li
                                key={suggestion}
                                className="p-2 hover:bg-primary hover:text-primary-content cursor-pointer"
                                onClick={() => {
                                  playerForm.setValue("playerInput", suggestion);
                                  addPlayer(suggestion);
                                }}
                              >
                                {suggestion}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
                        Hozzáad
                      </button>
                    </div>
                    {playerForm.formState.errors.playerInput && (
                      <span className="text-error text-sm">
                        {playerForm.formState.errors.playerInput.message}
                      </span>
                    )}
                  </form>

                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn btn-primary"
                      onClick={assignGroups}
                      disabled={loading || tournament.status !== "created"}
                    >
                      Csoportok kiosztása
                    </button>
                    <button
                      className="btn btn-success"
                      onClick={() => updateStatus("group")}
                      disabled={loading || tournament.status !== "created"}
                    >
                      Csoportkör indítása
                    </button>
                    <button
                      className="btn btn-warning"
                      onClick={() => updateStatus("knockout")}
                      disabled={loading || tournament.status !== "group"}
                    >
                      Kieséses szakasz indítása
                    </button>
                    <button
                      className="btn btn-error"
                      onClick={() => updateStatus("finished")}
                      disabled={loading || !["group", "knockout"].includes(tournament.status)}
                    >
                      Torna befejezése
                    </button>
                  </div>
                </div>
              )}

              {/* Csoportok */}
              <div className="mt-6">
                <h2 className="text-xl font-bold">Csoportok</h2>
                {tournament.groups.length === 0 ? (
                  <p>Nincsenek még csoportok kiosztva.</p>
                ) : (
                  <div className="space-y-4 mt-4">
                    {tournament.groups.map((group, index) => {
                      console.log(`Group ${index + 1}:`, group);
                      const eliminatedPlayers = getEliminatedPlayers(index);
                      return (
                        <div key={group._id} className="card bg-base-200 shadow-md">
                          <div className="card-body">
                            <h3 className="card-title">Csoport {index + 1} (Tábla {index + 1})</h3>
                            <table className="table w-full">
                              <thead>
                                <tr>
                                  <th>Sorszám</th>
                                  <th>Név</th>
                                  <th>Helyezés</th>
                                  <th>Pontok</th>
                                  <th>Legek</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.players && group.players.length > 0 ? (
                                  group.players.map((player) => {
                                    const standing = group.standings?.find(
                                      (s) => s.playerId._id.toString() === player.playerId._id.toString()
                                    );
                                    const isEliminated = eliminatedPlayers.includes(
                                      player.playerId._id.toString()
                                    );
                                    console.log(`Player ${player.playerId.name}:`, { standing, isEliminated });
                                    return (
                                      <tr key={player.playerId._id}>
                                        <td>{player.number || "-"}</td>
                                        <td className={isEliminated ? "text-error" : ""}>
                                          {player.playerId.name || "Ismeretlen"}
                                        </td>
                                        <td>{standing?.rank || "-"}</td>
                                        <td>{standing?.points || 0}</td>
                                        <td>
                                          {standing ? `${standing.legsWon}/${standing.legsLost}` : "-"}
                                        </td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan={5}>Nincsenek játékosok a csoportban.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                            <h4 className="font-semibold mt-4">Hátralévő mérkőzések:</h4>
                            {group.matches && group.matches.length > 0 ? (
                              <ul className="list-disc pl-5">
                                {group.matches
                                  .filter((match) => match.status === "pending")
                                  .map((match, matchIndex) => (
                                    <li key={match._id || matchIndex}>
                                      {(match.player1?.name || "Ismeretlen")} -{" "}
                                      {(match.player2?.name || "Ismeretlen")} (Eredményíró:{" "}
                                      {match.scorer?.name || "Nincs"})
                                    </li>
                                  ))}
                              </ul>
                            ) : (
                              <p>Nincsenek hátralévő mérkőzések.</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Táblák */}
              <div className="mt-6">
                <h2 className="text-xl font-bold">Táblák</h2>
                {boards.length === 0 ? (
                  <p>Nincsenek még táblák konfigurálva.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {boards.map((board) => (
                      <div key={board._id} className="card bg-base-200 shadow-md">
                        <div className="card-body">
                          <h3 className="card-title">Tábla {board.boardNumber}</h3>
                          <p>
                            Állapot:{" "}
                            {board.status === "idle"
                              ? "Üres"
                              : board.status === "waiting"
                              ? "Várakozik"
                              : "Játékban"}
                          </p>
                          {board.status === "waiting" && board.nextMatch ? (
                            <div>
                              <h4>Várakozik a következő játékosokra:</h4>
                              <ul className="list-disc pl-5">
                              
                                <li>{board.nextMatch.player1.name || "Ismeretlen"}</li>
                                <li>{board.nextMatch.player2.name || "Ismeretlen"}</li>
                              </ul>
                              <h4>Várakozik az eredményíróra:</h4>
                              <p className="pl-5">{board.nextMatch.scorer?.name || "Nincs"}</p>
                            </div>
                          ) : board.waitingPlayers && board.waitingPlayers.length > 0 ? (
                            <div>
                              <h4>Várakozó játékosok:</h4>
                              <ul className="list-disc pl-5">
                                {board.waitingPlayers.map((player) => (
                                  <li key={player._id}>{player.name || "Ismeretlen"}</li>
                                ))}
                              </ul>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Főtábla placeholder */}
              <div className="mt-6">
                <h2 className="text-xl font-bold">Főtábla</h2>
                <p>Jelenleg nincs főtábla. (Kieséses szakasz a /board/[code] oldalon követhető.)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}