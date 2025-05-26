'use client';

import { useState, useEffect } from "react";
import { Tournament } from "@/types/tournamentSchema";
import { useDebounce } from "use-debounce";

export default function TournamentSearch({
  initialTournaments,
  onSearch,
}: {
  initialTournaments: Tournament[];
  onSearch: (tournaments: Tournament[]) => void;
}) {
  const [name, setName] = useState("");
  const [club, setClub] = useState("");
  const [date, setDate] = useState("");
  const [debouncedName] = useDebounce(name, 500);
  const [debouncedClub] = useDebounce(club, 500);
  const [debouncedDate] = useDebounce(date, 500);

  useEffect(() => {
    const fetchTournaments = async () => {
      // Ha minden mező üres, használd az initialTournaments-t
      if (!debouncedName && !debouncedClub && !debouncedDate) {
        onSearch(initialTournaments);
        return;
      }

      try {
        const params = new URLSearchParams();
        if (debouncedName) params.append("name", debouncedName);
        if (debouncedClub) params.append("club", debouncedClub);
        if (debouncedDate) params.append("date", debouncedDate);

        const res = await fetch(`/api/tournaments?${params.toString()}`);
        if (!res.ok) throw new Error("Nem sikerült a tornák lekérése");
        const data = await res.json();
        onSearch(data.tournaments);
      } catch (error) {
        console.error("Hiba a keresés során:", error);
        onSearch([]);
      }
    };

    fetchTournaments();
  }, [debouncedName, debouncedClub, debouncedDate, initialTournaments, onSearch]);

  return (
    <div className="card bg-base-100 shadow-xl p-4 mb-4">
      <h2 className="text-lg font-semibold mb-4">Verseny keresése</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Név</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            placeholder="Verseny neve"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Klub</span>
          </label>
          <input
            type="text"
            className="input input-bordered"
            placeholder="Klub neve"
            value={club}
            onChange={(e) => setClub(e.target.value)}
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Dátum</span>
          </label>
          <input
            type="date"
            className="input input-bordered"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}