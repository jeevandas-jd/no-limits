"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

// ─── Types & constants ────────────────────────────────────────────────

export type RegionActivation = {
  region: string;
  mni: [number, number, number];
  activation: number; // 0–1, driven by agent overall score
  agent: string;
};

export const DEFAULT_REGIONS: RegionActivation[] = [
  { region: "Broca's area", mni: [-44, 20, 8], activation: 0.72, agent: "Lexical" },
  { region: "Wernicke's area", mni: [-54, -40, 14], activation: 0.58, agent: "Semantic" },
  { region: "DLPFC", mni: [-46, 20, 32], activation: 0.83, agent: "Syntax" },
  { region: "SMA", mni: [0, -4, 60], activation: 0.44, agent: "Prosody" },
  { region: "Amygdala", mni: [-24, -4, -22], activation: 0.31, agent: "Affective" },
];

type BrainViewerProps = {
  activations?: RegionActivation[];
  onRegionClick?: (r: RegionActivation) => void;
  activeAgentName?: string;
  showLabels?: boolean;
};

// ─── Region mesh config (maps region name → OBJ file + color) ────────

const REGION_MESH_CONFIG: Record<string, { file: string; color: string }> = {
  "Broca's area":    { file: "/region_broca.obj",    color: "#D85A30" },
  "Wernicke's area": { file: "/region_wernicke.obj",  color: "#EF9F27" },
  "DLPFC":           { file: "/region_dlpfc.obj",     color: "#1D9E75" },
  "SMA":             { file: "/region_sma.obj",       color: "#EF9F27" },
  "Amygdala":        { file: "/region_amygdala.obj",  color: "#B4B2A9" },
};

// ─── Anatomical relay nodes — 32 real MNI structures (mm × 0.01 → scene) ──
const S = 0.01;
const ANATOMICAL_NODES: Record<string, THREE.Vector3> = {
  // Sub-cortical relay hubs
  Thalamus:              new THREE.Vector3(  0*S, -12*S,   0*S),
  "Thalamus (pulvinar)": new THREE.Vector3( -8*S, -26*S,   6*S),
  Caudate:               new THREE.Vector3(-14*S,  16*S,   8*S),
  Putamen:               new THREE.Vector3(-28*S,  -2*S,   2*S),
  "Globus pallidus":     new THREE.Vector3(-22*S,  -4*S,  -2*S),
  "Subthalamic nucleus": new THREE.Vector3(-12*S, -14*S,  -6*S),
  "Nucleus accumbens":   new THREE.Vector3(-10*S,  10*S,  -6*S),
  Claustrum:             new THREE.Vector3(-30*S,   6*S,   4*S),
  // Limbic
  Hippocampus:           new THREE.Vector3(-28*S, -18*S, -14*S),
  Amygdala:              new THREE.Vector3(-24*S,  -4*S, -22*S),
  "Parahippocampal":     new THREE.Vector3(-24*S, -30*S, -18*S),
  Entorhinal:            new THREE.Vector3(-22*S, -14*S, -24*S),
  "Temporal pole":       new THREE.Vector3(-38*S,  14*S, -28*S),
  // Frontal
  Insula:                new THREE.Vector3(-38*S,  -6*S,   4*S),
  ACC:                   new THREE.Vector3( -4*S,  36*S,  14*S),
  "Orbitofrontal":       new THREE.Vector3(-24*S,  36*S, -10*S),
  "vlPFC":               new THREE.Vector3(-44*S,  30*S,   2*S),
  "Mid. frontal":        new THREE.Vector3(-44*S,  12*S,  36*S),
  "Sup. frontal":        new THREE.Vector3(-22*S,  28*S,  44*S),
  "Cingulate motor":     new THREE.Vector3( -8*S,  -6*S,  52*S),
  // Parietal
  "Inf. parietal":       new THREE.Vector3(-52*S, -42*S,  22*S),
  "Parietal operculum":  new THREE.Vector3(-56*S, -22*S,  16*S),
  "Posterior parietal":  new THREE.Vector3(-28*S, -60*S,  48*S),
  Precuneus:             new THREE.Vector3( -8*S, -58*S,  48*S),
  "Post. cingulate":     new THREE.Vector3( -4*S, -28*S,  40*S),
  "Angular gyrus":       new THREE.Vector3(-44*S, -62*S,  32*S),
  "Supramarginal":       new THREE.Vector3(-58*S, -38*S,  34*S),
  // Temporal
  "Sup. temporal":       new THREE.Vector3(-56*S, -14*S,   4*S),
  "Mid. temporal":       new THREE.Vector3(-58*S, -28*S, -10*S),
  "Inf. temporal":       new THREE.Vector3(-52*S, -56*S,  -8*S),
  "Planum temporale":    new THREE.Vector3(-56*S, -28*S,  14*S),
  "Heschl's gyrus":      new THREE.Vector3(-48*S, -22*S,   8*S),
  "Fusiform gyrus":      new THREE.Vector3(-36*S, -52*S, -18*S),
  // Motor
  "Primary motor":       new THREE.Vector3(-40*S, -14*S,  56*S),
  "Primary sensory":     new THREE.Vector3(-44*S, -20*S,  52*S),
  // Cerebellum & brainstem
  "Cerebellum VI":       new THREE.Vector3(-28*S, -56*S, -26*S),
  "Cerebellar vermis":   new THREE.Vector3(  0*S, -60*S, -18*S),
  Brainstem:             new THREE.Vector3(  0*S, -28*S, -30*S),
  // Basal ganglia network
  "Basal ganglia":       new THREE.Vector3(-20*S,   4*S,   0*S),
};

