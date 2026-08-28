import { createContext, useContext, useState, useCallback, useEffect, type Dispatch, type SetStateAction, type ReactNode } from "react";
import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { get_purl, request_separation, poll_progress } from "../client/request";
import {
  LayoutDashboard,
  FileAudio,
  Settings,
  Menu,
  SquareArrowRightExit,
  X,
} from "lucide-react"; 

import useAuth, { isLoggedIn } from "../hooks/useAuth"

export const Route = createFileRoute("/_layout")({
  component: Layout
});

export type UploadState = "IDLE" | "PENDING" | "COMPUTING" | "UPLOADING" | "READING" | "SUCCESS" | "FAILURE";
export type AudioType = "guitar" | "piano" | "drums" | "bass" | "vocals" | "other";
export type Step = "1" | "2" | "3";

type NavItem = {
  label: string;
  to: string;
  icon: ReactNode;
};

const navItems: NavItem[] = [
  { label: "Dashboard", to: "/", icon: <LayoutDashboard size={18} /> },
  { label: "Upload", to: "/audio", icon: <FileAudio size={18} /> },
  { label: "Settings", to: "/settings", icon: <Settings size={18} /> },
  { label: "Logout", to: "/login", icon: <SquareArrowRightExit size={18} /> },
];

export interface LayoutContextInterface {
  // upload flow state
  progress: UploadState;
  setProgress: Dispatch<SetStateAction<UploadState>>;
  trackResult: Blob | null;
  setTrackResult: Dispatch<SetStateAction<Blob | null>>;
  selectedFile: File | null;
  setSelectedFile: Dispatch<SetStateAction<File | null>>;
  target: AudioType[];
  setTarget: Dispatch<SetStateAction<AudioType[]>>;
  step: Step;
  setStep: Dispatch<SetStateAction<Step>>;
  audioKey: string | null;
  setAudioKey: Dispatch<SetStateAction<string | null>>;

  // derived state (Audio should read these, not set them directly)
  showComplete: boolean;
  audioUrl: string | null;

  // actions
  handleUpload: () => Promise<void>;
  handleDownload: () => Promise<void>;
}

export const LayoutContext = createContext<LayoutContextInterface | null>(null)

export function useLayoutContext() {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error("useLayoutContext must be used within Layout's provider");
  }
  return ctx;
}

function Layout() {
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth()

  /** States for audio process **/
  const [progress, setProgress] = useState<UploadState>("IDLE");

  const [trackResult, setTrackResult] = useState<Blob | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [target, setTarget] = useState<AudioType[]>(["guitar", "piano", "vocals", "drums", "bass", "other"]);

  const [step, setStep] = useState<Step>("1");

  const [showComplete, setShowComplete] = useState<boolean>(false);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [audioKey, setAudioKey] = useState<string | null>(null);
  /****/

  useEffect(() => {
    if (!trackResult) {
      setAudioUrl(null);
      return;
    }
    const url = URL.createObjectURL(trackResult);
    setAudioUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [trackResult]);

  useEffect(() => {
    if (progress !== "SUCCESS") {
      setShowComplete(false);
      return;
    }
    setShowComplete(true);
    const timer = setTimeout(() => setShowComplete(false), 1600);
    return () => clearTimeout(timer);
  }, [progress]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;
    setProgress("PENDING");
    try {
      const { signed_url, s3_key } = await get_purl();
      setAudioKey(s3_key);

      if (selectedFile.size > 10485760) {
        throw new Error("File size is too large");
      }

      await fetch(signed_url, { method: "PUT", body: selectedFile });

      const data = await request_separation({ target, s3_key });
      const result_url = await poll_progress(data["Task_ID"], (state: UploadState) => setProgress(state));

      const response = await fetch(result_url["result_url"] as string, { method: "GET" });
      console.log(result_url)
      console.log("status:", response.status, "content-length header:", response.headers.get("content-length"));
      const audio_blob = await response.blob();
      console.log("Audio Blob Size:", audio_blob.size)
      setTrackResult(audio_blob);
    } catch (err: unknown) {
      console.error(err);
      setProgress("FAILURE");
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
    const directoryHandle = await rootHandle.getDirectoryHandle("tracks", { create: true });
    const fileHandle = await directoryHandle.getFileHandle("audio", { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(trackResult);
    await writable.close();
  }, [trackResult]);

  const contextValue: LayoutContextInterface = {
    progress, setProgress,
    trackResult, setTrackResult,
    selectedFile, setSelectedFile,
    target, setTarget,
    step, setStep,
    audioKey, setAudioKey,
    showComplete,
    audioUrl,
    handleUpload,
    handleDownload,
  };

  const pageName = navItems.find((item) => item.to === location.pathname ).label

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-gray-200 bg-white transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          <span className="text-lg font-semibold text-gray-900">
            Trackify
          </span>
          <button
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => {
                setMobileOpen(false);
                if (item.label == "Logout") {
                    logout()
                }
              }}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
              activeProps={{
                className: "bg-gray-900 text-white hover:bg-gray-900 hover:text-white",
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 items-center border-b border-gray-200 bg-white px-4 md:px-6">
          <button
            className="mr-3 rounded-md p-1 text-gray-500 hover:bg-gray-100 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>
          <h1 className="text-base font-semibold text-gray-900"> {pageName} </h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <LayoutContext.Provider value={contextValue}>
            <Outlet />
          </LayoutContext.Provider>
        </main>
      </div>
    </div>
  );
}