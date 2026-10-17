import { useState, useCallback, useEffect, useRef } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { delete_track, get_all_tracks, get_saved_purl, type Track } from '../../client/request'
import useAuth from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import AudioPlayer from '../../components/AudioPlayer'
import TrackStats from '../../components/TrackStats'
import { Play, Download, Loader2, Music, FileAudio, Plus, Trash2, X, AudioWaveform } from 'lucide-react'

export const Route = createFileRoute('/_layout/')({
  component: Index,
})

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const iconBtn =
  'flex h-9 w-9 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50'

interface TrackRowProps {
  track: Track
  isActive: boolean
  isLoading: boolean
  playerSrc: string | null
  isDownloading: boolean
  isDeleting: boolean
  onPlay: (track: Track) => void
  onClose: () => void
  onDownload: (track: Track) => void
  onDelete: (track: Track) => void
}

function TrackRow({
  track,
  isActive,
  isLoading,
  playerSrc,
  isDownloading,
  isDeleting,
  onPlay,
  onClose,
  onDownload,
  onDelete,
}: TrackRowProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const title = track.title || 'Untitled track'

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.2 }}
      className={`overflow-hidden rounded-2xl border bg-white transition-colors ${
        isActive ? 'border-gray-900 shadow-sm' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
        <button
          onClick={() => (isActive ? onClose() : onPlay(track))}
          disabled={isLoading}
          aria-label={isActive ? `Close player for ${title}` : `Play ${title}`}
          className={`group flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
            isActive ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-900 hover:text-white'
          }`}
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : isActive ? (
            <AudioWaveform size={18} />
          ) : (
            <>
              <Music size={18} className="group-hover:hidden" />
              <Play size={18} fill="currentColor" className="hidden group-hover:block" />
            </>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-gray-900">{title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-xs text-gray-500">Saved {formatDate(track.created_at)}</span>
            <TrackStats musicalKey={track.musical_key} bpm={track.bpm} />
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {confirmingDelete ? (
            <div className="flex items-center gap-1 rounded-full bg-red-50 py-1 pl-3 pr-1">
              <span className="hidden text-xs font-medium text-red-700 sm:inline">Delete track?</span>
              <button
                onClick={() => onDelete(track)}
                disabled={isDeleting}
                className="flex items-center gap-1 rounded-full bg-red-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleting ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                Delete
              </button>
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={isDeleting}
                aria-label="Cancel delete"
                className="flex h-7 w-7 items-center justify-center rounded-full text-red-700 hover:bg-red-100"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => onDownload(track)}
                disabled={isDownloading}
                aria-label={`Download ${title}`}
                className={iconBtn}
              >
                {isDownloading ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />}
              </button>
              <button
                onClick={() => setConfirmingDelete(true)}
                aria-label={`Delete ${title}`}
                className={`${iconBtn} hover:bg-red-50 hover:text-red-600`}
              >
                <Trash2 size={17} />
              </button>
            </>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isActive && playerSrc && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="border-t border-gray-100 bg-gray-50/60 p-3 sm:p-4">
              <AudioPlayer src={playerSrc} autoPlay />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
}

function Index() {
  const { user: currentUser } = useAuth()
  const { showError, showSuccess } = useToast()
  const queryClient = useQueryClient()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['tracks'],
    queryFn: get_all_tracks,
  })

  const tracks = data?.Tracks ?? []

  const objectUrlCache = useRef<Map<string, string>>(new Map())

  const [activeTrackId, setActiveTrackId] = useState<number | null>(null)
  const [loadingTrackId, setLoadingTrackId] = useState<number | null>(null)
  const [playerSrc, setPlayerSrc] = useState<string | null>(null)
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

  const closePlayer = useCallback(() => {
    setActiveTrackId(null)
    setPlayerSrc(null)
  }, [])

  const handlePlay = useCallback(
    async (track: Track) => {
      setLoadingTrackId(track.id)
      try {
        const objectUrl = await resolveObjectUrl(track)
        setPlayerSrc(objectUrl)
        setActiveTrackId(track.id)
      } catch (err) {
        console.error(err)
        showError('Could not play this track. Please try again.')
      } finally {
        setLoadingTrackId(null)
      }
    },
    [resolveObjectUrl, showError]
  )

  const handleDownload = useCallback(
    async (track: Track) => {
      setDownloadingId(track.id)
      try {
        const objectUrl = await resolveObjectUrl(track)
        const link = document.createElement('a')
        link.href = objectUrl
        link.download = `${track.title || 'track'}.wav`
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

  const deleteMutation = useMutation({
    mutationFn: (track: Track) => delete_track(track.id),
    onSuccess: (_, track) => {
      if (activeTrackId === track.id) closePlayer()
      const cached = objectUrlCache.current.get(track.cloud_key)
      if (cached) {
        URL.revokeObjectURL(cached)
        objectUrlCache.current.delete(track.cloud_key)
      }
      queryClient.setQueryData<{ Tracks: Track[] }>(['tracks'], (old) =>
        old ? { Tracks: old.Tracks.filter((t) => t.id !== track.id) } : old
      )
      showSuccess(`"${track.title || 'Untitled track'}" was deleted.`)
    },
    onError: (err) => {
      showError(err instanceof Error ? err.message : 'Could not delete this track.')
    },
  })

  const firstName = currentUser?.full_name?.split(' ')[0]

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">Welcome back{firstName ? `, ${firstName}` : ''}</p>
          <h2 className="mt-1 text-2xl font-semibold text-gray-900">Your tracks</h2>
        </div>
        <Link
          to="/audio"
          className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
        >
          <Plus size={16} /> New backing track
        </Link>
      </div>

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
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-gray-300 bg-white py-16 text-center text-gray-500">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
            <FileAudio size={26} />
          </span>
          <p className="font-medium text-gray-900">No saved tracks yet</p>
          <p className="max-w-xs text-sm">Upload a song, remove the parts you play, and save it here to practice later.</p>
          <Link
            to="/audio"
            className="mt-2 inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Create your first backing track
          </Link>
        </div>
      )}

      {!isLoading && !isError && tracks.length > 0 && (
        <>
          <p className="-mb-3 text-xs font-medium uppercase tracking-wide text-gray-400">
            {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
          </p>
          <ul className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {tracks.map((track) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  isActive={activeTrackId === track.id}
                  isLoading={loadingTrackId === track.id}
                  playerSrc={activeTrackId === track.id ? playerSrc : null}
                  isDownloading={downloadingId === track.id}
                  isDeleting={deleteMutation.isPending && deleteMutation.variables?.id === track.id}
                  onPlay={handlePlay}
                  onClose={closePlayer}
                  onDownload={handleDownload}
                  onDelete={(t) => deleteMutation.mutate(t)}
                />
              ))}
            </AnimatePresence>
          </ul>
        </>
      )}
    </div>
  )
}
