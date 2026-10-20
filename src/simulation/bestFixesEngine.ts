import { FLOOD_HOTSPOTS, getEffectiveRadius, getFloodIntersectionResults } from "../data/floodHotspots";
import { HOTSPOT_FIX_COSTS, getHotspotFixConfig, COST_DISCLAIMER } from "../data/fixCosts";
import { calculateTraffic } from "./traffic";
import { computeHospitalTravelTimes } from "./hospitalAccess";
import { HOSPITAL_CONFIG } from "../data/constants";

export interface FixOption {
  type: "quick" | "capital";
  title: string;
  description: string;
  costCr: number; // in ₹ Crore
  deliveryTimeValue: number;
  deliveryTimeUnit: "days" | "months";
  deliveryTimeDisplay: string;
  isIndicative: boolean;
  disclaimer: string;
  efficiencyFactor: number; // 0.85 for quick operational, 1.0 for capital permanent
}

export interface HotspotFixConfig {
  hotspotId: string;
  hotspotName: string;
  vulnerabilityWeight: number; // synthetic social & transit equity vulnerability factor (1.0 - 1.5)
  vulnerabilityRationale: string;
  quick: FixOption;
  capital: FixOption;
}

export interface HotspotEvaluation {
  hotspotId: string;
  hotspotName: string;
  roadIds: string[];
  vulnerabilityWeight: number;
  vulnerabilityRationale: string;
  quickOption: FixOption;
  capitalOption: FixOption;
  connectivityRecoveryPct: number; // % disconnected demand recovered
  hospitalGainPct: number; // % hospital access gain
  baseCombinedScore: number; // 0 - 100
  equityCombinedScore: number; // baseCombinedScore * vulnerabilityWeight
  combinedRecoveryPerCrore: number; // yield in % / ₹ Cr
  tieBreakReason?: string;
  rank: number;
}

export interface FixPlanItem {
  hotspotId: string;
  hotspotName: string;
  fixType: "quick" | "capital";
  option: FixOption;
  costCr: number;
  deliveryTimeDisplay: string;
  recoveryPct: number;
}

export interface FixPlan {
  budgetCr: number;
  totalCostCr: number;
  remainingBudgetCr: number;
  items: FixPlanItem[];
  quickFixCount: number;
  capitalFixCount: number;
  totalHotspotsFixed: number;
  combinedRecoveryPct: number;
  connectivityRecoveryPct: number;
  hospitalGainPct: number;
  maxDeliveryDaysQuick: number;
  maxDeliveryMonthsCapital: number;
  deliveryDaysTotal: number;
  recoveryPerCrore: number;
  dominationType?: "recommended" | "dominated_by_quick" | "dominated_by_capital";
  dominationNote?: string;
}

export interface ParetoPoint {
  costCr: number;
  recoveryPct: number;
  planSummary: string;
}

export interface BestFixesAnalysisResult {
  activeHotspotCount: number;
  rankedHotspots: HotspotEvaluation[];
  bestPlan: FixPlan;
  quickOnlyPlan: FixPlan;
  capitalOnlyPlan: FixPlan;
  paretoPoints: ParetoPoint[];
  worstCaseMetrics: {
    totalDemand: number;
    floodedRoadsCount: number;
    disconnectedVehicles: number;
    disconnectedDemandPercent: number;
    hospitalWithin8Percent: number;
  };
  weights: {
    connectivity: number;
    hospital: number;
  };
  isEquityAware: boolean;
  budgetCr: number;
}

/**
 * Calculates delivery days for a plan (max delivery lead time across selected interventions).
 */
export function getPlanDeliveryDays(plan: { items: FixPlanItem[]; maxDeliveryDaysQuick?: number; maxDeliveryMonthsCapital?: number }): number {
  if (!plan || !plan.items || plan.items.length === 0) return 0;
  let maxDays = 0;
  for (const item of plan.items) {
    const days = item.fixType === "quick"
      ? (item.option.deliveryTimeValue || 14)
      : (item.option.deliveryTimeValue || 8) * 30;
    if (days > maxDays) maxDays = days;
  }
  return maxDays;
}

/**
 * DOMINANCE RULE:
 * Returns true if candidate dominates current plan:
 * 1. Strictly higher combined recovery (by > 1.0 percentage point)
 * 2. Equal recovery (within 1.0 percentage point):
 *    - Choose the LOWEST cost
 *    - Then the fastest delivery
 */
