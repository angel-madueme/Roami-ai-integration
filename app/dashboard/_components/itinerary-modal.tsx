"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { AI_CONFIG } from "@/lib/ai-config";

type ActivityCategory = "TRANSPORT" | "LODGING" | "FOOD" | "SIGHTSEEING" | "OTHER";

type Activity = {
  id?: string;
  category: ActivityCategory;
  title: string;
  note: string;
  order: number;
};

type Itinerary = {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  unsplashImageUrl: string | null;
  unsplashPhotographerName: string | null;
  unsplashPhotographerUrl: string | null;
  activities: Activity[];
};

type JobResponse = {
  id: string;
  status: "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  attempts?: number;
  itinerary?: Itinerary | null;
  errorMessage?: string | null;
};

const categoryStyles: Record<ActivityCategory, { className: string; label: string }> = {
  TRANSPORT: { className: "bg-blue-50 text-blue-600", label: "Transport" },
  LODGING: { className: "bg-violet-50 text-violet-600", label: "Lodging" },
  FOOD: { className: "bg-orange-50 text-orange-500", label: "Food" },
  SIGHTSEEING: { className: "bg-emerald-50 text-emerald-600", label: "Sightseeing" },
  OTHER: { className: "bg-slate-100 text-slate-600", label: "Other" },
};
function formatDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
}

function formatDateRange(startDate: string, endDate: string): string {
  return `${formatDate(startDate)} → ${formatDate(endDate)}`;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`w-full ${className}`}>{children}</div>;
}

function Arrow() {
  return <span aria-hidden="true" className="text-3xl font-light leading-none">→</span>;
}

