import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Play,
  Layers,
  Hospital,
  Award,
  Radio,
  SlidersHorizontal,
  MapPin,
  Database,
  Cpu,
  Compass,
  Scan,
} from "lucide-react";
import { useAppState } from "../context/AppStateContext";

export default function CoverPage() {
  const navigate = useNavigate();
  const { handleRunDemoScenario, currentZone } = useAppState();

  const handleDemoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    handleRunDemoScenario();
    navigate("/dashboard");
  };

  return (
    <div className="relative w-full min-h-screen bg-[#EAF1F8] text-[#1E293B] flex flex-col justify-between overflow-x-hidden font-sans select-none">
      {/* Top Header Navigation (FRAME deep navy #0B2540) */}
      <header className="sticky top-0 z-30 w-full bg-[#0B2540] border-b border-[#1A3B5C] shadow-md text-[#E6EEF7]">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#0E7490] border border-[#67E8F9]/40 flex items-center justify-center text-white shadow-xs">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-bold text-base tracking-tight text-[#E6EEF7] flex items-center gap-2">
                <span>RoadRisk Delhi</span>
                <span className="text-[12px] text-[#7DD3FC] px-2 py-0.5 rounded-md bg-[#12355A] border border-[#2B4A6B] font-semibold tracking-wide">
                  {currentZone.isDefault ? "Central Delhi Corridor" : currentZone.name}
                </span>
              </div>
              <div className="text-[12px] text-[#9FB3C8] font-medium hidden sm:block">
                Pre-Monsoon Flood Risk Screening &amp; Priority Drainage Optimizer
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[14px]">
            {/* Run Demo Scenario - Solid Amber #F59E0B with dark text #1F2937 */}
            <button
              type="button"
              onClick={handleDemoClick}
              className="px-4 py-2 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#1F2937] font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer hover:shadow-lg active:scale-95"
              title="Open Monsoon storm (3 hotspots) scenario in Dashboard"
            >
              <Play className="w-4 h-4 fill-[#1F2937] text-[#1F2937]" />
              <span className="hidden sm:inline">Run Demo Scenario</span>
              <span className="sm:hidden">Demo</span>
            </button>

            {/* Launch RoadRisk - Primary Button #0369A1 */}
            <Link
              to="/select-area"
              className="px-4 py-2 rounded-lg bg-[#0369A1] hover:bg-[#075985] text-white font-bold flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
            >
              <span>Launch RoadRisk</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 sm:px-8 py-12 lg:py-16 text-center max-w-5xl mx-auto space-y-8">
        {/* Status Planning Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#CBD8E6] bg-white text-[13px] font-medium text-[#0369A1] shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-[#0369A1]" />
          <span className="font-bold uppercase text-[12px] tracking-wider text-[#0B2540]">
            MCD / PWD Pre-Monsoon Planning Screening
          </span>
          <span className="text-[#94A9BF]">|</span>
          <span className="text-[#475569]">Central Delhi Urban Resilience</span>
        </div>

        {/* Title, Subtitle & Value Proposition */}
        <div className="space-y-4 max-w-4xl">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-[#0B2540] leading-tight">
            RoadRisk <span className="text-[#0369A1]">Delhi</span>
          </h1>
          <h2 className="text-xl sm:text-2xl font-semibold text-[#1E293B] leading-snug">
            Flood What-If &amp; Cascade Engine for Resilient Roads and Hospital Access
          </h2>
          <p className="text-[17px] text-[#475569] font-normal max-w-2xl mx-auto pt-1 leading-relaxed">
            &ldquo;See what breaks next, who gets cut off from hospitals, and which fixes to fund first.&rdquo;
          </p>
        </div>

        {/* Primary & Secondary Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md pt-2">
          <Link
            to="/select-area"
            className="w-full sm:w-auto flex-1 px-6 py-3.5 rounded-xl bg-[#0369A1] hover:bg-[#075985] text-white font-bold text-[15px] shadow-sm hover:shadow transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Launch RoadRisk</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={handleDemoClick}
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-[#F59E0B] hover:bg-[#D97706] text-[#1F2937] font-bold text-[15px] transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-95"
            title="Open Monsoon storm (3 hotspots) scenario in Dashboard"
          >
            <Play className="w-4 h-4 fill-[#1F2937] text-[#1F2937]" />
            <span>Run Demo Scenario</span>
          </button>
        </div>

        {/* 5-Stage Pipeline Overview Cards */}
        <div className="w-full pt-6">
          <div className="text-[12px] font-bold text-[#475569] uppercase tracking-wider text-center mb-4">
            How It Works &bull; 5-Stage Simulation Pipeline
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5 w-full text-left">
            {/* Step 1: Inputs */}
            <div className="p-4 rounded-xl bg-white border border-[#CBD8E6] shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#E0F2FE] border border-[#CBD8E6] flex items-center justify-center text-[#0369A1]">
                <Database className="w-4 h-4" />
              </div>
              <div className="text-[15px] font-bold text-[#0B2540]">1. Inputs</div>
              <p className="text-[13px] text-[#475569] leading-relaxed">
                OpenStreetMap road network, surveyed flood hotspots, and trauma hospital locations.
              </p>
            </div>

            {/* Step 2: What-If */}
            <div className="p-4 rounded-xl bg-white border border-[#CBD8E6] shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#E0F2FE] border border-[#CBD8E6] flex items-center justify-center text-[#0284C7]">
                <SlidersHorizontal className="w-4 h-4" />
              </div>
              <div className="text-[15px] font-bold text-[#0B2540]">2. What-If</div>
              <p className="text-[13px] text-[#475569] leading-relaxed">
                Simulate flooding any underpass with Moderate, Heavy, or Extreme rainfall radiuses.
              </p>
            </div>

            {/* Step 3: Cascade */}
            <div className="p-4 rounded-xl bg-white border border-[#CBD8E6] shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#FEE2E2] border border-[#FECACA] flex items-center justify-center text-[#991B1B]">
                <Layers className="w-4 h-4" />
              </div>
              <div className="text-[15px] font-bold text-[#0B2540]">3. Cascade</div>
              <p className="text-[13px] text-[#475569] leading-relaxed">
                BPR iterative traffic assignment traces diverted flows overloading secondary corridors.
              </p>
            </div>

            {/* Step 4: Impact */}
            <div className="p-4 rounded-xl bg-white border border-[#CBD8E6] shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#92400E]">
                <Hospital className="w-4 h-4" />
              </div>
              <div className="text-[15px] font-bold text-[#0B2540]">4. Impact</div>
              <p className="text-[13px] text-[#475569] leading-relaxed">
                Identifies 30-min Golden Hour emergency breaches and population sectors cut off.
              </p>
            </div>

            {/* Step 5: Optimizer */}
            <div className="p-4 rounded-xl bg-white border border-[#CBD8E6] shadow-2xs space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] border border-[#BBF7D0] flex items-center justify-center text-[#166534]">
                <Award className="w-4 h-4" />
              </div>
              <div className="text-[15px] font-bold text-[#0B2540]">5. Optimizer</div>
              <p className="text-[13px] text-[#475569] leading-relaxed">
                Combinatorial Pareto solver prioritizes Quick (pumps) vs Capital (culverts) under budget.
              </p>
            </div>
          </div>
        </div>

        {/* Technical Stack / Integration Badges */}
        <div className="w-full pt-4 border-t border-[#CBD8E6]">
          <div className="text-[12px] font-bold text-[#475569] uppercase tracking-wider text-center mb-3">
            Grounded Open Data Architecture
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-[13px] text-[#475569]">
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#CBD8E6] shadow-2xs font-medium">
              <Compass className="w-4 h-4 text-[#0369A1]" />
              <span>OpenStreetMap Overpass API</span>
            </span>
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#CBD8E6] shadow-2xs font-medium">
              <Radio className="w-4 h-4 text-[#166534]" />
              <span>TinyFish Live Intelligence</span>
            </span>
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#CBD8E6] shadow-2xs font-medium">
              <Cpu className="w-4 h-4 text-[#0284C7]" />
              <span>BPR Equilibrium Graph Engine</span>
            </span>
            <span className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#CBD8E6] shadow-2xs font-medium">
              <MapPin className="w-4 h-4 text-[#991B1B]" />
              <span>Leaflet Geospatial Mapping</span>
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 sm:px-8 py-4 border-t border-[#CBD8E6] bg-white flex flex-col sm:flex-row items-center justify-between text-[13px] text-[#475569] gap-2">
        <div className="text-center sm:text-left">
          <span>Illustrative simulation model. Data is synthetic or indicative.</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[#0B2540] font-semibold">Team Pixel Pioneers</span>
          <span>&bull;</span>
          <span>Central Delhi Urban Resilience Lab</span>
        </div>
      </footer>
    </div>
  );
}
