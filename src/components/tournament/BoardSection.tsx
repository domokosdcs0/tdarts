import { useState, useEffect } from "react";
import { Board } from "./TournamentDetailsPage";

interface BoardSectionProps {
  boards: Board[];
}

function BoardSection({ boards }: BoardSectionProps) {
  const [Boards, setBoard] = useState<Board[]>(boards.sort((a, b) => a.boardNumber - b.boardNumber));
  useEffect(() => {
    setBoard(boards.sort((a, b) => a.boardNumber - b.boardNumber));
  }, [boards]);
  // create a map with the boardId to a countdown value
  const [countdownMap, setCountdownMap] = useState<Map<string, number>>(new Map());

  useEffect(() => {
    const interval = setInterval(() => {
      const newCountdownMap = new Map<string, number>();
      Boards.forEach((board) => {
        if (board.status === "waiting" && board.updatedAt) {
          const countdown = Math.max(0, 300 - Math.floor((Date.now() - new Date(board.updatedAt).getTime()) / 1000));
          newCountdownMap.set(board._id, countdown);
        }
      });
      setCountdownMap(newCountdownMap);
    }, 1000);

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, [Boards]);
  return (
    <div className="mt-6">
      <h2 className="text-xl font-bold">Táblák</h2>
      {Boards.length === 0 ? (
        <p>Nincsenek még táblák konfigurálva.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {Boards.map((board, index) => (
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
                    {
                    board.waitingPlayers && board.waitingPlayers.length > 0 && (
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
                )}
                  </div>
                ) : board.status === "waiting" && board.nextMatch ? (
                  <div className="mt-2">
                    <h4 className="font-semibold">Következő mérkőzés:</h4>
                    <p className="text-md">
                    <span className={`font-bold ${board.nextMatch.player1Status === "ready" ? "text-success" : "text-error"}`}>
                      {board.nextMatch.player1Status === "ready" ? "✔" : "✘"} {board.nextMatch.player1Name}
                    </span>{" "}
                    vs{" "}
                    <span className={`font-bold ${board.nextMatch.player2Status === "ready" ? "text-success" : "text-error"}`}>
                      {board.nextMatch.player2Status === "ready" ? "✔" : "✘"} {board.nextMatch.player2Name}
                    </span>
                    </p>
                    <p className="text-md">
                      Eredményíró:{" "}
                      <span className="font-bold">
                        {board.nextMatch.scribeName || "Nincs"}
                      </span>
                    </p>
                    {/*Display a countdown from the board.updatedAt to 5 min*/}
                    <div className="text-sm text-gray-500">
                      Hátralévő idő: <b>{Math.floor((countdownMap.get(board._id) || 0) / 60)}:{String((countdownMap.get(board._id) || 0) % 60).padStart(2, '0')}</b> perc
                    </div>
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