// Branch targets — 8–12 per region, all scientifically motivated
const REGION_BRANCHES: Record<string, string[]> = {
  "Broca's area": [
    "Insula", "Caudate", "Thalamus", "Putamen", "Claustrum",
    "vlPFC", "Mid. frontal", "Sup. frontal", "Primary motor",
    "Cingulate motor", "Nucleus accumbens", "Parietal operculum",
  ],
  "Wernicke's area": [
    "Sup. temporal", "Angular gyrus", "Thalamus", "Hippocampus",
    "Planum temporale", "Heschl's gyrus", "Mid. temporal", "Inf. temporal",
    "Parahippocampal", "Fusiform gyrus", "Parietal operculum", "Supramarginal",
    "Thalamus (pulvinar)",
  ],
  "DLPFC": [
    "Caudate", "ACC", "Thalamus", "Basal ganglia", "Nucleus accumbens",
    "Orbitofrontal", "Posterior parietal", "Precuneus", "Mid. frontal",
    "Sup. frontal", "Post. cingulate", "Cingulate motor", "Subthalamic nucleus",
  ],
  "SMA": [
    "Putamen", "Thalamus", "Basal ganglia", "Primary motor", "Primary sensory",
    "Cingulate motor", "Globus pallidus", "Subthalamic nucleus",
    "Cerebellum VI", "Cerebellar vermis", "Brainstem", "Caudate",
  ],
  "Amygdala": [
    "Thalamus", "ACC", "Insula", "Hippocampus", "Parahippocampal",
    "Temporal pole", "Orbitofrontal", "Nucleus accumbens", "Entorhinal",
    "Thalamus (pulvinar)", "vlPFC", "Mid. temporal", "Brainstem",
  ],
};

// ─── Neural connectivity map (science-backed white-matter tracts) ─────
// Sources: arcuate fasciculus, fronto-parietal networks, SLF, uncinate, cingulum

const NEURAL_CONNECTIONS: Record<string, Array<{ target: string; tract: string }>> = {
  "Broca's area": [
    { target: "Wernicke's area", tract: "Arcuate fasciculus — primary language loop" },
    { target: "DLPFC",           tract: "Inferior fronto-occipital fasciculus" },
    { target: "SMA",             tract: "Cortico-cortical premotor pathway" },
  ],
  "Wernicke's area": [
    { target: "Broca's area",    tract: "Arcuate fasciculus — dorsal stream" },
    { target: "Amygdala",        tract: "Uncinate fasciculus — affective language" },
    { target: "DLPFC",           tract: "Superior longitudinal fasciculus II" },
  ],
  "DLPFC": [
    { target: "Broca's area",    tract: "Inferior fronto-occipital fasciculus" },
    { target: "SMA",             tract: "Supplementary-prefrontal loop" },
    { target: "Amygdala",        tract: "Cingulum — cognitive-emotional regulation" },
  ],
  "SMA": [
    { target: "DLPFC",           tract: "Supplementary-prefrontal loop" },
    { target: "Broca's area",    tract: "Speech motor initiation pathway" },
  ],
  "Amygdala": [
    { target: "Wernicke's area", tract: "Uncinate fasciculus — affective language" },
    { target: "DLPFC",           tract: "Cingulum — emotion regulation" },
  ],
};

