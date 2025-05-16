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
    oneEightiesCount: number;
    highestCheckout: number;
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
  stats?: {
    player1: { legsWon: number };
    player2: { legsWon: number };
  };
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
    player1Name?: string;
    player2Name?: string;
    scribeName?: string;
    player1: { _id: string; name: string };
    player2: { _id: string; name: string };
    scorer?: { _id: string; name: string };
  };
  currentMatch?: {
    player1Name: string;
    player2Name: string;
    scribeName: string;
    stats: {
      player1Legs: number;
      player2Legs: number;
    };
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
  const [matchFilter, setMatchFilter] = useState<"all" | "pending" | "ongoing" | "finished">("all");
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(10);

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "" },
  });

  const playerForm = useForm<PlayerForm>({
    resolver: zodResolver(playerSchema),
    defaultValues: { playerInput: "" },
  });

  const fetchTournament = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${code}`);
      if (!res.ok) throw new Error("Nem sikerült a torna lekérése");
      const data = await res.json();
      setTournament(data.tournament);
      setBoards(data.boards);
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a torna lekérése");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournament();

    const pollingIntervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/tournaments/${code}`);
        if (!res.ok) return;
        const data = await res.json();
        setTournament(data.tournament);
        setBoards(data.boards);
        setSecondsUntilRefresh(10);
      } catch (error) {
        console.error("Hiba a táblák pollingja során:", error);
      }
    }, 10000);

    const countdownIntervalId = setInterval(() => {
      setSecondsUntilRefresh((prev) => (prev > 0 ? prev - 1 : 10));
    }, 1000);

    return () => {
      clearInterval(pollingIntervalId);
      clearInterval(countdownIntervalId);
    };
  }, [code]);

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

  const regenerateGroups = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${code}/assign-groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Nem sikerült a csoportok újragenerálása");
      }
      await fetchTournament();
      toast.success("Csoportok és mérkőzések sikeresly újragenerálva");
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a csoportok újragenerálása");
    } finally {
      setLoading(false);
    }
  };

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

  const getEliminatedPlayers = (groupIndex: number): string[] => {
    if (!tournament || !tournament.groups || !tournament.players) return [];
    const totalPlayers = tournament.players.length;
    const groupsCount = tournament.groups.length;
    if (groupsCount === 0) return [];

    const qualifyingPlayers = Math.pow(2, Math.floor(Math.log2(totalPlayers)));
    const eliminatedPlayersCount = totalPlayers - qualifyingPlayers;

    const groupSizes = tournament.groups.map((group) => group.players?.length || 0);
    const totalGroupPlayers = groupSizes.reduce((sum, size) => sum + size, 0);

    const eliminationsPerGroup = groupSizes.map((size) =>
      Math.round((size / totalGroupPlayers) * eliminatedPlayersCount)
    );

    let currentTotal = eliminationsPerGroup.reduce((sum, count) => sum + count, 0);
    while (currentTotal !== eliminatedPlayersCount) {
      const diff = eliminatedPlayersCount - currentTotal;
      const indexToAdjust = diff > 0
        ? groupSizes.findIndex((size, i) => eliminationsPerGroup[i] < size)
        : groupSizes.findIndex((size, i) => eliminationsPerGroup[i] > 0);
      if (indexToAdjust === -1) break;
      eliminationsPerGroup[indexToAdjust] += diff > 0 ? 1 : -1;
      currentTotal += diff > 0 ? 1 : -1;
    }

    const group = tournament.groups[groupIndex];
    const eliminatedInGroup = eliminationsPerGroup[groupIndex] || 0;

    if (!group.standings || eliminatedInGroup <= 0) return [];

    const sortedStandings = [...group.standings].sort((a, b) => (a.rank || 0) - (b.rank || 0));
    const eliminatedPlayers = sortedStandings.slice(-eliminatedInGroup).map((s) => s.playerId._id);

    return eliminatedPlayers;
  };

  if (!tournament) {
    return (
      <div className="min-h-screen bg-base-200 w-full flex items-center justify-center">
        <div className="spinner loading loading-spinner bg-red-800"></div>
      </div>
    );
  }

  const sortedPlayers = [...tournament.players].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name, "hu", { sensitivity: "base" });
    }
    return (b.stats?.matchesWon || 0) - (a.stats?.matchesWon || 0);
  });

  return (
    <main className="min-h-screen bg-base-200 w-full">
      <div className="container mx-auto p-4 flex flex-col md:flex-row gap-4">
        <div className={`sidebar md:w-1/4 ${isSidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
          <div className="sidebar-content md:hidden">
            <button
              className="btn btn-primary"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            >
              Sidebar {isSidebarOpen ? "bezárása" : "megnyitása"}
            </button>
          </div>
          <div className={`sidebar-panel bg-base-100 w-full p-4 h-full ${isSidebarOpen ? "block" : "hidden md:block"}`}>
            {isSidebarOpen && (
              <div
                className="sidebar-overlay fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setIsSidebarOpen(false)}
              ></div>
            )}
            <h2 className="text-xl font-bold mb-4">Játékosok</h2>
            <div className="flex gap-2 mb-4 items-center justify-between">
              <button
                className={`btn btn-sm btn-outline`}
                onClick={() => setSortBy("name")}
              >
                Betűrend
              </button>
              <span className="text-sm font-medium">
                Következő frissítés: {secondsUntilRefresh} mp
              </span>
            </div>
            <ul className="space-y-3">
              {sortedPlayers.map((player, index) => (
                <li
                  key={player._id}
                  className={`flex justify-between items-center py-1 px-2 rounded-md ${
                    index % 2 === 0 ? "bg-base-200" : ""
                  } hover:bg-primary/10 transition-colors`}
                >
                  <span className="text-base font-medium">
                    {player.name}
                    {player.stats && player.stats.oneEightiesCount > 0 && (
                      <span className="ml-2 text-sm text-success">
                        ({player.stats.oneEightiesCount}x180)
                      </span>
                    )}
                    {player.stats && player.stats.highestCheckout > 80 && (
                      <span className="ml-2 text-sm text-info">
                        (HC: {player.stats.highestCheckout})
                      </span>
                    )}
                  </span>
                  {isModerator && (
                    <button
                      className="btn btn-error btn-sm"
                      onClick={() => removePlayer(player._id)}
                      disabled={loading}
                    >
                      Törlés
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

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
                      <div className="flex flex-col items-start">
                        <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
                          Hozzáad
                        </button>
                        <button className="btn btn-outline btn-warning" onClick={()=>(setIsModerator(!isModerator))}>
                          Kilépes moderátori módból
                        </button>
                      </div>
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
                      onClick={regenerateGroups}
                      disabled={loading || tournament.status === "finished"}
                    >
                      Csoportok újragenerálása
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

              <div className="mt-6">
                <h2 className="text-xl font-bold">Csoportok</h2>
                {tournament.groups.length === 0 ? (
                  <p>Nincsenek még csoportok kiosztva.</p>
                ) : (
                  <div className="space-y-4 mt-4">
                    {tournament.groups.map((group, index) => {
                      const eliminatedPlayers = getEliminatedPlayers(index);
                      return (
                        <div key={group._id} className="card bg-base-200 shadow-md">
                          <div className="card-body">
                            <h3 className="card-title">Csoport {index + 1} (Tábla {index + 1})</h3>
                            <div className="overflow-x-scroll">
                              <table className="table w-full">
                                <thead>
                                  <tr>
                                    <th>Helyezés</th>
                                    <th>Név</th>
                                    <th>Pontok</th>
                                    <th>Legek</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {group.players && group.players.length > 0 ? (
                                    group.players
                                      .map((player) => {
                                        const standing = group.standings?.find(
                                          (s) => s.playerId._id.toString() === player.playerId._id.toString()
                                        );
                                        return {
                                          player,
                                          standing,
                                          rank: standing?.rank || Infinity,
                                        };
                                      })
                                      .sort((a, b) => a.rank - b.rank)
                                      .map(({ player, standing }, index) => {
                                        const isEliminated = eliminatedPlayers.includes(player.playerId._id.toString());
                                        return (
                                          <tr
                                            key={player.playerId._id}
                                            className={isEliminated ? "bg-red-800 text-white" : ""}
                                          >
                                            <td>{standing?.rank || "-"}</td>
                                            <td>{player.playerId.name || "Ismeretlen"}</td>
                                            <td>{standing?.points || 0}</td>
                                            <td>{standing ? `${standing.legsWon}/${standing.legsLost}` : "-"}</td>
                                          </tr>
                                        );
                                      })
                                  ) : (
                                    <tr>
                                      <td colSpan={4}>Nincsenek játékosok a csoportban.</td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                            <h4 className="font-semibold mt-4">Mérkőzések:</h4>
                            <div className="mb-4">
                              <label className="label">
                                <span className="label-text">Szűrés állapot szerint:</span>
                              </label>
                              <select
                                className="select select-bordered w-full max-w-xs"
                                value={matchFilter}
                                onChange={(e) => setMatchFilter(e.target.value as any)}
                              >
                                <option value="all">Összes</option>
                                <option value="pending">Függőben</option>
                                <option value="ongoing">Folyamatban</option>
                                <option value="finished">Befejezve</option>
                              </select>
                            </div>
                            {group.matches && group.matches.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="table w-full">
                                  <thead>
                                    <tr>
                                      <th>Sorszám</th>
                                      <th>Játékosok</th>
                                      <th>Pontozó</th>
                                      <th>Állapot</th>
                                      <th>Eredmény</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {group.matches
                                      .filter((match) =>
                                        matchFilter === "all" ? true : match.status === matchFilter
                                      )
                                      .map((match, matchIndex) => (
                                        <tr key={match._id || matchIndex}>
                                          <td>{matchIndex + 1}</td>
                                          <td>
                                            {(match.player1?.name || "Ismeretlen")} vs{" "}
                                            {(match.player2?.name || "Ismeretlen")}
                                          </td>
                                          <td>{match.scorer?.name || "Nincs"}</td>
                                          <td>
                                            <span
                                              className={`badge ${
                                                match.status === "pending"
                                                  ? "badge-warning"
                                                  : match.status === "ongoing"
                                                  ? "badge-info"
                                                  : "badge-success"
                                              }`}
                                            >
                                              {match.status === "pending"
                                                ? "Függőben"
                                                : match.status === "ongoing"
                                                ? "Folyamatban"
                                                : "Befejezve"}
                                            </span>
                                          </td>
                                          <td>
                                            {(match.status === "finished" || match.status === "ongoing") && match.stats ? (
                                              <span className="badge badge-neutral">
                                                {match.stats.player1.legsWon}-{match.stats.player2.legsWon}
                                              </span>
                                            ) : (
                                              "-"
                                            )}
                                          </td>
                                        </tr>
                                      ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p>Nincsenek mérkőzések a csoportban.</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

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
                          <p
                            className={`text-lg font-bold ${
                              board.status === "idle"
                                ? "text-gray-500"
                                : board.status === "waiting"
                                ? "text-warning"
                                : "text-success"
                            }`}
                          >
                            Állapot:{" "}
                            {board.status === "idle"
                              ? "Üres"
                              : board.status === "waiting"
                              ? "Várakozik"
                              : "Játékban"}
                          </p>
                          {board.status === "playing" && board.currentMatch ? (
                            <div className="mt-2">
                              <h4 className="font-semibold">Jelenlegi mérkőzés:</h4>
                              <p className="text-md">
                                <span className="font-bold">{board.currentMatch.player1Name}</span> vs{" "}
                                <span className="font-bold">{board.currentMatch.player2Name}</span>
                              </p>
                              <p className="text-md">
                                Állás:{" "}
                                <span className="font-bold">
                                  {board.currentMatch.stats.player1Legs} - {board.currentMatch.stats.player2Legs}
                                </span>
                              </p>
                              <p className="text-md">
                                Eredményíró: <span className="font-bold">{board.currentMatch.scribeName}</span>
                              </p>
                            </div>
                          ) : board.status === "waiting" && board.nextMatch ? (
                            <div className="mt-2">
                              <h4 className="">Következő mérkőzés:</h4>
                              <p className="text-md">
                                <span className="font-bold">{board.nextMatch.player1Name}</span> vs{" "}
                                <span className="font-bold">{board.nextMatch.player2Name}</span>
                              </p>
                              <p className="text-md">
                                Eredményíró: <span className="font-bold">{board.nextMatch.scribeName}</span>
                              </p>
                            </div>
                          ) : board.waitingPlayers && board.waitingPlayers.length > 0 ? (
                            <div className="mt-2">
                              <h4 className="font-semibold">Várakozó játékosok:</h4>
                              <ul className="list-disc pl-5">
                                {board.waitingPlayers.map((player) => (
                                  <li key={player._id} className="text-md">
                                    {player.name || "Ismeretlen"}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <p className="text-md italic">Nincs további információ.</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
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