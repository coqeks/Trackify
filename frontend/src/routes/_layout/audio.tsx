import { cancel_progress, save_track } from "../../client/request"
import { useState, useRef, useCallback, type DragEvent, type FormEvent, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  useLayoutContext,
  ALL_STEMS,
  MAX_FILE_BYTES,
  type UploadState,
  type AudioType,
  type TrackAnalysis,
} from "../_layout";
import { useToast } from "../../hooks/useToast";
import AudioPlayer from "../../components/AudioPlayer";
import TrackStats from "../../components/TrackStats";

import { motion, AnimatePresence } from "motion/react"
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  Check,
  CloudUpload,
  Download,
  Drum,
  FileAudio,
  Guitar,
  Loader2,
  MicVocal,
  Music2,
  Piano,
  RefreshCw,
  Save,
  TriangleAlert,
  Waves,
  X,
} from "lucide-react";

const allowedFileType = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "audio/webm",
  "audio/flac",
];

export const Route = createFileRoute("/_layout/audio")({
  component: Audio,
});

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const STEM_INFO: Record<AudioType, { label: string; hint: string; icon: ReactNode }> = {
  vocals: { label: "Vocals", hint: "Lead & backing vocals", icon: <MicVocal size={20} /> },
  drums: { label: "Drums", hint: "Kit & percussion", icon: <Drum size={20} /> },
  bass: { label: "Bass", hint: "Bass guitar & synth bass", icon: <Waves size={20} /> },
  guitar: { label: "Guitar", hint: "Electric & acoustic", icon: <Guitar size={20} /> },
  piano: { label: "Piano", hint: "Piano & keys", icon: <Piano size={20} /> },
  other: { label: "Other", hint: "Strings, synths, effects", icon: <Music2 size={20} /> },
};

/* ------------------------------------------------------------------ */
/* Stepper                                                             */
/* ------------------------------------------------------------------ */

const STEPS = ["Upload", "Choose stems", "Process"] as const;

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-3">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  done || active ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-500"
                }`}
              >
                {done ? <Check size={14} strokeWidth={3} /> : i + 1}
              </span>
              <span className={`hidden text-sm font-medium sm:inline ${active ? "text-gray-900" : "text-gray-500"}`}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span className={`h-px w-6 sm:w-10 ${done ? "bg-gray-900" : "bg-gray-300"}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">{children}</div>;
}

function CardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
    </div>
  );
}

const primaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryBtn =
  "inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-gray-900 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50";

/* ------------------------------------------------------------------ */
/* Step 1: upload                                                      */
/* ------------------------------------------------------------------ */

interface UploadStep1Props {
  selectedFile: File | null;
  onFileSelected: (file: File | null) => void;
  onProceed: () => void;
}

