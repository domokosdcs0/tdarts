'use client';

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function TournamentDetailsPage() {
  const router = useRouter();
  const {code} = useParams()
  const [tournament, setTournament] = useState<any>(null);
  const [boards, setBoards] = useState<any[]>([]);
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

  // Torna adatainak lekérése és polling
  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const res = await fetch(`/api/tournaments/${code}`);
        if (!res.ok) throw new Error("Nem sikerült a torna lekérése");
        const data = await res.json();
        setTournament(data.tournament);
        setBoards(data.boards);
      } catch (error: any) {
        toast.error(error.message || "Nem sikerült a torna lekérése");
      }
    };
    fetchTournament();

    // Polling a táblákhoz (waitingPlayers frissítése)
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/tournaments/${code}`);
        if (!res.ok) return;
        const data = await res.json();
        setBoards(data.boards);
      } catch (error) {
        console.error("Hiba a táblák pollingja során:", error);
      }
    }, 300000); // 5 perc

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
      const updatedTournament = await fetch(`/api/tournaments/${code}`).then((res) => res.json());
      setTournament(updatedTournament.tournament);
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
      const updatedTournament = await fetch(`/api/tournaments/${code}`).then((res) => res.json());
      setTournament(updatedTournament.tournament);
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
      const updatedData = await fetch(`/api/tournaments/${code}`).then((res) => res.json());
      setTournament(updatedData.tournament);
      setBoards(updatedData.boards);
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
      const updatedTournament = await fetch(`/api/tournaments/${code}`).then((res) => res.json());
      setTournament(updatedTournament.tournament);
      toast.success("Torna állapota sikeresen módosítva");
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült az állapot módosítása");
    } finally {
      setLoading(false);
    }
  };

  if (!tournament) {
    return <div className="min-h-screen bg-base-200 flex items-center justify-center">Betöltés...</div>;
  }

  // Játékosok rendezése
  const sortedPlayers = [...tournament.players].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name, 'hu', { sensitivity: 'base' });
    }
    return (b.stats?.matchesWon || 0) - (a.stats?.matchesWon || 0);
  });

  return (
    <main className="min-h-screen bg-base-200 w-full">


      <div className="container mx-auto p-4 flex flex-col md:flex-row gap-4">
        {/* Sidebar */}
        <div
          className={`drawer md:drawer-open ${isSidebarOpen ? 'drawer-open' : ''} md:w-1/4`}
        >
          <input id="sidebar" type="checkbox" className="drawer-toggle" checked={isSidebarOpen} />
          <div className="drawer-content md:hidden">
            <label htmlFor="sidebar" className="btn btn-primary drawer-button">
              Sidebar bezárása
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
                {sortedPlayers.map((player: any) => (
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
              <h1 className="card-title text-2xl">{tournament.name}</h1>
              <p>Állapot: {tournament.status === "created" ? "Létrehozva" : tournament.status === "group" ? "Csoportkör" : tournament.status === "knockout" ? "Kieséses szakasz" : "Befejezve"}</p>
              <p>Táblák száma: {tournament.boardCount}</p>
              {tournament.description && <p>Leírás: {tournament.description}</p>}
              {tournament.createdAt && <p>Létrehozva: {new Date(tournament.createdAt).toLocaleString('hu-HU')}</p>}

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
                  {/* Játékos hozzáadása */}
                  <form onSubmit={playerForm.handleSubmit((data) => addPlayer(data.playerInput))} className="form-control">
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

                  {/* Moderátor vezérlők */}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {tournament.groups.map((group: any, index: number) => (
                      <div key={index} className="card bg-base-200 shadow-md">
                        <div className="card-body">
                          <h3 className="card-title">Csoport {index + 1} (Tábla {index + 1})</h3>
                          <h4 className="font-semibold">Játékosok:</h4>
                          <ul className="list-disc pl-5">
                            {group.players.map((player: any) => (
                              <li key={player.playerId}>
                                {player.number}. {player.name}
                              </li>
                            ))}
                          </ul>
                          <h4 className="font-semibold mt-4">Hátralévő mérkőzések:</h4>
                          {group.matches.length === 0 ? (
                            <p>Nincsenek mérkőzések.</p>
                          ) : (
                            <ul className="list-disc pl-5">
                              {group.matches
                                .filter((match: any) => match.status === 'pending')
                                .map((match: any, matchIndex: number) => (
                                  <li key={matchIndex}>
                                    {match.player1Name} - {match.player2Name} (Eredményíró: {match.scribeName || 'Nincs'})
                                  </li>
                                ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
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
                          <p>Állapot: {board.status === "idle" ? "Üres" : board.status === "waiting" ? "Várakozik" : "Játékban"}</p>
                          {board.waitingPlayers.length > 0 && (
                            <div>
                              <h4>Várakozó játékosok:</h4>
                              <ul className="list-disc pl-5">
                                {board.waitingPlayers.map((player: any) => (
                                  <li key={player._id}>{player.name}</li>
                                ))}
                              </ul>
                            </div>
                          )}
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