// ─── Science descriptions ─────────────────────────────────────────────

const REGION_DESCRIPTIONS: Record<string, string> = {
  "Broca's area":
    "Primary language production center (BA44/45). Damage causes expressive aphasia. Activated during phonological processing, lexical retrieval difficulty, and speech production planning.",
  "Wernicke's area":
    "Language comprehension hub (BA22). Damage causes fluent but meaningless speech. Activated by semantic processing, coherence maintenance, and auditory word recognition.",
  DLPFC:
    "Dorsolateral prefrontal cortex (BA9/46). Executive control center for working memory. Activated by complex syntactic structures requiring high cognitive load and rule-based processing.",
  SMA:
    "Supplementary motor area (BA6). Speech motor planning and timing center. Activated by prosodic regulation, speech rate control, pause management, and motor sequencing.",
  Amygdala:
    "Deep temporal emotional salience detector. Activated by affective language processing, arousal modulation, and certainty/uncertainty expression in speech.",
};

// ─── Helpers ──────────────────────────────────────────────────────────

function activationColor(a: number): string {
  if (a > 0.75) return "#D85A30";
  if (a > 0.5) return "#EF9F27";
  if (a > 0.25) return "#1D9E75";
  return "#B4B2A9";
}

// ─── Hover tooltip (follows mouse) ────────────────────────────────────

