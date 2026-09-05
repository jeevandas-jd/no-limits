"use client";

/**
 * NeuralField — bioluminescent synaptic flow field
 *
 * Palette mirrors the NeuroTrace design system:
 *   --background  #080a0e  deep near-black
 *   --accent-cyan #00e5ff  electric cyan (dominant signal traces)
 *   --accent-amber #f59e0b warm amber (activation heat)
 *   --accent-coral #ff6b6b excitatory burst
 *
 * Particles behave as action potentials travelling along a divergence-free
 * curl-noise field biased by two drifting focal centres — large vortex
 * structures that form, dissolve, and migrate.
 */

import { useRef, useEffect, useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const PARTICLE_COUNT = 1100;
const BG             = "rgb(8,10,14)";      // matches --background #080a0e
const FADE_ALPHA     = 0.032;               // trail persistence
const GRAIN_ALPHA    = 0.015;

// Particle colour classes — [r, g, b, maxAlpha, lineWidth]
const CLASSES = [
  // Electric cyan — dominant signal channel (50 %)
  { r:   0, g: 205, b: 230, a: 0.09, w: 0.7, weight: 50 },
  // Bright cyan — accent pulses (20 %)
  { r:   0, g: 229, b: 255, a: 0.22, w: 1.1, weight: 20 },
  // Amber — neural activation heat (20 %)
  { r: 245, g: 158, b:  11, a: 0.12, w: 0.75, weight: 20 },
  // Coral / excitatory burst (10 %)
  { r: 220, g:  82, b:  82, a: 0.10, w: 0.65, weight: 10 },
];

// Build a weighted draw table
const DRAW_TABLE = CLASSES.flatMap((c, i) => Array(c.weight).fill(i));

// ─── Scalar potential → curl field ───────────────────────────────────────────

const S = 0.0018;

function potential(x, y, t) {
  return (
    Math.sin(x * S * 2.3 + t * 0.19) * Math.cos(y * S * 1.6 + t * 0.14) +
    Math.cos(x * S * 1.1 - y * S * 2.8 + t * 0.11) * 0.6 +
    Math.sin((x + y) * S * 1.4 - t * 0.09) * Math.cos((x - y) * S * 0.8 + t * 0.07) * 0.45
  );
}

const EPS = 0.8;
function curlAngle(x, y, t, cx1, cy1, cx2, cy2) {
  const dPdy = (potential(x, y + EPS, t) - potential(x, y - EPS, t)) / (2 * EPS);
  const dPdx = (potential(x + EPS, y, t) - potential(x - EPS, y, t)) / (2 * EPS);
  let vx = dPdy;
  let vy = -dPdx;

  const addOrbital = (cx, cy, str) => {
    const dx = x - cx, dy = y - cy;
    const r2 = dx * dx + dy * dy + 8000;
    const s  = str / r2;
    vx += -dy * s;
    vy +=  dx * s;
  };
  addOrbital(cx1, cy1, 2_200_000);
  addOrbital(cx2, cy2, 1_600_000);

  return Math.atan2(vy, vx);
}

// ─── Grain texture ────────────────────────────────────────────────────────────
function buildGrain(w, h) {
  const off  = document.createElement("canvas");
  off.width  = w;
  off.height = h;
  const ctx  = off.getContext("2d");
  const img  = ctx.createImageData(w, h);
  const d    = img.data;
  for (let i = 0; i < d.length; i += 4) {
    // On a dark bg only additive (bright) dots are visible
    d[i] = d[i+1] = d[i+2] = 255;
    d[i+3] = Math.random() < 0.08 ? Math.floor(Math.random() * 40 + 10) : 0;
  }
  ctx.putImageData(img, 0, 0);
  return off;
}

// ─── Particle factory ─────────────────────────────────────────────────────────
function spawnParticle(w, h) {
  const idx = DRAW_TABLE[Math.floor(Math.random() * DRAW_TABLE.length)];
  const cls = CLASSES[idx];
  return {
    x:      Math.random() * w,
    y:      Math.random() * h,
    age:    Math.random() * 200,
    maxAge: 200 + Math.random() * 300,
    speed:  cls.a > 0.18 ? 0.8 + Math.random() * 1.6 : 0.3 + Math.random() * 1.1,
    ...cls,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function NeuralField({ mouseRadius = 160 }) {
  const canvasRef = useRef(null);
  const mouseRef  = useRef({ x: -9999, y: -9999 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;

    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d", { alpha: false });

    let raf;
    let t           = 0;
    let grainCanvas = null;

    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    function resize() {
      canvas.width  = W();
      canvas.height = H();
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W(), H());
      grainCanvas = buildGrain(W(), H());
    }
    resize();
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: PARTICLE_COUNT }, () => spawnParticle(W(), H()));

    // Pulse rings — electric cyan with glow
    const pulses    = [];
    let nextPulse   = performance.now() + 1200 + Math.random() * 2500;

    function frame(ts) {
      t += 0.005;

      const w = W(), h = H();

      // Drifting focal centres
      const cx1 = w * (0.5 + 0.30 * Math.sin(t * 0.10));
      const cy1 = h * (0.5 + 0.28 * Math.cos(t * 0.08));
      const cx2 = w * (0.5 + 0.32 * Math.cos(t * 0.07));
      const cy2 = h * (0.5 + 0.22 * Math.sin(t * 0.12));

      // Fade trails with dark bg colour
      ctx.fillStyle = `rgba(8,10,14,${FADE_ALPHA})`;
      ctx.fillRect(0, 0, w, h);

      // ── Pulse rings ────────────────────────────────────────────────────────
      if (ts > nextPulse) {
        pulses.push({
          x:    w * (0.1 + Math.random() * 0.8),
          y:    h * (0.1 + Math.random() * 0.8),
          r:    0,
          maxR: Math.min(w, h) * (0.18 + Math.random() * 0.40),
          // alternate between cyan and amber rings
          isCyan: Math.random() > 0.35,
        });
        nextPulse = ts + 2200 + Math.random() * 4200;
      }

      for (let i = pulses.length - 1; i >= 0; i--) {
        const p    = pulses[i];
        p.r       += 1.4;
        const prog = p.r / p.maxR;
        const a    = (1 - prog) * (p.isCyan ? 0.08 : 0.07);
        if (a > 0.002) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.strokeStyle = p.isCyan
            ? `rgba(0,229,255,${a})`
            : `rgba(245,158,11,${a})`;
          ctx.lineWidth   = 0.9 - prog * 0.5;
          ctx.stroke();
        }
        if (p.r > p.maxR) pulses.splice(i, 1);
      }

      // ── Particles ──────────────────────────────────────────────────────────
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (const p of particles) {
        let angle = curlAngle(p.x, p.y, t, cx1, cy1, cx2, cy2);

        // Mouse vortex — swirls nearby particles
        const dx   = p.x - mx;
        const dy   = p.y - my;
        const dist = Math.hypot(dx, dy);
        if (dist < mouseRadius) {
          const strength    = Math.pow(1 - dist / mouseRadius, 2);
          const vortexAngle = Math.atan2(dy, dx) + Math.PI * 0.5;
          angle += strength * (vortexAngle - angle) * 3.2;
        }

        const nx = p.x + Math.cos(angle) * p.speed;
        const ny = p.y + Math.sin(angle) * p.speed;

        // Lifetime envelope — fade in / fade out
        const lf  = p.age / p.maxAge;
        const env = lf < 0.06 ? lf / 0.06 : lf > 0.78 ? (1 - lf) / 0.22 : 1;
        const alpha = env * p.a;

        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(nx, ny);
        ctx.strokeStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
        ctx.lineWidth   = p.w;
        ctx.stroke();

        p.x = nx;  p.y = ny;  p.age++;

        if (p.age > p.maxAge || nx < -4 || nx > w + 4 || ny < -4 || ny > h + 4) {
          Object.assign(p, spawnParticle(w, h));
        }
      }

      // ── Grain overlay ──────────────────────────────────────────────────────
      if (grainCanvas) {
        ctx.globalAlpha = GRAIN_ALPHA;
        ctx.drawImage(grainCanvas, 0, 0);
        ctx.globalAlpha = 1;
      }

      raf = requestAnimationFrame(frame);
    }

    raf = requestAnimationFrame(frame);

    const onMove  = (e) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    const onLeave = ()  => { mouseRef.current = { x: -9999, y: -9999 }; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [mounted, mouseRadius]);

  if (!mounted) {
    return <div style={{ width: "100%", height: "100%", background: BG }} />;
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100%", display: "block" }}
    />
  );
}
