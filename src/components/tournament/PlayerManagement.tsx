import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Player } from "./TournamentDetailsPage";

const playerSchema = z.object({
  playerInput: z.string().min(1, "A játékos neve kötelező"),
});

type PlayerForm = z.infer<typeof playerSchema>;

interface PlayerManagementProps {
  players: Player[];
  isModerator: boolean;
  isSidebarOpen: boolean;
  sortBy: "name" | "ranking";
  secondsUntilRefresh: number;
  setIsSidebarOpen: (open: boolean) => void;
  setSortBy: (sortBy: "name" | "ranking") => void;
  addPlayer: (name: string) => Promise<void>;
  removePlayer: (playerId: string) => Promise<void>;
  loading: boolean;
  code: string;
  autoFetch: boolean
}

function PlayerManagement({
  players,
  isModerator,
  isSidebarOpen,
  sortBy,
  secondsUntilRefresh,
  setIsSidebarOpen,
  setSortBy,
  addPlayer,
  removePlayer,
  loading,
  code,
  autoFetch
}: PlayerManagementProps) {
  const [playerSuggestions, setPlayerSuggestions] = useState<string[]>([]);

  const playerForm = useForm<PlayerForm>({
    resolver: zodResolver(playerSchema),
    defaultValues: { playerInput: "" },
  });

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

  const sortedPlayers = [...players].sort((a, b) => {
    if (sortBy === "name") {
      return a.name.localeCompare(b.name, "hu", { sensitivity: "base" });
    }
    return (b.stats?.matchesWon || 0) - (a.stats?.matchesWon || 0);
  });

  return (
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
          {autoFetch? (
              <span className="text-sm font-medium">
              Következő frissítés: {secondsUntilRefresh} mp
            </span>
          ) : (
            <span className="text-sm italic text-right">
              Automatikus frissítés kikapcsolva
            </span>
          )}
        </div>
        {isModerator && (
          <form
            onSubmit={playerForm.handleSubmit(({ playerInput }) => {
              addPlayer(playerInput);
              playerForm.reset();
            })}
            className="form-control mb-4"
          >
            <label className="label">
              <span className="label-text">Játékos hozzáadása</span>
            </label>
            <div className="relative">
              <input
                type="text"
                {...playerForm.register("playerInput")}
                className="input input-bordered w-full"
                placeholder="Add meg a játékos nevét"
                onChange={(e) => {
                  playerForm.setValue("playerInput", e.target.value);
                  handlePlayerSearch(e.target.value);
                }}
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
                        playerForm.reset();
                      }}
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button type="submit" className="btn btn-primary btn-sm mt-2" disabled={loading}>
              Hozzáad
            </button>
            {playerForm.formState.errors.playerInput && (
              <span className="text-error text-sm">
                {playerForm.formState.errors.playerInput.message}
              </span>
            )}
          </form>
        )}
        <ul className="space-y-3 sticky top-4">
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
  );
}

export default PlayerManagement;