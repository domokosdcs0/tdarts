'use client';

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";

// Validációs séma
const formSchema = z.object({
  name: z.string().min(1, "A torna neve kötelező"),
  boardCount: z.number().min(1, "Legalább egy tábla szükséges"),
  description: z.string().optional(),
  startTime: z.string().optional(),
  tournamentPassword: z.string().min(6, "A jelszónak legalább 6 karakteresnek kell lennie"),
  players: z.array(z.object({ name: z.string().min(1, "A játékos neve kötelező") })),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateTournamentPage() {
  const router = useRouter();
  const [playerInput, setPlayerInput] = useState("");
  const [playerSuggestions, setPlayerSuggestions] = useState<string[]>([]);
  const [addedPlayers, setAddedPlayers] = useState<{ name: string; fromSearch: boolean }[]>([]);
  const [loading, setLoading] = useState(false);

  const { register, control, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      boardCount: 1,
      description: "",
      startTime: "",
      tournamentPassword: "",
      players: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "players",
  });

  // Játékos keresés autocomplete-hoz
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
  const addPlayer = (name: string, fromSearch: boolean) => {
    const trimmedName = name.trim();
    if (!trimmedName || addedPlayers.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error("Ez a játékos már hozzá van adva vagy érvénytelen név");
      return;
    }
    append({ name: trimmedName });
    setAddedPlayers((prev) => {
      const updated = [...prev, { name: trimmedName, fromSearch }].sort((a, b) =>
        a.name.localeCompare(b.name, 'hu', { sensitivity: 'base' })
      );
      return updated;
    });
    setPlayerSuggestions([]);
    setPlayerInput("");
  };

  // Játékos eltávolítása
  const removePlayer = (name: string) => {
    const fieldIndex = fields.findIndex((f) => f.name === name);
    if (fieldIndex !== -1) remove(fieldIndex);
    setAddedPlayers((prev) => prev.filter((p) => p.name !== name).sort((a, b) =>
      a.name.localeCompare(b.name, 'hu', { sensitivity: 'base' })
    ));
  };

  // Űrlap beküldése
  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          players: data.players.map((p) => p.name),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Nem sikerült a torna létrehozása");
      }

      const { tournament } = await response.json();
      toast.success("Torna sikeresen létrehozva!");
      router.push(`/tournaments/${tournament.code}`);
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a torna létrehozása");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full bg-base-200">

      <div className="container mx-auto p-4">
        <div className="card bg-base-100 shadow-xl max-w-2xl mx-auto">
          <div className="card-body">
            <h2 className="card-title text-2xl">Új Torna Létrehozása</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Torna neve */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Torna neve</span>
                </label>
                <input
                  type="text"
                  {...register("name")}
                  className="input input-bordered w-full"
                  placeholder="Add meg a torna nevét"
                />
                {errors.name && (
                  <span className="text-error text-sm">{errors.name.message}</span>
                )}
              </div>

              {/* Táblák száma */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Táblák száma</span>
                </label>
                <input
                  type="number"
                  {...register("boardCount", { valueAsNumber: true })}
                  className="input input-bordered w-full"
                  placeholder="Add meg a táblák számát"
                  min="1"
                />
                {errors.boardCount && (
                  <span className="text-error text-sm">{errors.boardCount.message}</span>
                )}
              </div>

              {/* Jelszó */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Torna jelszó</span>
                </label>
                <input
                  type="password"
                  {...register("tournamentPassword")}
                  className="input input-bordered w-full"
                  placeholder="Add meg a torna jelszavát"
                />
                {errors.tournamentPassword && (
                  <span className="text-error text-sm">{errors.tournamentPassword.message}</span>
                )}
              </div>

              {/* Leírás */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Leírás (opcionális)</span>
                </label>
                <textarea
                  {...register("description")}
                  className="textarea textarea-bordered w-full"
                  placeholder="Add meg a torna leírását"
                />
              </div>

              {/* Kezdési idő */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Kezdési idő (opcionális)</span>
                </label>
                <input
                  type="datetime-local"
                  {...register("startTime")}
                  className="input input-bordered w-full"
                />
              </div>

              {/* Játékosok */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Játékosok hozzáadása</span>
                </label>
                <div className="flex gap-2 mb-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={playerInput}
                      onChange={(e) => {
                        setPlayerInput(e.target.value);
                        handlePlayerSearch(e.target.value);
                      }}
                      className="input input-bordered w-full"
                      placeholder="Add meg a játékos nevét"
                    />
                    {playerSuggestions.length > 0 && (
                      <ul className="absolute z-10 bg-base-100 border border-base-300 rounded-md mt-1 w-full max-h-40 overflow-auto">
                        {playerSuggestions.map((suggestion) => (
                          <li
                            key={suggestion}
                            className="p-2 hover:bg-primary hover:text-primary-content cursor-pointer"
                            onClick={() => addPlayer(suggestion, true)}
                          >
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      if (playerInput) addPlayer(playerInput, false);
                    }}
                  >
                    Hozzáad
                  </button>
                </div>

                {/* Badge-ek konténere */}
                {addedPlayers.length > 0 && (
                  <div className="mt-4 bg-white p-6 rounded-md">
                    <label className="label">
                      <span className="label-text">Hozzáadott játékosok</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {addedPlayers.map((player) => (
                        <div
                          key={player.name}
                          className={`badge badge-neutral ${player.fromSearch ? 'badge-outline' : 'badge-dash'} badge-lg gap-2`}
                        >
                          {player.name}
                          <button
                            type="button"
                            className="text-xs"
                            onClick={() => removePlayer(player.name)}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Gombok */}
              <div className="flex justify-end gap-2">
                <Link href="/" className="btn btn-ghost">Mégse</Link>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? <span className="loading loading-spinner"></span> : "Torna létrehozása"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}