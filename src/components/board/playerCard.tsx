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
        <div className="flex items-center gap-1">
          <div className="w-1/2 h-full flex flex-col">
            <h3 className="text-4xl font-bold text-gray-800 mb-4">{playerName}</h3>
            <span className="text-[7rem] font-bold text-gray-900 mb-4">{score}</span>
          </div>
          <div className="flex flex-col gap-1 items-end w-1/2">
            <span className="text-xl font-bold  text-gray-600 ">Legek: {legsWon}</span>
            <span className="text-xl  text-gray-600 ">Átlag: {average.toFixed(2)}</span>
            <span className="text-xl  text-gray-600 ">Dobások: {dartsThrown}</span>
            {checkoutSuggestion && (
              <div className="bg-green-100 p-4 rounded-md mb-4">
                <p className="text-2xl font-medium text-green-800">Checkout: <b>{checkoutSuggestion}</b></p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }