// src/hooks/useAudioRecorder.ts
"use client";

import { useState, useRef, useCallback } from "react";

export type WordTimestamp = { word: string; start?: number; end?: number };

export type TranscriptResult = {
  transcript: string;
  pauseMap?: number[];
  wordTimestamps?: WordTimestamp[];
  duration?: number;
};

const AUTO_STOP_SILENCE_MS = 2200;
const SILENCE_THRESHOLD    = 0.016;
const MIN_RECORD_MS        = 1800;

export function useAudioRecorder(
  onTranscriptReady: (result: TranscriptResult) => void,
) {
  const [isRecording,     setIsRecording]     = useState(false);
  const [isTranscribing,  setIsTranscribing]  = useState(false);
  const [recordSeconds,   setRecordSeconds]   = useState(0);
  const [audioLevel,      setAudioLevel]      = useState(0);
  const [liveTranscript,  setLiveTranscript]  = useState("");
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null);

  const mediaRecorderRef    = useRef<MediaRecorder | null>(null);
  const audioChunksRef      = useRef<Blob[]>([]);
  const audioContextRef     = useRef<AudioContext | null>(null);
  const analyserRef         = useRef<AnalyserNode | null>(null);
  const meterRafRef         = useRef<number | null>(null);
  const timerIntervalRef    = useRef<number | null>(null);
  const silenceStartRef     = useRef<number | null>(null);
  const recordStartRef      = useRef<number>(0);
  const finalTranscriptRef  = useRef<string>(""); // NEW — persists across recog restarts, readable in onstop
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const speechRecogRef      = useRef<any>(null);
  const onTranscriptRef     = useRef(onTranscriptReady);
  onTranscriptRef.current   = onTranscriptReady;

  const stopCleanup = useCallback(() => {
    setIsRecording(false);
    setLiveTranscript("");
    setSilenceCountdown(null);
    silenceStartRef.current = null;
    if (timerIntervalRef.current)  { window.clearInterval(timerIntervalRef.current);       timerIntervalRef.current = null; }
    if (meterRafRef.current)       { window.cancelAnimationFrame(meterRafRef.current);     meterRafRef.current = null; }
    if (audioContextRef.current)   { audioContextRef.current.close().catch(() => undefined); audioContextRef.current = null; }
    if (speechRecogRef.current)    { speechRecogRef.current.stop(); speechRecogRef.current = null; }
    analyserRef.current = null;
    setRecordSeconds(0);
    setAudioLevel(0);
  }, []);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    stopCleanup();
  }, [stopCleanup]);

  const toggle = useCallback(async () => {
    if (isRecording) { stop(); return; }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recordStartRef.current = Date.now();
      finalTranscriptRef.current = ""; // reset for this recording

      // ── Web Speech API — live + final transcript ─────────────────────
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRec = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
      if (SpeechRec) {
        let shouldRestart = true;

        const startRecog = () => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const recog: any = new SpeechRec();
          recog.continuous     = true;
          recog.interimResults = true;
          recog.lang           = "en-US";
          recog.maxAlternatives = 1;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recog.onresult = (e: any) => {
            let interim = "";
            for (let i = e.resultIndex; i < e.results.length; i++) {
              if (e.results[i].isFinal) {
                finalTranscriptRef.current += e.results[i][0].transcript + " ";
              } else {
                interim = e.results[i][0].transcript;
              }
            }
            setLiveTranscript((finalTranscriptRef.current + interim).trim());
          };

          recog.onend = () => {
            if (shouldRestart) {
              try { recog.start(); } catch (_) {}
            }
          };

          recog.onerror = (e: any) => {
            if (e.error === "no-speech" || e.error === "aborted") return;
            shouldRestart = false;
          };

          try { recog.start(); } catch (_) {}
          speechRecogRef.current = { stop: () => { shouldRestart = false; try { recog.stop(); } catch (_) {} } };
        };

        startRecog();
      }

      // ── Audio context: level meter + silence detection (unchanged) ────
      const audioContext = new AudioContext();
      const source       = audioContext.createMediaStreamSource(stream);
      const analyser     = audioContext.createAnalyser();
      analyser.fftSize   = 2048;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current     = analyser;

      const updateMeter = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteTimeDomainData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i++) {
          const v = data[i] / 128 - 1;
          sum += v * v;
        }
        const level = Math.min(1, Math.sqrt(sum / data.length) * 1.5);
        setAudioLevel(level);

        const elapsed = Date.now() - recordStartRef.current;
        if (elapsed > MIN_RECORD_MS) {
          if (level < SILENCE_THRESHOLD) {
            if (!silenceStartRef.current) silenceStartRef.current = Date.now();
            const silenceMs  = Date.now() - silenceStartRef.current;
            const remaining  = Math.max(0, AUTO_STOP_SILENCE_MS - silenceMs);
            setSilenceCountdown(Math.ceil(remaining / 1000));

            if (silenceMs >= AUTO_STOP_SILENCE_MS) {
              if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                mediaRecorderRef.current.stop();
              }
              return;
            }
          } else {
            silenceStartRef.current = null;
            setSilenceCountdown(null);
          }
        }

        meterRafRef.current = window.requestAnimationFrame(updateMeter);
      };
      meterRafRef.current = window.requestAnimationFrame(updateMeter);

      mediaRecorder.ondataavailable = (e) => { audioChunksRef.current.push(e.data); };

      // ── onstop: finalize transcript locally, no Whisper call ──────────
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsTranscribing(true);
        try {
          const transcript  = finalTranscriptRef.current.trim();
          const durationSec = (Date.now() - recordStartRef.current) / 1000;

          // Fake evenly-spaced word timestamps — no real per-word alignment without Whisper,
          // but this keeps WaveformPanel rendering something reasonable for the demo.
          const words = transcript.split(/\s+/).filter(Boolean);
          const wordTimestamps: WordTimestamp[] = words.map((word, i) => ({
            word,
            start: words.length ? (i / words.length) * durationSec : 0,
            end:   words.length ? ((i + 1) / words.length) * durationSec : 0,
          }));

          onTranscriptRef.current({ transcript, wordTimestamps, duration: durationSec });
        } catch (err) {
          console.error("Transcript finalize error:", err);
        } finally {
          setIsTranscribing(false);
          stopCleanup();
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      timerIntervalRef.current = window.setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  }, [isRecording, stop, stopCleanup]);

  return {
    isRecording, isTranscribing, recordSeconds, audioLevel,
    liveTranscript, silenceCountdown,
    toggle, stop,
  };
}
