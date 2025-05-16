
export interface CheckoutPromptProps {
    checkoutDartsInput: string;
    doubleAttemptsInput: string;
    loading: boolean;
    onCheckoutDartsChange: (value: string) => void;
    onDoubleAttemptsChange: (value: string) => void;
    onSubmit: () => void;
  }
export default function CheckoutPrompt({
  checkoutDartsInput,
  doubleAttemptsInput,
  loading,
  onCheckoutDartsChange,
  onDoubleAttemptsChange,
  onSubmit,
}: CheckoutPromptProps) {
  return (
    <div className="mt-6 w-full max-w-md bg-base-100 p-6 rounded-lg shadow-lg">
      <h3 className="text-3xl font-bold text-gray-800 mb-6 text-center">Kiszálló részletek</h3>
      <div className="space-y-6">
        <div>
          <label className="block text-xl font-medium text-gray-700 mb-3">Kiszálló nyilak (1-3)</label>
          <div className="flex gap-3">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                className={`btn h-12 w-12 text-xl ${
                  checkoutDartsInput === num.toString()
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                } transition-colors duration-200`}
                onClick={() => onCheckoutDartsChange(num.toString())}
                disabled={loading}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xl font-medium text-gray-700 mb-3">Dupla nyilak (1-3)</label>
          <div className="flex gap-3">
            {[1, 2, 3].map((num) => (
              <button
                key={num}
                className={`btn h-12 w-12 text-xl ${
                  doubleAttemptsInput === num.toString()
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                } transition-colors duration-200`}
                onClick={() => onDoubleAttemptsChange(num.toString())}
                disabled={loading}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
        <button
          className="btn btn-success h-12 w-full text-xl font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors duration-200"
          onClick={onSubmit}
          disabled={loading || !checkoutDartsInput || !doubleAttemptsInput}
        >
          {loading ? <span className="loading loading-spinner"></span> : "Megerősítés"}
        </button>
      </div>
    </div>
  );
}