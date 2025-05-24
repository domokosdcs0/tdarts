import { Board } from "./TournamentDetailsPage";

interface BoardSectionProps {
  boards: Board[];
}

function BoardSection({ boards }: BoardSectionProps) {
  return (
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
                      : board.status === "playing" && !board.currentMatch && !board.nextMatch ? "text-gray-500" : "text-success"
                  }`}
                >
                  Állapot:{" "}
                  {board.status === "idle"
                    ? "Üres"
                    : board.status === "waiting"
                    ? "Várakozik"
                    : board.status === "playing" && !board.currentMatch && !board.nextMatch ? "Üres" : "Játékban"}
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
                      Eredményíró:{" "}
                      <span className="font-bold">
                        {board.currentMatch.scribeName || "Nincs"}
                      </span>
                    </p>
                  </div>
                ) : board.status === "waiting" && board.nextMatch ? (
                  <div className="mt-2">
                    <h4 className="font-semibold">Következő mérkőzés:</h4>
                    <p className="text-md">
                      <span className="font-bold">{board.nextMatch.player1Name}</span> vs{" "}
                      <span className="font-bold">{board.nextMatch.player2Name}</span>
                    </p>
                    <p className="text-md">
                      Eredményíró:{" "}
                      <span className="font-bold">
                        {board.nextMatch.scribeName || "Nincs"}
                      </span>
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
  );
}

export default BoardSection;
