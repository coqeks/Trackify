import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react"
import { Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react"

const BAR_COUNT = 96
const SKIP_SECONDS = 10

// Decoded peaks are cached per source so re-mounting a player doesn't re-decode the audio
const peakCache = new Map<string, number[]>()

async function computePeaks(src: string, bars: number): Promise<number[]> {
  const cached = peakCache.get(src)
  if (cached) return cached

  const data = await (await fetch(src)).arrayBuffer()
  const ctx = new AudioContext()
  try {
    const buffer = await ctx.decodeAudioData(data)
    const channel = buffer.getChannelData(0)
    const block = Math.floor(channel.length / bars)
    const peaks: number[] = []
    for (let i = 0; i < bars; i++) {
      let max = 0
      // Stride through the block; sampling every 16th value is plenty for a visual
      for (let j = i * block; j < (i + 1) * block; j += 16) {
        const v = Math.abs(channel[j])
        if (v > max) max = v
      }
      peaks.push(max)
    }
    const top = Math.max(...peaks, 1e-6)
    const normalized = peaks.map((p) => Math.max(0.06, p / top))
    peakCache.set(src, normalized)
    return normalized
  } finally {
    ctx.close()
  }
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00"
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

interface AudioPlayerProps {
  src: string
  autoPlay?: boolean
  onEnded?: () => void
}

export default function AudioPlayer({ src, autoPlay = false, onEnded }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const waveRef = useRef<HTMLDivElement | null>(null)
  const scrubbing = useRef(false)

  const [peaks, setPeaks] = useState<number[] | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [hoverRatio, setHoverRatio] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setPeaks(null)
    setCurrentTime(0)
    setPlaying(false)
    computePeaks(src, BAR_COUNT)
      .then((p) => !cancelled && setPeaks(p))
      .catch((err) => {
        console.error("Could not draw waveform", err)
        // Flat bars still work as a scrubber
        if (!cancelled) setPeaks(Array(BAR_COUNT).fill(0.3))
      })
    return () => {
      cancelled = true
    }
  }, [src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    audio.muted = muted
  }, [volume, muted])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      audio.play().catch(() => setPlaying(false))
    } else {
      audio.pause()
    }
  }, [])

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current
    if (!audio || !Number.isFinite(audio.duration)) return
    audio.currentTime = Math.min(Math.max(time, 0), audio.duration)
    setCurrentTime(audio.currentTime)
  }, [])

  const ratioFromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const rect = waveRef.current!.getBoundingClientRect()
    return Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
  }

  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    scrubbing.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    seekTo(ratioFromPointer(e) * duration)
  }

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const ratio = ratioFromPointer(e)
    setHoverRatio(ratio)
    if (scrubbing.current) seekTo(ratio * duration)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") seekTo(currentTime - 5)
    else if (e.key === "ArrowRight") seekTo(currentTime + 5)
    else if (e.key === "Home") seekTo(0)
    else if (e.key === "End") seekTo(duration)
    else if (e.key === " " || e.key === "Enter") togglePlay()
    else return
    e.preventDefault()
  }

  const progress = duration > 0 ? currentTime / duration : 0

  return (
    <div className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration)
          if (autoPlay) e.currentTarget.play().catch(() => setPlaying(false))
        }}
        onTimeUpdate={(e) => !scrubbing.current && setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false)
          onEnded?.()
        }}
      />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-900 text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
        >
          {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
        </button>

        <div
          ref={waveRef}
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          aria-valuetext={`${formatTime(currentTime)} of ${formatTime(duration)}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={() => (scrubbing.current = false)}
          onPointerLeave={() => setHoverRatio(null)}
          onKeyDown={handleKeyDown}
          className="relative flex h-14 min-w-0 flex-1 cursor-pointer touch-none items-center gap-[2px] rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30"
        >
          {(peaks ?? Array(BAR_COUNT).fill(0.25)).map((peak, i) => {
            const barRatio = (i + 0.5) / BAR_COUNT
            const played = barRatio <= progress
            const hovered = hoverRatio !== null && barRatio <= hoverRatio
            return (
              <div
                key={i}
                className={`flex-1 rounded-full transition-colors duration-150 ${
                  peaks === null
                    ? "animate-pulse bg-gray-200"
                    : played
                      ? "bg-gray-900"
                      : hovered
                        ? "bg-gray-400"
                        : "bg-gray-200"
                }`}
                style={{ height: `${peak * 100}%` }}
              />
            )
          })}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 items-center text-xs text-gray-500">
        <span className="justify-self-start tabular-nums">
          {formatTime(currentTime)} <span className="text-gray-300">/</span> {formatTime(duration)}
        </span>

        <div className="flex items-center gap-1 justify-self-center">
          <button
            type="button"
            onClick={() => seekTo(currentTime - SKIP_SECONDS)}
            aria-label={`Back ${SKIP_SECONDS} seconds`}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <RotateCcw size={16} />
          </button>
          <button
            type="button"
            onClick={() => seekTo(currentTime + SKIP_SECONDS)}
            aria-label={`Forward ${SKIP_SECONDS} seconds`}
            className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
          >
            <RotateCw size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2 justify-self-end">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute" : "Mute"}
            className="rounded-full p-1 text-gray-500 transition-colors hover:text-gray-900"
          >
            {muted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => {
              setVolume(Number(e.target.value))
              setMuted(false)
            }}
            aria-label="Volume"
            className="hidden w-16 accent-gray-900 sm:block"
          />
        </div>
      </div>
    </div>
  )
}
