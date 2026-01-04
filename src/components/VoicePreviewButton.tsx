"use client";

interface VoicePreviewButtonProps {
  onClick: () => void;
  isPlaying: boolean;
  disabled?: boolean;
  label?: string;
}

export function VoicePreviewButton({
  onClick,
  isPlaying,
  disabled = false,
  label = "試聴",
}: VoicePreviewButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isPlaying}
      className={`
        flex items-center gap-1 px-2 py-2 rounded-lg text-sm
        ${isPlaying
          ? "bg-blue-500/30 text-blue-300"
          : "bg-zinc-800 text-white/60 hover:bg-zinc-700 hover:text-white/80"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
        transition-colors
      `}
      title={label}
    >
      {isPlaying ? (
        <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
      )}
    </button>
  );
}
