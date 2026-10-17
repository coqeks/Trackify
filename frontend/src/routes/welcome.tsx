import { createFileRoute, Link } from "@tanstack/react-router"
import { motion, useReducedMotion } from "motion/react"
import {
  Activity,
  ArrowRight,
  AudioWaveform,
  Drum,
  Guitar,
  Layers,
  Library,
  MicVocal,
  Music2,
  Piano,
  Sparkles,
  Waves,
} from "lucide-react"
import type { ReactNode } from "react"
import { isLoggedIn } from "../hooks/useAuth"

export const Route = createFileRoute("/welcome")({
  component: Welcome,
})

type Lane = { name: string; icon: ReactNode; muted: boolean }

const lanes: Lane[] = [
  { name: "Vocals", icon: <MicVocal size={15} />, muted: false },
  { name: "Drums", icon: <Drum size={15} />, muted: false },
  { name: "Bass", icon: <Waves size={15} />, muted: false },
  { name: "Guitar", icon: <Guitar size={15} />, muted: true },
  { name: "Piano", icon: <Piano size={15} />, muted: false },
  { name: "Other", icon: <Music2 size={15} />, muted: false },
]

const BARS = 36

// Deterministic pseudo-random heights so the mock waveform is stable between renders
function laneHeights(seed: number) {
  return Array.from({ length: BARS }, (_, i) => {
    const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453
    return 0.2 + (v - Math.floor(v)) * 0.8
  })
}

function MixerLane({ lane, index }: { lane: Lane; index: number }) {
  const reduceMotion = useReducedMotion()
  const heights = laneHeights(index + 1)

  return (
    <div className={`flex items-center gap-3 transition-opacity ${lane.muted ? "opacity-40" : ""}`}>
      <div className="flex w-20 shrink-0 items-center gap-2 text-xs font-medium text-gray-700 sm:w-24">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
          {lane.icon}
        </span>
        {lane.name}
      </div>
      <div className="flex h-7 flex-1 items-center gap-[2px]">
        {heights.map((h, i) => (
          <motion.div
            key={i}
            className={`flex-1 rounded-full ${lane.muted ? "bg-gray-300" : "bg-gray-900"}`}
            style={{ height: `${h * 100}%`, originY: 0.5 }}
            animate={reduceMotion || lane.muted ? undefined : { scaleY: [1, 0.55, 1] }}
            transition={{
              duration: 1.2 + (i % 5) * 0.15,
              repeat: Infinity,
              delay: (i % 7) * 0.08,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <span
        className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 ${
          lane.muted ? "bg-gray-200" : "bg-gray-900"
        }`}
        aria-hidden
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            lane.muted ? "" : "translate-x-4"
          }`}
        />
      </span>
    </div>
  )
}

function MixerPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-br from-gray-200/70 via-transparent to-gray-300/40 blur-2xl" />
      <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-xl shadow-gray-900/5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white">
              <AudioWaveform size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Midnight Drive.mp3</p>
              <p className="text-xs text-gray-500">6 stems separated</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700">
              <Music2 size={12} className="text-gray-400" /> A minor
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-700">
              <Activity size={12} className="text-gray-400" /> 128 BPM
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {lanes.map((lane, i) => (
            <MixerLane key={lane.name} lane={lane} index={i} />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-gray-50 px-4 py-3 text-xs text-gray-500">
          <span>Guitar removed, ready to play along</span>
          <span className="shrink-0 whitespace-nowrap font-medium text-gray-900">Backing track ✓</span>
        </div>
      </div>
    </div>
  )
}

const features = [
  {
    icon: <Layers size={18} />,
    title: "Six-stem separation",
    body: "Split any song into vocals, drums, bass, guitar, piano and everything else.",
  },
  {
    icon: <Activity size={18} />,
    title: "Key & tempo detection",
    body: "Every track is analysed so you know what key to play in and how fast.",
  },
  {
    icon: <Library size={18} />,
    title: "Your practice library",
    body: "Save backing tracks to your account and replay them from any device.",
  },
]

function Welcome() {
  const loggedIn = isLoggedIn()

  return (
    <div className="relative min-h-screen overflow-hidden bg-white text-gray-900">
      {/* Dotted backdrop, faded toward the edges */}
      <div
        className="pointer-events-none absolute inset-0 -z-0 opacity-60 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_70%)]"
        style={{
          backgroundImage: "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/welcome" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-900 text-white">
            <AudioWaveform size={16} />
          </span>
          Trackify
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          {loggedIn ? (
            <Link to="/" className="rounded-full bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-800">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login" className="rounded-full px-4 py-2 font-medium text-gray-600 hover:text-gray-900">
                Log in
              </Link>
              <Link to="/signup" className="rounded-full bg-gray-900 px-4 py-2 font-medium text-white hover:bg-gray-800">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-10 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-600 shadow-sm">
            <Sparkles size={13} className="text-gray-900" />
            AI source separation for musicians
          </span>

          <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Turn any song into
            <br />
            <span className="text-gray-400">your backing track.</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-gray-600">
            Upload a song, mute the part you play, and practice along. Trackify separates the
            instruments and tells you the key and tempo, so you can jump straight in.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to={loggedIn ? "/audio" : "/signup"}
              className="group inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-gray-900/10 transition-colors hover:bg-gray-800"
            >
              {loggedIn ? "Create a backing track" : "Start for free"}
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            {!loggedIn && (
              <Link
                to="/login"
                className="inline-flex items-center rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:border-gray-900"
              >
                I have an account
              </Link>
            )}
          </div>

          <p className="mt-5 text-xs text-gray-400">MP3, WAV, FLAC, OGG, M4A and WebM · up to 10 MB</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: "easeOut" }}
        >
          <MixerPreview />
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-2xl border border-gray-200 bg-white p-6"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-900">
                {f.icon}
              </span>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{f.body}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}
