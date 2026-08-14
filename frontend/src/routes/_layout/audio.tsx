import useAuth from "../../hooks/useAuth";
import { useState, useRef } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  FileAudio
} from "lucide-react"


type UploadState = "idle" | "uploading" | "success" | "error";
type audioType = "guitar" | "piano" | "drums" | "bass" | "vocals";

interface UploadResult {
    filename: string;
    content_type: string;
    size_bytes: number;
    message: string;
}

export async function getDirectoryHandle() {
  const rootHandle = await navigator.storage.getDirectory()
  const directoryHandle = await rootHandle.getDirectoryHandle("tracks", {create: true})
  return directoryHandle
}

export const Route = createFileRoute('/_layout/audio')({
  component: Audio
})

const directoryHandle = await getDirectoryHandle()

async function createPlayBack(
  track_blob: Blob,
  parent : Node
) {
  const blobURL = URL.createObjectURL(track_blob);

  const audioPlayer = document.createElement("audio");
  audioPlayer.src = blobURL;
  audioPlayer.controls = true;
  parent.appendChild(audioPlayer);
}

function Audio() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [result, setResult] = useState<UploadResult | null>(null);
  const [track_result, setTrack] = useState<Blob | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef(null)

  
  function handleLogout() {
    logout();
    navigate({to: "/login"})
  }

  const handleResult = async () => {
    if (track_result == null) return;

    let downloadLink = document.createElement("a");
    downloadLink.href = window.URL.createObjectURL(track_result);
    downloadLink.download = "BackingTrack.mp3";
    document.body.appendChild(downloadLink);
    downloadLink.click();

    const fileHandle = await directoryHandle.getFileHandle("audio", {create: true});
    const writable = await fileHandle.createWritable();
    await writable.write(track_result);
    await writable.close()

    console.log("downloading track")
  }

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadState("uploading");
    console.log("Uploading")

    const selectElm = document.getElementById("select-target") as HTMLInputElement
    let target: audioType;
    if (!selectElm) {
      target = "guitar"
    } else {
      target = selectElm.value as audioType
    };

    console.log(target);

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
        console.log(err.detail)
        throw new Error(err.detail);
      }

      const downloadBtn = document.getElementById("download") as HTMLElement
      downloadBtn.hidden = false;

      const audio = await res.blob()
      console.log("Success")
      createPlayBack(audio, document.getElementById("download") as HTMLElement)
      setUploadState("success");
      setTrack(audio);
    } catch (err: unknown) {
      setUploadState("error");
    }
  };

  const promptFileInput = async () => {
    fileInputRef.current.click();
  }

  return (
    <div className="flex flex-col gap-5 justify-center">
      <div className="topbar">
        <div className="brand">Upload Your Audio</div>
      </div>
      <div className="flex flex-col items-center">
        <div className="bg-gray-180 border p-10 m-5 w-8/12 max-w-8/12 flex flex-col items-center gap-1" id="upload-card">
          
          <div className="text-gray-300 hover:text-gray-500 hover:font-bold cursor-pointer flex flex-col items-center"
          onClick={promptFileInput}>
            <FileAudio size={120}/>
            <h3 className="text-black text-8 m-2">Choose a File to Upload</h3>
          </div>

          <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} 
          className="hidden" ref={fileInputRef}></input>

          {selectedFile && <p className="text-gray-500">Selected file: {selectedFile.name}</p>}

          <select name="target" required id="select-target" hidden>
            <option value="">-- Choose instrument to exclude --</option>
            <option value="guitar">Lead Guitar</option>
            <option value="drums">Percussion</option>
            <option value="vocals">Vocal</option>
            <option value="bass">Bass</option>
            <option value="piano">Piano</option>
          </select>

          <button className="btn-secondary" onClick={handleUpload}>Proceed</button>
        </div>
        <div className="auth-card" id="download" hidden>
          <label htmlFor="track-name">Name of your track:</label>
          <input type="text" id="track-name" name="track-name"></input>
          <button className="btn-primary" onClick={handleResult}>Download Track</button>
        </div>
      </div>
    </div>
  );
}

