import { Activity, Music2 } from "lucide-react"

export function formatKey(key: string) {
  return key.replace("#", "♯")
}

interface TrackStatsProps {
  musicalKey: string | null
  bpm: number | null
  size?: "sm" | "md"
}

export default function TrackStats({ musicalKey, bpm, size = "sm" }: TrackStatsProps) {
  if (!musicalKey && !bpm) return null

  const pill =
    size === "md"
      ? "gap-1.5 px-3 py-1.5 text-sm"
      : "gap-1 px-2 py-0.5 text-xs"
  const iconSize = size === "md" ? 15 : 12

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {musicalKey && (
        <span
          className={`inline-flex items-center rounded-full border border-gray-200 bg-gray-50 font-medium text-gray-700 ${pill}`}
          title="Detected key"
        >
          <Music2 size={iconSize} className="text-gray-400" />
          {formatKey(musicalKey)}
        </span>
      )}
      {bpm && (
        <span
          className={`inline-flex items-center rounded-full border border-gray-200 bg-gray-50 font-medium text-gray-700 tabular-nums ${pill}`}
          title="Detected tempo"
        >
          <Activity size={iconSize} className="text-gray-400" />
          {Math.round(bpm)} BPM
        </span>
      )}
    </div>
  )
}
