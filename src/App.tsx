import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Home,
  RefreshCw,
  Info,
  Play,
  Users,
  RotateCcw,
  Scan,
  ChevronDown,
  SlidersHorizontal,
} from "lucide-react";
import RoadMap from "./components/RoadMap";
import LeftSidebar, { SidebarSectionKey } from "./components/LeftSidebar";
import DetailPanel from "./components/DetailPanel";
import ModelAssumptionsModal from "./components/ModelAssumptionsModal";
import ResidentReportingModal from "./components/ResidentReportingModal";
import { useAppState } from "./context/AppStateContext";

export default function App() {
  const {
    currentZone,
    roads,
    hospitals,
    dataSource,
    loading,
    loadingMessage,
    fetchError,
    selectedRoad,
    setSelectedRoad,
    selectedHotspotId,
    setSelectedHotspotId,
    selectedHotspotIds,
    toggleHotspot,
    selectAllHotspots,
    clearHotspots,
    applyMonsoonPreset,
    applySeverePreset,
    rainfallLevel,
    setRainfallLevel,
    activeTab,
    cascadeStepIndex,
    setCascadeStepIndex,
    selectedHospitalAreaId,
    setSelectedHospitalAreaId,
    showHospitalNodes,
    setShowHospitalNodes,
    useLiveTinyFish,
    effectiveClosedRoadIds,
    graph,
    odPairs,
    baselineTraffic,
    whatIfScenario,
    hospitalAccess,
    activeZoneHotspots,
    loadZoneData,
    handleRunAnalysisArea,
    handleResetToCentralDelhi,
    toggleRoadClosed,
    resetClosures,
    handleRunDemoScenario,
    fitTrigger,
  } = useAppState();

  // Active Detail Panel: null by default as required ("Open with no panel by default")
  const [activePanel, setActivePanel] = useState<SidebarSectionKey | null>(null);

  // Responsive mobile sidebar state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);
  const [mapMode, setMapMode] = useState<"utilization" | "hierarchy">("utilization");
  const [showHotspotCircles, setShowHotspotCircles] = useState<boolean>(true);

  // Modal Dialog States
  const [showAssumptionsModal, setShowAssumptionsModal] = useState<boolean>(false);
  const [showReportingModal, setShowReportingModal] = useState<boolean>(false);

  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close "More" dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handlers with auto-open behavior as specified in Requirement 5:
  // "Selecting a flooded hotspot or running a preset should auto-open the Traffic impact panel so the result is visible right away."
  const handleToggleHotspotWithAutoOpen = (id: string) => {
    toggleHotspot(id);
    setActivePanel("traffic");
  };

  const handleSelectAllHotspotsWithAutoOpen = () => {
    selectAllHotspots();
    setActivePanel("traffic");
  };

  const handleMonsoonPresetWithAutoOpen = () => {
    applyMonsoonPreset();
    setActivePanel("traffic");
  };

  const handleSeverePresetWithAutoOpen = () => {
    applySeverePreset();
    setActivePanel("traffic");
  };

  const handleRunDemoScenarioWithAutoOpen = () => {
    handleRunDemoScenario();
    setActivePanel("traffic");
  };

  const handleSelectPanel = (panel: SidebarSectionKey) => {
    // Clicking active item again closes the panel; clicking inactive opens it
    setActivePanel((curr) => (curr === panel ? null : panel));
  };

  return (
    <div className="w-full h-screen max-h-screen flex flex-col bg-[#EAF1F8] text-[#1E293B] font-sans select-none overflow-hidden">
      {/* Header: Deep navy #0B2540 with ghost buttons and amber CTA */}
      <header className="h-[56px] bg-[#0B2540] border-b border-[#1A3B5C] px-3 lg:px-5 flex items-center justify-between shrink-0 z-30 select-none shadow-md text-[#E6EEF7]">
        {/* Left: Logo, Zone name, and Mobile Drawer Button */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0E7490] border border-[#67E8F9]/40 flex items-center justify-center text-white shadow-xs shrink-0">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="font-bold text-sm tracking-tight text-[#E6EEF7] whitespace-nowrap font-sans">
                RoadRisk Delhi
              </span>
              <span className="text-xs text-[#9FB3C8] border-l border-[#2B4A6B] pl-2.5 truncate max-w-[180px] sm:max-w-[300px] font-sans">
                {currentZone.isDefault ? "Central Delhi" : currentZone.name}
              </span>
            </div>
          </div>

          {/* Mobile Parameters Menu Button (under 900px) - ghost style */}
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(true)}
            className="min-[900px]:hidden px-2.5 py-1.5 rounded-lg bg-transparent border border-[#2B4A6B] text-[#E6EEF7] hover:bg-[#12355A] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Open parameters"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#67E8F9]" />
            <span>Parameters</span>
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 text-xs">
          {/* Home Link - Ghost style */}
          <Link
            to="/"
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-transparent hover:bg-[#12355A] border border-[#2B4A6B] text-[#E6EEF7] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Return to cover page"
          >
            <Home className="w-3.5 h-3.5 text-[#67E8F9]" />
            <span className="hidden sm:inline">Home</span>
          </Link>

          {/* Change Area Button - Ghost style */}
          <Link
            to="/select-area"
            className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-transparent hover:bg-[#12355A] border border-[#2B4A6B] text-[#E6EEF7] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Choose or draw an analysis area"
          >
            <Scan className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span className="hidden sm:inline">Change area</span>
            <span className="sm:hidden">Area</span>
          </Link>

          {/* Reset to Central Delhi (when custom area is active) - Ghost style */}
          {!currentZone.isDefault && (
            <button
              type="button"
              onClick={handleResetToCentralDelhi}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-transparent hover:bg-[#12355A] border border-[#2B4A6B] text-[#67E8F9] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Reset simulation back to default Central Delhi zone"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#67E8F9]" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          {/* Run Demo Scenario Button (solid amber button #F59E0B with dark text #1F2937) */}
          <button
            type="button"
            onClick={handleRunDemoScenarioWithAutoOpen}
            className="px-3 sm:px-3.5 py-1.5 rounded-lg bg-[#F59E0B] hover:bg-[#D97706] text-[#1F2937] font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:shadow-lg active:scale-95"
            title="Run Monsoon storm (3 hotspots) preset scenario and view traffic impact"
          >
            <Play className="w-3.5 h-3.5 fill-[#1F2937] text-[#1F2937]" />
            <span className="whitespace-nowrap font-bold">Run demo scenario</span>
          </button>

          {/* More Dropdown - Ghost style button */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen((v) => !v)}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-transparent hover:bg-[#12355A] border border-[#2B4A6B] text-[#E6EEF7] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              aria-expanded={isMoreMenuOpen}
              title="More options"
            >
              <span>More</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#9FB3C8]" />
            </button>

            {isMoreMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-60 rounded-xl bg-white border border-[#CBD8E6] shadow-xl py-1.5 z-50 animate-in fade-in duration-100 text-xs text-[#1E293B]">
                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setShowReportingModal(true);
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-[#EAF1F8] flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Users className="w-4 h-4 text-[#0369A1] shrink-0" />
                  <div>
                    <div className="font-semibold text-[#0B2540] font-sans">Resident reporting</div>
                    <div className="text-[11px] text-[#475569] font-sans">Crowdsourced waterlogging reports</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    setShowAssumptionsModal(true);
                  }}
                  className="w-full px-3.5 py-2 text-left hover:bg-[#EAF1F8] flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <Info className="w-4 h-4 text-[#0369A1] shrink-0" />
                  <div>
                    <div className="font-semibold text-[#0B2540] font-sans">Assumptions</div>
                    <div className="text-[11px] text-[#475569] font-sans">Model methodology &amp; parameters</div>
                  </div>
                </button>

                <div className="border-t border-[#CBD8E6] my-1" />

                <button
                  type="button"
                  onClick={() => {
                    setIsMoreMenuOpen(false);
                    loadZoneData(currentZone, true);
                  }}
                  disabled={loading}
                  className="w-full px-3.5 py-2 text-left hover:bg-[#EAF1F8] flex items-center gap-2.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 text-[#0369A1] shrink-0 ${loading ? "animate-spin" : ""}`} />
                  <div>
                    <div className="font-semibold text-[#0B2540] font-sans">Refresh OSM</div>
                    <div className="text-[11px] text-[#475569] font-sans">Re-query OpenStreetMap live data</div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Workstation: Compact Left Sidebar + Detail Panel + Full-Width Map */}
      <div
        className="flex-1 flex flex-row relative min-h-0 overflow-hidden w-full"
        style={{
          height: "calc(100vh - 56px)",
          maxHeight: "calc(100vh - 56px)",
        }}
      >
        {/* 1. Compact Left Sidebar (240px wide, always visible on desktop, back-to-menu feel) */}
        <LeftSidebar
          activePanel={activePanel}
          onSelectPanel={handleSelectPanel}
          activeZoneHotspots={activeZoneHotspots}
          selectedHotspotIds={selectedHotspotIds}
          rainfallLevel={rainfallLevel}
          effectiveClosedRoadIds={effectiveClosedRoadIds}
          mapMode={mapMode}
          whatIfScenario={whatIfScenario}
          hospitalAccess={hospitalAccess}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* 2. Detail Panel Column (380px wide, directly to the right of sidebar, opens when activePanel is non-null) */}
        {activePanel && (
          <DetailPanel
            activePanel={activePanel}
            onClose={() => setActivePanel(null)}
            onSwitchPanel={(panel) => setActivePanel(panel)}
            activeZoneHotspots={activeZoneHotspots}
            selectedHotspotIds={selectedHotspotIds}
            onToggleHotspot={handleToggleHotspotWithAutoOpen}
            onSelectAllHotspots={handleSelectAllHotspotsWithAutoOpen}
            onClearHotspots={clearHotspots}
            onMonsoonPreset={handleMonsoonPresetWithAutoOpen}
            onSeverePreset={handleSeverePresetWithAutoOpen}
            rainfallLevel={rainfallLevel}
            onSetRainfallLevel={setRainfallLevel}
            roads={roads}
            closedRoadIds={effectiveClosedRoadIds}
            effectiveClosedRoadIds={effectiveClosedRoadIds}
            onToggleRoadClosed={toggleRoadClosed}
            selectedRoad={selectedRoad}
            onClearSelectedRoad={() => setSelectedRoad(null)}
            onResetClosures={resetClosures}
            mapMode={mapMode}
            onSetMapMode={setMapMode}
            showHotspotCircles={showHotspotCircles}
            onToggleHotspots={() => setShowHotspotCircles((v) => !v)}
            showHospitalNodes={showHospitalNodes}
            onToggleHospitalNodes={() => setShowHospitalNodes((v: boolean) => !v)}
            whatIfScenario={whatIfScenario}
            baselineTraffic={baselineTraffic}
            cascadeStepIndex={cascadeStepIndex}
            onSetCascadeStepIndex={setCascadeStepIndex}
            hospitalAccess={hospitalAccess}
            selectedHospitalAreaId={selectedHospitalAreaId}
            onSelectHospitalArea={setSelectedHospitalAreaId}
          />
        )}

        {/* 3. Map Viewport: gets the full remaining width and resizes automatically */}
        <main
          className="flex-1 relative bg-[#EAF1F8] overflow-hidden h-full min-w-0"
          style={{
            height: "calc(100vh - 56px)",
          }}
        >
          <RoadMap
            roads={roads}
            hospitals={hospitals}
            graph={graph}
            dataSource={dataSource}
            loading={loading}
            loadingMessage={loadingMessage}
            onRefresh={() => loadZoneData(currentZone, true)}
            selectedRoadId={selectedRoad?.id}
            onSelectRoad={(road) => setSelectedRoad(road)}
            baselineTraffic={baselineTraffic}
            odPairs={odPairs}
            whatIfScenario={whatIfScenario}
            closedRoadIds={effectiveClosedRoadIds}
            onToggleRoadClosed={toggleRoadClosed}
            selectedHotspotId={selectedHotspotId}
            onSelectHotspot={(id) => setSelectedHotspotId(id)}
            selectedHotspotIds={selectedHotspotIds}
            onToggleHotspot={handleToggleHotspotWithAutoOpen}
            rainfallLevel={rainfallLevel}
            activeTab={activeTab}
            cascadeStepIndex={cascadeStepIndex}
            onResetClosures={resetClosures}
            hospitalAccess={hospitalAccess}
            selectedHospitalAreaId={selectedHospitalAreaId}
            onSelectHospitalArea={setSelectedHospitalAreaId}
            showHospitalNodes={showHospitalNodes}
            onToggleHospitalNodes={() => setShowHospitalNodes((v: boolean) => !v)}
            currentZone={currentZone}
            onRunAnalysisArea={handleRunAnalysisArea}
            onResetToCentralDelhi={handleResetToCentralDelhi}
            resetTrigger={fitTrigger}
            fetchError={fetchError}
            onRetryAnalysis={() => loadZoneData(currentZone, true)}
            mapMode={mapMode}
            onSetMapMode={setMapMode}
            showHotspotCircles={showHotspotCircles}
            onToggleHotspots={() => setShowHotspotCircles((v) => !v)}
            panelState={activePanel}
          />
        </main>
      </div>

      {/* Model Assumptions Modal */}
      <ModelAssumptionsModal
        isOpen={showAssumptionsModal}
        onClose={() => setShowAssumptionsModal(false)}
      />

      {/* Resident Reporting Concept Mockup Modal */}
      <ResidentReportingModal
        isOpen={showReportingModal}
        onClose={() => setShowReportingModal(false)}
      />
    </div>
  );
}
