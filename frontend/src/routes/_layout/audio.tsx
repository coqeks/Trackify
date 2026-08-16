import useAuth from "../../hooks/useAuth";
import { useState, useRef, useCallback } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FileAudio, ArrowLeft } from "lucide-react";

type UploadState = "idle" | "uploading" | "success" | "error";
type AudioType = "guitar" | "piano" | "drums" | "bass" | "vocals";
type Step = "1" | "2" | "3";

const allowedFileType = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/mp4",
  "audio/webm",
  "audio/flac",
];

export async function getDirectoryHandle() {
  const rootHandle = await navigator.storage.getDirectory();
  return rootHandle.getDirectoryHandle("tracks", { create: true });
}

export const Route = createFileRoute("/_layout/audio")({
  component: Audio,
});

interface UploadStep1Props {
  selectedFile: File | null;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onFileSelected: (file: File) => void;
  onProceed: () => void;
}

function UploadStep1({
  selectedFile,
  fileInputRef,
  onFileSelected,
  onProceed,
}: UploadStep1Props) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!allowedFileType.includes(file.type)) {
      console.log("Unsupported Type");
      return;
    }
    onFileSelected(file);
  };

  return (
    <div className="flex flex-col gap-5 justify-center">
      <div className="topbar justify-between">
        <div className="brand">Upload Your Audio</div>
      </div>
      <div className="flex flex-col items-center">
        <div
          className="bg-gray-180 border border-dotted p-10 m-5 w-8/12 max-w-8/12 flex flex-col items-center gap-1"
          id="upload-card"
        >
          <div
            className="text-gray-300 hover:text-gray-500 hover:font-bold cursor-pointer flex flex-col items-center"
            onClick={() => fileInputRef.current?.click()}
          >
            <FileAudio size={120} />
            <h3 className="text-black text-8 m-2">
              Click to Choose a File to Upload
            </h3>
          </div>

          <input
            type="file"
            onChange={handleChange}
            className="hidden"
            ref={fileInputRef}
          />

          {selectedFile && (
            <p className="text-gray-500">Selected file: {selectedFile.name}</p>
          )}

          {selectedFile && (
            <button className="btn-secondary" onClick={onProceed}>
              Proceed
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface UploadStep2Props {
  target: AudioType;
  onTargetChange: (t: AudioType) => void;
  onBack: () => void;
  onProceed: () => void;
}

function UploadStep2({ onBack, onProceed }: UploadStep2Props) {
  // NOTE: all four cards currently say "Guitar" and are hardcoded checked.
  // If these should represent different stems (guitar/piano/drums/bass),
  // give each its own label + controlled checked state tied to `target`
  // (or an array of selected stems) instead of defaultChecked.
  return (
    <div className="flex flex-col gap-5">
      <div className="topbar justify-start">
        <div className="px-2" onClick={onBack}>
          <ArrowLeft />
        </div>
        <div className="brand px-2">Customize Your Track</div>
      </div>
      <div>
        Uncheck sounds you want to exclude. Only checked sounds will be
        present in your backing track.
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-y-5 columns place-items-center">
        <div className="border w-3/4 py-2 rounded-2xl flex justify-center gap-2">
          <h3>Guitar</h3>
          <input type="checkbox" defaultChecked />
        </div>
        <div className="border w-3/4 py-2 rounded-2xl flex justify-center gap-2">
          <h3>Guitar</h3>
          <input type="checkbox" defaultChecked />
        </div>
        <div className="border w-3/4 py-2 rounded-2xl flex justify-center gap-2">
          <h3>Guitar</h3>
          <input type="checkbox" defaultChecked />
        </div>
        <div className="border w-3/4 py-2 rounded-2xl flex justify-center gap-2">
          <h3>Guitar</h3>
          <input type="checkbox" defaultChecked />
        </div>
      </div>
      <button className="btn-secondary" onClick={onProceed}>
        Proceed
      </button>
    </div>
  );
}

interface UploadStep3Props {
  audioContainerRef: React.RefObject<HTMLDivElement>;
  onDownload: () => void;
}

function UploadStep3({ audioContainerRef, onDownload }: UploadStep3Props) {
  return (
    <div className="auth-card" id="download" ref={audioContainerRef}>
      <label htmlFor="track-name">Name of your track:</label>
      <input type="text" id="track-name" name="track-name" />
      <button className="btn-primary" onClick={onDownload}>
        Download Track
      </button>
    </div>
  );
}

function Audio() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [trackResult, setTrackResult] = useState<Blob | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [target, setTarget] = useState<AudioType>("guitar");
  const [step, setStep] = useState<Step>("1");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContainerRef = useRef<HTMLDivElement>(null);

  function handleLogout() {
    logout();
    navigate({ to: "/login" });
  }

  const createPlayback = (blob: Blob) => {
    const container = audioContainerRef.current;
    if (!container) return;
    const blobURL = URL.createObjectURL(blob);
    const audioPlayer = document.createElement("audio");
    audioPlayer.src = blobURL;
    audioPlayer.controls = true;
    container.appendChild(audioPlayer);
  };

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setUploadState("uploading");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("target", target);

    try {
      const res = await fetch("http://localhost:8000/audio", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail);
      }

      const audio = await res.blob();
      setTrackResult(audio);
      setUploadState("success");
      // wait a tick so UploadStep3 (and its ref) is mounted before we append the player
      requestAnimationFrame(() => createPlayback(audio));
    } catch (err: unknown) {
      console.error(err);
      setUploadState("error");
    }
  }, [selectedFile, target]);

  const handleDownload = useCallback(async () => {
    if (!trackResult) return;

    const downloadLink = document.createElement("a");
    downloadLink.href = window.URL.createObjectURL(trackResult);
    downloadLink.download = "BackingTrack.mp3";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    downloadLink.remove();

    const rootHandle = await navigator.storage.getDirectory();
    const directoryHandle = await rootHandle.getDirectoryHandle("tracks", {
      create: true,
    });
    const fileHandle = await directoryHandle.getFileHandle("audio", {
      create: true,
    });
    const writable = await fileHandle.createWritable();
    await writable.write(trackResult);
    await writable.close();
  }, [trackResult]);

  return (
    <div>
      {step === "1" && (
        <UploadStep1
          selectedFile={selectedFile}
          fileInputRef={fileInputRef}
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
        <UploadStep3
          audioContainerRef={audioContainerRef}
          onDownload={handleDownload}
        />
      )}
    </div>
  );
}