function UploadStep1({ selectedFile, onFileSelected, onProceed }: UploadStep1Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errMessage, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const acceptFile = (file: File | undefined) => {
    if (!file) {
      setError("No file detected.");
      return;
    }
    if (!allowedFileType.includes(file.type)) {
      setError("That doesn't look like a supported audio file. Try MP3, WAV, FLAC, OGG, M4A or WebM.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError(`That file is ${formatBytes(file.size)}. The limit is 10 MB.`);
      return;
    }
    setError(null);
    onFileSelected(file);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    acceptFile(e.dataTransfer.files?.[0]);
  };

  return (
    <Card>
      <CardHeader title="Upload your song" subtitle="We'll split it into separate instruments in the next steps." />

      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/30 ${
          dragging ? "border-gray-900 bg-gray-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50/60"
        }`}
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-700">
          <CloudUpload size={26} />
        </span>
        <p className="mt-4 font-medium text-gray-900">
          {dragging ? "Drop to upload" : "Drag & drop a song, or click to browse"}
        </p>
        <p className="mt-1 text-sm text-gray-500">MP3, WAV, FLAC, OGG, M4A or WebM · up to 10 MB</p>
        <input
          type="file"
          accept={allowedFileType.join(",")}
          onChange={(e) => {
            acceptFile(e.target.files?.[0]);
            e.target.value = "";
          }}
          className="hidden"
          ref={fileInputRef}
        />
      </div>

      {errMessage && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          {errMessage}
        </div>
      )}

      {selectedFile && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm">
            <FileAudio size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{selectedFile.name}</p>
            <p className="text-xs text-gray-500">{formatBytes(selectedFile.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => onFileSelected(null)}
            aria-label="Remove file"
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-900"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button className={primaryBtn} disabled={!selectedFile} onClick={onProceed}>
          Continue <ArrowRight size={16} />
        </button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Step 2: stem selection                                              */
/* ------------------------------------------------------------------ */

interface UploadStep2Props {
  target: AudioType[];
  onTargetChange: (t: AudioType[]) => void;
  onBack: () => void;
  onProceed: () => void;
}

function UploadStep2({ target, onTargetChange, onBack, onProceed }: UploadStep2Props) {
  const toggle = (stem: AudioType) => {
    if (target.includes(stem)) {
      if (target.length <= 1) return; // a backing track needs at least one stem
      onTargetChange(target.filter((s) => s !== stem));
    } else {
      // Keep canonical order so the server's output filename is stable
      onTargetChange(ALL_STEMS.filter((s) => s === stem || target.includes(s)));
    }
  };

  const removeOnly = (stem: AudioType) => onTargetChange(ALL_STEMS.filter((s) => s !== stem));
  const isRemoveOnly = (stem: AudioType) => target.length === ALL_STEMS.length - 1 && !target.includes(stem);

  return (
    <Card>
      <CardHeader
        title="Choose what to keep"
        subtitle="Turn off the parts you want to play yourself. Only the stems that are on will be in your backing track."
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-medium uppercase tracking-wide text-gray-400">Quick picks</span>
        {(["vocals", "guitar", "drums", "bass", "piano"] as AudioType[]).map((stem) => (
          <button
            key={stem}
            type="button"
            onClick={() => removeOnly(stem)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              isRemoveOnly(stem)
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 text-gray-600 hover:border-gray-400"
            }`}
          >
            {stem === "vocals" ? "Karaoke (no vocals)" : `No ${STEM_INFO[stem].label.toLowerCase()}`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {ALL_STEMS.map((stem) => {
          const on = target.includes(stem);
          const locked = on && target.length <= 1;
          const info = STEM_INFO[stem];
          return (
            <button
              key={stem}
              type="button"
              role="switch"
              aria-checked={on}
              onClick={() => toggle(stem)}
              title={locked ? "Keep at least one stem" : undefined}
              className={`group relative flex flex-col items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                on
                  ? "border-gray-900 bg-white shadow-sm"
                  : "border-gray-200 bg-gray-50 text-gray-400 hover:border-gray-300"
              } ${locked ? "cursor-not-allowed" : ""}`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                  on ? "bg-gray-900 text-white" : "bg-white text-gray-400"
                }`}
              >
                {info.icon}
              </span>
              <span>
                <span className={`block font-medium ${on ? "text-gray-900" : "text-gray-500 line-through"}`}>
                  {info.label}
                </span>
                <span className="block text-xs text-gray-500">{info.hint}</span>
              </span>
              <span
                className={`absolute right-4 top-4 flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
                  on ? "bg-gray-900" : "bg-gray-300"
                }`}
              >
                <span
                  className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-4" : ""}`}
                />
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-gray-500">
        Keeping <span className="font-medium text-gray-900">{target.length}</span> of {ALL_STEMS.length} stems
        {target.length === ALL_STEMS.length && " (turn at least one off to make a backing track)"}
      </p>

      <div className="mt-6 flex justify-between">
        <button className={secondaryBtn} onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>
        <button className={primaryBtn} onClick={onProceed}>
          Process track <ArrowRight size={16} />
        </button>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Step 3: processing & result                                         */
/* ------------------------------------------------------------------ */

const STAGES: { label: string; hint?: string; states: UploadState[] }[] = [
  { label: "Uploading your song", states: ["PENDING"] },
  { label: "Preparing audio", states: ["READING"] },
  { label: "Separating stems", hint: "This usually takes a few minutes", states: ["COMPUTING"] },
  { label: "Detecting key & tempo", states: ["ANALYZING"] },
  { label: "Finishing up", states: ["UPLOADING", "FINISHING"] },
];

function ProcessingTimeline({ progress, onCancel }: { progress: UploadState; onCancel: () => void }) {
  const currentIndex = Math.max(0, STAGES.findIndex((s) => s.states.includes(progress)));
  const cancelling = progress === "CANCELLING";
  const canCancel = !cancelling && progress !== "UPLOADING" && progress !== "FINISHING";

  return (
    <div className="flex flex-col items-center">
      <ol className="w-full max-w-sm">
        {STAGES.map((stage, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex && !cancelling;
          return (
            <li key={stage.label} className="relative flex gap-4 pb-6 last:pb-0">
              {i < STAGES.length - 1 && (
                <span
                  className={`absolute left-[13px] top-7 h-[calc(100%-1.75rem)] w-px ${done ? "bg-gray-900" : "bg-gray-200"}`}
                />
              )}
              <span
                className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  done
                    ? "border-gray-900 bg-gray-900 text-white"
                    : active
                      ? "border-gray-900 bg-white text-gray-900"
                      : "border-gray-200 bg-white text-gray-300"
                }`}
              >
                {done ? (
                  <Check size={14} strokeWidth={3} />
                ) : active ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                )}
              </span>
              <div className="pt-0.5">
                <p className={`text-sm font-medium ${done || active ? "text-gray-900" : "text-gray-400"}`}>
                  {stage.label}
                </p>
                {active && stage.hint && <p className="text-xs text-gray-500">{stage.hint}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-8">
        {cancelling ? (
          <p className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={14} className="animate-spin" /> Cancelling…
          </p>
        ) : (
          canCancel && (
            <button className={secondaryBtn} onClick={onCancel}>
              Cancel
            </button>
          )
        )}
      </div>
    </div>
  );
}

interface ResultProps {
  audioUrl: string;
  analysis: TrackAnalysis;
  defaultTitle: string;
  saved: boolean;
  saving: boolean;
  onDownload: () => void;
  onSave: (title: string) => void;
  onStartOver: () => void;
}

function ResultView({
  audioUrl,
  analysis,
  defaultTitle,
  saved,
  saving,
  onDownload,
  onSave,
  onStartOver,
}: ResultProps) {
  const [title, setTitle] = useState(defaultTitle);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim()) onSave(title.trim());
  };

  return (
    <motion.div layout className="flex flex-col gap-6">
      <div className="flex flex-col items-center text-center">
        <motion.span
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-white"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", visualDuration: 0.5, bounce: 0.5 }}
        >
          <Check size={28} strokeWidth={3} />
        </motion.span>
        <h3 className="mt-4 text-lg font-semibold text-gray-900">Your backing track is ready</h3>
        <div className="mt-3">
          <TrackStats musicalKey={analysis.musicalKey} bpm={analysis.bpm} size="md" />
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
        <AudioPlayer src={audioUrl} />
      </motion.div>

      <div className="grid gap-4 md:grid-cols-[auto_1fr]">
        <button className={`${secondaryBtn} md:self-end`} onClick={onDownload}>
          <Download size={16} /> Download WAV
        </button>

        {saved ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <span className="flex items-center gap-2 font-medium text-gray-900">
              <Check size={16} /> Saved to your library
            </span>
            <Link to="/" className="font-medium text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline">
              View dashboard
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
            <label htmlFor="trackTitle" className="text-xs font-medium text-gray-500">
              Track name
            </label>
            <div className="flex gap-2">
              <input
                id="trackTitle"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder="e.g. Midnight Drive (no guitar)"
                className="min-w-0 flex-1 rounded-full border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition-colors focus:border-gray-900"
              />
              <button type="submit" className={primaryBtn} disabled={saving || !title.trim()}>
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="flex justify-center border-t border-gray-100 pt-5">
        <button
          onClick={onStartOver}
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <RefreshCw size={14} /> Process another song
        </button>
      </div>
    </motion.div>
  );
}

function StatusMessage({
  icon,
  title,
  body,
  actions,
}: {
  icon: ReactNode;
  title: string;
  body?: string | null;
  actions: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-700">{icon}</span>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      {body && <p className="mt-1 max-w-md text-sm text-gray-500">{body}</p>}
      <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function Audio() {
  const {
    progress, setProgress, selectedFile, setSelectedFile, target, setTarget,
    step, setStep, audioUrl, handleUpload, handleDownload, taskId, audioKey,
    analysis, errorDetail, resetFlow,
  } = useLayoutContext();

  const queryClient = useQueryClient();
  const { showError, showSuccess } = useToast();
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const inProcess = !["IDLE", "SUCCESS", "FAILURE", "CANCELLED"].includes(progress);

  const handleSave = useCallback(async (trackTitle: string) => {
    if (!audioKey) return;
    setSaving(true);
    try {
      await save_track(trackTitle, audioKey);
      setSavedKey(audioKey);
      showSuccess(`"${trackTitle}" was saved to your library.`);
      queryClient.invalidateQueries({ queryKey: ["tracks"] });
    } catch (err) {
      showError(err instanceof Error ? err.message : "Could not save this track.");
    } finally {
      setSaving(false);
    }
  }, [audioKey, queryClient, showError, showSuccess]);

  const handleCancel = useCallback(async () => {
    if (!taskId) return;
    setProgress("CANCELLING");
    try {
      await cancel_progress(taskId);
    } catch (err) {
      console.error(err);
    }
  }, [taskId, setProgress]);

  const defaultTitle = selectedFile?.name.replace(/\.[^.]+$/, "") ?? "";

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pb-10">
      <div className="flex justify-center pt-2">
        <Stepper current={Number(step) - 1} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {step === "1" && (
            <UploadStep1
              selectedFile={selectedFile}
              onFileSelected={setSelectedFile}
              onProceed={() => setStep("2")}
            />
          )}
          {step === "2" && (
            <UploadStep2
              target={target}
              onTargetChange={setTarget}
              onBack={() => setStep("1")}
              onProceed={() => {
                setStep("3");
                handleUpload();
              }}
            />
          )}
          {step === "3" && (
            <Card>
              {inProcess && (
                <>
                  <CardHeader
                    title="Creating your backing track"
                    subtitle={selectedFile ? `Working on ${selectedFile.name}` : "Working on your song"}
                  />
                  <ProcessingTimeline progress={progress} onCancel={handleCancel} />
                </>
              )}

              {progress === "SUCCESS" && audioUrl && (
                <ResultView
                  audioUrl={audioUrl}
                  analysis={analysis}
                  defaultTitle={defaultTitle}
                  saved={savedKey !== null && savedKey === audioKey}
                  saving={saving}
                  onDownload={handleDownload}
                  onSave={handleSave}
                  onStartOver={resetFlow}
                />
              )}

              {progress === "FAILURE" && (
                <StatusMessage
                  icon={<TriangleAlert size={26} />}
                  title={errorDetail?.startsWith("Storage is full") ? "Not enough storage space" : "Something went wrong"}
                  body={errorDetail ?? "We couldn't process this track. Please try again."}
                  actions={
                    <>
                      <button className={secondaryBtn} onClick={resetFlow}>
                        Start over
                      </button>
                      <button className={primaryBtn} onClick={() => setStep("2")}>
                        <ArrowLeft size={16} /> Back to stems
                      </button>
                    </>
                  }
                />
              )}

              {progress === "CANCELLED" && (
                <StatusMessage
                  icon={<Ban size={26} />}
                  title="Processing cancelled"
                  body="Nothing was saved. You can adjust your stems and try again."
                  actions={
                    <>
                      <button className={secondaryBtn} onClick={resetFlow}>
                        Start over
                      </button>
                      <button className={primaryBtn} onClick={() => setStep("2")}>
                        <ArrowLeft size={16} /> Back to stems
                      </button>
                    </>
                  }
                />
              )}
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
