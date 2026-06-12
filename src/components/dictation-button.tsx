"use client";

import { cn } from "@/lib/utils";
import { Mic, MicOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// Minimal type surface for webkitSpeechRecognition / SpeechRecognition.
// Not in the standard DOM lib; we narrow via feature detection.
type RecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
};
type RecognitionEvent = {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isDictationSupported(): boolean {
  return getSpeechRecognitionCtor() !== null;
}

type Props = {
  // Called with the full text including any prior value passed in via
  // `currentValue`. The parent just sets state to this string.
  onTranscript: (next: string) => void;
  currentValue: string;
  className?: string;
  // Optional aria label; defaults sensibly.
  label?: string;
};

export function DictationButton({
  onTranscript,
  currentValue,
  className,
  label,
}: Props) {
  const [recording, setRecording] = useState(false);
  const [supported, setSupported] = useState(false);
  const recognitionRef = useRef<Recognition | null>(null);
  // Capture the value at the moment we start recording — we append the
  // dictation to it, not to whatever the user might have typed since.
  const baseValueRef = useRef("");

  useEffect(() => {
    setSupported(isDictationSupported());
  }, []);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {
        // already stopped
      }
    }
    setRecording(false);
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";
    baseValueRef.current = currentValue;
    rec.onresult = (e: RecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (!r) continue;
        const text = r[0].transcript;
        if (r.isFinal) final += text;
        else interim += text;
      }
      const base = baseValueRef.current;
      // Append finalized speech to the base value; show interim as a
      // live preview while the user is still speaking.
      if (final) baseValueRef.current = appendText(base, final);
      const preview = interim
        ? appendText(baseValueRef.current, interim)
        : baseValueRef.current;
      onTranscript(preview);
    };
    rec.onerror = (e) => {
      // Permission denied or no-speech are common; just stop the UI.
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        console.error("Dictation: microphone permission denied.");
      }
      setRecording(false);
    };
    rec.onend = () => {
      setRecording(false);
    };
    recognitionRef.current = rec;
    try {
      rec.start();
      setRecording(true);
    } catch {
      setRecording(false);
    }
  }, [currentValue, onTranscript]);

  useEffect(() => {
    return () => {
      // Clean up on unmount.
      const rec = recognitionRef.current;
      if (rec) {
        try {
          rec.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={recording ? stop : start}
      aria-label={
        label ?? (recording ? "Stop dictation" : "Start voice dictation")
      }
      title={label ?? (recording ? "Stop dictation" : "Start voice dictation")}
      className={cn(
        "absolute top-1.5 right-1.5 z-10 inline-flex size-7 items-center justify-center rounded-md border bg-background/85 text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground",
        recording
          ? "animate-pulse border-rose-300 bg-rose-50 text-rose-600 hover:text-rose-700"
          : "border-input",
        className,
      )}
    >
      {recording ? (
        <MicOff className="size-3.5" />
      ) : (
        <Mic className="size-3.5" />
      )}
    </button>
  );
}

function appendText(base: string, addition: string): string {
  const cleanBase = base.replace(/\s+$/, "");
  const cleanAdd = addition.replace(/^\s+/, "");
  if (!cleanBase) return cleanAdd;
  // If the base already ends with sentence punctuation, just join with a space.
  // Otherwise also join with a space.
  return `${cleanBase} ${cleanAdd}`;
}
