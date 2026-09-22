import { useState, useCallback, useEffect, useRef } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { get_all_tracks, get_saved_purl, type Track } from '../../client/request'
import useAuth from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { Play, Pause, Download, Loader2, Music, FileAudio } from 'lucide-react'

export const Route = createFileRoute('/_layout/')({
  component: Index,
})

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused'

interface TrackRowProps {
  track: Track
  playbackState: PlaybackState
  isDownloading: boolean
  onPlayToggle: (track: Track) => void
  onDownload: (track: Track) => void
}

function TrackRow({ track, playbackState, isDownloading, onPlayToggle, onDownload }: TrackRowProps) {
  const isPlaying = playbackState === 'playing'
  const isLoading = playbackState === 'loading'

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
          <Music size={18} />
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-medium text-gray-900">{track.title}</h3>
          <p className="text-sm text-gray-500">Saved {formatDate(track.created_at)}</p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => onPlayToggle(track)}
          disabled={isLoading}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60"
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : isPlaying ? (
            <Pause size={18} />
          ) : (
            <Play size={18} />
          )}
        </button>
        <button
          onClick={() => onDownload(track)}
          disabled={isDownloading}
          aria-label="Download"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-60"
        >
          {isDownloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
        </button>
      </div>
    </div>
  )
}

function Index() {
  const { user: currentUser } = useAuth()
  const { showError } = useToast()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tracks'],
    queryFn: get_all_tracks,
  })

  const tracks = data?.Tracks ?? []

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const objectUrlCache = useRef<Map<string, string>>(new Map())

  const [activeTrackId, setActiveTrackId] = useState<number | null>(null)
  const [playbackState, setPlaybackState] = useState<PlaybackState>('idle')
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  useEffect(() => {
    const cache = objectUrlCache.current
    return () => {
      cache.forEach((url) => URL.revokeObjectURL(url))
      cache.clear()
    }
  }, [])

  const resolveObjectUrl = useCallback(async (track: Track) => {
    const cached = objectUrlCache.current.get(track.cloud_key)
    if (cached) return cached

    const { signed_url } = await get_saved_purl(track.cloud_key)
    const response = await fetch(signed_url)
    if (!response.ok) {
      throw new Error('Could not fetch track audio')
    }
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    objectUrlCache.current.set(track.cloud_key, objectUrl)
    return objectUrl
  }, [])

  const handlePlayToggle = useCallback(
    async (track: Track) => {
      const audio = audioRef.current
      if (!audio) return

      if (activeTrackId === track.id && playbackState === 'playing') {
        audio.pause()
        setPlaybackState('paused')
        return
      }
      if (activeTrackId === track.id && playbackState === 'paused') {
        await audio.play()
        setPlaybackState('playing')
        return
      }

      setActiveTrackId(track.id)
      setPlaybackState('loading')
      try {
        const objectUrl = await resolveObjectUrl(track)
        audio.src = objectUrl
        await audio.play()
        setPlaybackState('playing')
      } catch (err) {
        console.error(err)
        showError('Could not play this track. Please try again.')
        setPlaybackState('idle')
        setActiveTrackId(null)
      }
    },
    [activeTrackId, playbackState, resolveObjectUrl, showError]
  )

  const handleDownload = useCallback(
    async (track: Track) => {
      setDownloadingId(track.id)
      try {
        const objectUrl = await resolveObjectUrl(track)
        const link = document.createElement('a')
        link.href = objectUrl
        link.download = `${track.title || 'track'}.mp3`
        document.body.appendChild(link)
        link.click()
        link.remove()
      } catch (err) {
        console.error(err)
        showError('Could not download this track. Please try again.')
      } finally {
        setDownloadingId(null)
      }
    },
    [resolveObjectUrl, showError]
  )

  return (
    <div className="flex flex-col gap-5">
      <div className="topbar justify-between">
        <div className="brand">Your Tracks</div>
        <Link to="/audio" className="btn-secondary">
          Start uploading
        </Link>
      </div>

      <h3 className="text-gray-600">Welcome back, {currentUser?.full_name}</h3>

      {/* Hidden shared player - controlled entirely via the row buttons above */}
      <audio ref={audioRef} onEnded={() => setPlaybackState('idle')} className="hidden" />

      {isLoading && (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
          <Loader2 size={28} className="animate-spin" />
          <p>Loading your tracks...</p>
        </div>
      )}

      {isError && !isLoading && (
        <div className="flex flex-col items-center gap-2 py-16 text-gray-500">
          <p>Something went wrong loading your tracks.</p>
        </div>
      )}

      {!isLoading && !isError && tracks.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-300 py-16 text-gray-500">
          <FileAudio size={48} className="text-gray-300" />
          <p>You haven&apos;t saved any tracks yet.</p>
          <Link to="/audio" className="btn-primary px-6 w-auto max-w-1/2">
            Create your first backing track
          </Link>
        </div>
      )}

      {!isLoading && !isError && tracks.length > 0 && (
        <div className="flex flex-col gap-3">
          {tracks.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              playbackState={activeTrackId === track.id ? playbackState : 'idle'}
              isDownloading={downloadingId === track.id}
              onPlayToggle={handlePlayToggle}
              onDownload={handleDownload}
            />
          ))}
        </div>
      )}
    </div>
  )
}