export function doesPlanDominate(candidate: FixPlan, current: FixPlan): boolean {
  if (!current || current.items.length === 0) return candidate && candidate.items.length > 0;
  if (!candidate || candidate.items.length === 0) return false;

  const recDiff = candidate.combinedRecoveryPct - current.combinedRecoveryPct;

  // 1. Strict recovery advantage (greater than 1.0 percentage point difference)
  if (recDiff > 1.0) {
    return true;
  }
  if (recDiff < -1.0) {
    return false;
  }

  // 2. Equal recovery (within 1.0 percentage point) -> choose LOWEST cost
  const costDiff = current.totalCostCr - candidate.totalCostCr;
  if (costDiff > 0.05) {
    return true; // candidate is cheaper
  }
  if (costDiff < -0.05) {
    return false; // current is cheaper
  }

  // 3. Equal cost (within 0.05 Cr) -> choose fastest delivery
  const candDays = candidate.deliveryDaysTotal || getPlanDeliveryDays(candidate);
  const currDays = current.deliveryDaysTotal || getPlanDeliveryDays(current);
  return candDays < currDays;
}

/**
 * Runs complete municipal prioritization and budget optimization
 */
export function analyzeBestFixes({
  graph,
  roads,
  odPairs,
  hospitals = [],
  rainfallLevel = "Extreme",
  weights = { connectivity: 0.5, hospital: 0.5 },
  budgetCr = 10.0,
  isEquityAware = false,
  targetHotspots = FLOOD_HOTSPOTS,
}: {
  graph: any;
  roads: any[];
  odPairs: any[];
  hospitals?: any[];
  rainfallLevel?: string;
  weights?: { connectivity: number; hospital: number };
  budgetCr?: number;
  isEquityAware?: boolean;
  targetHotspots?: any[];
}): BestFixesAnalysisResult | null {
  if (!graph || !roads || roads.length === 0 || !odPairs || odPairs.length === 0) {
    return null;
  }

  const connWeight = weights.connectivity;
  const hospWeight = weights.hospital;

  // 1. Determine intersected hotspots
  const floodInfo = getFloodIntersectionResults(roads, targetHotspots, rainfallLevel as any);
  const activeHotspots = (floodInfo.intersectedHotspots || []).length > 0
    ? floodInfo.intersectedHotspots
    : targetHotspots.map((h) => ({
        ...h,
        roads: [],
        effectiveRadius: getEffectiveRadius(h, rainfallLevel as any),
      }));

  const allFloodedRoadIds = new Set<string>();
  if (floodInfo.floodedRoadIds && floodInfo.floodedRoadIds.size > 0) {
    floodInfo.floodedRoadIds.forEach((id: string) => allFloodedRoadIds.add(id));
  } else {
    activeHotspots.forEach((h) => {
      (h.roads || []).forEach((r: any) => allFloodedRoadIds.add(String(r.id)));
    });
  }

  const originNodeIds = [...new Set(odPairs.map((p) => p.start))];

  // Only trauma hospitals are valid Golden Hour destinations
  const traumaHospitals = hospitals.filter(
    (h) => h.type === "trauma" || (h.type !== "specialty" && !h.name?.toLowerCase().includes("eye"))
  );

  // 2. Worst Case State (All hotspots flooded)
  const worstTraffic = calculateTraffic(graph, odPairs, allFloodedRoadIds);
  const worstHospital = traumaHospitals.length > 0
    ? computeHospitalTravelTimes(
        graph,
        traumaHospitals,
        originNodeIds,
        allFloodedRoadIds,
        odPairs,
        HOSPITAL_CONFIG.GOLDEN_HOUR_THRESHOLD_MINUTES
      )
    : null;

  const totalDemand = worstTraffic.totalVehicles || 1;
  const worstDisconnected = worstTraffic.disconnectedVehicles || 0;
  const worstHospitalWithin8 = worstHospital?.demandWithin8Percent || 0;

  const worstCaseMetrics = {
    totalDemand,
    floodedRoadsCount: allFloodedRoadIds.size,
    disconnectedVehicles: worstDisconnected,
    disconnectedDemandPercent: Number(((worstDisconnected / totalDemand) * 100).toFixed(1)),
    hospitalWithin8Percent: worstHospitalWithin8,
  };

  // 3. Evaluate each hotspot individually when fixed
  const rawEvaluations: HotspotEvaluation[] = [];

  for (const spot of activeHotspots) {
    const spotKey = spot.id || spot.name;
    const config = getHotspotFixConfig(spotKey) || {
      hotspotId: spotKey,
      hotspotName: spot.name,
      vulnerabilityWeight: 1.2,
      vulnerabilityRationale: "Central Delhi vehicular feeder link",
      quick: {
        type: "quick" as const,
        title: "Mobile Dewatering Unit",
        description: "Deploy mobile trailer pumps and automated barriers",
        costCr: 1.2,
        deliveryTimeValue: 14,
        deliveryTimeUnit: "days" as const,
        deliveryTimeDisplay: "14 days",
        isIndicative: true,
        disclaimer: COST_DISCLAIMER,
        efficiencyFactor: 0.85,
      },
      capital: {
        type: "capital" as const,
        title: "Drainage Outfall Reconstruction",
        description: "Micro-tunneling storm culvert to main trunk",
        costCr: 5.5,
        deliveryTimeValue: 8,
        deliveryTimeUnit: "months" as const,
        deliveryTimeDisplay: "8 months",
        isIndicative: true,
        disclaimer: COST_DISCLAIMER,
        efficiencyFactor: 1.0,
      },
    };

    // Hotspot roads to unblock
    const spotRoadIds = new Set((spot.roads || []).map((r: any) => String(r.id)));
    const remainingBlocked = new Set<string>();
    allFloodedRoadIds.forEach((id) => {
      if (!spotRoadIds.has(id)) remainingBlocked.add(id);
    });

    const fixedTraffic = calculateTraffic(graph, odPairs, remainingBlocked);
    const fixedHospital = traumaHospitals.length > 0
      ? computeHospitalTravelTimes(
          graph,
          traumaHospitals,
          originNodeIds,
          remainingBlocked,
          odPairs,
          HOSPITAL_CONFIG.GOLDEN_HOUR_THRESHOLD_MINUTES
        )
      : null;

    const fixedDisconnected = fixedTraffic.disconnectedVehicles || 0;
    const recoveredVehicles = Math.max(0, worstDisconnected - fixedDisconnected);
    const connectivityRecoveryPct = worstDisconnected > 0
      ? Number(((recoveredVehicles / worstDisconnected) * 100).toFixed(1))
      : Number(((spotRoadIds.size / Math.max(1, allFloodedRoadIds.size)) * 100).toFixed(1));

    const fixedWithin8 = fixedHospital?.demandWithin8Percent || worstHospitalWithin8;
    const hospitalPotentialGap = Math.max(0.1, 100 - worstHospitalWithin8);
    const hospitalGainPct = Number(Math.max(0, fixedWithin8 - worstHospitalWithin8).toFixed(1));

    const baseCombinedScore = Number(
      (connectivityRecoveryPct * connWeight + hospitalGainPct * hospWeight).toFixed(1)
    );

    const vulnWeight = config.vulnerabilityWeight || 1.0;
    const equityCombinedScore = Number((baseCombinedScore * vulnWeight).toFixed(1));

    const activeScore = isEquityAware ? equityCombinedScore : baseCombinedScore;
    const bestCost = config.quick.costCr || 1.0;
    const combinedRecoveryPerCrore = Number((activeScore / bestCost).toFixed(1));

    rawEvaluations.push({
      hotspotId: config.hotspotId,
      hotspotName: config.hotspotName,
      roadIds: Array.from(spotRoadIds) as string[],
      vulnerabilityWeight: vulnWeight,
      vulnerabilityRationale: config.vulnerabilityRationale,
      quickOption: config.quick,
      capitalOption: config.capital,
      connectivityRecoveryPct,
      hospitalGainPct,
      baseCombinedScore,
      equityCombinedScore,
      combinedRecoveryPerCrore,
      rank: 1,
    });
  }

  // 4. RANKING: Rank by combined recovery per crore, and determine tie-break reasons
  rawEvaluations.sort((a, b) => {
    const diff = b.combinedRecoveryPerCrore - a.combinedRecoveryPerCrore;
    if (Math.abs(diff) > 0.1) return diff;
    // Tie-break 1: Higher hospital protection
    if (Math.abs(b.hospitalGainPct - a.hospitalGainPct) > 0.2) {
      return b.hospitalGainPct - a.hospitalGainPct;
    }
    // Tie-break 2: Higher connectivity recovery
    if (Math.abs(b.connectivityRecoveryPct - a.connectivityRecoveryPct) > 0.2) {
      return b.connectivityRecoveryPct - a.connectivityRecoveryPct;
    }
    // Tie-break 3: Lower initial cost
    return a.quickOption.costCr - b.quickOption.costCr;
  });

  // Assign ranks and generate tie-break explanation when adjacent scores match
  for (let idx = 0; idx < rawEvaluations.length; idx++) {
    const item = rawEvaluations[idx];
    item.rank = idx + 1;

    // Check if score is tied with neighbor
    const prev = idx > 0 ? rawEvaluations[idx - 1] : null;
    const next = idx < rawEvaluations.length - 1 ? rawEvaluations[idx + 1] : null;
    const isTied =
      (prev && Math.abs(prev.combinedRecoveryPerCrore - item.combinedRecoveryPerCrore) <= 0.1) ||
      (next && Math.abs(next.combinedRecoveryPerCrore - item.combinedRecoveryPerCrore) <= 0.1);

    if (isTied) {
      if (item.hospitalGainPct > (next ? next.hospitalGainPct : 0)) {
        item.tieBreakReason = `Higher hospital protection (+${item.hospitalGainPct}% gain)`;
      } else if (item.connectivityRecoveryPct > (next ? next.connectivityRecoveryPct : 0)) {
        item.tieBreakReason = `Higher road network connectivity (+${item.connectivityRecoveryPct}%)`;
      } else if (item.quickOption.costCr < (next ? next.quickOption.costCr : 99)) {
        item.tieBreakReason = `Lower capital outlay (₹${item.quickOption.costCr} Cr)`;
      } else {
        item.tieBreakReason = item.vulnerabilityRationale || "Key transit interchange";
      }
    }
  }

  const evaluations = rawEvaluations;

  // 5. Combinatorial Knapsack solver with Dominance Rule
  const optimPool = evaluations.slice(0, 10);

  function evaluateCombination(choices: number[], maxBudget: number): FixPlan | null {
    let cost = 0;
    let rawScore = 0;
    const chosenItems: FixPlanItem[] = [];
    let quickCount = 0;
    let capCount = 0;
    let maxDaysQuick = 0;
    let maxMonthsCap = 0;
    let connSum = 0;
    let hospSum = 0;

    for (let i = 0; i < choices.length; i++) {
      const choice = choices[i];
      if (choice === 0) continue;
      const spot = optimPool[i];
      const opt = choice === 1 ? spot.quickOption : spot.capitalOption;
      cost += opt.costCr;

      if (choice === 1) {
        quickCount++;
        maxDaysQuick = Math.max(maxDaysQuick, opt.deliveryTimeValue);
      } else {
        capCount++;
        maxMonthsCap = Math.max(maxMonthsCap, opt.deliveryTimeValue);
      }

      const efficiency = opt.efficiencyFactor || 1.0;
      const spotScore = isEquityAware ? spot.equityCombinedScore : spot.baseCombinedScore;
      const contribution = spotScore * efficiency;
      rawScore += contribution;

      connSum += spot.connectivityRecoveryPct * efficiency;
      hospSum += spot.hospitalGainPct * efficiency;

      chosenItems.push({
        hotspotId: spot.hotspotId,
        hotspotName: spot.hotspotName,
        fixType: choice === 1 ? "quick" : "capital",
        option: opt,
        costCr: opt.costCr,
        deliveryTimeDisplay: opt.deliveryTimeDisplay,
        recoveryPct: Number(contribution.toFixed(1)),
      });
    }

    if (cost > maxBudget) return null;

    const combinedRecoveryPct = Number(Math.min(100, rawScore).toFixed(1));
    const finalConnPct = Number(Math.min(100, connSum).toFixed(1));
    const finalHospPct = Number(Math.min(100, hospSum).toFixed(1));
    const roundedCost = Number(cost.toFixed(1));
    const recoveryPerCrore = roundedCost > 0
      ? Number((combinedRecoveryPct / roundedCost).toFixed(2))
      : 0;
    const deliveryDaysTotal = Math.max(maxDaysQuick, maxMonthsCap * 30);

    return {
      budgetCr: maxBudget,
      totalCostCr: roundedCost,
      remainingBudgetCr: Number(Math.max(0, maxBudget - roundedCost).toFixed(1)),
      items: chosenItems,
      quickFixCount: quickCount,
      capitalFixCount: capCount,
      totalHotspotsFixed: chosenItems.length,
      combinedRecoveryPct,
      connectivityRecoveryPct: finalConnPct,
      hospitalGainPct: finalHospPct,
      maxDeliveryDaysQuick: maxDaysQuick,
      maxDeliveryMonthsCapital: maxMonthsCap,
      deliveryDaysTotal,
      recoveryPerCrore,
    };
  }

  // Find best plan given constraints using Dominance Rule
  function findBestPlan(maxBudget: number, mode: "any" | "quick_only" | "capital_only" = "any"): FixPlan {
    let bestPlan: FixPlan = {
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

    const n = optimPool.length;
    const allowedChoices = mode === "quick_only" ? [0, 1] : mode === "capital_only" ? [0, 2] : [0, 1, 2];

    function search(index: number, currentChoices: number[], currentCost: number) {
      if (currentCost > maxBudget) return;

      if (index === n) {
        const plan = evaluateCombination(currentChoices, maxBudget);
        if (plan) {
          if (doesPlanDominate(plan, bestPlan)) {
            bestPlan = plan;
          }
        }
        return;
      }

      for (const choice of allowedChoices) {
        let addedCost = 0;
        if (choice === 1) addedCost = optimPool[index].quickOption.costCr;
        else if (choice === 2) addedCost = optimPool[index].capitalOption.costCr;

        if (currentCost + addedCost <= maxBudget) {
          currentChoices.push(choice);
          search(index + 1, currentChoices, currentCost + addedCost);
          currentChoices.pop();
        }
      }
    }

    search(0, [], 0);
    return bestPlan;
  }

  const rawRecommendedPlan = findBestPlan(budgetCr, "any");
  const quickOnlyPlan = findBestPlan(budgetCr, "quick_only");
  const capitalOnlyPlan = findBestPlan(budgetCr, "capital_only");

  // DOMINANCE RULE ENFORCEMENT:
  // "If the 'Only quick fixes' or 'Only capital works' plan dominates the recommended plan, replace the recommendation with that plan."
  let finalRecommendedPlan = rawRecommendedPlan;

  if (doesPlanDominate(quickOnlyPlan, finalRecommendedPlan)) {
    finalRecommendedPlan = {
      ...quickOnlyPlan,
      dominationType: "dominated_by_quick",
      dominationNote: "Dominated by Only Quick Fixes: achieves matching recovery (within 1%) at lower cost or faster deployment.",
    };
  } else if (doesPlanDominate(capitalOnlyPlan, finalRecommendedPlan)) {
    finalRecommendedPlan = {
      ...capitalOnlyPlan,
      dominationType: "dominated_by_capital",
      dominationNote: "Dominated by Only Capital Works: achieves higher combined recovery under the budget envelope.",
    };
  }

  // 6. Pareto Frontier step-chart data from ₹0 to ₹20 Cr
  const paretoPoints: ParetoPoint[] = [];
  const budgetSteps = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20];
  for (const b of budgetSteps) {
    const p = findBestPlan(b, "any");
    paretoPoints.push({
      costCr: p.totalCostCr,
      recoveryPct: p.combinedRecoveryPct,
      planSummary: `${p.totalHotspotsFixed} fixes (${p.quickFixCount}Q/${p.capitalFixCount}C) used ₹${p.totalCostCr} Cr`,
    });
  }

  paretoPoints.sort((a, b) => a.costCr - b.costCr);

  return {
    activeHotspotCount: activeHotspots.length,
    rankedHotspots: evaluations,
    bestPlan: finalRecommendedPlan,
    quickOnlyPlan,
    capitalOnlyPlan,
    paretoPoints,
    worstCaseMetrics,
    weights,
    isEquityAware,
    budgetCr,
  };
}
