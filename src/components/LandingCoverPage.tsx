import React from "react";
import {
  Activity,
  ArrowRight,
  Play,
  Layers,
  Hospital,
  Award,
  Radio,
  SlidersHorizontal,
  TrendingUp,
  MapPin,
  ShieldAlert,
  Droplets,
  Database,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Compass,
} from "lucide-react";

export interface LandingCoverPageProps {
  onLaunch: () => void;
  onRunDemo: () => void;
}

export default function LandingCoverPage({ onLaunch, onRunDemo }: LandingCoverPageProps) {
  return (
    <div className="relative w-full h-full min-h-screen bg-[#080b10] text-slate-100 flex flex-col justify-between overflow-x-hidden overflow-y-auto font-sans select-none">
      {/* Subtle Animated Background Road-Network SVG Pattern */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle dot matrix grid */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #38bdf8 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />

        {/* Ambient atmospheric glows */}
        <div className="absolute -top-32 -left-32 w-[650px] h-[650px] bg-cyan-500/[0.08] rounded-full blur-[150px]" />
        <div className="absolute top-1/3 -right-32 w-[600px] h-[600px] bg-sky-500/[0.06] rounded-full blur-[140px]" />
        <div className="absolute -bottom-32 left-1/4 w-[750px] h-[750px] bg-cyan-600/[0.07] rounded-full blur-[160px]" />

        {/* Vector Road Network Lines with Pulse Animations */}
        <svg
          className="absolute inset-0 w-full h-full opacity-[0.16]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="roadGradCyan" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id="roadGradRed" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#fb7185" stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Primary Arterial Corridors */}
          <path
            d="M-80,240 L340,300 L720,180 L1140,330 L1680,220"
            stroke="url(#roadGradCyan)"
            strokeWidth="2"
            fill="none"
          />
          <path
            d="M140,-40 L340,300 L510,580 L920,760 L1320,980"
            stroke="url(#roadGradCyan)"
            strokeWidth="1.5"
            fill="none"
          />
          <path
            d="M440,980 L720,700 L720,180 L880,40"
            stroke="url(#roadGradCyan)"
            strokeWidth="1.5"
            fill="none"
          />
          {/* Severed Detour Link (Dashed Red) */}
          <path
            d="M720,700 L1140,330 L1520,580"
            stroke="url(#roadGradRed)"
            strokeWidth="1.8"
            strokeDasharray="6 4"
            fill="none"
          />
          <path
            d="M340,300 L720,700"
            stroke="#f43f5e"
            strokeWidth="2.5"
            strokeDasharray="5 5"
            fill="none"
            opacity="0.85"
          />

          {/* Intersection Nodes */}
          <circle cx="340" cy="300" r="5" fill="#06b6d4" className="animate-pulse" />
          <circle cx="720" cy="180" r="4.5" fill="#06b6d4" />
          <circle cx="1140" cy="330" r="5" fill="#06b6d4" />
          <circle cx="720" cy="700" r="6" fill="#f43f5e" />
          <circle cx="510" cy="580" r="4" fill="#38bdf8" />
          <circle cx="920" cy="760" r="4" fill="#38bdf8" />
        </svg>
      </div>

      {/* Top Header Navigation */}
      <header className="relative z-10 w-full px-5 lg:px-10 py-4 border-b border-[#182333]/80 bg-[#090c10]/80 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#131c2a] border border-[#24354d] flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="font-mono font-black text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>ROADRISK DELHI</span>
              <span className="text-[10px] text-cyan-400 px-1.5 py-0.2 rounded bg-cyan-950/80 border border-cyan-800/60 font-semibold tracking-wider">
                CENTRAL ZONE
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest hidden sm:block">
              Pre-Monsoon Flood Risk Screening &amp; Priority Drainage Optimizer
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 font-mono text-xs">
          <button
            type="button"
            onClick={onRunDemo}
            className="px-3 py-1.5 rounded bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(245,158,11,0.35)] cursor-pointer"
            title="Open Monsoon storm (3 hotspots) scenario in Cascade view"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">RUN DEMO SCENARIO</span>
            <span className="sm:hidden">DEMO</span>
          </button>

          <button
            type="button"
            onClick={onLaunch}
            className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <span>LAUNCH ROADRISK</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-10 lg:py-14 text-center max-w-5xl mx-auto space-y-8">
        {/* Status Telemetry Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-[#0c131f]/90 text-[11px] font-mono text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="uppercase tracking-widest font-bold">
            MCD / PWD PRE-MONSOON PLANNING SCREENING
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">CENTRAL DELHI CORRIDOR</span>
        </div>

        {/* 1. Hero Title & Subtitle & One-Line Tagline */}
        <div className="space-y-3 max-w-4xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-mono font-black tracking-tight text-white leading-tight">
            RoadRisk <span className="text-cyan-400">Delhi</span>
          </h1>
          <h2 className="text-lg sm:text-xl md:text-2xl font-sans font-bold text-slate-200 leading-snug">
            Flood What-If &amp; Cascade Engine for Resilient Roads and Hospital Access
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-cyan-200 font-sans font-medium max-w-2xl mx-auto pt-1 leading-relaxed">
            &ldquo;See what breaks next, who gets cut off from hospitals, and which fixes to fund first.&rdquo;
          </p>
        </div>

        {/* 2. Primary & Secondary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md pt-2">
          {/* Primary Action Button */}
          <button
            type="button"
            onClick={onLaunch}
            className="w-full sm:w-auto flex-1 group px-6 py-3.5 rounded bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 text-slate-950 font-mono font-black text-sm tracking-wide shadow-[0_0_30px_rgba(6,182,212,0.4)] border border-cyan-300/40 hover:scale-[1.02] active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span className="text-white uppercase tracking-wider">LAUNCH ROADRISK</span>
            <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Secondary Action Button */}
          <button
            type="button"
            onClick={onRunDemo}
            className="w-full sm:w-auto px-5 py-3.5 rounded bg-[#162232] hover:bg-[#1f2f45] border border-amber-500/60 text-amber-300 hover:text-white font-mono font-bold text-xs tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            title="Load Monsoon storm (3 hotspots) at Extreme rainfall and open Cascade tab"
          >
            <Play className="w-3.5 h-3.5 fill-current text-amber-400" />
            <span className="uppercase">RUN DEMO SCENARIO</span>
          </button>
        </div>

        {/* 3. "The Problem" Strip with 3 Stat Cards */}
        <div className="w-full pt-4">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest text-center mb-2.5">
            THE MUNICIPAL PLANNING PROBLEM
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full text-left font-mono">
            {/* Stat Card 1 */}
            <div className="p-4 rounded bg-[#0d121a]/90 border border-[#1e2a3c] space-y-1.5 shadow-sm">
              <div className="text-2xl sm:text-3xl font-black text-amber-400 tabular-nums">
                445
              </div>
              <div className="text-xs font-bold text-white font-sans">
                Waterlogging Points Flagged
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-snug">
                Identified in Delhi for 2025 by PWD and Delhi Traffic Police registers across regional divisions.
              </p>
            </div>

            {/* Stat Card 2 */}
            <div className="p-4 rounded bg-[#0d121a]/90 border border-[#1e2a3c] space-y-1.5 shadow-sm">
              <div className="text-2xl sm:text-3xl font-black text-rose-400 tabular-nums">
                7 Critical
              </div>
              <div className="text-xs font-bold text-white font-sans">
                Severe Underpass Sump Chokepoints
              </div>
              <p className="text-[11px] text-slate-400 font-sans leading-snug">
                Including Minto Bridge Railway Underpass, ITO Crossing, and Tilak Bridge where floodwaters repeatedly halt key corridors.
              </p>
            </div>

            {/* Stat Card 3 */}
            <div className="p-4 rounded bg-[#0d121a]/90 border border-cyan-800/60 space-y-1.5 shadow-sm bg-gradient-to-br from-[#0c1420] to-[#0d1017]">
              <div className="text-2xl sm:text-3xl font-black text-cyan-400 tabular-nums flex items-center gap-1.5">
                <span>Network Ripple</span>
              </div>
              <div className="text-xs font-bold text-cyan-200 font-sans">
                The Systemic Blindspot
              </div>
              <p className="text-[11px] text-slate-300 font-sans leading-snug">
                Hotspot maps show where water collects, not what breaks next, which parallel radials gridlock, or whose ambulance routes get cut off.
              </p>
            </div>
          </div>
        </div>

        {/* 4. "How It Works" Row of 5 Steps with Icons */}
        <div className="w-full pt-4">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest text-center mb-3">
            HOW ROADRISK WORKS &bull; 5-STAGE PIPELINE
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 w-full text-left font-mono">
            {/* Step 1: Inputs */}
            <div className="p-3 rounded bg-[#0b0f16] border border-[#1a2538] space-y-1.5">
              <div className="w-7 h-7 rounded bg-[#131d2b] border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                <Database className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span>1. Inputs</span>
              </div>
              <p className="text-[10.5px] text-slate-400 font-sans leading-tight">
                OpenStreetMap road network, 10 surveyed hotspots, and trauma hospital locations.
              </p>
            </div>

            {/* Step 2: What-If */}
            <div className="p-3 rounded bg-[#0b0f16] border border-[#1a2538] space-y-1.5">
              <div className="w-7 h-7 rounded bg-[#131d2b] border border-blue-500/40 flex items-center justify-center text-blue-300">
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span>2. What-If</span>
              </div>
              <p className="text-[10.5px] text-slate-400 font-sans leading-tight">
                Simulate flooding any underpass with Moderate, Heavy, or Extreme rainfall radiuses.
              </p>
            </div>

            {/* Step 3: Cascade */}
            <div className="p-3 rounded bg-[#0b0f16] border border-[#1a2538] space-y-1.5">
              <div className="w-7 h-7 rounded bg-[#131d2b] border border-rose-500/40 flex items-center justify-center text-rose-400">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span>3. Cascade</span>
              </div>
              <p className="text-[10.5px] text-slate-400 font-sans leading-tight">
                BPR iterative traffic assignment traces diverted flows overloading secondary corridors.
              </p>
            </div>

            {/* Step 4: Impact */}
            <div className="p-3 rounded bg-[#0b0f16] border border-[#1a2538] space-y-1.5">
              <div className="w-7 h-7 rounded bg-[#131d2b] border border-amber-500/40 flex items-center justify-center text-amber-300">
                <Hospital className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span>4. Impact</span>
              </div>
              <p className="text-[10.5px] text-slate-400 font-sans leading-tight">
                Identifies 30-min Golden Hour emergency breaches and population sectors cut off.
              </p>
            </div>

            {/* Step 5: Optimizer */}
            <div className="p-3 rounded bg-[#0b0f16] border border-[#1a2538] space-y-1.5">
              <div className="w-7 h-7 rounded bg-[#131d2b] border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                <Award className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs font-bold text-white flex items-center gap-1">
                <span>5. Optimizer</span>
              </div>
              <p className="text-[10.5px] text-slate-400 font-sans leading-tight">
                Combinatorial Pareto solver prioritizes Quick (pumps) vs Capital (culverts) under budget.
              </p>
            </div>
          </div>
        </div>

        {/* 5. Feature Grid of 4 Cards */}
        <div className="w-full pt-4">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest text-center mb-3">
            CORE PLATFORM CAPABILITIES
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
            {/* Card 1 */}
            <div className="p-4 rounded bg-[#0c1017] border border-[#1b2638] hover:border-cyan-500/50 transition-colors space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-rose-400" />
                  <h3 className="font-mono font-bold text-xs text-white">Cascade Simulation</h3>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                  DOMINO RIPPLE
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Watch in 3 steps how closing Minto Bridge or ITO diverts vehicles, pushing parallel routes beyond 100% capacity and creating secondary gridlock.
              </p>
            </div>

            {/* Card 2 */}
            <div className="p-4 rounded bg-[#0c1017] border border-[#1b2638] hover:border-cyan-500/50 transition-colors space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Hospital className="w-4 h-4 text-rose-400" />
                  <h3 className="font-mono font-bold text-xs text-white">Hospital Access Risk (Golden Hour alert past 30 min)</h3>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800">
                  GOLDEN HOUR
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Evaluates emergency travel times from Central Delhi population sectors to tertiary trauma hospitals (LNJP, GB Pant, RML), flagging delays past 30 minutes.
              </p>
            </div>

            {/* Card 3 */}
            <div className="p-4 rounded bg-[#0c1017] border border-[#1b2638] hover:border-cyan-500/50 transition-colors space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-mono font-bold text-xs text-white">Best Fixes Under Budget</h3>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  PARETO OPTIMIZER
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                CPWD/DSR-calibrated budget solver (₹10 Cr / ₹20 Cr / custom) comparing Quick pump deployments (days) versus Capital culvert works (months) with equity weighting.
              </p>
            </div>

            {/* Card 4 */}
            <div className="p-4 rounded bg-[#0c1017] border border-[#1b2638] hover:border-cyan-500/50 transition-colors space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-cyan-400" />
                  <h3 className="font-mono font-bold text-xs text-white">Live Conditions via TinyFish</h3>
                </div>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                  LIVE WEB INTELLIGENCE
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Automated search and fetch pipeline reading live monsoon news and traffic advisories, matching flooded roads, and re-running network impact in real-time.
              </p>
            </div>
          </div>
        </div>

        {/* 6. "Powered By" Row */}
        <div className="w-full pt-2 border-t border-[#182333]/70">
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest text-center mb-2">
            POWERED BY
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-slate-300">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#0f1420] border border-[#1c2738]">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>OpenStreetMap</span>
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#0f1420] border border-[#1c2738]">
              <Radio className="w-3.5 h-3.5 text-emerald-400" />
              <span>TinyFish (live web data for flood conditions)</span>
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#0f1420] border border-[#1c2738]">
              <Cpu className="w-3.5 h-3.5 text-blue-400" />
              <span>React</span>
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#0f1420] border border-[#1c2738]">
              <MapPin className="w-3.5 h-3.5 text-rose-400" />
              <span>Leaflet</span>
            </span>
          </div>
        </div>
      </main>

      {/* 7. Footer */}
      <footer className="relative z-10 w-full px-5 lg:px-10 py-4 border-t border-[#182333]/80 bg-[#06080d]/90 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-500 gap-2">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <span>Illustrative simulation model. Demand and costs are synthetic or indicative.</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 font-bold">Team Pixel Pioneers</span>
          <span className="text-slate-600">&bull;</span>
          <span>Central Delhi Urban Resilience Lab</span>
        </div>
      </footer>
    </div>
  );
}
