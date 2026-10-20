import React from "react";
import {
  Info,
  X,
  Activity,
  Droplets,
  DollarSign,
  Cpu,
  CloudRain,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { BPR_CONFIG } from "../simulation/traffic";
import { COST_DISCLAIMER } from "../data/fixCosts";

export interface ModelAssumptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ModelAssumptionsModal({ isOpen, onClose }: ModelAssumptionsModalProps) {
  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B2540]/40 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white border border-[#CBD8E6] rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#CBD8E6] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E0F2FE] border border-[#CBD8E6] flex items-center justify-center text-[#0369A1] shadow-2xs">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0B2540] leading-tight">
                Model Assumptions &amp; Scientific Methodology
              </h2>
              <p className="text-[12px] text-[#475569]">
                Central Delhi Pre-Monsoon Simulation Architecture
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#475569] hover:text-[#0B2540] hover:bg-[#EAF1F8] transition-colors cursor-pointer"
            title="Close assumptions modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scroll Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs bg-[#EAF1F8]/30">
          {assumptions.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-xl bg-white border border-[#CBD8E6] hover:border-[#0369A1] transition-colors space-y-2.5 shadow-2xs"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-[#EAF1F8] border border-[#CBD8E6] shadow-2xs">
                    {item.icon}
                  </div>
                  <h3 className="font-bold text-[#0B2540] text-[14px]">
                    {item.title}
                  </h3>
                </div>
                <span
                  className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0 border ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              </div>

              <div className="text-[13px] font-semibold text-[#0369A1] bg-[#EAF1F8] border border-[#CBD8E6] px-3 py-1.5 rounded-lg">
                {item.summary}
              </div>

              <p className="text-[13px] text-[#475569] leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#CBD8E6] bg-[#EAF1F8] flex items-center justify-between text-[13px] text-[#475569]">
          <span>Scientific heuristics calibrated for MCD pre-monsoon readiness.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-[#0369A1] hover:bg-[#075985] text-white font-bold text-[13px] cursor-pointer shadow-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
