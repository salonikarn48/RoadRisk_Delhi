import React, { useState } from "react";
import {
  Users,
  X,
  MapPin,
  CheckCircle2,
  ShieldAlert,
  Upload,
  Droplets,
} from "lucide-react";
import { FLOOD_HOTSPOTS } from "../data/floodHotspots";

export interface ResidentReportingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface SubmittedReport {
  location: string;
  depth: string;
  roadClosed: boolean;
  description: string;
  status: "SAMPLE: PENDING" | "SAMPLE: VERIFIED";
  photoSample: string;
}

export default function ResidentReportingModal({ isOpen, onClose }: ResidentReportingModalProps) {
  const [location, setLocation] = useState<string>("Minto Bridge Railway Underpass");
  const [customStreet, setCustomStreet] = useState<string>("");
  const [waterDepth, setWaterDepth] = useState<string>("2 to 3 feet (Car axle submerged)");
  const [isPassable, setIsPassable] = useState<boolean>(false);
  const [description, setDescription] = useState<string>(
    "Underpass drain choked with silt. Water level rising fast; 2 cars stalled under bridge. Traffic backing up towards Connaught Place."
  );
  const [selectedPhoto, setSelectedPhoto] = useState<string>("minto_waterlogged.jpg");
  const [submittedReports, setSubmittedReports] = useState<SubmittedReport[]>([
    {
      location: "Minto Bridge Railway Underpass",
      depth: "3+ feet (Fully impassable)",
      roadClosed: true,
      description: "Severe waterlogging near Shivaji Bridge rail cut. Water depth past knee level.",
      status: "SAMPLE: VERIFIED",
      photoSample: "minto_waterlogged.jpg",
    },
    {
      location: "ITO Junction / Vikas Marg",
      depth: "1.5 feet (Slow crawl)",
      roadClosed: false,
      description: "Water stagnation in left two lanes towards Laxmi Nagar.",
      status: "SAMPLE: PENDING",
      photoSample: "ito_crossing.jpg",
    },
    {
      location: "Tilak Bridge Underpass",
      depth: "2 feet (Moderate stagnation)",
      roadClosed: false,
      description: "Debris accumulating in stormwater drain grating along railway retaining wall.",
      status: "SAMPLE: VERIFIED",
      photoSample: "tilak_inundation.jpg",
    },
  ]);
  const [hasJustSubmitted, setHasJustSubmitted] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedLoc = customStreet.trim() ? customStreet.trim() : location;
    const newReport: SubmittedReport = {
      location: resolvedLoc,
      depth: waterDepth,
      roadClosed: !isPassable,
      description: description.trim() || "Water accumulation observed by resident.",
      status: "SAMPLE: PENDING",
      photoSample: selectedPhoto,
    };

    setSubmittedReports([newReport, ...submittedReports]);
    setHasJustSubmitted(true);
    setTimeout(() => setHasJustSubmitted(false), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B2540]/40 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-white border border-[#CBD8E6] rounded-2xl shadow-2xl flex flex-col overflow-hidden font-sans">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#CBD8E6] flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E0F2FE] border border-[#CBD8E6] flex items-center justify-center text-[#0369A1] shadow-2xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#0B2540] leading-tight">
                  Resident Waterlogging Intake
                </h2>
                <span className="text-[11px] font-bold text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 rounded-full">
                  MCD Mockup
                </span>
              </div>
              <p className="text-[12px] text-[#475569]">
                Central Delhi Civic Resilience &bull; MCD Zone SP-City
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#475569] hover:text-[#0B2540] hover:bg-[#EAF1F8] transition-colors cursor-pointer"
            title="Close reporting modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scroll Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs bg-[#EAF1F8]/30">
          {/* NOTICE: NOT CONNECTED TO SIMULATION */}
          <div className="p-3.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] text-[13px] space-y-1 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-[12px] uppercase tracking-wider text-[#92400E]">
              <ShieldAlert className="w-4 h-4 text-[#92400E] shrink-0" />
              <span>Concept Mockup &bull; Not Connected to Simulation</span>
            </div>
            <p className="text-[12px] leading-relaxed">
              This intake form is an operational mockup illustrating how citizen reports flow into municipal maintenance workflows. Reports do <strong>not</strong> alter live simulation physics or link capacities.
            </p>
          </div>

          {/* Submission Form */}
          <form onSubmit={handleSubmit} className="p-5 rounded-xl bg-white border border-[#CBD8E6] space-y-4 shadow-2xs">
            <div className="text-[13px] font-bold text-[#0B2540] uppercase tracking-wider flex items-center justify-between border-b border-[#CBD8E6] pb-2.5">
              <span className="flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-[#0369A1]" />
                <span>Submit Waterlogging Observation</span>
              </span>
              <span className="text-[11px] text-[#475569]">Citizen Form</span>
            </div>

            {/* Location Selector */}
            <div className="space-y-1.5">
              <label className="text-[13px] text-[#0B2540] font-semibold flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#0369A1]" />
                <span>Incident Location (Central Delhi):</span>
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-white border border-[#94A9BF] text-[#1E293B] text-[13px] rounded-xl px-3 py-2 focus:outline-none focus:border-[#0369A1] focus:ring-1 focus:ring-[#0369A1] cursor-pointer shadow-2xs"
              >
                {FLOOD_HOTSPOTS.map((h) => (
                  <option key={h.id || h.name} value={h.name}>
                    {h.name}
                  </option>
                ))}
                <option value="Custom Street / Intersection">-- Other Street / Colony Road --</option>
              </select>

              {location === "Custom Street / Intersection" && (
                <input
                  type="text"
                  placeholder="Enter street name, colony or intersection..."
                  value={customStreet}
                  onChange={(e) => setCustomStreet(e.target.value)}
                  className="w-full mt-2 bg-white border border-[#94A9BF] text-[#1E293B] text-[13px] rounded-xl px-3 py-2 focus:outline-none focus:border-[#0369A1] focus:ring-1 focus:ring-[#0369A1]"
                />
              )}
            </div>

            {/* Water Depth & Passability */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="text-[13px] text-[#0B2540] font-semibold block">
                  Observed Water Depth:
                </label>
                <select
                  value={waterDepth}
                  onChange={(e) => setWaterDepth(e.target.value)}
                  className="w-full bg-white border border-[#94A9BF] text-[#1E293B] text-[13px] rounded-xl px-3 py-2 focus:outline-none focus:border-[#0369A1] focus:ring-1 focus:ring-[#0369A1] cursor-pointer shadow-2xs"
                >
                  <option value="6 to 12 inches (Curb overtopping)">6 to 12 inches (Curb overtopping)</option>
                  <option value="1 to 2 feet (Knee level, small cars stuck)">1 to 2 feet (Knee level, small cars stuck)</option>
                  <option value="2 to 3 feet (Car axle submerged)">2 to 3 feet (Car axle submerged)</option>
                  <option value="3+ feet (Fully submerged / underpass blocked)">3+ feet (Fully submerged / blocked)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[13px] text-[#0B2540] font-semibold block">
                  Vehicular Passability:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPassable(false)}
                    className={`py-2 px-2.5 rounded-xl text-[12px] font-bold border transition-colors cursor-pointer ${
                      !isPassable
                        ? "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA] shadow-2xs"
                        : "bg-white border-[#CBD8E6] text-[#475569] hover:bg-[#EAF1F8]"
                    }`}
                  >
                    Impassable
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPassable(true)}
                    className={`py-2 px-2.5 rounded-xl text-[12px] font-bold border transition-colors cursor-pointer ${
                      isPassable
                        ? "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A] shadow-2xs"
                        : "bg-white border-[#CBD8E6] text-[#475569] hover:bg-[#EAF1F8]"
                    }`}
                  >
                    Crawling / 1 Lane
                  </button>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[13px] text-[#0B2540] font-semibold block">
                Field Description &amp; Public Safety Impact:
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe water accumulation, stuck emergency vehicles, or choked stormwater drains..."
                className="w-full bg-white border border-[#94A9BF] text-[#1E293B] text-[13px] rounded-xl p-2.5 focus:outline-none focus:border-[#0369A1] focus:ring-1 focus:ring-[#0369A1] resize-none leading-relaxed shadow-2xs"
              />
            </div>

            {/* Validated Before Use Note */}
            <div className="p-3 rounded-xl bg-[#DCFCE7] border border-[#BBF7D0] text-[12px] text-[#166534] leading-relaxed flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#166534] shrink-0 mt-0.5" />
              <div>
                <strong>Validated before use:</strong> Reports are held in a pending queue and verified by municipal engineers before being fed into inputs.
              </div>
            </div>

            {/* Submit Button */}
            <div>
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-[#0369A1] hover:bg-[#075985] text-white font-bold text-[14px] flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Submit report (mockup, not sent anywhere)</span>
              </button>
            </div>

            {hasJustSubmitted && (
              <div className="p-2.5 rounded-xl bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] text-[12px] text-center font-bold animate-pulse">
                ✓ Report logged into Mockup Intake Ledger (Status: SAMPLE: PENDING)
              </div>
            )}
          </form>

          {/* Sample Submissions Queue */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[12px] text-[#475569] uppercase font-bold">
              <span>Sample entries (illustrative) ({submittedReports.length})</span>
              <span className="text-[#0369A1]">Intake Ledger</span>
            </div>

            <div className="space-y-2">
              {submittedReports.map((item, idx) => (
                <div
                  key={`modal-report-${idx}`}
                  className="p-3.5 rounded-xl bg-white border border-[#CBD8E6] space-y-1.5 text-xs shadow-2xs hover:border-[#0369A1] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-[#0B2540] text-[13px]">
                        <span className="truncate">{item.location}</span>
                      </div>
                      <div className="text-[12px] text-[#475569] mt-0.5">
                        Depth: <strong className="text-[#92400E]">{item.depth}</strong>
                      </div>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase shrink-0 border ${
                        item.status === "SAMPLE: VERIFIED"
                          ? "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]"
                          : "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#1E293B] leading-relaxed">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#CBD8E6] bg-[#EAF1F8] flex items-center justify-between text-[13px] text-[#475569]">
          <span>MCD Monsoon Incident Intake Desk</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white hover:bg-[#EAF1F8] border border-[#CBD8E6] text-[#0B2540] font-semibold text-[13px] cursor-pointer shadow-2xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
