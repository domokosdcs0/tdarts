'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import Link from 'next/link';

// Form validation schema
const formSchema = z.object({
  name: z.string().min(1, 'A torna neve kötelező'),
  boardCount: z.number().min(1, 'Legalább egy tábla szükséges'),
  description: z.string().optional(),
  startTime: z.string().optional(),
  tournamentPassword: z.string().min(6, 'A jelszónak legalább 6 karakteresnek kell lennie'),
  players: z.array(z.object({ name: z.string().min(1, 'A játékos neve kötelező') })),
});

type FormValues = z.infer<typeof formSchema>;

interface Club {
  _id: string;
  code: string;
  name: string;
  description?: string;
  location: string;
  createdAt: string;
  updatedAt: string;
  tournaments: Tournament[];
  players: Player[];
}

interface Player {
  _id: string;
  name: string;
}

interface Tournament {
  _id: string;
  code: string;
  name: string;
  status: string;
  createdAt: string;
}

export default function ClubDetailPage() {
  const [club, setClub] = useState<Club | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAddPlayerModalOpen, setIsAddPlayerModalOpen] = useState(false);
  const [isCreateTournamentModalOpen, setIsCreateTournamentModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const params = useParams();
  const code = params.code as string;

  // Tournament form
  const [playerInput, setPlayerInput] = useState('');
  const [playerSuggestions, setPlayerSuggestions] = useState<string[]>([]);
  const [addedPlayers, setAddedPlayers] = useState<{ name: string; fromSearch: boolean }[]>([]);

  const { register, control, handleSubmit, formState: { errors }, reset } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      boardCount: 1,
      description: '',
      startTime: '',
      tournamentPassword: '',
      players: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'players',
  });

  // Fetch club details
  useEffect(() => {
    const fetchClub = async () => {
      const toastId = toast.loading('Klub adatok betöltése...');
      try {
        const res = await fetch(`/api/club/${code}/get`);
        if (!res.ok) throw new Error('Klub nem található');
        const data = await res.json();
        setClub(data.club);
        toast.success('Klub adatok betöltve!', { id: toastId });
      } catch (err) {
        toast.error('Klub betöltése sikertelen', { id: toastId });
        console.error(err)
        router.push('/clubs');
      }
    };
    if (code) fetchClub();
  }, [code, router]);

  // Filter tournaments
  const filteredTournaments = useMemo(() => {
    if (!searchQuery.trim()) return club?.tournaments || [];
    return (club?.tournaments || []).filter(tournament =>
      tournament.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [club, searchQuery]);

  // Handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading('Bejelentkezés...');
    try {
      const res = await fetch(`/api/club/${club?._id}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error('Hibás jelszó');
      setIsAuthenticated(true);
      setIsLoginModalOpen(false);
      setPassword('');
      toast.success('Sikeres bejelentkezés!', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Bejelentkezés sikertelen', { id: toastId });
    }
  };

  // Handle add player
  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) {
      toast.error('Játékos neve kötelező');
      return;
    }
    const toastId = toast.loading('Játékos hozzáadása...');
    try {
      const res = await fetch(`/api/club/${club?._id}/addPlayer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPlayerName }),
      });
      if (!res.ok) throw new Error('Játékos hozzáadása sikertelen');
      const data = await res.json();
      setClub(prev => prev ? {
        ...prev,
        players: [...prev.players, { _id: data.playerId, name: newPlayerName }],
      } : prev);
      setNewPlayerName('');
      setIsAddPlayerModalOpen(false);
      toast.success('Játékos sikeresen hozzáadva!', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Játékos hozzáadása sikertelen', { id: toastId });
    }
  };

  // Handle remove player
  const handleRemovePlayer = async (playerId: string, playerName: string) => {
    const toastId = toast.loading('Játékos törlése...');
    try {
      const res = await fetch(`/api/club/${club?._id}/removePlayer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
      if (!res.ok) throw new Error('Játékos törlése sikertelen');
      setClub(prev => prev ? {
        ...prev,
        players: prev.players.filter(p => p._id !== playerId),
      } : prev);
      toast.success(`${playerName} törölve!`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Játékos törlése sikertelen', { id: toastId });
    }
  };

  // Handle player search for tournament
  const handlePlayerSearch = async (query: string) => {
    if (query.length < 2) {
      setPlayerSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/club/${club?._id}/search?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      setPlayerSuggestions(data.players.map((p: { name: string }) => p.name));
    } catch (error) {
      console.error("Hiba a játékosok keresésekor:", error);
      toast.error('Játékosok keresése sikertelen');
    }
  };

  // Add player to tournament
  const addPlayer = (name: string, fromSearch: boolean) => {
    const trimmedName = name.trim();
    if (!trimmedName || addedPlayers.some((p) => p.name.toLowerCase() === trimmedName.toLowerCase())) {
      toast.error('Ez a játékos már hozzá van adva vagy érvénytelen név');
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
    setPlayerInput('');
  };

  // Remove player from tournament
  const removePlayer = (name: string) => {
    const fieldIndex = fields.findIndex((f) => f.name === name);
    if (fieldIndex !== -1) remove(fieldIndex);
    setAddedPlayers((prev) => prev.filter((p) => p.name !== name).sort((a, b) =>
      a.name.localeCompare(b.name, 'hu', { sensitivity: 'base' })
    ));
  };

  // Handle create tournament
  const handleCreateTournament = async (data: FormValues) => {
    const toastId = toast.loading('Torna létrehozása...');
    try {
      const response = await fetch(`/api/club/${club?._id}/createTournament`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          players: data.players.map((p) => p.name),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Nem sikerült a torna létrehozása');
      }

      const { tournament } = await response.json();
      setClub(prev => prev ? {
        ...prev,
        tournaments: [...prev.tournaments, {
          _id: tournament._id,
          code: tournament.code,
          name: tournament.name,
          status: tournament.status,
          createdAt: tournament.createdAt,
        }],
      } : prev);
      setAddedPlayers([]);
      reset();
      setIsCreateTournamentModalOpen(false);
      toast.success('Torna sikeresen létrehozva!', { id: toastId });
      router.push(`/tournaments/${tournament.code}`);
    } catch (err: any) {
      toast.error(err.message || 'Torna létrehozása sikertelen', { id: toastId });
    }
  };

  if (!club) return null;

  return (
    <div className="w-full min-h-screen bg-base-200 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-base-content mb-6">{club.name}</h1>

        {/* Club Info */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="card-title text-base-content">Klub Adatok</h2>
            {club.description && <p className="text-base-content/70">{club.description}</p>}
            <p className="text-base-content/80"><span className="font-semibold">Helyszín:</span> {club.location}</p>
            <p className="text-base-content/80"><span className="font-semibold">Létrehozva:</span> {new Date(club.createdAt).toLocaleDateString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('-', '.')}</p>
            {!isAuthenticated && (
              <div className="card-actions justify-end">
                <button className="btn btn-primary" onClick={() => setIsLoginModalOpen(true)}>
                  Bejelentkezés
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Players */}
        <div className="card bg-base-100 shadow-xl mb-6">
          <div className="card-body">
            <div className="flex justify-between items-center">
              <h2 className="card-title text-base-content">Játékosok</h2>
              {isAuthenticated && (
                <button className="btn btn-primary btn-sm" onClick={() => setIsAddPlayerModalOpen(true)}>
                  Játékos Hozzáadása
                </button>
              )}
            </div>
            {club.players.length === 0 ? (
              <p className="text-base-content/70">Nincsenek játékosok.</p>
            ) : (
              <ul className="list-none">
                {club.players.map(player => (
                  <li key={player._id} className="flex justify-between items-center py-2 border-b border-base-200">
                    <span className="text-base-content">{player.name}</span>
                    {isAuthenticated && (
                      <button
                        className="btn btn-error btn-xs"
                        onClick={() => handleRemovePlayer(player._id, player.name)}
                      >
                        Törlés
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Tournaments */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title text-base-content">Tornák</h2>
              {isAuthenticated && (
                <button className="btn btn-primary btn-sm" onClick={() => setIsCreateTournamentModalOpen(true)}>
                  Torna Létrehozása
                </button>
              )}
            </div>
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Keresés torna neve alapján..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input input-bordered input-md w-full pl-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                </button>
              )}
            </div>
            {filteredTournaments.length === 0 ? (
              <p className="text-base-content/70">Nincsenek tornák.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTournaments.map(tournament => (
                  <Link key={tournament._id} href={`/tournaments/${tournament.code}`}>
                    <div className="card bg-base-100 shadow hover:shadow-lg transition-shadow">
                      <div className="card-body">
                        <h3 className="card-title text-base-content">{tournament.name}</h3>
                        <p className="text-base-content/80"><span className="font-semibold">Állapot:</span> {tournament.status}</p>
                        <p className="text-base-content/80"><span className="font-semibold">Létrehozva:</span> {new Date(tournament.createdAt).toLocaleDateString('hu-HU', { year: 'numeric', month: '2-digit', day: '2-digit' }).replaceAll('-', '.')}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Login Modal */}
        <dialog open={isLoginModalOpen} className="modal">
          <div className="modal-box bg-base-100">
            <h2 className="text-2xl font-bold text-base-content mb-4">Bejelentkezés a Klubba</h2>
            <form onSubmit={handleLogin}>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Jelszó *</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input input-bordered input-md w-full"
                  required
                />
              </div>
              <div className="modal-action">
                <button type="button" onClick={() => setIsLoginModalOpen(false)} className="btn btn-ghost">
                  Mégse
                </button>
                <button type="submit" className="btn btn-primary">
                  Bejelentkezés
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setIsLoginModalOpen(false)}>close</button>
          </form>
        </dialog>

        {/* Add Player Modal */}
        <dialog open={isAddPlayerModalOpen} className="modal">
          <div className="modal-box bg-base-100">
            <h2 className="text-2xl font-bold text-base-content mb-4">Játékos Hozzáadása</h2>
            <form onSubmit={handleAddPlayer}>
              <div className="form-control mb-4">
                <label className="label">
                  <span className="label-text">Játékos Neve *</span>
                </label>
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  className="input input-bordered input-md w-full"
                  required
                />
              </div>
              <div className="modal-action">
                <button type="button" onClick={() => setIsAddPlayerModalOpen(false)} className="btn btn-ghost">
                  Mégse
                </button>
                <button type="submit" className="btn btn-primary">
                  Hozzáadás
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setIsAddPlayerModalOpen(false)}>close</button>
          </form>
        </dialog>

        {/* Create Tournament Modal */}
        <dialog open={isCreateTournamentModalOpen} className="modal">
          <div className="modal-box bg-base-100 max-w-2xl">
            <h2 className="text-2xl font-bold text-base-content mb-4">Új Torna Létrehozása</h2>
            <form onSubmit={handleSubmit(handleCreateTournament)} className="space-y-4">
              {/* Torna neve */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Torna neve</span>
                </label>
                <input
                  type="text"
                  {...register('name')}
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
                  {...register('boardCount', { valueAsNumber: true })}
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
                  {...register('tournamentPassword')}
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
                  {...register('description')}
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
                  {...register('startTime')}
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

                {/* Added players */}
                {addedPlayers.length > 0 && (
                  <div className="mt-4 bg-base-100 p-6 rounded-md">
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

              {/* Buttons */}
              <div className="modal-action">
                <button type="button" onClick={() => setIsCreateTournamentModalOpen(false)} className="btn btn-ghost">
                  Mégse
                </button>
                <button type="submit" className="btn btn-primary">
                  Létrehozás
                </button>
              </div>
            </form>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button onClick={() => setIsCreateTournamentModalOpen(false)}>close</button>
          </form>
        </dialog>
      </div>
    </div>
  );
}