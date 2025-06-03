interface MatchSetupProps {
    matchType: "bo3" | "bo5" | "bo7";
    startingPlayer: "player1" | "player2";
    player1Name: string;
    player2Name: string;
    onMatchTypeChange: (type: "bo3" | "bo5" | "bo7") => void;
    onStartingPlayerChange: (player: "player1" | "player2") => void;
    onStart: () => void;
  }
  
 export default function MatchSetup({
    matchType,
    startingPlayer,
    player1Name,
    player2Name,
    onMatchTypeChange,
    onStartingPlayerChange,
    onStart,
  }: MatchSetupProps) {
    return (
      <div className="w-screen h-screen bg-base-200 flex items-center justify-center p-6">
        <div className="bg-base-100 rounded-lg shadow-lg p-8 w-full max-w-md">
          <h2 className="text-5xl font-bold text-gray-800 mb-8 text-center">Mérkőzés Beállítása</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-2xl font-medium text-gray-700 mb-4">Mérkőzés típusa:</label>
              <div className="grid grid-cols-3 gap-4">
                {["bo3", "bo5", "bo7"].map((type) => (
                  <button
                    key={type}
                    className={`btn btn-lg h-16 text-xl ${matchType === type ? "bg-primary text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"} transition-colors duration-200`}
                    onClick={() => onMatchTypeChange(type as "bo3" | "bo5" | "bo7")}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-2xl font-medium text-gray-700 mb-4">Ki kezd?</label>
              <div className="flex gap-4">
                <button
                  className={`btn btn-lg h-16 flex-1 text-xl ${startingPlayer === "player1" ? "bg-primary text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"} transition-colors duration-200`}
                  onClick={() => onStartingPlayerChange("player1")}
                >
                  {player1Name}
                </button>
                <button
                  className={`btn btn-lg h-16 flex-1 text-xl ${startingPlayer === "player2" ? "bg-primary text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"} transition-colors duration-200`}
                  onClick={() => onStartingPlayerChange("player2")}
                >
                  {player2Name}
                </button>
              </div>
            </div>
            <button
              className="btn btn-success h-14 w-full text-xl font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors duration-200"
              onClick={onStart}
            >
              Kezdés
            </button>
          </div>
        </div>
      </div>
    );
  }