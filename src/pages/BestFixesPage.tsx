import React from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import TopNavBar from "../components/TopNavBar";
import BestFixesTab from "../components/BestFixesTab";
import { useAppState } from "../context/AppStateContext";

export default function BestFixesPage() {
  const navigate = useNavigate();
  const {
    currentZone,
    roads,
    graph,
    odPairs,
    hospitals,
    rainfallLevel,
    whatIfScenario,
    activeZoneHotspots,
    setSelectedHotspotId,
    setActiveTab,
  } = useAppState();

  const floodedCount = whatIfScenario?.floodedHotspots?.length || 0;
  const floodedNames = whatIfScenario?.floodedHotspots?.map((h) => h.name).join(", ") || "";

  const hasAnalysis = Boolean(roads && roads.length > 0 && graph);

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
              Best Fixes Optimizer
            </h1>
            <p className="text-[15px] text-[#475569] mt-1">
              CPWD / DSR Pareto Capital &amp; Quick Drainage Recommender for {currentZone.isDefault ? "Central Delhi Corridor" : currentZone.name}
            </p>
            <p className="text-[14px] text-[#0369A1] font-semibold mt-0.5">
              Costs are indicative, calibrated to CPWD/DSR-style rates, not official quotes. Recovery is relative and based on synthetic demand.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[13px] px-3 py-1 rounded-md bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] font-bold">
              Pareto Solver Active
            </span>
          </div>
        </div>

        {/* Optimizer Component or Empty State */}
        {hasAnalysis ? (
          <BestFixesTab
            graph={graph}
            roads={roads}
            odPairs={odPairs}
            hospitals={hospitals}
            rainfallLevel={rainfallLevel}
            targetHotspots={activeZoneHotspots}
            scenarioFloodedHotspots={whatIfScenario?.floodedHotspots || []}
            currentZoneName={currentZone.isDefault ? "Central Delhi" : currentZone.name}
            floodedHotspotsCount={floodedCount}
            floodedHotspotsNames={floodedNames}
            onSimulateHotspotFix={(hotspotId) => {
              setSelectedHotspotId(hotspotId);
              setActiveTab("what_if");
              navigate("/dashboard");
            }}
            onNavigateToWhatIf={() => {
              setActiveTab("what_if");
              navigate("/dashboard");
            }}
          />
        ) : (
          <div className="p-10 rounded-2xl bg-white border border-[#CBD8E6] text-center space-y-4 max-w-lg mx-auto shadow-sm">
            <div className="w-14 h-14 rounded-full bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-[#0B2540]">
                No Network Analysis Initialized
              </h2>
              <p className="text-[14px] text-[#475569] leading-relaxed">
                The municipal fix optimizer requires an active road graph and demand matrix. Open the simulation dashboard to initialize the network.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="px-5 py-2.5 rounded-xl bg-[#0369A1] hover:bg-[#075985] text-white font-bold text-[14px] flex items-center justify-center gap-2 mx-auto cursor-pointer shadow-xs transition-colors"
            >
              <span>Go to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full px-6 sm:px-8 py-4 border-t border-[#CBD8E6] bg-white flex flex-col sm:flex-row items-center justify-between text-[14px] text-[#475569] gap-2">
        <div className="text-center sm:text-left">
          <span>Costs are indicative, calibrated to CPWD/DSR-style rates, not official quotes. Recovery is relative and based on synthetic demand.</span>
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
