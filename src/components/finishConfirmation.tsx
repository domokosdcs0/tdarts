interface FinishConfirmationProps {
    winnerName: string;
    scribeName: string;
    loading: boolean;
    onConfirm: (confirm: boolean) => void;
  }
  
 export default function FinishConfirmation({
    winnerName,
    scribeName,
    loading,
    onConfirm,
  }: FinishConfirmationProps) {
    return (
      <div className="mt-6 w-full max-w-md bg-base-100 p-6 rounded-lg shadow-lg">
        <h3 className="text-3xl font-bold text-gray-800 mb-6 text-center">Mérkőzés befejezése</h3>
        <p className="text-lg text-gray-600 mb-6 text-center">
          Biztosan befejezi? {winnerName} nyert. (Eredményíró: {scribeName})
        </p>
        <div className="flex gap-4 justify-center">
          <button
            className="btn btn-success h-12 w-32 text-xl font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors duration-200"
            onClick={() => onConfirm(true)}
            disabled={loading}
          >
            Igen
          </button>
          <button
            className="btn btn-error h-12 w-32 text-xl font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors duration-200"
            onClick={() => onConfirm(false)}
            disabled={loading}
          >
            Nem
          </button>
        </div>
      </div>
    );
  }