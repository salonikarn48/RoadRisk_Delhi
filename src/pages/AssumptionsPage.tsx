import React from "react";
import {
  Info,
  Activity,
  Droplets,
  DollarSign,
  Cpu,
  CloudRain,
  Clock,
  ShieldCheck,
} from "lucide-react";
import TopNavBar from "../components/TopNavBar";
import { BPR_CONFIG } from "../simulation/traffic";
import { COST_DISCLAIMER } from "../data/fixCosts";

export default function AssumptionsPage() {
  const assumptions = [
    {
      id: "synthetic-demand",
      title: "1. Synthetic Demand (Illustrative)",
      icon: <Activity className="w-5 h-5 text-[#0369A1]" />,
      badge: "GRAVITY MODEL",
      badgeColor: "bg-[#E0F2FE] text-[#0369A1] border-[#CBD8E6]",
      summary: "Trip generation between 12 Central Delhi centroid intersection hubs",
      description:
        "Demand is synthetically modeled via a spatial gravity formulation (T_ij = K * (Mass_i * Mass_j) / (d_ij + 0.25)^1.5) connecting key CBD nodes (Connaught Place radials, Minto Bridge, ITO, Tilak Bridge, Delhi Gate, Mandi House). It reflects structural urban trip distributions without real-time GPS probe telemetry or census microdata.",
    },
    {
      id: "demo-hotspots",
      title: "2. Demo Hotspots (Public Lists)",
      icon: <Droplets className="w-5 h-5 text-[#0369A1]" />,
      badge: "PWD / TRAFFIC POLICE",
      badgeColor: "bg-[#E0F2FE] text-[#0369A1] border-[#CBD8E6]",
      summary: "Illustrative locations based on published municipal waterlogging registries",
      description:
        "Hotspots (e.g. Minto Bridge Underpass, ITO Crossing, Tilak Bridge RUB, Delhi Gate) are derived from public Delhi Traffic Police annual monsoon advisories and PWD vulnerable underpass registers. Coordinates and nominal radiuses (240m–320m) are illustrative planning heuristics, not hydraulic site surveys.",
    },
    {
      id: "indicative-costs",
      title: "3. Indicative Fix Costs (CPWD / DSR)",
      icon: <DollarSign className="w-5 h-5 text-[#166534]" />,
      badge: "CPWD / DSR RATES",
      badgeColor: "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]",
      summary: `${COST_DISCLAIMER}`,
      description:
        "Costs for Quick fixes (high-power 3,000–5,000 GPM dewatering pumps & automated diversion barriers at ₹0.7–₹1.8 Cr, 8–18 days delivery) and Capital works (micro-tunneling storm culverts, sump deepening at ₹3.9–₹8.5 Cr, 5–10 months delivery) are indicative planning benchmarks calibrated to CPWD Delhi Schedule of Rates, not formal contractor tenders.",
    },
    {
      id: "bpr-parameters",
      title: "4. BPR Congestion Function Parameters",
      icon: <Cpu className="w-5 h-5 text-[#7C3AED]" />,
      badge: `α = ${BPR_CONFIG.ALPHA}, β = ${BPR_CONFIG.BETA}`,
      badgeColor: "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]",
      summary: "Iterative Dijkstra with Bureau of Public Roads delay formulation",
      description:
        `Travel time on each road link follows the standard BPR curve: t = t_0 * (1 + 0.15 * (V / C)^4), where V is assigned vehicular volume and C is OSM-derived lane capacity. Flows are solved using Method of Successive Averages (4 MSA iterations) with a numerical stability cap of 8.0x free-flow time to represent severe gridlock.`,
    },
    {
      id: "rainfall-multipliers",
      title: "5. Rainfall Radius Multipliers",
      icon: <CloudRain className="w-5 h-5 text-[#0369A1]" />,
      badge: "HEURISTIC SCALING",
      badgeColor: "bg-[#E0F2FE] text-[#0369A1] border-[#CBD8E6]",
      summary: "Moderate (40%), Heavy (70%), Extreme (100% of surveyed hotspot radius)",
      description:
        "Rainfall intensity scales the geometric flood intersection radius: Moderate rainfall activates 40% of radius (low-depression collection); Heavy rainfall activates 70% (underpass sump breach); Extreme rainfall activates 100% (severe cloudburst spillover onto feeder radials). This is an operational heuristic, not IMD Doppler radar telemetry.",
    },
    {
      id: "golden-hour",
      title: "6. Golden Hour = 30 Minutes",
      icon: <Clock className="w-5 h-5 text-[#991B1B]" />,
      badge: "THRESHOLD: 30 MIN",
      badgeColor: "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]",
      summary: "Emergency transit window from demand centroids to tertiary trauma facilities",
      description:
        "Emergency healthcare reachability evaluates congested travel time from 12 zone origins to the nearest tertiary trauma center (LNJP, GB Pant, RML Hospital, Lady Hardinge, Northern Railway Hospital). Trips under 15 min are classified as Safe, 15–30 min as Delayed, and trips exceeding 30 min (or severed) trigger a critical Golden Hour Breach alarm.",
    },
  ];

  return (
    <div className="relative w-full min-h-screen bg-[#EAF1F8] text-[#1E293B] flex flex-col justify-between overflow-x-hidden font-sans select-none">
      {/* Consistent Shared Top Navigation Bar */}
      <TopNavBar />

      {/* Main Full-Width Content Container (max-width 1440px, 24 to 32px side padding) */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 sm:px-8 py-8 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CBD8E6] pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B2540]">
              Model Assumptions &amp; Methodology
            </h1>
            <p className="text-[15px] text-[#475569] mt-1">
              Scientific parameters, algorithmic formulations, and data benchmarks
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[13px] px-3 py-1 rounded-md bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#166534]" />
              <span>Calibrated Heuristics</span>
            </span>
          </div>
        </div>

        {/* Informational Summary Callout */}
        <div className="p-4 rounded-2xl bg-white border border-[#CBD8E6] shadow-sm flex items-start gap-3">
          <Info className="w-5 h-5 text-[#0369A1] shrink-0 mt-0.5" />
          <p className="text-[14px] text-[#475569] leading-relaxed">
            RoadRisk Delhi synthesizes open geospatial infrastructure from OpenStreetMap, public municipal waterlogging advisories from the Public Works Department (PWD) and Delhi Traffic Police, and classical transportation equilibrium modeling (Bureau of Public Roads delay curves). All simulation outputs are intended for pre-monsoon priority screening and operational stress-testing.
          </p>
        </div>

        {/* Two-Column Responsive Grid of Assumption Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {assumptions.map((item) => (
            <div
              key={item.id}
              className="p-6 rounded-2xl bg-white border border-[#CBD8E6] shadow-sm hover:border-[#0369A1] hover:shadow transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EAF1F8] border border-[#CBD8E6] flex items-center justify-center shrink-0 shadow-2xs">
                      {item.icon}
                    </div>
                    <h2 className="text-lg font-bold text-[#0B2540] leading-snug">
                      {item.title}
                    </h2>
                  </div>
                  <span
                    className={`text-[11px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider shrink-0 border ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                </div>

                <div className="text-[14px] font-semibold text-[#0369A1] bg-[#EAF1F8] border border-[#CBD8E6] px-3.5 py-2 rounded-xl">
                  {item.summary}
                </div>

                <p className="text-[14px] text-[#475569] leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
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
