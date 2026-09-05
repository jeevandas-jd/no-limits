"use client";

import { useEffect, useState } from "react";
import Slider from "@/components/ticease/Slider";
import {
  addEntry,
  getTodayCheckIn,
  upsertTodayCheckIn,
  type Situation,
  type TicType,
} from "@/lib/ticease/storage";

const TIC_TYPES: { value: TicType; label: string }[] = [
  { value: "movement", label: "Movement" },
  { value: "sound", label: "Sound" },
  { value: "head_neck", label: "Head/neck" },
  { value: "face_eyes", label: "Face/eyes" },
  { value: "body", label: "Body" },
  { value: "other", label: "Other" },
];

const SITUATIONS: { value: Situation; label: string }[] = [
  { value: "home", label: "At home" },
  { value: "school", label: "School" },
  { value: "work", label: "Work" },
  { value: "social", label: "Social situation" },
  { value: "public", label: "Public place" },
  { value: "exercising", label: "Exercising" },
  { value: "screen", label: "Using phone/computer" },
  { value: "before_sleep", label: "Before sleep" },
  { value: "other", label: "Other" },
];

type Tab = "tic" | "urge" | "stress" | "situation";

export default function TrackPage() {
  const [tab, setTab] = useState<Tab>("tic");

  const [ticType, setTicType] = useState<TicType>("movement");
  const [customLabel, setCustomLabel] = useState("");
  const [urgeIntensity, setUrgeIntensity] = useState(3);
  const [stress, setStress] = useState(3);
  const [situation, setSituation] = useState<Situation>("home");
  const [impact, setImpact] = useState(3);

  const [sleepHours, setSleepHours] = useState<string>("");
  const [sleepLoggedToday, setSleepLoggedToday] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const today = getTodayCheckIn();
    setSleepLoggedToday(typeof today?.sleepHours === "number");
    if (today?.sleepHours !== undefined) setSleepHours(String(today.sleepHours));
  }, []);

  function submit() {
    addEntry({ ticType, customLabel: customLabel || undefined, urgeIntensity, stress, situation, impact });
    upsertTodayCheckIn({ stress, ticImpact: impact });
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  function saveSleep() {
    const hours = parseFloat(sleepHours);
    if (!Number.isNaN(hours)) {
      upsertTodayCheckIn({ sleepHours: hours });
      setSleepLoggedToday(true);
    }
  }

  return (
    <>
      <h1 className="tic-page-title">Track</h1>
      <p className="tic-page-sub">Record moments that feel important or useful to understand.</p>

      {!sleepLoggedToday && (
        <div className="tic-card">
          <div className="tic-section-label">SLEEP — ONCE A DAY</div>
          <p style={{ fontSize: 14, marginBottom: 10 }}>How long did you sleep last night?</p>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="tic-input"
              type="number"
              step="0.5"
              placeholder="7.5"
              value={sleepHours}
              onChange={(e) => setSleepHours(e.target.value)}
              style={{ maxWidth: 100 }}
            />
            <button className="tic-btn tic-btn-primary" style={{ width: "auto", padding: "10px 16px" }} onClick={saveSleep}>
              Save
            </button>
          </div>
        </div>
      )}

      <div className="tic-tab-row">
        {(["tic", "urge", "stress", "situation"] as Tab[]).map((t) => (
          <button key={t} className="tic-tab" data-active={tab === t} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="tic-card">
        {tab === "tic" && (
          <>
            <div className="tic-section-label">TIC TYPE</div>
            <div className="tic-chip-row" style={{ marginBottom: 14 }}>
              {TIC_TYPES.map((t) => (
                <button
                  key={t.value}
                  className="tic-chip"
                  data-selected={ticType === t.value}
                  onClick={() => setTicType(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {ticType === "other" && (
              <input
                className="tic-input"
                placeholder="Describe it (custom label)"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
              />
            )}
          </>
        )}

        {tab === "urge" && (
          <Slider label="Urge intensity" value={urgeIntensity} onChange={setUrgeIntensity} leftHint="No urge" rightHint="Very strong" />
        )}

        {tab === "stress" && (
          <Slider label="How stressed do you feel?" value={stress} onChange={setStress} leftHint="Calm" rightHint="Very stressed" />
        )}

        {tab === "situation" && (
          <div className="tic-chip-row">
            {SITUATIONS.map((s) => (
              <button
                key={s.value}
                className="tic-chip"
                data-selected={situation === s.value}
                onClick={() => setSituation(s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="tic-card">
        <Slider
          label="How much did this interfere with what you wanted to do?"
          value={impact}
          onChange={setImpact}
          leftHint="Not at all"
          rightHint="A great deal"
        />
        <button className="tic-btn tic-btn-primary" onClick={submit}>
          {saved ? "Saved ✓" : "Save entry"}
        </button>
      </div>
    </>
  );
}
