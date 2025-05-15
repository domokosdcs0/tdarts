import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { checkoutTable } from "@/lib/checkouts";
import { Leg, Player } from "@/types/matchSchema"; // Import centralized types
import mongoose from "mongoose";

interface DartsCounterProps {
  match: {
    matchId: string;
    player1Id: string;
    player2Id: string;
    player1Name: string;
    player2Name: string;
    scribeName: string;
    stats: {
      player1: {
        average: number;
        dartsThrown: number;
        legsWon: number;
      };
      player2: {
        average: number;
        dartsThrown: number;
        legsWon: number;
      };
    };
  };
  boardId: string;
  selectedBoard: string;
  handleFinishMatch: (finalStats: {
    winnerId: string;
    player1Stats: { legsWon: number; dartsThrown: number; average: number };
    player2Stats: { legsWon: number; dartsThrown: number; average: number };
    highestCheckout: { player1: number; player2: number };
    oneEighties: { player1: { count: number; darts: number[] }; player2: { count: number; darts: number[] } };
  }) => Promise<void>;
}

interface Throw {
  score: number;
  isDouble?: boolean;
  darts?: number; // Track darts for 180s and checkouts
}

interface PlayerState {
  score: number;
  dartsThrown: number;
  throws: Throw[];
  checkoutAttempts: number;
  successfulCheckouts: number;
  legsWon: number;
  oneEighties: number[]; // Track 180 throws
  highestCheckout: { player1: number; player2: number } | null; // Adjusted to match Leg.highestCheckout
}

