"use client";

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  leftHint?: string;
  rightHint?: string;
}

export default function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
  leftHint,
  rightHint,
}: SliderProps) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 13.5, color: "var(--tic-primary-dark)", fontWeight: 700 }}>
          {value}/{max}
        </span>
      </div>
      <input
        type="range"
        className="tic-slider"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
      />
      {(leftHint || rightHint) && (
        <div className="tic-slider-label">
          <span>{leftHint}</span>
          <span>{rightHint}</span>
        </div>
      )}
    </div>
  );
}
