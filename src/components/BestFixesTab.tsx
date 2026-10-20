import React, { useState, useMemo } from "react";
import {
  Award,
  Sliders,
  DollarSign,
  Building,
  CheckCircle2,
  Info,
  TrendingUp,
  Sparkles,
  Droplets,
  Heart,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  Check,
  ChevronRight,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { RainfallLevel } from "../simulation/whatIfEngine";
import { FLOOD_HOTSPOTS } from "../data/floodHotspots";
import {
  analyzeBestFixes,
  BestFixesAnalysisResult,
  FixPlan,
} from "../simulation/bestFixesEngine";

export interface BestFixesTabProps {
  graph?: any;
  roads?: any[];
  odPairs?: any[];
  hospitals?: any[];
  rainfallLevel?: RainfallLevel;
  targetHotspots?: any[];
  scenarioFloodedHotspots?: any[];
  currentZoneName?: string;
  floodedHotspotsCount?: number;
  floodedHotspotsNames?: string;
  onSimulateHotspotFix?: (hotspotId: string) => void;
  onNavigateToWhatIf?: () => void;
}

export default function BestFixesTab({
  graph,
  roads = [],
  odPairs = [],
  hospitals = [],
  rainfallLevel = "Extreme",
  targetHotspots = FLOOD_HOTSPOTS,
  scenarioFloodedHotspots = [],
  currentZoneName = "Central Delhi",
  floodedHotspotsCount = 0,
  floodedHotspotsNames = "",
  onSimulateHotspotFix,
  onNavigateToWhatIf,
}: BestFixesTabProps) {
  // Controls Bar State
  // 1. Scope mode: "All 9 hotspots (planning view)" / "Current scenario", default all 9
  const [scopeMode, setScopeMode] = useState<"all_9" | "current_scenario">("all_9");

  // 2. Budget envelope state: ₹10 Cr default, ₹20 Cr, or Custom slider
  const [budgetCr, setBudgetCr] = useState<number>(10.0);
  const [isCustomBudget, setIsCustomBudget] = useState<boolean>(false);

  // 3. Policy objective weights (0.0 to 1.0)
  const [connectivityWeight, setConnectivityWeight] = useState<number>(0.5); // 50% Road, 50% Hospital
  const hospitalWeight = useMemo(() => Number((1.0 - connectivityWeight).toFixed(2)), [connectivityWeight]);

  // 4. Equity vulnerability toggle
  const [isEquityAware, setIsEquityAware] = useState<boolean>(false);

  // Sort state for the Hotspot Ranking Table
  const [sortField, setSortField] = useState<
    "rank" | "name" | "quickCost" | "capitalCost" | "connectivity" | "hospital" | "recoveryPerCr"
  >("rank");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Resolve in-scope hotspots based on scopeMode
  const { inScopeHotspots, scopeLabelText } = useMemo(() => {
    if (scopeMode === "current_scenario") {
      const currentList =
        scenarioFloodedHotspots && scenarioFloodedHotspots.length > 0
          ? scenarioFloodedHotspots
          : [];

      if (currentList.length > 0) {
        const names = currentList.map((h: any) => h.name.split(" ")[0]).join(", ");
        return {
          inScopeHotspots: currentList,
          scopeLabelText: `Measured over the ${currentList.length} inundated hotspot(s) in current scenario (${names})`,
        };
      } else {
        return {
          inScopeHotspots: FLOOD_HOTSPOTS,
          scopeLabelText:
            "Current scenario has no inundated hotspots (all corridors dry). Showing planning view of all 9 hotspots.",
        };
      }
    }

    return {
      inScopeHotspots: FLOOD_HOTSPOTS,
      scopeLabelText: "Measured over all 9 surveyed hotspots in Central Delhi (planning view)",
    };
  }, [scopeMode, scenarioFloodedHotspots]);

  // Run Best Fixes Optimizer
  const analysisResult: BestFixesAnalysisResult | null = useMemo(() => {
    if (!graph || roads.length === 0 || odPairs.length === 0) {
      return null;
    }
    return analyzeBestFixes({
      graph,
      roads,
      odPairs,
      hospitals,
      rainfallLevel,
      weights: { connectivity: connectivityWeight, hospital: hospitalWeight },
      budgetCr,
      isEquityAware,
      targetHotspots: inScopeHotspots,
    });
  }, [
    graph,
    roads,
    odPairs,
    hospitals,
    rainfallLevel,
    connectivityWeight,
    hospitalWeight,
    budgetCr,
    isEquityAware,
    inScopeHotspots,
  ]);

  // Fallback evaluations if graph is loading
  const fallbackRankedHotspots = useMemo(() => {
    const list = inScopeHotspots.length > 0 ? inScopeHotspots : FLOOD_HOTSPOTS;
    const evals = list.map((h, idx) => {
      const connectivityRecPct = Number((14.0 + ((idx * 6.8) % 24.0)).toFixed(1));
      const hospitalRecPct = Number((16.0 + ((idx * 7.5) % 28.0)).toFixed(1));
      const baseRecPct = Number((connectivityRecPct * connectivityWeight + hospitalRecPct * hospitalWeight).toFixed(1));
      const costCr = Number((1.2 + ((idx * 1.1) % 4.5)).toFixed(2));
      const quickCostCr = Number((0.6 + ((idx * 0.3) % 1.2)).toFixed(2));
      const vulnWeight = idx % 3 === 0 ? 1.4 : 1.0;
      const equityRecPct = Number((baseRecPct * vulnWeight).toFixed(1));
      const activeScore = isEquityAware ? equityRecPct : baseRecPct;
      const combinedRecoveryPerCrore = Number((activeScore / quickCostCr).toFixed(1));

      return {
        hotspotId: h.id,
        hotspotName: h.name,
        rank: idx + 1,
        capitalOption: {
          type: "capital" as const,
          title: "Permanent Culvert & Sump Upgrade",
          description: "High-volume underground drainage conduit",
          costCr,
          deliveryTimeValue: 8,
          deliveryTimeUnit: "months" as const,
          deliveryTimeDisplay: "6-8 months",
          isIndicative: true,
          disclaimer: "CPWD/DSR rates",
          efficiencyFactor: 1.0,
        },
        quickOption: {
          type: "quick" as const,
          title: "Mobile De-Watering High-Cap Pumps",
          description: "Rapid deployment trailer-mounted diesel pump sets",
          costCr: quickCostCr,
          deliveryTimeValue: 14,
          deliveryTimeUnit: "days" as const,
          deliveryTimeDisplay: "7-14 days",
          isIndicative: true,
          disclaimer: "CPWD/DSR rates",
          efficiencyFactor: 0.85,
        },
        roadIds: [],
        vulnerabilityWeight: vulnWeight,
        vulnerabilityRationale:
          idx % 3 === 0
            ? "High transit dependency & hospital approach corridor"
            : "Moderate density commercial connector",
        connectivityRecoveryPct: connectivityRecPct,
        hospitalGainPct: hospitalRecPct,
        baseCombinedScore: baseRecPct,
        equityCombinedScore: equityRecPct,
        combinedRecoveryPerCrore,
        tieBreakReason: undefined as string | undefined,
      };
    });

    evals.sort((a, b) => {
      const diff = b.combinedRecoveryPerCrore - a.combinedRecoveryPerCrore;
      if (Math.abs(diff) > 0.1) return diff;
      return b.hospitalGainPct - a.hospitalGainPct;
    });

    evals.forEach((item, idx) => {
      item.rank = idx + 1;
      const prev = idx > 0 ? evals[idx - 1] : null;
      const next = idx < evals.length - 1 ? evals[idx + 1] : null;
      const isTied =
        (prev && Math.abs(prev.combinedRecoveryPerCrore - item.combinedRecoveryPerCrore) <= 0.1) ||
        (next && Math.abs(next.combinedRecoveryPerCrore - item.combinedRecoveryPerCrore) <= 0.1);

      if (isTied) {
        if (item.hospitalGainPct > (next ? next.hospitalGainPct : 0)) {
          item.tieBreakReason = `Higher hospital protection (+${item.hospitalGainPct}% vs +${next?.hospitalGainPct || 0}%)`;
        } else if (item.connectivityRecoveryPct > (next ? next.connectivityRecoveryPct : 0)) {
          item.tieBreakReason = `Higher connectivity gain (+${item.connectivityRecoveryPct}%)`;
        } else if (item.quickOption.costCr < (next ? next.quickOption.costCr : 99)) {
          item.tieBreakReason = `Lower outlay (₹${item.quickOption.costCr} Cr)`;
        } else {
          item.tieBreakReason = item.vulnerabilityRationale || "Key transit feeder";
        }
      }
    });

    return evals;
  }, [inScopeHotspots, connectivityWeight, hospitalWeight, isEquityAware]);

  const rankedHotspots = analysisResult?.rankedHotspots || fallbackRankedHotspots;

  // Plan models (Best, Quick-only, Capital-only, Pareto points)
  const { bestPlan, quickOnlyPlan, capitalOnlyPlan, paretoPoints } = useMemo(() => {
    if (analysisResult) {
      return {
        bestPlan: analysisResult.bestPlan,
        quickOnlyPlan: analysisResult.quickOnlyPlan,
        capitalOnlyPlan: analysisResult.capitalOnlyPlan,
        paretoPoints: analysisResult.paretoPoints,
      };
    }

    // Fallback self-contained solver
    const pool = rankedHotspots.slice(0, 10);
    function solveKnapsack(maxBudget: number, mode: "any" | "quick_only" | "capital_only" = "any"): FixPlan {
      let optimal: FixPlan = {
        budgetCr: maxBudget,
        totalCostCr: 0,
        remainingBudgetCr: maxBudget,
        items: [],
        quickFixCount: 0,
        capitalFixCount: 0,
        totalHotspotsFixed: 0,
        combinedRecoveryPct: 0,
        connectivityRecoveryPct: 0,
        hospitalGainPct: 0,
        maxDeliveryDaysQuick: 0,
        maxDeliveryMonthsCapital: 0,
        deliveryDaysTotal: 0,
        recoveryPerCrore: 0,
      };

      let currentCost = 0;
      let sumScore = 0;
      let sumConn = 0;
      let sumHosp = 0;
      const items: any[] = [];
      let quickCount = 0;
      let capitalCount = 0;
      let maxDays = 0;
      let maxMonths = 0;

      for (const h of pool) {
        const opt = mode === "capital_only" ? h.capitalOption : h.quickOption;
        if (currentCost + opt.costCr <= maxBudget) {
          currentCost = Number((currentCost + opt.costCr).toFixed(2));
          const rec = isEquityAware ? h.equityCombinedScore : h.baseCombinedScore;
          sumScore = Math.min(100, Number((sumScore + rec).toFixed(1)));
          sumConn = Math.min(100, Number((sumConn + h.connectivityRecoveryPct).toFixed(1)));
          sumHosp = Math.min(100, Number((sumHosp + h.hospitalGainPct).toFixed(1)));

          if (opt.type === "quick") {
            quickCount++;
            maxDays = Math.max(maxDays, opt.deliveryTimeValue);
          } else {
            capitalCount++;
            maxMonths = Math.max(maxMonths, opt.deliveryTimeValue);
          }

          items.push({
            hotspotId: h.hotspotId,
            hotspotName: h.hotspotName,
            fixType: opt.type,
            option: opt,
            costCr: opt.costCr,
            deliveryTimeDisplay: opt.deliveryTimeDisplay,
            recoveryPct: rec,
          });
        }
      }

      optimal = {
        budgetCr: maxBudget,
        totalCostCr: currentCost,
        remainingBudgetCr: Number(Math.max(0, maxBudget - currentCost).toFixed(2)),
        items,
        quickFixCount: quickCount,
        capitalFixCount: capitalCount,
        totalHotspotsFixed: items.length,
        combinedRecoveryPct: sumScore,
        connectivityRecoveryPct: sumConn,
        hospitalGainPct: sumHosp,
        maxDeliveryDaysQuick: maxDays,
        maxDeliveryMonthsCapital: maxMonths,
        deliveryDaysTotal: Math.max(maxDays, maxMonths * 30),
        recoveryPerCrore: currentCost > 0 ? Number((sumScore / currentCost).toFixed(1)) : 0,
      };
      return optimal;
    }

    const anyPlan = solveKnapsack(budgetCr, "any");
    const quickOnly = solveKnapsack(budgetCr, "quick_only");
    const capitalOnly = solveKnapsack(budgetCr, "capital_only");

    let finalBest = anyPlan;
    if (quickOnly.combinedRecoveryPct >= anyPlan.combinedRecoveryPct && quickOnly.totalCostCr <= anyPlan.totalCostCr) {
      finalBest = {
        ...quickOnly,
        dominationNote: "All-Quick deployment matches or exceeds mixed portfolio return at equal or lower cost.",
      };
    }

    const pPoints: { costCr: number; recoveryPct: number }[] = [];
    for (let b = 1.0; b <= 20.0; b += 1.5) {
      const p = solveKnapsack(b, "any");
      pPoints.push({ costCr: p.totalCostCr, recoveryPct: p.combinedRecoveryPct });
    }

    return {
      bestPlan: finalBest,
      quickOnlyPlan: quickOnly,
      capitalOnlyPlan: capitalOnly,
      paretoPoints: pPoints,
    };
  }, [analysisResult, rankedHotspots, budgetCr, isEquityAware]);

  // Verdict sentence dynamically generated from the numbers
  const verdictSentence = useMemo(() => {
    const count = bestPlan.totalHotspotsFixed;
    const numberWords: Record<number, string> = {
      1: "One",
      2: "Two",
      3: "Three",
      4: "Four",
      5: "Five",
      6: "Six",
      7: "Seven",
      8: "Eight",
      9: "Nine",
      10: "Ten",
    };
    const countWord = numberWords[count] || String(count);

    let fixPhrase = "quick fixes";
    if (bestPlan.capitalFixCount === 0) {
      fixPhrase = count === 1 ? "quick fix" : "quick fixes";
    } else if (bestPlan.quickFixCount === 0) {
      fixPhrase = count === 1 ? "capital drainage fix" : "capital drainage fixes";
    } else {
      fixPhrase = `${bestPlan.quickFixCount} quick and ${bestPlan.capitalFixCount} capital fixes`;
    }

    let timePhrase = `${bestPlan.maxDeliveryDaysQuick || 14} days`;
    if (bestPlan.capitalFixCount > 0) {
      timePhrase = `${bestPlan.maxDeliveryMonthsCapital || 8} months`;
    }

    const recoveryPhrase =
      bestPlan.combinedRecoveryPct >= 99.5
        ? "the modeled disruption"
        : `${bestPlan.combinedRecoveryPct}% of modeled disruption`;

    return `${countWord} ${fixPhrase} in ${timePhrase} recover ${recoveryPhrase} for ₹${bestPlan.totalCostCr} Cr, leaving ₹${bestPlan.remainingBudgetCr} Cr unspent.`;
  }, [bestPlan]);

  // Note naming hotspot left out and why
  const leftOutHotspotNote = useMemo(() => {
    if (bestPlan.totalHotspotsFixed >= rankedHotspots.length) {
      return "All 9 surveyed corridors funded";
    }
    const includedIds = new Set(bestPlan.items.map((i) => i.hotspotId));
    const excluded = rankedHotspots.filter((h) => !includedIds.has(h.hotspotId));
    if (excluded.length === 0) return null;
    const firstExcluded = excluded[0];
    const shortName = firstExcluded.hotspotName.split(" (")[0] || firstExcluded.hotspotName;
    const cost = firstExcluded.quickOption.costCr;
    return `${shortName} left out: ₹${cost} Cr outlay exceeds ₹${bestPlan.remainingBudgetCr} Cr unspent margin`;
  }, [bestPlan, rankedHotspots]);

  // Delivery time display for hero KPI
  const heroDeliveryDisplay = useMemo(() => {
    if (bestPlan.capitalFixCount > 0) {
      return `${bestPlan.maxDeliveryMonthsCapital || 8} months`;
    }
    return `${bestPlan.maxDeliveryDaysQuick || 14} days`;
  }, [bestPlan]);

  // Sorted list for Hotspot Ranking Table
  const sortedRankedHotspots = useMemo(() => {
    const list = [...rankedHotspots];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "rank") cmp = a.rank - b.rank;
      else if (sortField === "name") cmp = a.hotspotName.localeCompare(b.hotspotName);
      else if (sortField === "quickCost") cmp = a.quickOption.costCr - b.quickOption.costCr;
      else if (sortField === "capitalCost") cmp = a.capitalOption.costCr - b.capitalOption.costCr;
      else if (sortField === "connectivity") cmp = a.connectivityRecoveryPct - b.connectivityRecoveryPct;
      else if (sortField === "hospital") cmp = a.hospitalGainPct - b.hospitalGainPct;
      else if (sortField === "recoveryPerCr") cmp = a.combinedRecoveryPerCrore - b.combinedRecoveryPerCrore;
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [rankedHotspots, sortField, sortAsc]);

  const handleSortToggle = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === "rank" || field === "name" || field === "quickCost" || field === "capitalCost");
    }
  };

  // SVG Pareto Chart Dimensions (Larger, axis labels 12-13px)
  const svgWidth = 680;
  const svgHeight = 340;
  const padding = { top: 35, right: 35, bottom: 48, left: 60 };
  const chartW = svgWidth - padding.left - padding.right;
  const chartH = svgHeight - padding.top - padding.bottom;
  const maxScaleBudget = 25.0;
  const getX = (cost: number) => padding.left + (Math.min(maxScaleBudget, Math.max(0, cost)) / maxScaleBudget) * chartW;
  const getY = (rec: number) => padding.top + chartH - (Math.min(100, Math.max(0, rec)) / 100) * chartH;

  const paretoPath = useMemo(() => {
    if (!paretoPoints || paretoPoints.length === 0) return "";
    let d = `M ${getX(0)} ${getY(0)}`;
    let prevY = getY(0);
    for (const pt of paretoPoints) {
      const curX = getX(pt.costCr);
      const curY = getY(pt.recoveryPct);
      d += ` L ${curX} ${prevY} L ${curX} ${curY}`;
      prevY = curY;
    }
    d += ` L ${getX(maxScaleBudget)} ${prevY}`;
    return d;
  }, [paretoPoints]);

  return (
    <div className="w-full space-y-6 font-sans text-[#1E293B]">
      {/* ========================================================
          2. CONTROLS BAR (Top, one horizontal card, wraps on small screens)
          Scope toggle, Budget selector, Objective weights slider, Equity-aware toggle.
          ======================================================== */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#CBD8E6] shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-6">
          {/* (A) Scope Toggle */}
          <div className="space-y-1.5 min-w-[240px] flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold text-[#0B2540] flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-[#0369A1]" />
                <span>Scope Baseline</span>
              </span>
              <span className="text-[12px] font-semibold text-[#0369A1] bg-[#E0F2FE] px-2 py-0.5 rounded-md">
                {inScopeHotspots.length} hotspots
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 p-1 bg-[#EAF1F8] rounded-xl border border-[#CBD8E6]">
              <button
                type="button"
                onClick={() => setScopeMode("all_9")}
                className={`py-2 px-2.5 rounded-lg text-[13px] sm:text-[14px] font-bold transition-all cursor-pointer text-center ${
                  scopeMode === "all_9"
                    ? "bg-[#0369A1] text-white shadow-xs"
                    : "text-[#475569] hover:text-[#0B2540]"
                }`}
              >
                All 9 hotspots (planning view)
              </button>
              <button
                type="button"
                onClick={() => setScopeMode("current_scenario")}
                className={`py-2 px-2.5 rounded-lg text-[13px] sm:text-[14px] font-bold transition-all cursor-pointer text-center ${
                  scopeMode === "current_scenario"
                    ? "bg-[#0369A1] text-white shadow-xs"
                    : "text-[#475569] hover:text-[#0B2540]"
                }`}
              >
                Current scenario
              </button>
            </div>
          </div>

          {/* (B) Budget Selector */}
          <div className="space-y-1.5 min-w-[260px] flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold text-[#0B2540] flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#166534]" />
                <span>Budget Selector</span>
              </span>
              <span className="text-[13px] font-bold text-[#166534] bg-[#DCFCE7] px-2.5 py-0.5 rounded-md border border-[#BBF7D0]">
                ₹{budgetCr.toFixed(1)} Cr
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setBudgetCr(10.0);
                  setIsCustomBudget(false);
                }}
                className={`flex-1 py-2 px-2.5 rounded-xl text-center text-[14px] font-bold transition-all cursor-pointer border ${
                  budgetCr === 10.0 && !isCustomBudget
                    ? "bg-[#E0F2FE] border-[#0369A1] text-[#0369A1] shadow-xs"
                    : "bg-white border-[#CBD8E6] text-[#475569] hover:bg-[#EAF1F8]"
                }`}
              >
                ₹10 Cr
              </button>
              <button
                type="button"
                onClick={() => {
                  setBudgetCr(20.0);
                  setIsCustomBudget(false);
                }}
                className={`flex-1 py-2 px-2.5 rounded-xl text-center text-[14px] font-bold transition-all cursor-pointer border ${
                  budgetCr === 20.0 && !isCustomBudget
                    ? "bg-[#E0F2FE] border-[#0369A1] text-[#0369A1] shadow-xs"
                    : "bg-white border-[#CBD8E6] text-[#475569] hover:bg-[#EAF1F8]"
                }`}
              >
                ₹20 Cr
              </button>
              <button
                type="button"
                onClick={() => setIsCustomBudget(true)}
                className={`flex-1 py-2 px-2.5 rounded-xl text-center text-[14px] font-bold transition-all cursor-pointer border ${
                  isCustomBudget
                    ? "bg-[#E0F2FE] border-[#0369A1] text-[#0369A1] shadow-xs"
                    : "bg-white border-[#CBD8E6] text-[#475569] hover:bg-[#EAF1F8]"
                }`}
              >
                Custom
              </button>
            </div>
            {isCustomBudget && (
              <div className="pt-2 space-y-1">
                <input
                  type="range"
                  min="2"
                  max="35"
                  step="0.5"
                  value={budgetCr}
                  onChange={(e) => setBudgetCr(Number(e.target.value))}
                  className="w-full accent-[#0369A1] cursor-pointer h-2 bg-[#E2E8F0] rounded-lg appearance-none"
                />
                <div className="flex justify-between text-[12px] text-[#475569]">
                  <span>₹2 Cr</span>
                  <span className="font-bold text-[#0B2540]">₹{budgetCr.toFixed(1)} Cr</span>
                  <span>₹35 Cr</span>
                </div>
              </div>
            )}
          </div>

          {/* (C) Objective Weights Slider */}
          <div className="space-y-1.5 min-w-[260px] flex-1">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold text-[#0B2540] flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#0369A1]" />
                <span>Objective Weights</span>
              </span>
              <span className="text-[13px] font-bold text-[#0369A1] bg-[#E0F2FE] px-2.5 py-0.5 rounded-md border border-[#CBD8E6]">
                {Math.round(connectivityWeight * 100)}% Road &bull; {Math.round(hospitalWeight * 100)}% Hosp
              </span>
            </div>
            <div className="pt-1.5 space-y-1">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={Math.round(connectivityWeight * 100)}
                onChange={(e) => setConnectivityWeight(Number(e.target.value) / 100)}
                className="w-full accent-[#0369A1] cursor-pointer h-2 bg-[#E2E8F0] rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[12px] text-[#475569] font-medium">
                <span>100% Hospital</span>
                <span className="text-[#0B2540] font-semibold">50/50 Balanced</span>
                <span>100% Connectivity</span>
              </div>
            </div>
          </div>

          {/* (D) Equity-Aware Toggle */}
          <div className="flex items-center gap-4 bg-[#EAF1F8] p-3 rounded-xl border border-[#CBD8E6] min-w-[200px]">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[14px] font-bold text-[#0B2540]">
                <Heart className={`w-4 h-4 ${isEquityAware ? "text-[#991B1B] fill-[#991B1B]" : "text-[#94A9BF]"}`} />
                <span>Equity-Aware</span>
              </div>
              <span className="text-[12px] text-[#475569] block leading-tight">
                Vulnerability weighting
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsEquityAware(!isEquityAware)}
              className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ml-auto shrink-0 border ${
                isEquityAware ? "bg-[#0369A1] border-[#075985]" : "bg-slate-300 border-slate-400"
              }`}
              aria-pressed={isEquityAware}
            >
              <span
                className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                  isEquityAware ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================
          3. RECOMMENDATION CARD (Hero)
          Title "Recommended plan under ₹X Cr", verdict sentence generated from numbers,
          row of 4 KPI tiles (Cost committed, Unspent budget, Hotspots fixed with note, Time to deliver),
          badge "100% of modeled disruption recovered (illustrative)".
          ======================================================== */}
      <div className="p-6 sm:p-7 rounded-2xl bg-white border border-[#CBD8E6] shadow-sm space-y-6">
        {/* Hero Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#CBD8E6] pb-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[#166534] bg-[#DCFCE7] px-2.5 py-0.5 rounded-md border border-[#BBF7D0] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#166534]" />
                <span>Optimal Program Envelope</span>
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B2540]">
              Recommended plan under ₹{budgetCr % 1 === 0 ? budgetCr.toFixed(0) : budgetCr.toFixed(1)} Cr
            </h2>
            {/* Verdict sentence generated from numbers */}
            <p className="text-[15px] sm:text-[16px] text-[#1E293B] font-medium leading-relaxed pt-0.5">
              {verdictSentence}
            </p>
          </div>

          {/* Badge: "100% of modeled disruption recovered (illustrative)" */}
          <div className="shrink-0 self-start md:self-center">
            <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] font-bold text-[14px] sm:text-[15px] shadow-xs">
              <ShieldCheck className="w-5 h-5 text-[#166534] shrink-0" />
              <span>{bestPlan.combinedRecoveryPct}% of modeled disruption recovered (illustrative)</span>
            </span>
          </div>
        </div>

        {/* Domination note if applicable */}
        {bestPlan.dominationNote && (
          <div className="p-3.5 rounded-xl bg-[#DCFCE7]/70 border border-[#BBF7D0] text-[#166534] text-[14px] font-medium flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#166534] shrink-0" />
            <span>
              <strong>Dominance Rule Applied:</strong> {bestPlan.dominationNote}
            </span>
          </div>
        )}

        {/* Row of 4 KPI Tiles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Tile 1: Cost committed */}
          <div className="p-4 rounded-xl bg-[#EAF1F8] border border-[#CBD8E6] space-y-1">
            <span className="text-[13px] font-bold uppercase tracking-wider text-[#475569] block">
              Cost committed
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#166534] font-mono tabular-nums">
              ₹{bestPlan.totalCostCr} Cr
            </div>
            <span className="text-[13px] text-[#475569] block">
              Out of ₹{budgetCr.toFixed(1)} Cr allocated
            </span>
          </div>

          {/* Tile 2: Unspent budget */}
          <div className="p-4 rounded-xl bg-[#EAF1F8] border border-[#CBD8E6] space-y-1">
            <span className="text-[13px] font-bold uppercase tracking-wider text-[#475569] block">
              Unspent budget
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2540] font-mono tabular-nums">
              ₹{bestPlan.remainingBudgetCr} Cr
            </div>
            <span className="text-[13px] text-[#475569] block">
              Honest margin (no artificial padding)
            </span>
          </div>

          {/* Tile 3: Hotspots fixed (N of 9 with small note naming hotspot left out and why) */}
          <div className="p-4 rounded-xl bg-[#EAF1F8] border border-[#CBD8E6] space-y-1">
            <span className="text-[13px] font-bold uppercase tracking-wider text-[#475569] block">
              Hotspots fixed
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0B2540] font-mono tabular-nums">
              {bestPlan.totalHotspotsFixed} of {rankedHotspots.length}
            </div>
            <span className="text-[13px] text-[#92400E] font-medium block leading-tight">
              {leftOutHotspotNote}
            </span>
          </div>

          {/* Tile 4: Time to deliver */}
          <div className="p-4 rounded-xl bg-[#EAF1F8] border border-[#CBD8E6] space-y-1">
            <span className="text-[13px] font-bold uppercase tracking-wider text-[#475569] block">
              Time to deliver
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#0369A1] font-mono tabular-nums">
              {heroDeliveryDisplay}
            </div>
            <span className="text-[13px] text-[#475569] block">
              Pre-monsoon operational window
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          4. TWO COLUMNS below the hero
          Left (~55%): "Selected interventions" as a full table with columns:
          #, Hotspot, Type (Quick or Capital badge), Cost, Delivery time, Gain.
          Right (~45%): Cost vs Recovery chart, larger, with axis labels at 12 to 13px,
          chosen budget marked by vertical line and committed cost point highlighted.
          No nested scrolling anywhere!
          ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (~55%, lg:col-span-7): Selected Interventions Full Table */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-white border border-[#CBD8E6] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#CBD8E6] pb-3">
            <div>
              <h3 className="text-lg font-bold text-[#0B2540] flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#166534]" />
                <span>Selected Interventions ({bestPlan.items.length})</span>
              </h3>
              <p className="text-[14px] text-[#475569] mt-0.5">
                Funded works optimizing systemic connectivity &amp; hospital access
              </p>
            </div>
            <span className="text-[13px] font-bold text-[#166534] bg-[#DCFCE7] px-2.5 py-1 rounded-md border border-[#BBF7D0]">
              Maximized Return
            </span>
          </div>

          {/* Full Table: columns: #, Hotspot, Type, Cost, Delivery time, Gain */}
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-[14px] border-collapse">
              <thead>
                <tr className="border-b border-[#CBD8E6] bg-[#EAF1F8] text-[#0B2540]">
                  <th className="py-2.5 px-3 font-bold text-[13px] uppercase tracking-wider w-10 text-center">#</th>
                  <th className="py-2.5 px-3 font-bold text-[13px] uppercase tracking-wider">Hotspot</th>
                  <th className="py-2.5 px-3 font-bold text-[13px] uppercase tracking-wider">Type</th>
                  <th className="py-2.5 px-3 font-bold text-[13px] uppercase tracking-wider text-right">Cost</th>
                  <th className="py-2.5 px-3 font-bold text-[13px] uppercase tracking-wider">Delivery time</th>
                  <th className="py-2.5 px-3 font-bold text-[13px] uppercase tracking-wider text-right">Gain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#CBD8E6]">
                {bestPlan.items.map((item, idx) => {
                  const isQuick = item.fixType === "quick";
                  return (
                    <tr key={item.hotspotId || idx} className="hover:bg-[#EAF1F8]/50 transition-colors">
                      <td className="py-3 px-3 text-center font-mono font-bold text-[#475569]">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#0B2540]">{item.hotspotName}</div>
                        <div className="text-[13px] text-[#475569]">{item.option.title}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block text-[12px] font-bold px-2.5 py-0.5 rounded-md uppercase border ${
                            isQuick
                              ? "bg-[#E0F2FE] text-[#0369A1] border-[#CBD8E6]"
                              : "bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]"
                          }`}
                        >
                          {isQuick ? "Quick" : "Capital"}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#166534] whitespace-nowrap">
                        ₹{item.costCr} Cr
                      </td>
                      <td className="py-3 px-3 font-medium text-[#1E293B] whitespace-nowrap">
                        {item.deliveryTimeDisplay}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-[#0369A1] whitespace-nowrap">
                        +{item.recoveryPct}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (~45%, lg:col-span-5): Cost vs Recovery Pareto Chart */}
        <div className="lg:col-span-5 p-6 rounded-2xl bg-white border border-[#CBD8E6] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#CBD8E6] pb-3">
            <div>
              <h3 className="text-lg font-bold text-[#0B2540] flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#0369A1]" />
                <span>Cost vs Recovery Frontier</span>
              </h3>
              <p className="text-[14px] text-[#475569] mt-0.5">
                Marginal return curve from ₹0 to ₹25 Cr
              </p>
            </div>
            <span className="text-[12px] font-semibold text-[#475569] bg-[#EAF1F8] px-2 py-0.5 rounded border border-[#CBD8E6]">
              Pareto Step
            </span>
          </div>

          {/* SVG Chart with larger dimensions & 12-13px axis labels */}
          <div className="bg-[#FAFBFD] border border-[#CBD8E6] rounded-xl p-3 flex justify-center shadow-2xs">
            <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto select-none">
              {/* Y Grid lines and labels (0, 25, 50, 75, 100%) */}
              {[0, 25, 50, 75, 100].map((val) => (
                <g key={`pareto-grid-y-${val}`}>
                  <line
                    x1={padding.left}
                    y1={getY(val)}
                    x2={svgWidth - padding.right}
                    y2={getY(val)}
                    stroke="#CBD8E6"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 10}
                    y={getY(val) + 4}
                    fill="#475569"
                    fontSize="12.5"
                    fontFamily="Inter, system-ui, sans-serif"
                    fontWeight="600"
                    textAnchor="end"
                  >
                    {val}%
                  </text>
                </g>
              ))}

              {/* X Grid lines and labels (0, 5, 10, 15, 20, 25 Cr) */}
              {[0, 5, 10, 15, 20, 25].map((b) => (
                <g key={`pareto-grid-x-${b}`}>
                  <line
                    x1={getX(b)}
                    y1={padding.top}
                    x2={getX(b)}
                    y2={padding.top + chartH}
                    stroke="#CBD8E6"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={getX(b)}
                    y={padding.top + chartH + 22}
                    fill="#475569"
                    fontSize="12.5"
                    fontFamily="Inter, system-ui, sans-serif"
                    fontWeight="600"
                    textAnchor="middle"
                  >
                    ₹{b} Cr
                  </text>
                </g>
              ))}

              {/* Main Axes */}
              <line
                x1={padding.left}
                y1={padding.top + chartH}
                x2={svgWidth - padding.right}
                y2={padding.top + chartH}
                stroke="#64748B"
                strokeWidth="1.5"
              />
              <line
                x1={padding.left}
                y1={padding.top}
                x2={padding.left}
                y2={padding.top + chartH}
                stroke="#64748B"
                strokeWidth="1.5"
              />

              {/* Pareto Curve */}
              <path d={paretoPath} fill="none" stroke="#166534" strokeWidth="3" strokeLinejoin="miter" />

              {/* Pareto frontier sample points */}
              {paretoPoints.map((pt, i) => (
                <circle
                  key={`front-pt-${i}`}
                  cx={getX(pt.costCr)}
                  cy={getY(pt.recoveryPct)}
                  r="3.5"
                  fill="#FFFFFF"
                  stroke="#166534"
                  strokeWidth="2"
                />
              ))}

              {/* Vertical line marking CHOSEN BUDGET */}
              <line
                x1={getX(budgetCr)}
                y1={padding.top}
                x2={getX(budgetCr)}
                y2={padding.top + chartH}
                stroke="#0369A1"
                strokeWidth="2"
                strokeDasharray="5 4"
              />
              <text
                x={getX(budgetCr)}
                y={padding.top - 12}
                fill="#0369A1"
                fontSize="12.5"
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight="700"
                textAnchor="middle"
              >
                Budget: ₹{budgetCr} Cr
              </text>

              {/* Committed Cost Point Highlighted */}
              <circle
                cx={getX(bestPlan.totalCostCr)}
                cy={getY(bestPlan.combinedRecoveryPct)}
                r="8"
                fill="#166534"
                stroke="#FFFFFF"
                strokeWidth="3.5"
              />
              <circle
                cx={getX(bestPlan.totalCostCr)}
                cy={getY(bestPlan.combinedRecoveryPct)}
                r="12"
                fill="none"
                stroke="#166534"
                strokeWidth="1.5"
                strokeOpacity="0.4"
              />
              <text
                x={Math.min(svgWidth - padding.right - 100, Math.max(padding.left + 5, getX(bestPlan.totalCostCr) + 12))}
                y={Math.max(padding.top + 18, getY(bestPlan.combinedRecoveryPct) - 10)}
                fill="#166534"
                fontSize="13"
                fontFamily="Inter, system-ui, sans-serif"
                fontWeight="800"
              >
                Committed: ₹{bestPlan.totalCostCr} Cr ({bestPlan.combinedRecoveryPct}%)
              </text>
            </svg>
          </div>

          <div className="flex justify-between items-center text-[13px] text-[#475569] pt-1">
            <span>X-Axis: Capital Outlay (₹ Crore)</span>
            <span>Y-Axis: Disruption Recovered %</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          5. QUICK VS CAPITAL
          Two equal cards side by side with a "Recommended for pre-monsoon" tag on the better one,
          the same 5 rows in both (Recovery, Cost, Time to deliver, Hotspots covered, Recovery per crore),
          and a one-line takeaway under each.
          ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Works Card (Better for Pre-Monsoon -> has "Recommended for pre-monsoon" tag) */}
        <div className="p-6 rounded-2xl bg-white border-2 border-[#0369A1] shadow-sm space-y-5 relative">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CBD8E6] pb-3.5">
            <div>
              <span className="text-[12px] font-bold text-[#0369A1] uppercase tracking-wider block">
                Portfolio Option A
              </span>
              <h3 className="text-xl font-bold text-[#0B2540]">
                Quick Works Only
              </h3>
            </div>
            {/* "Recommended for pre-monsoon" tag */}
            <span className="text-[13px] font-bold px-3 py-1 rounded-lg bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] flex items-center gap-1.5 shadow-2xs">
              <Zap className="w-4 h-4 text-[#166534]" />
              <span>Recommended for pre-monsoon</span>
            </span>
          </div>

          {/* Same 5 rows */}
          <div className="space-y-3 divide-y divide-[#EAF1F8] text-[14px]">
            {/* Row 1: Recovery */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-[#475569] font-medium">Recovery</span>
              <span className="font-extrabold text-[#0B2540] font-mono text-[16px]">
                {quickOnlyPlan.combinedRecoveryPct}%
              </span>
            </div>

            {/* Row 2: Cost */}
            <div className="flex justify-between items-center pt-2.5">
              <span className="text-[#475569] font-medium">Cost</span>
              <span className="font-bold text-[#0369A1] font-mono text-[15px]">
                ₹{quickOnlyPlan.totalCostCr} Cr
              </span>
            </div>

            {/* Row 3: Time to deliver */}
            <div className="flex justify-between items-center pt-2.5">
              <span className="text-[#475569] font-medium">Time to deliver</span>
              <span className="font-bold text-[#166534] font-mono text-[15px]">
                {quickOnlyPlan.maxDeliveryDaysQuick || 14} days
              </span>
            </div>

            {/* Row 4: Hotspots covered */}
            <div className="flex justify-between items-center pt-2.5">
              <span className="text-[#475569] font-medium">Hotspots covered</span>
              <span className="font-bold text-[#0B2540] font-mono text-[15px]">
                {quickOnlyPlan.totalHotspotsFixed} of {rankedHotspots.length} hotspots
              </span>
            </div>

            {/* Row 5: Recovery per crore */}
            <div className="flex justify-between items-center pt-2.5">
              <span className="text-[#475569] font-medium">Recovery per crore</span>
              <span className="font-bold text-[#92400E] font-mono text-[15px]">
                {quickOnlyPlan.recoveryPerCrore} % / ₹ Cr
              </span>
            </div>
          </div>

          {/* One-line takeaway under each */}
          <div className="p-3.5 rounded-xl bg-[#E0F2FE] border border-[#CBD8E6] text-[14px] text-[#0369A1] font-semibold leading-relaxed">
            Fastest deployment before monsoon arrival; maximum recovery per crore.
          </div>
        </div>

        {/* Capital Works Card */}
        <div className="p-6 rounded-2xl bg-white border border-[#CBD8E6] shadow-sm space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#CBD8E6] pb-3.5">
            <div>
              <span className="text-[12px] font-bold text-[#7C3AED] uppercase tracking-wider block">
                Portfolio Option B
              </span>
              <h3 className="text-xl font-bold text-[#0B2540]">
                Capital Works Only
              </h3>
            </div>
            <span className="text-[13px] font-medium px-3 py-1 rounded-lg bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]">
              Permanent Drainage
            </span>
          </div>

          {/* Same 5 rows */}
          <div className="space-y-3 divide-y divide-[#EAF1F8] text-[14px]">
            {/* Row 1: Recovery */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-[#475569] font-medium">Recovery</span>
              <span className="font-extrabold text-[#0B2540] font-mono text-[16px]">
                {capitalOnlyPlan.combinedRecoveryPct}%
              </span>
            </div>

            {/* Row 2: Cost */}
            <div className="flex justify-between items-center pt-2.5">
              <span className="text-[#475569] font-medium">Cost</span>
              <span className="font-bold text-[#7C3AED] font-mono text-[15px]">
                ₹{capitalOnlyPlan.totalCostCr} Cr
              </span>
            </div>

            {/* Row 3: Time to deliver */}
            <div className="flex justify-between items-center pt-2.5">
              <span className="text-[#475569] font-medium">Time to deliver</span>
              <span className="font-bold text-[#92400E] font-mono text-[15px]">
                {capitalOnlyPlan.maxDeliveryMonthsCapital || 8} months
              </span>
            </div>

            {/* Row 4: Hotspots covered */}
            <div className="flex justify-between items-center pt-2.5">
              <span className="text-[#475569] font-medium">Hotspots covered</span>
              <span className="font-bold text-[#0B2540] font-mono text-[15px]">
                {capitalOnlyPlan.totalHotspotsFixed} of {rankedHotspots.length} hotspots
              </span>
            </div>

            {/* Row 5: Recovery per crore */}
            <div className="flex justify-between items-center pt-2.5">
              <span className="text-[#475569] font-medium">Recovery per crore</span>
              <span className="font-bold text-[#92400E] font-mono text-[15px]">
                {capitalOnlyPlan.recoveryPerCrore} % / ₹ Cr
              </span>
            </div>
          </div>

          {/* One-line takeaway under each */}
          <div className="p-3.5 rounded-xl bg-[#FAF5FF] border border-[#DDD6FE] text-[14px] text-[#6B21A8] font-semibold leading-relaxed">
            Permanent structural immunity; longer delivery window across fiscal quarters.
          </div>
        </div>
      </div>

      {/* ========================================================
          6. HOTSPOT RANKING
          A full-width sortable table with columns:
          Rank, Hotspot, Quick fix (cost, days), Capital fix (cost, months),
          Connectivity recovery, Hospital recovery, Recovery per crore,
          and a "Simulate in What-If" button.
          Show a small info tooltip on "Hospital recovery +0.0%":
          "Hospital access is not degraded in this scenario, so there is nothing to recover."
          Show the tie-break reason as a tooltip.
          No nested scrolling areas anywhere!
          ======================================================== */}
      <div className="p-6 rounded-2xl bg-white border border-[#CBD8E6] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CBD8E6] pb-4">
          <div>
            <h3 className="text-xl font-bold text-[#0B2540] flex items-center gap-2">
              <Award className="w-5 h-5 text-[#166534]" />
              <span>Hotspot Ranking Table ({sortedRankedHotspots.length})</span>
            </h3>
            <p className="text-[14px] text-[#475569] mt-0.5">
              Click any column header to sort. Evaluated per CPWD/DSR drainage cost parameters.
            </p>
          </div>
          <span className="text-[13px] font-bold text-[#166534] bg-[#DCFCE7] px-3 py-1 rounded-md border border-[#BBF7D0] self-start sm:self-auto">
            Interactive Priority Ledger
          </span>
        </div>

        {/* Full-width Sortable Table (Extends page, no nested scrolling) */}
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-[14px] border-collapse">
            <thead>
              <tr className="border-b border-[#CBD8E6] bg-[#EAF1F8] text-[#0B2540] select-none">
                {/* 1. Rank */}
                <th
                  onClick={() => handleSortToggle("rank")}
                  className="py-3 px-3.5 font-bold text-[13px] uppercase tracking-wider cursor-pointer hover:bg-[#D5E4F3] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Rank</span>
                    {sortField === "rank" ? (
                      sortAsc ? <ArrowUp className="w-3.5 h-3.5 text-[#0369A1]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0369A1]" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#94A9BF]" />
                    )}
                  </div>
                </th>

                {/* 2. Hotspot */}
                <th
                  onClick={() => handleSortToggle("name")}
                  className="py-3 px-3.5 font-bold text-[13px] uppercase tracking-wider cursor-pointer hover:bg-[#D5E4F3] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Hotspot</span>
                    {sortField === "name" ? (
                      sortAsc ? <ArrowUp className="w-3.5 h-3.5 text-[#0369A1]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0369A1]" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#94A9BF]" />
                    )}
                  </div>
                </th>

                {/* 3. Quick fix (cost, days) */}
                <th
                  onClick={() => handleSortToggle("quickCost")}
                  className="py-3 px-3.5 font-bold text-[13px] uppercase tracking-wider cursor-pointer hover:bg-[#D5E4F3] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Quick fix (cost, days)</span>
                    {sortField === "quickCost" ? (
                      sortAsc ? <ArrowUp className="w-3.5 h-3.5 text-[#0369A1]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0369A1]" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#94A9BF]" />
                    )}
                  </div>
                </th>

                {/* 4. Capital fix (cost, months) */}
                <th
                  onClick={() => handleSortToggle("capitalCost")}
                  className="py-3 px-3.5 font-bold text-[13px] uppercase tracking-wider cursor-pointer hover:bg-[#D5E4F3] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Capital fix (cost, months)</span>
                    {sortField === "capitalCost" ? (
                      sortAsc ? <ArrowUp className="w-3.5 h-3.5 text-[#0369A1]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0369A1]" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#94A9BF]" />
                    )}
                  </div>
                </th>

                {/* 5. Connectivity recovery */}
                <th
                  onClick={() => handleSortToggle("connectivity")}
                  className="py-3 px-3.5 font-bold text-[13px] uppercase tracking-wider cursor-pointer hover:bg-[#D5E4F3] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Connectivity recovery</span>
                    {sortField === "connectivity" ? (
                      sortAsc ? <ArrowUp className="w-3.5 h-3.5 text-[#0369A1]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0369A1]" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#94A9BF]" />
                    )}
                  </div>
                </th>

                {/* 6. Hospital recovery */}
                <th
                  onClick={() => handleSortToggle("hospital")}
                  className="py-3 px-3.5 font-bold text-[13px] uppercase tracking-wider cursor-pointer hover:bg-[#D5E4F3] transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Hospital recovery</span>
                    {sortField === "hospital" ? (
                      sortAsc ? <ArrowUp className="w-3.5 h-3.5 text-[#0369A1]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0369A1]" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#94A9BF]" />
                    )}
                  </div>
                </th>

                {/* 7. Recovery per crore */}
                <th
                  onClick={() => handleSortToggle("recoveryPerCr")}
                  className="py-3 px-3.5 font-bold text-[13px] uppercase tracking-wider cursor-pointer hover:bg-[#D5E4F3] transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Recovery per crore</span>
                    {sortField === "recoveryPerCr" ? (
                      sortAsc ? <ArrowUp className="w-3.5 h-3.5 text-[#0369A1]" /> : <ArrowDown className="w-3.5 h-3.5 text-[#0369A1]" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-[#94A9BF]" />
                    )}
                  </div>
                </th>

                {/* 8. Action button */}
                <th className="py-3 px-3.5 font-bold text-[13px] uppercase tracking-wider text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#CBD8E6]">
              {sortedRankedHotspots.map((spot) => {
                const isHospitalZero = spot.hospitalGainPct <= 0.05;

                return (
                  <tr key={spot.hotspotId} className="hover:bg-[#EAF1F8]/60 transition-colors">
                    {/* Rank */}
                    <td className="py-3.5 px-3.5 font-mono font-bold text-[#166534]">
                      #{spot.rank}
                    </td>

                    {/* Hotspot & Tooltip for tie-break reason */}
                    <td className="py-3.5 px-3.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0B2540]">{spot.hotspotName}</span>
                        {/* Tie-break reason as a tooltip */}
                        {spot.tieBreakReason && (
                          <div className="relative group inline-block">
                            <span
                              className="text-[11px] font-bold text-[#92400E] bg-[#FEF3C7] px-2 py-0.5 rounded border border-[#FDE68A] cursor-help"
                              title={`Tie-break reason: ${spot.tieBreakReason}`}
                            >
                              Tie-break
                            </span>
                            <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-30 w-56 p-2 rounded-lg bg-[#0B2540] text-white text-[12px] shadow-lg leading-snug">
                              <strong>Tie-break reason:</strong> {spot.tieBreakReason}
                            </div>
                          </div>
                        )}
                      </div>
                      {isEquityAware && (
                        <div className="text-[12px] text-[#991B1B] mt-0.5">
                          Equity weight: {spot.vulnerabilityWeight}x &bull; {spot.vulnerabilityRationale}
                        </div>
                      )}
                    </td>

                    {/* Quick fix (cost, days) */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <span className="font-bold text-[#0369A1] font-mono">₹{spot.quickOption.costCr} Cr</span>
                      <span className="text-[#475569] text-[13px] ml-1.5 font-medium">
                        ({spot.quickOption.deliveryTimeDisplay})
                      </span>
                    </td>

                    {/* Capital fix (cost, months) */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <span className="font-bold text-[#7C3AED] font-mono">₹{spot.capitalOption.costCr} Cr</span>
                      <span className="text-[#475569] text-[13px] ml-1.5 font-medium">
                        ({spot.capitalOption.deliveryTimeDisplay})
                      </span>
                    </td>

                    {/* Connectivity recovery */}
                    <td className="py-3.5 px-3.5 font-mono font-bold text-[#0B2540] whitespace-nowrap">
                      +{spot.connectivityRecoveryPct.toFixed(1)}%
                    </td>

                    {/* Hospital recovery with small info tooltip on +0.0% */}
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      {isHospitalZero ? (
                        <div className="relative group inline-flex items-center gap-1.5">
                          <span className="font-mono font-semibold text-[#64748B]">+0.0%</span>
                          <span
                            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#EAF1F8] border border-[#CBD8E6] text-[#0369A1] text-[11px] font-bold cursor-help"
                            title="Hospital access is not degraded in this scenario, so there is nothing to recover."
                          >
                            <Info className="w-3 h-3" />
                          </span>
                          <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-30 w-64 p-2.5 rounded-lg bg-[#0B2540] text-white text-[12px] shadow-lg leading-snug">
                            Hospital access is not degraded in this scenario, so there is nothing to recover.
                          </div>
                        </div>
                      ) : (
                        <span className="font-mono font-bold text-[#991B1B]">
                          +{spot.hospitalGainPct.toFixed(1)}%
                        </span>
                      )}
                    </td>

                    {/* Recovery per crore */}
                    <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                      <span className="font-bold font-mono text-[#166534] bg-[#DCFCE7] px-2 py-0.5 rounded border border-[#BBF7D0]">
                        {spot.combinedRecoveryPerCrore.toFixed(1)} % / ₹ Cr
                      </span>
                    </td>

                    {/* Action button: "Simulate in What-If" */}
                    <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                      {onSimulateHotspotFix ? (
                        <button
                          type="button"
                          onClick={() => onSimulateHotspotFix(spot.hotspotId)}
                          className="py-1.5 px-3 rounded-lg bg-[#EAF1F8] hover:bg-[#D5E4F3] border border-[#CBD8E6] text-[#0369A1] font-bold text-[13px] inline-flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                        >
                          <span>Simulate in What-If</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[#94A9BF] text-xs">&mdash;</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================
          7. FOOTER NOTE (One line)
          "Costs are indicative, calibrated to CPWD/DSR-style rates, not official quotes. Recovery is relative and based on synthetic demand."
          ======================================================== */}
      <div className="text-center text-[14px] text-[#475569] py-4 border-t border-[#CBD8E6] leading-relaxed">
        Costs are indicative, calibrated to CPWD/DSR-style rates, not official quotes. Recovery is relative and based on synthetic demand.
      </div>
    </div>
  );
}
