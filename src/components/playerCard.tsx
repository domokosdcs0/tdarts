import { checkoutTable } from "@/lib/checkouts";
interface PlayerCardProps {
    playerName: string;
    score: number;
    legsWon: number;
    dartsThrown: number;
    average: number;
    checkoutSuggestion: string | null;
    isCurrentPlayer: boolean;
    inputScore: string;
    isDoubleAttempt: boolean;
    doubleHit: boolean;
    onDoubleAttemptChange: (checked: boolean) => void;
    onDoubleHitChange: (checked: boolean) => void;
  }
  
 export default function PlayerCard({
    playerName,
    score,
    legsWon,
    dartsThrown,
    average,
    checkoutSuggestion,
    isCurrentPlayer,
    inputScore,
    isDoubleAttempt,
    doubleHit,
    onDoubleAttemptChange,
    onDoubleHitChange,
  }: PlayerCardProps) {
    const canShowDouble =
      score - (parseInt(inputScore) || 0) <= 170 &&
      score - (parseInt(inputScore) || 0) > 0 &&
      (score - (parseInt(inputScore) || 0) <= 50 ||
        checkoutTable[score - (parseInt(inputScore) || 0)]?.includes("D"));
  
    return (
      <div
        className={`flex-1 p-6 rounded-lg shadow-lg ${
          isCurrentPlayer ? "bg-primary/10 border-4 border-primary" : "bg-base-100"
        }`}
      >
        <h3 className="text-4xl font-bold text-gray-800 mb-4">{playerName}</h3>
        <div className="text-6xl font-bold text-gray-900 mb-4">{score}</div>
        <div className="text-xl text-gray-600 mb-2">Legek: {legsWon}</div>
        <div className="text-xl text-gray-600 mb-2">Dobások: {dartsThrown}</div>
        <div className="text-xl text-gray-600 mb-4">Átlag: {average.toFixed(2)}</div>
        {checkoutSuggestion && (
          <div className="bg-green-100 p-4 rounded-md mb-4">
            <p className="text-lg font-medium text-green-800">Checkout: {checkoutSuggestion}</p>
          </div>
        )}
        {canShowDouble && (
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={isDoubleAttempt}
                onChange={(e) => onDoubleAttemptChange(e.target.checked)}
                disabled={!isCurrentPlayer}
                className="checkbox checkbox-primary h-6 w-6"
              />
              <span className="text-lg text-gray-700">Dupla</span>
            </label>
            {isDoubleAttempt && isCurrentPlayer && (
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={doubleHit}
                  onChange={(e) => onDoubleHitChange(e.target.checked)}
                  className="checkbox checkbox-success h-6 w-6"
                />
                <span className="text-lg text-gray-700">Talált</span>
              </label>
            )}
          </div>
        )}
      </div>
    );
  }