function ActivityIcon({ category }: { category: ActivityCategory }) {
  const style = categoryStyles[category] ?? categoryStyles.OTHER;
  const icon = {
    TRANSPORT: <><path d="m4 12 16-5-4.5 5L20 17 4 12Z" /><path d="M8 12 5 7.5M8 12 5 16.5" /></>,
    LODGING: <><path d="M4 17v-6.5A2.5 2.5 0 0 1 6.5 8h2A2.5 2.5 0 0 1 11 10.5V17" /><path d="M11 12h5.5A3.5 3.5 0 0 1 20 15.5V17M4 14h16M4 17v2M20 17v2" /></>,
    FOOD: <><path d="M6 4v7M4 4v4a2 2 0 0 0 4 0V4M6 11v9" /><path d="M15 4v16M15 4c2.2 1.2 3.5 3.1 3.5 5.5H15" /></>,
    SIGHTSEEING: <><path d="M4 9.5 12 4l8 5.5V20H4V9.5Z" /><path d="M8 20v-5h8v5M9 9h.01M12 9h.01M15 9h.01" /></>,
    OTHER: <><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></>,
  }[category] ?? <><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" /></>;

  return (
    <span aria-label={style.label} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${style.className}`}>
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
    </span>
  );
}
function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" aria-hidden="true">
      <path d="M7 18.5h10a4.5 4.5 0 0 0 .4-8.98A6 6 0 0 0 5.6 11.4 3.6 3.6 0 0 0 7 18.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9.5v6M9.5 12 12 9.5l2.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UploadError({ message }: { message: string }) {
  return (
    <div role="alert" className="mt-4 flex items-start gap-2.5 rounded-xl bg-red-50 px-4 py-3 text-left">
      <span className="mt-0.5 shrink-0 text-red-500" aria-hidden="true">!</span>
      <span className="flex-1 text-sm font-medium text-red-700">{message}</span>
    </div>
  );
}

function UploadScreen({ onStarted, loadingMessage }: { onStarted: (jobId: string) => void; loadingMessage: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function chooseFile(nextFile: File | null) {
    if (!nextFile) return;
    if (!["image/jpeg", "image/png"].includes(nextFile.type)) {
      setError("Please choose a JPG or PNG image.");
      return;
    }
    if (nextFile.size > 20 * 1024 * 1024) {
      setError("That image is larger than 20MB. Please choose a smaller file.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(URL.createObjectURL(nextFile));
    setError(null);
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0] ?? null);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function submit() {
    if (!file) {
      setError("Choose a photo of your notes first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/itinerary/upload", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "We couldn’t start itinerary extraction.");
      onStarted(data.id);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "We couldn’t start itinerary extraction.");
      setSubmitting(false);
    }
  }

  return (
    <Card className="max-w-[820px] px-7 py-10 text-left sm:px-12 sm:py-12">
      <p className="text-base text-[#7180ad]">Upload a photo of your notes, screenshot, or booking.</p>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`mt-6 flex min-h-[242px] cursor-pointer flex-col items-center justify-center rounded-2xl text-center transition-colors ${dragging ? "bg-blue-50" : "bg-[#f7fbff]"}`}
      >
        <span className="text-blue-500"><UploadIcon /></span>
        <p className="mt-4 text-xl font-medium text-[#101c4d]">Drag a photo here or <span className="text-blue-600 underline">click to browse</span></p>
        <p className="mt-1 text-lg text-[#8290b7]">JPG, PNG — up to 20MB</p>
        <input ref={inputRef} type="file" accept="image/jpeg,image/png" onChange={onInputChange} className="sr-only" />
      </div>

      {file && previewUrl && (
        <div className="mt-6 flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <img src={previewUrl} alt="Selected trip notes" className="h-24 w-32 rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-semibold text-[#101c4d]">{file.name}</p>
            <p className="text-base text-[#8290b7]">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
          <button type="button" onClick={() => { setFile(null); if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-2xl text-slate-500" aria-label="Remove selected image">×</button>
        </div>
      )}

      {error && <UploadError message={error} />}
      <button type="button" disabled={submitting || !file} onClick={submit} className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-600 py-4 text-xl font-semibold text-white shadow-lg shadow-blue-500/20 transition enabled:hover:from-blue-600 enabled:hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
        {submitting ? <><WaveSpinner /> {loadingMessage}</> : <>Extract notes <Arrow /></>}
      </button>
    </Card>
  );
}

function WaveSpinner() {
  return <span className="wave-spinner" aria-label="Loading"><i /><i /><i /></span>;
}

function ResultScreen({ itinerary, onExpand, expanding, detailsVisible }: { itinerary: Itinerary; onExpand: () => void; expanding: boolean; detailsVisible: boolean }) {
  return (
    <Card className="max-w-[760px] px-8 py-10 sm:px-10">
      {itinerary.unsplashImageUrl && (
        <div className="relative mt-4 overflow-hidden rounded-2xl">
          <img src={itinerary.unsplashImageUrl} alt={`Destination photo for ${itinerary.destination}`} className="h-64 w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent px-5 pb-4 pt-12 text-sm text-white">
            Photo by <a href={itinerary.unsplashPhotographerUrl ?? "https://unsplash.com"} target="_blank" rel="noreferrer" className="underline">{itinerary.unsplashPhotographerName ?? "Unsplash photographer"}</a> on <a href="https://unsplash.com" target="_blank" rel="noreferrer" className="underline">Unsplash</a>
          </div>
        </div>
      )}
      <h2 className="mt-7 text-3xl font-extrabold tracking-tight text-[#101c4d]">{itinerary.destination}</h2>
      <p className="mt-1 text-2xl text-[#7180ad]">{formatDateRange(itinerary.startDate, itinerary.endDate)}</p>
      <div className="mt-7 space-y-5">
        {itinerary.activities.map((activity) => (
          <div key={activity.id ?? `${activity.order}-${activity.title}`} className="flex items-start gap-4">
            <ActivityIcon category={activity.category} />
            <div className="pt-1">
              <h3 className="text-lg font-semibold text-[#101c4d]">{activity.title}</h3>
              <p className="mt-1 text-base leading-6 text-[#7180ad]">{activity.note}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-8 pt-7">
        <button type="button" onClick={onExpand} disabled={expanding} className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-blue-500 py-3.5 text-xl font-medium text-blue-600 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-70">
          {expanding ? <><WaveSpinner /> Loading...</> : detailsVisible ? "See less" : "See details"}
        </button>
      </div>
    </Card>
  );
}
export function ItineraryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [screen, setScreen] = useState<"upload" | "result">("upload");
  const [jobId, setJobId] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [expandedItinerary, setExpandedItinerary] = useState<Itinerary | null>(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [errorOverlayOpen, setErrorOverlayOpen] = useState(false);
  const [uploadKey, setUploadKey] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Reading your notes...");
  const [expanding, setExpanding] = useState(false);
  const [expandError, setExpandError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !jobId || screen !== "upload" || errorOverlayOpen) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/itinerary/job/${jobId}`, { cache: "no-store" });
        const data: JobResponse = await response.json();
        if (cancelled) return;
        if (!response.ok) throw new Error(data.errorMessage ?? "We couldn't check extraction status.");
        if (data.status === "DONE" && data.itinerary) {
          setItinerary(data.itinerary);
          setJobId(null);
          setScreen("result");
        } else if (data.status === "FAILED") {
          setJobId(null);
          setErrorOverlayOpen(true);
        }
      } catch (pollError) {
        if (!cancelled) {
          setJobId(null);
          setErrorOverlayOpen(true);
        }
      }
    };
    void poll();
    const interval = window.setInterval(() => void poll(), AI_CONFIG.client.jobPollIntervalMs);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [errorOverlayOpen, jobId, open, screen]);

  useEffect(() => {
    if (!open || !jobId || screen !== "upload" || errorOverlayOpen) return;
    const messages = ["Reading your notes...", "Putting your itinerary together...", "Almost done..."];
    let index = 0;
    setLoadingMessage(messages[index]);
    const interval = window.setInterval(() => {
      index = (index + 1) % messages.length;
      setLoadingMessage(messages[index]);
    }, AI_CONFIG.client.loadingMessageIntervalMs);
    return () => window.clearInterval(interval);
  }, [errorOverlayOpen, jobId, open, screen]);

  async function expand() {
    if (!itinerary) return;
    if (expandedItinerary) {
      setDetailsVisible((visible) => !visible);
      return;
    }
    setExpanding(true);
    setExpandError(null);
    try {
      const response = await fetch(`/api/itinerary/${itinerary.id}/expand`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "We couldn't expand this itinerary.");
      setExpandedItinerary(data.itinerary);
      setDetailsVisible(true);
    } catch (error) {
      setExpandError(error instanceof Error ? error.message : "We couldn't expand this itinerary.");
    } finally {
      setExpanding(false);
    }
  }

  if (!open) return null;

  const displayedItinerary = detailsVisible && expandedItinerary ? expandedItinerary : itinerary;

  const closeEverything = () => {
    setErrorOverlayOpen(false);
    onClose();
  };
  const retryUpload = () => {
    setErrorOverlayOpen(false);
    setJobId(null);
    setUploadKey((value) => value + 1);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/35 p-4 backdrop-blur-[2px]" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="itinerary-modal-title">
        <div className="my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-[43rem] flex-col overflow-hidden rounded-3xl bg-white" onClick={(event) => event.stopPropagation()}>
          <div className="shrink-0 bg-gradient-to-br from-blue-50 to-white px-7 py-7 sm:px-9">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="itinerary-modal-title" className="text-3xl font-extrabold tracking-tight text-slate-900">{screen === "upload" ? "Extract from notes" : "Here’s your itinerary"}</h2><p className="mt-2 text-base text-slate-500">{screen === "upload" ? "Turn a photo of your travel notes into a structured itinerary." : "Add more detail and a few extra ideas for your trip."}</p></div>
              <button type="button" onClick={onClose} className="rounded-lg px-2 text-4xl leading-none text-blue-900/70 hover:bg-white" aria-label="Close">×</button>
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto px-6 pb-6 pt-4 sm:px-9 sm:pb-7 sm:pt-5">
            {screen === "upload" && <UploadScreen key={uploadKey} loadingMessage={loadingMessage} onStarted={(id) => { setLoadingMessage("Reading your notes..."); setJobId(id); }} />}
            {screen === "result" && displayedItinerary && (
              <div className="w-full max-w-[760px]">
                <ResultScreen itinerary={displayedItinerary} onExpand={expand} expanding={expanding} detailsVisible={detailsVisible} />
                {expandError && <p role="alert" className="relative z-10 mt-4 text-center text-sm font-medium text-red-600">{expandError}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
      {errorOverlayOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-[2px]" onClick={closeEverything} role="dialog" aria-modal="true" aria-labelledby="itinerary-error-title">
          <div className="relative w-full max-w-[26rem] rounded-3xl bg-white px-9 py-9 text-center shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={closeEverything} className="absolute right-5 top-4 rounded-lg px-2 text-4xl leading-none text-blue-900/70 hover:bg-slate-50" aria-label="Close">×</button>
            <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-red-500 text-6xl font-light leading-none text-white" aria-hidden="true">×</div>
            <h2 id="itinerary-error-title" className="mt-8 text-[2.25rem] font-extrabold leading-tight tracking-tight text-slate-900">We couldn't read that image</h2>
            <p className="mt-5 text-[1.2rem] leading-8 text-slate-500">Try again with a clearer photo or better-lit notes.</p>
            <button type="button" onClick={retryUpload} className="mt-9 w-full rounded-2xl bg-gradient-to-b from-blue-500 to-blue-600 py-3.5 text-lg font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-600 hover:to-blue-700">Try again</button>
          </div>
        </div>
      )}
    </>
  );
}
