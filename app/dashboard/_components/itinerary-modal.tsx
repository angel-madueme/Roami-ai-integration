"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";

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

const categoryStyles: Record<ActivityCategory, { symbol: string; className: string; label: string }> = {
  TRANSPORT: { symbol: "✈", className: "bg-blue-50 text-blue-600", label: "Transport" },
  LODGING: { symbol: "▣", className: "bg-violet-50 text-violet-600", label: "Lodging" },
  FOOD: { symbol: "♜", className: "bg-orange-50 text-orange-500", label: "Food" },
  SIGHTSEEING: { symbol: "◉", className: "bg-emerald-50 text-emerald-600", label: "Sightseeing" },
  OTHER: { symbol: "◇", className: "bg-pink-50 text-pink-500", label: "Other" },
};

function friendlyFailure(errorMessage?: string | null): string {
  if (!errorMessage) return "We couldn’t read that image. Try a clearer photo, or make sure your notes are visible and well-lit.";
  if (/provider error|schema validation|missing required|at position|deepseek/i.test(errorMessage)) {
    return "We couldn’t read that image. Try a clearer photo, or make sure your notes are visible and well-lit.";
  }
  return errorMessage;
}

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
  return <span aria-label={style.label} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl font-semibold ${style.className}`}>{style.symbol}</span>;
}

function UploadScreen({ onStarted }: { onStarted: (jobId: string) => void }) {
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
    if (nextFile.size > 10 * 1024 * 1024) {
      setError("That image is larger than 10MB. Please choose a smaller file.");
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
    <Card className="max-w-[820px] px-7 py-10 sm:px-12 sm:py-12">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#101c4d] sm:text-5xl">Turn your notes into a trip</h1>
        <p className="mx-auto mt-3 max-w-[620px] text-xl leading-8 text-[#7180ad]">Upload a photo of your notes, screenshot, or booking —<br className="hidden sm:block" /> we’ll turn it into an itinerary.</p>
      </div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}
        onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`mt-9 flex min-h-[242px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-colors ${dragging ? "border-blue-500 bg-blue-50" : "border-blue-300 bg-[#f7fbff]"}`}
      >
        <span className="text-6xl leading-none text-blue-500" aria-hidden="true">♧</span>
        <p className="mt-4 text-xl font-medium text-[#101c4d]">Drag a photo here or <span className="text-blue-600 underline">click to browse</span></p>
        <p className="mt-1 text-lg text-[#8290b7]">JPG, PNG — up to 10MB</p>
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

      {error && <p role="alert" className="mt-4 text-center text-sm font-medium text-red-600">{error}</p>}
      <button type="button" disabled={submitting || !file} onClick={submit} className="mt-6 flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-b from-blue-500 to-blue-600 py-4 text-xl font-semibold text-white shadow-lg shadow-blue-500/20 transition enabled:hover:from-blue-600 enabled:hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
        {submitting ? <><WaveSpinner /> Extracting…</> : <>Extract notes <Arrow /></>}
      </button>
    </Card>
  );
}

function WaveSpinner() {
  return <span className="wave-spinner" aria-label="Loading"><i /><i /><i /></span>;
}

function ProcessingScreen() {
  return (
    <Card className="flex min-h-[28rem] flex-col items-center justify-center px-8 text-center">
      <WaveSpinner />
      <h1 className="mt-12 text-4xl font-extrabold tracking-tight text-[#101c4d] sm:text-5xl">Reading your notes…</h1>
      <p className="mt-4 max-w-[500px] text-xl leading-8 text-[#7180ad]">We’re extracting the details and putting<br className="hidden sm:block" /> your itinerary together.</p>
    </Card>
  );
}

function ResultScreen({ itinerary, onExpand, expanding }: { itinerary: Itinerary; onExpand: () => void; expanding: boolean }) {
  return (
    <Card className="max-w-[760px] px-8 py-10 sm:px-10">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-[#101c4d]">Here’s your itinerary</h1>
        <p className="mt-3 text-xl text-[#7180ad]">We found the following details from your notes.</p>
      </div>
      {itinerary.unsplashImageUrl && (
        <div className="relative mt-7 overflow-hidden rounded-2xl">
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
      <div className="mt-8 border-t border-slate-200 pt-7">
        <button type="button" onClick={onExpand} disabled={expanding} className="w-full rounded-2xl border-2 border-blue-500 py-3.5 text-xl font-medium text-blue-600 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-70">
          {expanding ? "Expanding…" : "Expand this itinerary"}
        </button>
      </div>
    </Card>
  );
}

function FailedScreen({ message, onTryAgain }: { message: string; onTryAgain: () => void }) {
  return (
    <Card className="flex min-h-[600px] max-w-[850px] flex-col items-center justify-center px-8 text-center">
      <div className="flex h-32 w-32 items-center justify-center rounded-full bg-red-500 text-7xl font-light text-white" aria-hidden="true">×</div>
      <h1 className="mt-12 text-4xl font-extrabold tracking-tight text-[#101c4d] sm:text-5xl">We couldn’t read that image</h1>
      <p className="mt-5 max-w-[600px] text-xl leading-8 text-[#7180ad]">{message}</p>
      <button type="button" onClick={onTryAgain} className="mt-10 w-full max-w-[620px] rounded-2xl bg-gradient-to-b from-blue-500 to-blue-600 py-4 text-xl font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:from-blue-600 hover:to-blue-700">Try again</button>
    </Card>
  );
}

export function ItineraryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [screen, setScreen] = useState<"upload" | "processing" | "result" | "failed">("upload");
  const [jobId, setJobId] = useState<string | null>(null);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);
  const [expanding, setExpanding] = useState(false);
  const [expandError, setExpandError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || screen !== "processing" || !jobId) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const response = await fetch(`/api/itinerary/job/${jobId}`, { cache: "no-store" });
        const data: JobResponse = await response.json();
        if (cancelled) return;
        if (!response.ok) throw new Error(data.errorMessage ?? "We couldn’t check extraction status.");
        if (data.status === "DONE" && data.itinerary) {
          setItinerary(data.itinerary);
          setScreen("result");
        } else if (data.status === "FAILED") {
          setFailureMessage(friendlyFailure(data.errorMessage));
          setScreen("failed");
        }
      } catch (pollError) {
        if (!cancelled) {
          setFailureMessage(pollError instanceof Error ? pollError.message : "We couldn’t check extraction status.");
          setScreen("failed");
        }
      }
    };
    void poll();
    const interval = window.setInterval(() => void poll(), 2000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [jobId, open, screen]);

  async function expand() {
    if (!itinerary) return;
    setExpanding(true);
    setExpandError(null);
    try {
      const response = await fetch(`/api/itinerary/${itinerary.id}/expand`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "We couldn’t expand this itinerary.");
      setItinerary(data.itinerary);
    } catch (error) {
      setExpandError(error instanceof Error ? error.message : "We couldn’t expand this itinerary.");
    } finally {
      setExpanding(false);
    }
  }

  if (!open) return null;

  const modalCopy = screen === "upload"
    ? { title: "Extract from notes", subtitle: "Turn a photo of your travel notes into a structured itinerary." }
    : screen === "processing"
      ? { title: "Reading your notes", subtitle: "We’re extracting the details and putting your itinerary together." }
      : screen === "failed"
        ? { title: "We couldn’t read that image", subtitle: "Try again with a clearer photo or better-lit notes." }
        : { title: "Here’s your itinerary", subtitle: "Review your extracted trip details and add more detail when ready." };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-slate-950/35 p-4 backdrop-blur-[2px]" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="itinerary-modal-title">
      <div className="my-4 flex max-h-[calc(100vh-2rem)] w-full max-w-[43rem] flex-col overflow-hidden rounded-3xl bg-white" onClick={(event) => event.stopPropagation()}>
        <div className="shrink-0 bg-gradient-to-br from-blue-50 to-white px-7 py-7 sm:px-9">
          <div className="flex items-start justify-between gap-4">
            <div><h2 id="itinerary-modal-title" className="text-3xl font-extrabold tracking-tight text-slate-900">{modalCopy.title}</h2><p className="mt-2 text-base text-slate-500">{modalCopy.subtitle}</p></div>
            <button type="button" onClick={onClose} className="rounded-lg px-2 text-4xl leading-none text-blue-900/70 hover:bg-white" aria-label="Close">×</button>
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto px-6 py-6 sm:px-9 sm:py-7">
      {screen === "upload" && <UploadScreen onStarted={(id) => { setJobId(id); setScreen("processing"); }} />}
      {screen === "processing" && <ProcessingScreen />}
      {screen === "failed" && <FailedScreen message={failureMessage ?? "We couldn’t read that image. Try again with a clearer photo."} onTryAgain={() => { setJobId(null); setFailureMessage(null); setScreen("upload"); }} />}
      {screen === "result" && itinerary && (
        <div className="w-full max-w-[760px]">
          <ResultScreen itinerary={itinerary} onExpand={expand} expanding={expanding} />
          {expandError && <p role="alert" className="relative z-10 mt-4 text-center text-sm font-medium text-red-600">{expandError}</p>}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