export default function DartsCounter({
  match,
  boardId,
  selectedBoard,
  handleFinishMatch,
}: DartsCounterProps) {
  const [matchType, setMatchType] = useState<"bo3" | "bo5" | "bo7">("bo3");
  const [startingPlayer, setStartingPlayer] = useState<"player1" | "player2">("player1");
  const [player1State, setPlayer1State] = useState<PlayerState>({
    score: 501,
    dartsThrown: 0,
    throws: [],
    checkoutAttempts: 0,
    successfulCheckouts: 0,
    legsWon: match.stats.player1.legsWon || 0,
    oneEighties: [],
    highestCheckout: null,
  });
  const [player2State, setPlayer2State] = useState<PlayerState>({
    score: 501,
    dartsThrown: 0,
    throws: [],
    checkoutAttempts: 0,
    successfulCheckouts: 0,
    legsWon: match.stats.player2.legsWon || 0,
    oneEighties: [],
    highestCheckout: null,
  });
  const [currentPlayer, setCurrentPlayer] = useState<"player1" | "player2">(startingPlayer);
  const [inputScore, setInputScore] = useState("");
  const [isDoubleAttempt, setIsDoubleAttempt] = useState(false);
  const [doubleHit, setDoubleHit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [legs, setLegs] = useState<Leg[]>([]);
  const [showCheckoutPrompt, setShowCheckoutPrompt] = useState(false);
  const [checkoutDartsInput, setCheckoutDartsInput] = useState("");
  const [doubleAttemptsInput, setDoubleAttemptsInput] = useState("");
  const [showSetup, setShowSetup] = useState(true);
  const [editingField, setEditingField] = useState<"checkoutDarts" | "doubleAttempts" | null>(null);
  const [showFinishConfirmation, setShowFinishConfirmation] = useState(false);

  useEffect(() => {
    if (legs.length > 0) {
      const lastLegWinner = legs[legs.length - 1].winnerId;
      setCurrentPlayer(lastLegWinner?.toString() === match.player1Id ? "player2" : "player1");
      setPlayer1State((prev) => ({ ...prev, score: 501, throws: [] }));
      setPlayer2State((prev) => ({ ...prev, score: 501, throws: [] }));
    }
  }, [legs, match.player1Id, match.player2Id]);

  const handleThrow = async () => {
    const score = parseInt(inputScore);
    if (isNaN(score) || score < 0 || score > 180) {
      toast.error("Érvénytelen pontszám (0-180 között legyen)");
      return;
    }

    const currentState = currentPlayer === "player1" ? player1State : player2State;
    const setCurrentState = currentPlayer === "player1" ? setPlayer1State : setPlayer2State;
    const opponentState = currentPlayer === "player1" ? player2State : player1State;

    let newScore = currentState.score - score;
    let newThrows = [...currentState.throws, { score, isDouble: isDoubleAttempt && doubleHit, darts: 3 }];
    let checkoutAttempts = currentState.checkoutAttempts;
    let successfulCheckouts = currentState.successfulCheckouts;
    let oneEighties = [...currentState.oneEighties];
    let highestCheckout = currentState.highestCheckout || { player1: 0, player2: 0 };

    if (score === 180) {
      oneEighties.push(currentState.dartsThrown + 1); // Record dart number of 180
    }

    const requiresDouble = newScore > 0 && newScore <= 170 && checkoutTable[newScore];
    const canDoubleFinish = newScore <= 50 || (newScore <= 170 && checkoutTable[newScore] && checkoutTable[newScore].includes("D"));
    if (requiresDouble && canDoubleFinish && isDoubleAttempt) {
      checkoutAttempts++;
      if (doubleHit && newScore === 0) {
        successfulCheckouts++;
        highestCheckout = {
          player1: currentPlayer === "player1" ? score : highestCheckout.player1,
          player2: currentPlayer === "player2" ? score : highestCheckout.player2,
        };
      }
    }

    if (newScore < 0 || (newScore === 0 && requiresDouble && !(isDoubleAttempt && doubleHit))) {
      toast.error("Bust! Túl sok pont vagy dupla szükséges.");
      newThrows.pop();
      setCurrentPlayer(currentPlayer === "player1" ? "player2" : "player1");
    } else {
      currentState.dartsThrown += 3;
      if (newScore === 0 && (!requiresDouble || (isDoubleAttempt && doubleHit))) {
        const newLegsWon = currentState.legsWon + 1;
        setCurrentState((prev) => ({
          ...prev,
          score: newScore,
          throws: newThrows,
          dartsThrown: prev.dartsThrown,
          checkoutAttempts,
          successfulCheckouts,
          legsWon: newLegsWon,
          oneEighties,
          highestCheckout,
        }));

        const newLeg: Leg = {
            player1Throws: player1State.throws.map(throwItem => ({ score: throwItem.score, darts: throwItem.darts || 0 })),
            player2Throws: player2State.throws.map(throwItem => ({ score: throwItem.score, darts: throwItem.darts || 0 })),
            winnerId: new mongoose.Types.ObjectId(currentPlayer === "player1" ? match.player1Id : match.player2Id),
            highestCheckout: {
              player1: player1State.highestCheckout?.player1 || 0,
              player2: player2State.highestCheckout?.player2 || 0,
            },
            oneEighties: { player1: player1State.oneEighties, player2: player2State.oneEighties },
            createdAt: new Date(),
          };
        setLegs((prev) => [...prev, newLeg]);
        setShowCheckoutPrompt(true);
        return;
      } else {
        setCurrentState((prev) => ({
          ...prev,
          score: newScore,
          throws: newThrows,
          dartsThrown: prev.dartsThrown,
          checkoutAttempts,
          successfulCheckouts,
          oneEighties,
          highestCheckout,
        }));
        setCurrentPlayer(currentPlayer === "player1" ? "player2" : "player1");
      }
    }

    setInputScore("");
    setIsDoubleAttempt(false);
    setDoubleHit(false);
  };

  const handleCheckoutSubmit = async () => {
    const checkoutDarts = parseInt(checkoutDartsInput);
    const doubleAttempts = parseInt(doubleAttemptsInput);

    if (isNaN(checkoutDarts) || checkoutDarts < 1 || checkoutDarts > 3) {
      toast.error("A kiszálló nyilak száma 1 és 3 között legyen");
      return;
    }
    if (isNaN(doubleAttempts) || doubleAttempts < 0 || doubleAttempts > 2) {
      toast.error("A dupla próbálkozások száma 0 és 2 között legyen");
      return;
    }

    const updatedLegs = [...legs];
    const lastLeg = updatedLegs[updatedLegs.length - 1];
    lastLeg.checkoutDarts = checkoutDarts;
    lastLeg.doubleAttempts = doubleAttempts;
    setLegs(updatedLegs);

    const currentState = currentPlayer === "player1" ? player1State : player2State;
    const setCurrentState = currentPlayer === "player1" ? setPlayer1State : setPlayer2State;
    const updatedState = {
      ...currentState,
      checkoutAttempts: currentState.checkoutAttempts + (doubleAttempts > 0 ? 1 : 0),
      successfulCheckouts: currentState.successfulCheckouts + (doubleAttempts > 0 ? 1 : 0),
    };
    setCurrentState(updatedState);

    const updatedPlayer1Stats = {
      dartsThrown: player1State.dartsThrown,
      average: calculateAverage(player1State.score, player1State.dartsThrown),
      legsWon: player1State.legsWon,
    };
    const updatedPlayer2Stats = {
      dartsThrown: player2State.dartsThrown,
      average: calculateAverage(player2State.score, player2State.dartsThrown),
      legsWon: player2State.legsWon,
    };

    await updateMatchStats({
      player1: updatedPlayer1Stats,
      player2: updatedPlayer2Stats,
      legs: updatedLegs,
    });

    const targetLegs = { bo3: 2, bo5: 3, bo7: 4 }[matchType];
    if (currentState.legsWon >= targetLegs) {
      setShowFinishConfirmation(true);
    } else {
      setPlayer1State((prev) => ({ ...prev, score: 501, throws: [] }));
      setPlayer2State((prev) => ({ ...prev, score: 501, throws: [] }));
      setCurrentPlayer(currentPlayer === match.player1Id ? "player2" : "player1");
      toast.success(`${currentPlayer === "player1" ? match.player1Name : match.player2Name} nyerte a leget!`);
    }

    setShowCheckoutPrompt(false);
    setCheckoutDartsInput("");
    setDoubleAttemptsInput("");
    setEditingField(null);
  };

  const handleFinishConfirmation = async (confirm: boolean) => {
    if (confirm) {
      const currentState = currentPlayer === "player1" ? player1State : player2State;
      const winnerId = currentPlayer === "player1" ? match.player1Id : match.player2Id;
      // Adjust highestCheckout to match the expected type { player1: number; player2: number }
      const highestCheckout = legs.reduce((max, leg) => {
        const player1Max = leg.highestCheckout?.player1 || 0;
        const player2Max = leg.highestCheckout?.player2 || 0;
        const maxPlayer1 = max.player1 || 0;
        const maxPlayer2 = max.player2 || 0;
        return {
          player1: Math.max(player1Max, maxPlayer1),
          player2: Math.max(player2Max, maxPlayer2),
        };
      }, { player1: 0, player2: 0 });

      const oneEighties = {
        player1: { count: player1State.oneEighties.length, darts: player1State.oneEighties },
        player2: { count: player2State.oneEighties.length, darts: player2State.oneEighties },
      };
      await handleFinishMatch({
        winnerId,
        player1Stats: { legsWon: player1State.legsWon, dartsThrown: player1State.dartsThrown, average: calculateAverage(player1State.score, player1State.dartsThrown) },
        player2Stats: { legsWon: player2State.legsWon, dartsThrown: player2State.dartsThrown, average: calculateAverage(player2State.score, player2State.dartsThrown) },
        highestCheckout, // Now matches { player1: number; player2: number }
        oneEighties,
      });
    }
    setShowFinishConfirmation(false);
    if (!confirm) {
      setPlayer1State((prev) => ({ ...prev, score: 501, throws: [] }));
      setPlayer2State((prev) => ({ ...prev, score: 501, throws: [] }));
      setCurrentPlayer(currentPlayer === match.player1Id ? "player2" : "player1");
    }
  };

  const calculateAverage = (score: number, dartsThrown: number) => {
    if (dartsThrown === 0) return 0;
    const pointsThrown = 501 - score;
    return (pointsThrown / dartsThrown) * 3;
  };

  const updateMatchStats = async (updatedStats: {
    player1: { dartsThrown: number; average: number; legsWon: number };
    player2: { dartsThrown: number; average: number; legsWon: number };
    legs?: Leg[];
  }) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/matches/${match.matchId}/update-stats`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stats: { player1: updatedStats.player1, player2: updatedStats.player2 },
          legs: updatedStats.legs || legs,
          boardId,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Statisztikák frissítve");
    } catch (error: any) {
      toast.error(error.message || "Nem sikerült a statisztikák frissítése");
    } finally {
      setLoading(false);
    }
  };

  const getCheckoutSuggestion = (score: number) => {
    if (score <= 170 && score > 0) return checkoutTable[score] || "Nincs javaslat";
    return null;
  };

  const handleNumpadInput = (value: string) => {
    if (editingField === "checkoutDarts") {
      const newValue = checkoutDartsInput + value;
      if (parseInt(newValue) <= 3) setCheckoutDartsInput(newValue);
      else toast.error("A kiszálló nyilak száma 1 és 3 között legyen");
    } else if (editingField === "doubleAttempts") {
      const newValue = doubleAttemptsInput + value;
      if (parseInt(newValue) <= 2) setDoubleAttemptsInput(newValue);
      else toast.error("A dupla próbálkozások száma 0 és 2 között legyen");
    }
  };

  const handleNumpadDelete = () => {
    if (editingField === "checkoutDarts") setCheckoutDartsInput(checkoutDartsInput.slice(0, -1));
    else if (editingField === "doubleAttempts") setDoubleAttemptsInput(doubleAttemptsInput.slice(0, -1));
  };

  if (showSetup) {
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
                    onClick={() => setMatchType(type as any)}
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
                  onClick={() => setStartingPlayer("player1")}
                >
                  {match.player1Name}
                </button>
                <button
                  className={`btn btn-lg h-16 flex-1 text-xl ${startingPlayer === "player2" ? "bg-primary text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"} transition-colors duration-200`}
                  onClick={() => setStartingPlayer("player2")}
                >
                  {match.player2Name}
                </button>
              </div>
            </div>
            <button
              className="btn btn-success h-14 w-full text-xl font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors duration-200"
              onClick={() => setShowSetup(false)}
            >
              Kezdés
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-screen h-screen bg-base-200 flex flex-col items-center justify-center p-6">
      <h2 className="text-5xl font-bold text-gray-800 mb-8 text-center">Tábla {selectedBoard} - Darts Counter</h2>
      <div className="flex flex-col md:flex-row gap-6 w-full max-w-6xl">
        <div className={`flex-1 p-6 rounded-lg shadow-lg ${currentPlayer === "player1" ? "bg-primary/10 border-4 border-primary" : "bg-base-100"}`}>
          <h3 className="text-4xl font-bold text-gray-800 mb-4">{match.player1Name}</h3>
          <div className="text-6xl font-bold text-gray-900 mb-4">{player1State.score}</div>
          <div className="text-xl text-gray-600 mb-2">Legek: {player1State.legsWon}</div>
          <div className="text-xl text-gray-600 mb-2">Dobások: {player1State.dartsThrown}</div>
          <div className="text-xl text-gray-600 mb-4">Átlag: {calculateAverage(player1State.score, player1State.dartsThrown).toFixed(2)}</div>
          {getCheckoutSuggestion(player1State.score) && (
            <div className="bg-green-100 p-4 rounded-md mb-4">
              <p className="text-lg font-medium text-green-800">Checkout: {getCheckoutSuggestion(player1State.score)}</p>
            </div>
          )}
          {player1State.score - (parseInt(inputScore) || 0) <= 170 && player1State.score - (parseInt(inputScore) || 0) > 0 && (player1State.score - (parseInt(inputScore) || 0) <= 50 || checkoutTable[player1State.score - (parseInt(inputScore) || 0)]?.includes("D")) && (
            <div className="space-y-2">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isDoubleAttempt && currentPlayer === "player1"}
                  onChange={(e) => setIsDoubleAttempt(e.target.checked)}
                  disabled={currentPlayer !== "player1"}
                  className="checkbox checkbox-primary h-6 w-6"
                />
                <span className="text-lg text-gray-700">Dupla</span>
              </label>
              {isDoubleAttempt && currentPlayer === "player1" && (
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={doubleHit}
                    onChange={(e) => setDoubleHit(e.target.checked)}
                    className="checkbox checkbox-success h-6 w-6"
                  />
                  <span className="text-lg text-gray-700">Talált</span>
                </label>
              )}
            </div>
          )}
        </div>
        <div className={`flex-1 p-6 rounded-lg shadow-lg ${currentPlayer === "player2" ? "bg-primary/10 border-4 border-primary" : "bg-base-100"}`}>
          <h3 className="text-4xl font-bold text-gray-800 mb-4">{match.player2Name}</h3>
          <div className="text-6xl font-bold text-gray-900 mb-4">{player2State.score}</div>
          <div className="text-xl text-gray-600 mb-2">Legek: {player2State.legsWon}</div>
          <div className="text-xl text-gray-600 mb-2">Dobások: {player2State.dartsThrown}</div>
          <div className="text-xl text-gray-600 mb-4">Átlag: {calculateAverage(player2State.score, player2State.dartsThrown).toFixed(2)}</div>
          {getCheckoutSuggestion(player2State.score) && (
            <div className="bg-green-100 p-4 rounded-md mb-4">
              <p className="text-lg font-medium text-green-800">Checkout: {getCheckoutSuggestion(player2State.score)}</p>
            </div>
          )}
          {player2State.score - (parseInt(inputScore) || 0) <= 170 && player2State.score - (parseInt(inputScore) || 0) > 0 && (player2State.score - (parseInt(inputScore) || 0) <= 50 || checkoutTable[player2State.score - (parseInt(inputScore) || 0)]?.includes("D")) && (
            <div className="space-y-2">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={isDoubleAttempt && currentPlayer === "player2"}
                  onChange={(e) => setIsDoubleAttempt(e.target.checked)}
                  disabled={currentPlayer !== "player2"}
                  className="checkbox checkbox-primary h-6 w-6"
                />
                <span className="text-lg text-gray-700">Dupla</span>
              </label>
              {isDoubleAttempt && currentPlayer === "player2" && (
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={doubleHit}
                    onChange={(e) => setDoubleHit(e.target.checked)}
                    className="checkbox checkbox-success h-6 w-6"
                  />
                  <span className="text-lg text-gray-700">Talált</span>
                </label>
              )}
            </div>
          )}
        </div>
      </div>
      {!showCheckoutPrompt ? (
        <div className="mt-6 w-full max-w-xl">
          <div className="mb-6">
            <div className="input input-bordered w-full flex items-center justify-between py-4 px-6 text-3xl bg-white border-gray-300 rounded-lg">
              <span>{inputScore || "0"}</span>
              <button className="btn btn-ghost text-2xl" onClick={() => setInputScore("")} disabled={loading || !inputScore}>✕</button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {Array.from({ length: 9 }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                className="btn btn-outline h-16 text-2xl bg-white text-gray-800 hover:bg-gray-100 transition-colors duration-200"
                onClick={() => {
                  const newScore = inputScore + num.toString();
                  if (parseInt(newScore) <= 180) setInputScore(newScore);
                  else toast.error("A pontszám nem lehet nagyobb, mint 180");
                }}
                disabled={loading}
              >
                {num}
              </button>
            ))}
            <button className="btn btn-warning h-16 text-2xl bg-yellow-500 text-white hover:bg-yellow-600 transition-colors duration-200" onClick={() => setInputScore(inputScore.slice(0, -1))} disabled={loading || !inputScore}>⌫</button>
            <button
              className="btn btn-outline h-16 text-2xl bg-white text-gray-800 hover:bg-gray-100 transition-colors duration-200"
              onClick={() => {
                const newScore = inputScore + "0";
                if (parseInt(newScore) <= 180) setInputScore(newScore);
                else toast.error("A pontszám nem lehet nagyobb, mint 180");
              }}
              disabled={loading || inputScore.length >= 3}
            >
              0
            </button>
            <button className="btn btn-primary h-16 text-2xl bg-primary text-white hover:bg-primary-dark transition-colors duration-200" onClick={handleThrow} disabled={loading || !inputScore}>
              {loading ? <span className="loading loading-spinner"></span> : "Dobás"}
            </button>
          </div>
          <p className="text-center text-lg text-gray-600">Eredményíró: {match.scribeName}</p>
        </div>
      ) : !showFinishConfirmation ? (
        <div className="mt-6 w-full max-w-md bg-base-100 p-6 rounded-lg shadow-lg">
          <h3 className="text-3xl font-bold text-gray-800 mb-6 text-center">Kiszálló részletek</h3>
          <div className="space-y-6">
            <div>
              <label className="block text-xl font-medium text-gray-700 mb-3">Kiszálló nyilak (1-3)</label>
              <div className="flex gap-3">
                {[1, 2, 3].map((num) => (
                  <button
                    key={num}
                    className={`btn h-12 w-12 text-xl ${checkoutDartsInput === num.toString() ? "bg-primary text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"} transition-colors duration-200`}
                    onClick={() => { setEditingField("checkoutDarts"); setCheckoutDartsInput(num.toString()); }}
                    disabled={loading}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xl font-medium text-gray-700 mb-3">Dupla nyilak (0-2)</label>
              <div className="flex gap-3">
                {[0, 1, 2].map((num) => (
                  <button
                    key={num}
                    className={`btn h-12 w-12 text-xl ${doubleAttemptsInput === num.toString() ? "bg-primary text-white" : "bg-gray-100 text-gray-800 hover:bg-gray-200"} transition-colors duration-200`}
                    onClick={() => { setEditingField("doubleAttempts"); setDoubleAttemptsInput(num.toString()); }}
                    disabled={loading}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
            <button
              className="btn btn-success h-12 w-full text-xl font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors duration-200"
              onClick={handleCheckoutSubmit}
              disabled={loading || !checkoutDartsInput || !doubleAttemptsInput}
            >
              {loading ? <span className="loading loading-spinner"></span> : "Megerősítés"}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 w-full max-w-md bg-base-100 p-6 rounded-lg shadow-lg">
          <h3 className="text-3xl font-bold text-gray-800 mb-6 text-center">Mérkőzés befejezése</h3>
          <p className="text-lg text-gray-600 mb-6 text-center">Biztosan befejezi? {currentPlayer === "player1" ? match.player1Name : match.player2Name} nyert. (Eredményíró: {match.scribeName})</p>
          <div className="flex gap-4 justify-center">
            <button className="btn btn-success h-12 w-32 text-xl font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors duration-200" onClick={() => handleFinishConfirmation(true)} disabled={loading}>Igen</button>
            <button className="btn btn-error h-12 w-32 text-xl font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors duration-200" onClick={() => handleFinishConfirmation(false)} disabled={loading}>Nem</button>
          </div>
        </div>
      )}
    </div>
  );
}