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
  }: PlayerCardProps) {
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
      </div>
    );
  }