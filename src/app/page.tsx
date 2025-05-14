// pages/index.tsx
import { connectMongo } from "@/lib/mongoose";
import { getModels } from "@/lib/models";
import { Tournament } from "@/types/tournamentSchema";
import Link from "next/link";

async function getTournaments() {
  await connectMongo();
  const { TournamentModel } = getModels();
  const tournaments = await TournamentModel.find({})
    .sort({ createdAt: -1 })
    .lean<Tournament[]>();
  return tournaments;
}

export default async function Page() {
  const tournaments = await getTournaments();

  return (
    <main className="min-h-screen w-full bg-base-200">
     

      {/* Main Content */}
      <div className="container mx-auto p-4">
        {tournaments.length === 0 ? (
          <div className="text-center py-10">
            <h2 className="text-xl font-semibold text-base-content">
              Nem található verseny
            </h2>
            <p className="text-base-content/70 mt-2">
              Készíts egy versenyt, hogy elkezdhess játszani!
            </p>
            <Link href="/tournaments/new">
              <button className="btn btn-primary mt-4">Verseny létrehozása</button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tournaments.map((tournament) => (
              <div
                key={tournament.code}
                className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow"
              >
                <div className="card-body">
                  <h2 className="card-title text-lg">{tournament.name}</h2>
                  <p className="text-sm text-base-content/70">
                    Code: {tournament.code}
                  </p>
                  <p className="text-sm text-base-content/70">
                    Status: {tournament.status}
                  </p>
                  <p className="text-sm text-base-content/70">
                    Created: {new Date(tournament.createdAt).toLocaleString()}
                  </p>
                  <div className="card-actions justify-end">
                    <Link href={`/tournaments/${tournament.code}`}>
                      <button className="btn btn-primary btn-sm">View</button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Create Button */}
      <Link href="/tournaments/new">
        <button className="btn btn-primary btn-circle fixed bottom-6 right-6 shadow-lg hover:scale-110 transition-transform">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </button>
      </Link>
    </main>
  );
}