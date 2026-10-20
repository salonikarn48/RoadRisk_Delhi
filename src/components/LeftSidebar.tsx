import React from "react";
import { Link } from "react-router-dom";
import {
  Droplets,
  CloudRain,
  ShieldAlert,
  Layers,
  TrendingUp,
  Activity,
  Hospital as HospitalIcon,
  Award,
  Radio,
  X,
  ExternalLink,
} from "lucide-react";
import { WhatIfScenarioResult, RainfallLevel } from "../simulation/whatIfEngine";
import { HospitalAccessAnalysisResult } from "../simulation/hospitalAccessibilityEngine";

export type SidebarSectionKey =
  | "hotspots"
  | "rainfall"
  | "closures"
  | "layers"
  | "traffic"
  | "cascade"
  | "hospitals";

export interface LeftSidebarProps {
  activePanel: SidebarSectionKey | null;
  onSelectPanel: (panel: SidebarSectionKey) => void;
  // Parameter live values
  activeZoneHotspots: any[];
  selectedHotspotIds: string[];
  rainfallLevel: RainfallLevel;
  effectiveClosedRoadIds: Set<string>;
  mapMode: "utilization" | "hierarchy";
  whatIfScenario: WhatIfScenarioResult | null;
  hospitalAccess: HospitalAccessAnalysisResult | null;
  // Mobile responsiveness
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function LeftSidebar({
  activePanel,
  onSelectPanel,
  activeZoneHotspots,
  selectedHotspotIds,
  rainfallLevel,
  effectiveClosedRoadIds,
  mapMode,
  whatIfScenario,
  hospitalAccess,
  isMobileOpen = false,
  onCloseMobile,
}: LeftSidebarProps) {
  // Compute live values for each parameter
  const floodedHotspotCount = activeZoneHotspots.filter((h) =>
    selectedHotspotIds.includes(h.id)
  ).length;

  const rainfallLabel =
    rainfallLevel.charAt(0).toUpperCase() + rainfallLevel.slice(1);

  const closedCount = effectiveClosedRoadIds.size;

  const trafficImpactText = whatIfScenario?.hasActiveClosures
    ? `${whatIfScenario.avgTravelTimeDeltaPct >= 0 ? "+" : ""}${whatIfScenario.avgTravelTimeDeltaPct}% trip time`
    : "Nominal";

  const roadsOverCap =
    whatIfScenario?.secondaryGridlockRoads?.length ||
    whatIfScenario?.roadsPushedOverCapacity?.length ||
    0;

  const goldenHourBreachCount =
    hospitalAccess?.goldenHourBreachedAreas?.length || 0;
  const cutOffCount = hospitalAccess?.cutOffAreas?.length || 0;
  const delayedCount = hospitalAccess?.delayedAreas?.length || 0;

  // Menu item definitions grouped by SCENARIO, RESULTS, and VIEW
  const menuGroups: {
    label: string;
    items: {
      key: SidebarSectionKey;
      icon: React.ComponentType<{ className?: string }>;
      title: string;
      liveValue: string;
      valueClass?: string;
    }[];
  }[] = [
    {
      label: "SCENARIO",
      items: [
        {
          key: "hotspots",
          icon: Droplets,
          title: "Hotspots",
          liveValue: `${floodedHotspotCount} flooded`,
          valueClass:
            floodedHotspotCount > 0 ? "text-[#F87171] font-semibold" : "text-[#9FB3C8]",
        },
        {
          key: "rainfall",
          icon: CloudRain,
          title: "Rainfall",
          liveValue: rainfallLabel,
          valueClass:
            rainfallLevel === "Extreme"
              ? "text-[#F87171] font-semibold"
              : rainfallLevel === "Heavy"
              ? "text-[#FBBF24] font-semibold"
              : "text-[#E6EEF7]",
        },
        {
          key: "closures",
          icon: ShieldAlert,
          title: "Corridor closures",
          liveValue: `${closedCount} closed`,
          valueClass:
            closedCount > 0 ? "text-[#FBBF24] font-semibold" : "text-[#9FB3C8]",
        },
      ],
    },
    {
      label: "RESULTS",
      items: [
        {
          key: "traffic",
          icon: TrendingUp,
          title: "Traffic impact",
          liveValue: trafficImpactText,
          valueClass:
            whatIfScenario?.hasActiveClosures && whatIfScenario.avgTravelTimeDeltaPct > 0
              ? "text-[#67E8F9] font-semibold"
              : "text-[#9FB3C8]",
        },
        {
          key: "cascade",
          icon: Activity,
          title: "Cascade",
          liveValue:
            (whatIfScenario?.tripsDisconnectedPct || 0) > 20
              ? "Cascade not shown: most flows have no alternative route"
              : `${roadsOverCap} over cap`,
          valueClass:
            (whatIfScenario?.tripsDisconnectedPct || 0) > 20
              ? "text-amber-400 font-semibold"
              : roadsOverCap > 0
              ? "text-[#F87171] font-semibold"
              : "text-[#9FB3C8]",
        },
        {
          key: "hospitals",
          icon: HospitalIcon,
          title: "Hospital access",
          liveValue:
            cutOffCount > 0 && delayedCount > 0
              ? `${cutOffCount} cut off, ${delayedCount} >30m`
              : cutOffCount > 0
              ? `${cutOffCount} cut off`
              : delayedCount > 0
              ? `${delayedCount} >30m`
              : "All safe",
          valueClass:
            goldenHourBreachCount > 0
              ? "text-[#F87171] font-semibold"
              : "text-[#4ADE80] font-semibold",
        },
      ],
    },
    {
      label: "VIEW",
      items: [
        {
          key: "layers",
          icon: Layers,
          title: "Map layers",
          liveValue: mapMode === "utilization" ? "Utilization" : "Hierarchy",
          valueClass: "text-[#9FB3C8]",
        },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop for screens < 900px */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-[#0B2540]/60 backdrop-blur-xs z-40 min-[900px]:hidden"
          aria-hidden="true"
        />
      )}

      {/* Compact Menu Sidebar (240px wide, deep navy #0B2540) */}
      <aside
        className={`h-full flex flex-col bg-[#0B2540] border-r border-[#1A3B5C] shrink-0 select-none font-sans z-30 transition-all duration-200 text-[#E6EEF7] ${
          isMobileOpen
            ? "fixed inset-y-0 left-0 w-[240px] shadow-2xl flex"
            : "hidden min-[900px]:flex min-[900px]:w-[240px]"
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-3.5 border-b border-[#1A3B5C] flex items-center justify-between shrink-0 bg-[#0B2540]">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-bold uppercase tracking-wider text-[#9FB3C8] font-sans">
              Simulation Parameters
            </span>
          </div>

          {/* Close button on mobile */}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1 rounded-md text-[#9FB3C8] hover:text-[#E6EEF7] hover:bg-[#12355A] min-[900px]:hidden cursor-pointer"
              title="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Parameter List: Grouped by SCENARIO, RESULTS, VIEW */}
        <nav className="flex-1 py-2 overflow-y-auto space-y-3.5" aria-label="Parameters">
          {menuGroups.map((group) => (
            <div key={group.label} className="space-y-0.5">
              <div className="px-3.5 pt-1.5 pb-1 text-[12px] font-bold tracking-wider text-[#7DD3FC] font-sans uppercase">
                {group.label}
              </div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activePanel === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      onSelectPanel(item.key);
                      if (onCloseMobile && window.innerWidth < 900) {
                        onCloseMobile();
                      }
                    }}
                    className={`w-full px-3 py-2.5 flex items-center justify-between text-left transition-colors cursor-pointer group ${
                      isActive
                        ? "border-l-[4px] border-[#67E8F9] bg-[#0E7490] text-white font-semibold pl-[8px]"
                        : "border-l-[4px] border-transparent hover:bg-[#12355A] text-[#E6EEF7] pl-[8px]"
                    }`}
                    title={`${item.title}: ${item.liveValue}`}
                  >
                    {/* Left: Icon and Title */}
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className={`p-1 rounded-md shrink-0 transition-colors ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "text-[#9FB3C8] group-hover:text-[#67E8F9]"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[13px] truncate font-sans">
                        {item.title}
                      </span>
                    </div>

                    {/* Right: Live Value */}
                    <span
                      className={`text-[12px] font-mono tabular-nums shrink-0 text-right truncate max-w-[95px] ${
                        isActive ? "text-white/90 font-medium" : item.valueClass || "text-[#9FB3C8]"
                      }`}
                    >
                      {item.liveValue}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Navigation Links: Best Fixes & Live Feed */}
        <div className="p-3 border-t border-[#1A3B5C] space-y-1.5 shrink-0 bg-[#091D33]">
          <Link
            to="/best-fixes"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#12355A] hover:bg-[#1A4B7C] text-[13px] font-semibold text-[#E6EEF7] border border-[#2B4A6B] transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-[#4ADE80] group-hover:scale-110 transition-transform" />
              <span>Best Fixes</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[#9FB3C8] group-hover:text-[#67E8F9]" />
          </Link>

          <Link
            to="/live-feed"
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#12355A] hover:bg-[#1A4B7C] text-[13px] font-semibold text-[#E6EEF7] border border-[#2B4A6B] transition-all cursor-pointer group shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-[#67E8F9] group-hover:scale-110 transition-transform" />
              <span>Live Feed</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[#9FB3C8] group-hover:text-[#67E8F9]" />
          </Link>
        </div>
      </aside>
    </>
  );
}