function HoverTooltip({
  region,
  x,
  y,
}: {
  region: RegionActivation;
  x: number;
  y: number;
}) {
  const color = activationColor(region.activation);
  const score = Math.round(region.activation * 100);

  // Offset so tooltip doesn't sit under the cursor
  const OFFSET_X = 16;
  const OFFSET_Y = -12;

  return (
    <div
      className="pointer-events-none absolute z-30 w-56 rounded-xl p-3"
      style={{
        left: x + OFFSET_X,
        top: y + OFFSET_Y,
        transform: "translateY(-100%)",
        background: "rgba(8, 10, 16, 0.88)",
        backdropFilter: "blur(18px)",
        border: `1px solid ${color}44`,
        boxShadow: `0 0 18px ${color}22, 0 4px 24px rgba(0,0,0,0.4)`,
      }}
    >
      {/* Region name + score */}
      <div className="flex items-center justify-between mb-1.5">
        <span
          className="text-[11px] font-semibold"
          style={{ color: "rgba(255,255,255,0.92)", fontFamily: "var(--font-dm-sans)" }}
        >
          {region.region}
        </span>
        <span
          className="text-[13px] font-bold tabular-nums"
          style={{ color, fontFamily: "var(--font-jetbrains-mono)" }}
        >
          {score}
        </span>
      </div>

      {/* Score bar */}
      <div className="h-1 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, background: `linear-gradient(90deg, ${color}99, ${color})` }}
        />
      </div>

      {/* Agent + MNI tag */}
      <div
        className="inline-block text-[8px] tracking-widest uppercase font-semibold px-1.5 py-0.5 rounded mb-1.5"
        style={{ background: `${color}1a`, color, fontFamily: "var(--font-jetbrains-mono)" }}
      >
        {region.agent} · MNI [{region.mni.join(", ")}]
      </div>

      {/* Connected regions */}
      {NEURAL_CONNECTIONS[region.region] && (
        <div className="mb-1 flex flex-col gap-0.5">
          {NEURAL_CONNECTIONS[region.region].map((c) => (
            <div key={c.target} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
              <span className="text-[8px]" style={{ color: "rgba(255,255,255,0.45)", fontFamily: "var(--font-jetbrains-mono)" }}>
                {c.target} <span style={{ color: "rgba(255,255,255,0.22)" }}>— {c.tract.split(" ")[0]}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Anatomical relay nodes */}
      {REGION_BRANCHES[region.region] && (
        <>
          <div className="text-[7px] uppercase tracking-widest mb-1" style={{ color: "rgba(255,255,255,0.22)", fontFamily: "var(--font-jetbrains-mono)" }}>
            relay nodes ({REGION_BRANCHES[region.region].length})
          </div>
          <div className="flex flex-wrap gap-1">
            {REGION_BRANCHES[region.region].map((node) => (
              <span
                key={node}
                className="text-[7px] px-1 py-0.5 rounded"
                style={{ background: `${color}15`, color: `${color}dd`, fontFamily: "var(--font-jetbrains-mono)", border: `1px solid ${color}28` }}
              >
                {node}
              </span>
            ))}
          </div>
        </>
      )}

      {/* Description */}
      <p
        className="text-[10px] leading-relaxed"
        style={{ color: "rgba(255,255,255,0.48)", fontFamily: "var(--font-dm-sans)" }}
      >
        {REGION_DESCRIPTIONS[region.region] ?? "No description available."}
      </p>
    </div>
  );
}

// ─── Info panel overlay (bottom-left) ─────────────────────────────────

function RegionInfoPanel({
  region,
  onClose,
}: {
  region: RegionActivation;
  onClose: () => void;
}) {
  const color = activationColor(region.activation);

  return (
    <div
      className="absolute bottom-4 left-4 z-20 w-72 rounded-xl p-4"
      style={{
        background: "rgba(252, 251, 249, 0.82)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.62)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)",
      }}
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-black/30 hover:text-black/60 hover:bg-black/5 transition-colors"
        style={{ fontSize: 14 }}
      >
        &times;
      </button>

      <h3 className="text-sm font-semibold text-black/85 mb-1 pr-6">{region.region}</h3>

      <div
        className="inline-block text-[9px] tracking-widest uppercase font-semibold px-1.5 py-0.5 rounded mb-2"
        style={{ background: `${color}18`, color, fontFamily: "var(--font-jetbrains-mono)" }}
      >
        {region.agent} agent
      </div>

      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 rounded-full bg-black/8 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${region.activation * 100}%`, background: color }}
          />
        </div>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color, fontFamily: "var(--font-jetbrains-mono)" }}
        >
          {Math.round(region.activation * 100)}%
        </span>
      </div>

      <div
        className="text-[10px] text-black/40 mb-2"
        style={{ fontFamily: "var(--font-jetbrains-mono)" }}
      >
        MNI [{region.mni.join(", ")}]
      </div>

      <p className="text-[11px] leading-relaxed text-black/55">
        {REGION_DESCRIPTIONS[region.region] ?? "No description available."}
      </p>
    </div>
  );
}

// ─── Main component (imperative Three.js — NeuraLens approach) ────────

// Label color per region (matches the biomarker palette)
const REGION_LABEL_COLORS: Record<string, string> = {
  "Broca's area":    "#ff6b6b",
  "Wernicke's area": "#f59e0b",
  "DLPFC":           "#00e5ff",
  "SMA":             "#1d9e75",
  "Amygdala":        "#a855f7",
};

export default function BrainViewer({
  activations = DEFAULT_REGIONS,
  onRegionClick,
  activeAgentName: _activeAgentName,
  showLabels = false,
}: BrainViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const labelElsRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const showLabelsRef = useRef(showLabels);
  type ConnectionParticle = {
    mesh: THREE.Mesh;
    curve: THREE.CatmullRomCurve3;
    speed: number;
    offset: number;
  };

  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    regionMeshes: Map<string, THREE.Group>;
    regionMaterials: Map<string, THREE.MeshPhongMaterial>;
    regionCenters: Map<string, THREE.Vector3>;
    raycaster: THREE.Raycaster;
    pointer: THREE.Vector2;
    clock: THREE.Clock;
    idleTime: number;
    interacting: boolean;
    connectionGroup: THREE.Group | null;
    connectionParticles: ConnectionParticle[];
  } | null>(null);

  const [selectedRegion, setSelectedRegion] = useState<RegionActivation | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const hoveredRegionRef = useRef<string | null>(null);
  const activationsRef = useRef(activations);
  activationsRef.current = activations;
  const onRegionClickRef = useRef(onRegionClick);
  onRegionClickRef.current = onRegionClick;
  showLabelsRef.current = showLabels;

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 3);

    // Renderer — transparent bg
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enablePan = false;
    controls.minDistance = 1.8;
    controls.maxDistance = 5;

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dir1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dir1.position.set(3, 5, 4);
    scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0x8888ff, 0.3);
    dir2.position.set(-1, -3, -3);
    scene.add(dir2);

    const regionMeshes = new Map<string, THREE.Group>();
    const regionMaterials = new Map<string, THREE.MeshPhongMaterial>();
    const regionCenters = new Map<string, THREE.Vector3>();
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clock = new THREE.Clock();

    sceneRef.current = {
      scene, camera, renderer, controls,
      regionMeshes, regionMaterials, regionCenters,
      raycaster, pointer, clock,
      idleTime: 0, interacting: false,
      connectionGroup: null, connectionParticles: [],
    };

    // ── Load brain surface OBJ (semi-transparent anatomical context) ─

    const brainMaterial = new THREE.MeshPhongMaterial({
      color: new THREE.Color("#e8beaf"),
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      shininess: 10,
      depthWrite: false,
    });

    const loader = new OBJLoader();

    loader.load(
      "/brain_surface.obj",
      (obj) => {
        obj.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).material = brainMaterial;
          }
        });
        scene.add(obj);
      },
      undefined,
      (err) => console.warn("Failed to load brain_surface.obj:", err),
    );

    // ── Load region activation meshes (like NeuraLens tumor meshes) ──

    for (const region of activationsRef.current) {
      const config = REGION_MESH_CONFIG[region.region];
      if (!config) continue;

      const material = new THREE.MeshPhongMaterial({
        color: new THREE.Color(config.color),
        transparent: true,
        opacity: 0.15 + region.activation * 0.65, // activation controls visibility
        side: THREE.DoubleSide,
        shininess: 30,
        emissive: new THREE.Color(config.color),
        emissiveIntensity: 0.3 + region.activation * 0.5,
      });

      regionMaterials.set(region.region, material);

      loader.load(
        config.file,
        (obj) => {
          obj.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              (child as THREE.Mesh).material = material;
              // Tag for raycasting
              child.userData = { regionName: region.region };
            }
          });

          // Compute bounding box center — used for point light + connection routing
          const box = new THREE.Box3().setFromObject(obj);
          const center = box.getCenter(new THREE.Vector3());
          regionCenters.set(region.region, center.clone());

          const light = new THREE.PointLight(
            new THREE.Color(config.color),
            region.activation * 2,
            2,
            2,
          );
          light.position.copy(center);
          obj.add(light);

          scene.add(obj);
          regionMeshes.set(region.region, obj);
        },
        undefined,
        (err) => console.warn(`Failed to load ${config.file}:`, err),
      );
    }

    // ── Animation loop ──────────────────────────────────────────────

    let frameId: number;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const s = sceneRef.current;
      if (!s) return;

      const elapsed = s.clock.getElapsedTime();
      const delta = s.clock.getDelta();

      // Auto-rotate when idle
      if (s.interacting) {
        s.idleTime = 0;
      } else {
        s.idleTime += delta;
        if (s.idleTime > 2) {
          s.camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.003);
          s.camera.lookAt(0, 0, 0);
        }
      }

      // Pulse region meshes (emissive intensity oscillation) + hover highlight
      const hovered = hoveredRegionRef.current;
      for (const region of activationsRef.current) {
        const mat = s.regionMaterials.get(region.region);
        if (!mat) continue;
        const isHovered = region.region === hovered;
        if (isHovered) {
          // Bright steady highlight when hovered
          mat.emissiveIntensity = 1.2;
          mat.opacity = Math.min(1, 0.15 + region.activation * 0.65 + 0.35);
        } else if (region.activation > 0.3) {
          const pulse = Math.sin(elapsed * (1.5 + region.activation * 1.5)) * 0.15 * region.activation;
          mat.emissiveIntensity = 0.3 + region.activation * 0.5 + pulse;
          mat.opacity = 0.15 + region.activation * 0.65 + pulse * 0.3;
        }
      }

      // Animate connection particles traveling along neural tracts
      for (const p of s.connectionParticles) {
        const t = ((elapsed * p.speed + p.offset) % 1);
        const pos = p.curve.getPoint(t);
        p.mesh.position.copy(pos);
        // Fade edges, bright middle
        const alpha = Math.sin(t * Math.PI);
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = alpha * 0.95;
      }

      s.controls.update();
      s.renderer.render(s.scene, s.camera);

      // ── Project region centers to 2D and update label positions ──────
      if (showLabelsRef.current && labelElsRef.current.size > 0) {
        const w = container.clientWidth;
        const h = container.clientHeight;
        const brainCenter = new THREE.Vector3(0, 0.1, 0);
        const camDir = s.camera.position.clone().sub(brainCenter).normalize();

        s.regionCenters.forEach((center, regionName) => {
          const el = labelElsRef.current.get(regionName);
          if (!el) return;

          const vec = center.clone();
          vec.project(s.camera);

          const x = (vec.x * 0.5 + 0.5) * w;
          const y = (-vec.y * 0.5 + 0.5) * h;

          // Fade out labels on the back side of the brain
          const outward = center.clone().sub(brainCenter).normalize();
          const facing = outward.dot(camDir);
          const opacity = Math.max(0, Math.min(1, facing * 2.8 + 0.5));

          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
          el.style.opacity = String(opacity);
        });
      }
    };
    animate();

    // ── Interaction ─────────────────────────────────────────────────

    controls.addEventListener("start", () => {
      if (sceneRef.current) sceneRef.current.interacting = true;
    });
    controls.addEventListener("end", () => {
      if (sceneRef.current) sceneRef.current.interacting = false;
    });

    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Collect clickable meshes for raycasting
    const getClickables = (): THREE.Object3D[] => {
      const clickables: THREE.Object3D[] = [];
      regionMeshes.forEach((group) => {
        group.traverse((child) => {
          if ((child as THREE.Mesh).isMesh && child.userData.regionName) {
            clickables.push(child);
          }
        });
      });
      return clickables;
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Track raw mouse for tooltip positioning
      setMousePos({ x: event.clientX - rect.left, y: event.clientY - rect.top });

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(getClickables());

      if (intersects.length > 0) {
        const name = intersects[0].object.userData.regionName as string;
        hoveredRegionRef.current = name;
        setHoveredRegion(name);
        container.style.cursor = "pointer";
      } else {
        hoveredRegionRef.current = null;
        setHoveredRegion(null);
        container.style.cursor = "grab";
      }
    };
    container.addEventListener("pointermove", handlePointerMove);

    const handleClick = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(getClickables());

      if (intersects.length > 0) {
        const name = intersects[0].object.userData.regionName as string;
        const region = activationsRef.current.find((r) => r.region === name);
        if (region) {
          setSelectedRegion(region);
          onRegionClickRef.current?.(region);
        }
      } else {
        setSelectedRegion(null);
      }
    };
    container.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("click", handleClick);
      cancelAnimationFrame(frameId);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Neural connection builder ───────────────────────────────────

  const clearConnections = useCallback(() => {
    const s = sceneRef.current;
    if (!s) return;
    if (s.connectionGroup) {
      s.scene.remove(s.connectionGroup);
      s.connectionGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).geometry?.dispose();
          const mat = (child as THREE.Mesh).material;
          if (mat) (Array.isArray(mat) ? mat : [mat]).forEach((m) => m.dispose());
        }
      });
      s.connectionGroup = null;
    }
    s.connectionParticles = [];
  }, []);

  const buildConnections = useCallback((regionName: string) => {
    const s = sceneRef.current;
    if (!s) return;
    clearConnections();

    const connections = NEURAL_CONNECTIONS[regionName];
    if (!connections) return;

    const fromCenter = s.regionCenters.get(regionName);
    if (!fromCenter) return;

    const srcRegion = activationsRef.current.find((r) => r.region === regionName);
    const color = new THREE.Color(activationColor(srcRegion?.activation ?? 0.5));

    const group = new THREE.Group();
    s.connectionGroup = group;
    s.scene.add(group);

    for (const conn of connections) {
      const toCenter = s.regionCenters.get(conn.target);
      if (!toCenter) continue;

      // Build organic curve: start → pulled-inward midpoints → end
      const mid1 = fromCenter.clone().lerp(toCenter, 0.33);
      const mid2 = fromCenter.clone().lerp(toCenter, 0.66);
      // Bow both mids toward brain interior (origin) for a "through the brain" path
      mid1.lerp(new THREE.Vector3(0, 0, 0), 0.28);
      mid2.lerp(new THREE.Vector3(0, 0, 0), 0.28);
      // Small deterministic perpendicular jitter for branching feel
      const perp = new THREE.Vector3()
        .crossVectors(toCenter.clone().sub(fromCenter), new THREE.Vector3(0, 1, 0))
        .normalize()
        .multiplyScalar(0.08);
      mid1.add(perp);
      mid2.sub(perp);

      const curve = new THREE.CatmullRomCurve3([fromCenter, mid1, mid2, toCenter]);

      // Tube — thin glowing tract
      const tubeGeo = new THREE.TubeGeometry(curve, 40, 0.007, 5, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      group.add(new THREE.Mesh(tubeGeo, tubeMat));

      // A secondary thicker dim halo tube for depth
      const haloGeo = new THREE.TubeGeometry(curve, 40, 0.018, 5, false);
      const haloMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      group.add(new THREE.Mesh(haloGeo, haloMat));

      // Traveling spark particles (4 per connection, staggered)
      const particleGeo = new THREE.SphereGeometry(0.022, 6, 6);
      for (let i = 0; i < 4; i++) {
        const particleMat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const mesh = new THREE.Mesh(particleGeo, particleMat);
        group.add(mesh);
        s.connectionParticles.push({
          mesh,
          curve,
          speed: 0.22 + i * 0.04,
          offset: i * 0.25,
        });
      }
    }

    // ── Helper: draw one branch tract ─────────────────────────────────
    const addBranch = (
      from: THREE.Vector3,
      to: THREE.Vector3,
      idx: number,
      radius: number,
      opacity: number,
      particles: number,
      speedBase: number,
      drawEndpoint: boolean,
    ) => {
      const mid = from.clone().lerp(to, 0.5);
      mid.lerp(new THREE.Vector3(0, 0, 0), 0.12);
      const lateralAxis = new THREE.Vector3(
        Math.sin(idx * 2.399),   // golden-angle-ish deterministic spread
        Math.cos(idx * 1.618),
        Math.sin(idx * 3.141),
      ).normalize().multiplyScalar(0.04 + radius * 3);
      mid.add(lateralAxis);

      const curve = new THREE.CatmullRomCurve3([from, mid, to]);

      // Core tube
      const tubeGeo = new THREE.TubeGeometry(curve, 28, radius, 4, false);
      const tubeMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      group.add(new THREE.Mesh(tubeGeo, tubeMat));

      // Soft halo (2× radius, 1/4 opacity)
      const haloTubeGeo = new THREE.TubeGeometry(curve, 28, radius * 2.2, 4, false);
      const haloTubeMat = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: opacity * 0.22,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      group.add(new THREE.Mesh(haloTubeGeo, haloTubeMat));

      // Endpoint node
      if (drawEndpoint) {
        const markerGeo = new THREE.SphereGeometry(radius * 2.8, 8, 8);
        const markerMat = new THREE.MeshBasicMaterial({
          color, transparent: true, opacity: 0.8,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const marker = new THREE.Mesh(markerGeo, markerMat);
        marker.position.copy(to);
        group.add(marker);

        const ringGeo = new THREE.SphereGeometry(radius * 5, 8, 8);
        const ringMat = new THREE.MeshBasicMaterial({
          color, transparent: true, opacity: 0.12,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(to);
        group.add(ring);
      }

      // Traveling sparks
      const pGeo = new THREE.SphereGeometry(radius * 1.9, 5, 5);
      for (let i = 0; i < particles; i++) {
        const pMat = new THREE.MeshBasicMaterial({
          color, transparent: true, opacity: 0,
          blending: THREE.AdditiveBlending, depthWrite: false,
        });
        const mesh = new THREE.Mesh(pGeo, pMat);
        group.add(mesh);
        s.connectionParticles.push({
          mesh, curve,
          speed: speedBase + idx * 0.018 + i * 0.042,
          offset: ((idx * 0.37 + i * 0.5) % 1),
        });
      }

      return curve;
    };

    // ── Primary anatomical branch connections ──────────────────────────
    const branchTargets = REGION_BRANCHES[regionName] ?? [];

    for (let bi = 0; bi < branchTargets.length; bi++) {
      const toPos = ANATOMICAL_NODES[branchTargets[bi]];
      if (!toPos) continue;

      // Primary branch: medium thickness, 2 sparks
      const primaryCurve = addBranch(fromCenter, toPos, bi, 0.0042, 0.32, 2, 0.14, true);

      // ── Sub-branches: fork off the midpoint of each primary branch ──
      // Pick 2 sub-targets from the anatomical nodes that aren't already connected
      const midPt = primaryCurve.getPoint(0.45);
      const allNodes = Object.entries(ANATOMICAL_NODES);
      const subTargets = allNodes
        .filter(([name]) => !branchTargets.includes(name) && name !== regionName)
        .slice(bi % 4, (bi % 4) + 2); // deterministic pick, varies per branch

      for (let si = 0; si < subTargets.length; si++) {
        const [, subPos] = subTargets[si];
        // sub-branches are thinner, dimmer, 1 spark
        addBranch(midPt, subPos, bi * 10 + si, 0.0022, 0.14, 1, 0.10, false);
      }
    }
  }, [clearConnections]);

  useEffect(() => {
    if (hoveredRegion) {
      buildConnections(hoveredRegion);
    } else {
      clearConnections();
    }
  }, [hoveredRegion, buildConnections, clearConnections]);

  // ── Update activation values reactively ────────────────────────

  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;

    for (const region of activations) {
      const mat = s.regionMaterials.get(region.region);
      if (!mat) continue;

      const config = REGION_MESH_CONFIG[region.region];
      if (!config) continue;

      const color = new THREE.Color(activationColor(region.activation));
      mat.color.copy(color);
      mat.emissive.copy(color);
      mat.emissiveIntensity = 0.3 + region.activation * 0.5;
      mat.opacity = 0.15 + region.activation * 0.65;

      // Update point light intensity
      const group = s.regionMeshes.get(region.region);
      if (group) {
        group.traverse((child) => {
          if (child instanceof THREE.PointLight) {
            child.color.copy(color);
            child.intensity = region.activation * 2;
          }
        });
      }
    }
  }, [activations]);

  const hoveredData = hoveredRegion
    ? activationsRef.current.find((r) => r.region === hoveredRegion) ?? null
    : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{ minHeight: 300, cursor: "grab" }}
    >
      {selectedRegion && (
        <RegionInfoPanel
          region={selectedRegion}
          onClose={() => setSelectedRegion(null)}
        />
      )}

      {/* ── Hover tooltip ── */}
      {hoveredData && !selectedRegion && (
        <HoverTooltip region={hoveredData} x={mousePos.x} y={mousePos.y} />
      )}

      {/* ── Region labels (3D→2D projected, only when showLabels=true) ── */}
      {showLabels && activations.map((region) => {
        const color = REGION_LABEL_COLORS[region.region] ?? activationColor(region.activation);
        const isHovered = hoveredRegion === region.region;
        return (
          <div
            key={region.region}
            ref={(el) => {
              if (el) labelElsRef.current.set(region.region, el);
              else labelElsRef.current.delete(region.region);
            }}
            className="pointer-events-none absolute"
            style={{
              transform: "translate(-50%, calc(-100% - 10px))",
              opacity: 0,
              transition: "opacity 0.15s",
              zIndex: isHovered ? 25 : 10,
            }}
          >
            {/* Label pill */}
            <div
              style={{
                background: "rgba(6, 8, 14, 0.82)",
                backdropFilter: "blur(10px)",
                border: `1px solid ${color}50`,
                borderRadius: 8,
                padding: "3px 8px 3px 6px",
                display: "flex",
                alignItems: "center",
                gap: 5,
                boxShadow: `0 0 10px ${color}18, 0 2px 8px rgba(0,0,0,0.5)`,
                whiteSpace: "nowrap",
                transform: isHovered ? "scale(1.08)" : "scale(1)",
                transition: "transform 0.15s",
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: color,
                  boxShadow: `0 0 6px ${color}`,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  color: "rgba(255,255,255,0.92)",
                  fontSize: 9.5,
                  fontFamily: "var(--font-syne)",
                  fontWeight: 600,
                  letterSpacing: "0.01em",
                }}
              >
                {region.region}
              </span>
              <span
                style={{
                  color: color,
                  fontSize: 7.5,
                  fontFamily: "var(--font-jetbrains-mono)",
                  opacity: 0.75,
                }}
              >
                {region.agent}
              </span>
            </div>
            {/* Connector stem */}
            <div
              style={{
                width: 1,
                height: 10,
                background: `linear-gradient(to bottom, ${color}60, transparent)`,
                margin: "0 auto",
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
