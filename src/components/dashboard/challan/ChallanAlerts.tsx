// Inline alert bar — shows error (red) or success (green) message
interface Props {
  error: string;
  success: string;
  onDismiss?: () => void;
}

export default function ChallanAlerts({ error, success, onDismiss }: Props) {
  const msg = error || success;
  if (!msg) return null;

  return (
    <div className={`mx-4 mt-2 shrink-0 rounded-lg px-4 py-2 text-xs font-medium flex items-center justify-between gap-3 ${
      error
        ? 'bg-red-50 border border-red-200 text-red-700'
        : 'bg-green-50 border border-green-200 text-green-700'
    }`}>
      <span>{msg}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="text-current opacity-60 hover:opacity-100 font-bold text-sm leading-none">
          ✕
        </button>
      )}
    </div>
  );
}
