/**
 * Utility functions for Live Feed matching quality, recency classification,
 * event-type tagging, and domain filtering.
 */

export type RecencyLabel =
  | "Recent (last 7 days)"
  | "This season (7 to 120 days)"
  | "Historical (older than 120 days)";

export type EventType =
  | "Active incident"
  | "Risk listing / preparedness";

/**
 * Drop social media / video sharing domains:
 * facebook.com, youtube.com, instagram.com, x.com (and twitter.com, youtu.be)
 */
export function isExcludedSourceUrl(url: string): boolean {
  if (!url || typeof url !== "string") return true;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (
      host.includes("facebook.com") ||
      host.includes("youtube.com") ||
      host.includes("youtu.be") ||
      host.includes("instagram.com") ||
      host.includes("x.com") ||
      host.includes("twitter.com") ||
      host.includes("tiktok.com")
    );
  } catch {
    const lower = url.toLowerCase();
    return (
      lower.includes("facebook.com") ||
      lower.includes("youtube.com") ||
      lower.includes("youtu.be") ||
      lower.includes("instagram.com") ||
      lower.includes("x.com") ||
      lower.includes("twitter.com")
    );
  }
}

/**
 * Normalizes URL for clean deduplication
 */
export function normalizeUrl(url: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    // remove hash and trailing slash
    return `${parsed.protocol}//${parsed.hostname.toLowerCase()}${parsed.pathname.replace(/\/+$/, "")}${parsed.search}`;
  } catch {
    return url.trim().toLowerCase().replace(/\/+$/, "");
  }
}

/**
 * Parses date string or relative date into RecencyLabel:
 * - "Recent (last 7 days)" (diff <= 7 days)
 * - "This season (7 to 120 days)" (7 < diff <= 120 days)
 * - "Historical (older than 120 days)" (diff > 120 days or older historical reference)
 */
export function classifyRecency(dateStr?: string, fallbackText?: string): RecencyLabel {
  const now = new Date(); // current system date (2026-10-20)

  if (!dateStr || typeof dateStr !== "string" || !dateStr.trim()) {
    // Check if fallbackText contains relative time words
    if (fallbackText) {
      const lowerText = fallbackText.toLowerCase();
      if (
        /\b(today|yesterday|just now|\d+\s*(?:hour|hr|minute|min|sec)s?\s*ago)\b/i.test(lowerText)
      ) {
        return "Recent (last 7 days)";
      }
      if (/\b([1-7])\s*days?\s*ago\b/i.test(lowerText)) {
        return "Recent (last 7 days)";
      }
      if (/\b(?:[8-9]|[1-9]\d|1[0-1]\d)\s*days?\s*ago\b/i.test(lowerText)) {
        return "This season (7 to 120 days)";
      }
      if (/\b([1-4])\s*weeks?\s*ago\b/i.test(lowerText) || /\b([1-3])\s*months?\s*ago\b/i.test(lowerText)) {
        return "This season (7 to 120 days)";
      }
    }
    return "Historical (older than 120 days)";
  }

  const trimmed = dateStr.trim();
  const lower = trimmed.toLowerCase();

  // 1. Relative keywords
  if (
    lower === "today" ||
    lower === "yesterday" ||
    lower === "just now" ||
    lower.includes("hour ago") ||
    lower.includes("hours ago") ||
    lower.includes("minute ago") ||
    lower.includes("minutes ago") ||
    lower.includes("mins ago") ||
    lower.includes("recent")
  ) {
    return "Recent (last 7 days)";
  }

  const daysAgoMatch = lower.match(/(\d+)\s*days?\s*ago/);
  if (daysAgoMatch) {
    const days = parseInt(daysAgoMatch[1], 10);
    if (days <= 7) return "Recent (last 7 days)";
    if (days <= 120) return "This season (7 to 120 days)";
    return "Historical (older than 120 days)";
  }

  const weeksAgoMatch = lower.match(/(\d+)\s*weeks?\s*ago/);
  if (weeksAgoMatch) {
    const days = parseInt(weeksAgoMatch[1], 10) * 7;
    if (days <= 7) return "Recent (last 7 days)";
    if (days <= 120) return "This season (7 to 120 days)";
    return "Historical (older than 120 days)";
  }

  const monthsAgoMatch = lower.match(/(\d+)\s*months?\s*ago/);
  if (monthsAgoMatch) {
    const days = parseInt(monthsAgoMatch[1], 10) * 30;
    if (days <= 120) return "This season (7 to 120 days)";
    return "Historical (older than 120 days)";
  }

  const yearsAgoMatch = lower.match(/(\d+)\s*years?\s*ago/);
  if (yearsAgoMatch) {
    return "Historical (older than 120 days)";
  }

  // 2. Try parsing standard date
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const diffMs = now.getTime() - parsed.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays >= 0 && diffDays <= 7) {
      return "Recent (last 7 days)";
    }
    if (diffDays > 7 && diffDays <= 120) {
      return "This season (7 to 120 days)";
    }
    return "Historical (older than 120 days)";
  }

  // Fallback
  return "Historical (older than 120 days)";
}

/**
 * Returns numeric priority rank of recency (lower = newer)
 */
export function getRecencyRank(label: RecencyLabel): number {
  switch (label) {
    case "Recent (last 7 days)":
      return 1;
    case "This season (7 to 120 days)":
      return 2;
    case "Historical (older than 120 days)":
    default:
      return 3;
  }
}

/**
 * Given multiple recency labels (from multiple sources of a card),
 * returns the recency of the NEWEST source.
 */
export function getNewestRecency(labels: RecencyLabel[]): RecencyLabel {
  if (!labels || labels.length === 0) return "Historical (older than 120 days)";
  let best = labels[0];
  let bestRank = getRecencyRank(best);
  for (let i = 1; i < labels.length; i++) {
    const r = getRecencyRank(labels[i]);
    if (r < bestRank) {
      best = labels[i];
      bestRank = r;
    }
  }
  return best;
}

/**
 * Classifies snippet/title as:
 * - "Active incident" (words like closed, waterlogged, submerged, stranded, diverted, traffic halted, jam)
 * - "Risk listing / preparedness" (words like prone, prepared, flags, ahead of monsoon, SOPs, plan)
 */
export function classifyEventType(snippet: string, title?: string): EventType {
  const combined = `${title || ""} ${snippet || ""}`.toLowerCase();

  // Active disruption keywords
  const activePatterns = [
    /\bclosed\b/i,
    /\bwaterlogged\b/i,
    /\bwaterlogging\b/i,
    /\bsubmerged\b/i,
    /\bsubmergence\b/i,
    /\bstranded\b/i,
    /\bdiverted\b/i,
    /\bdiversion\b/i,
    /\btraffic halted\b/i,
    /\bhalted\b/i,
    /\bjam\b/i,
    /\bjams\b/i,
    /\bgridlock\b/i,
    /\binundated\b/i,
    /\binundation\b/i,
    /\bwater stagnation\b/i,
    /\bstalled\b/i,
    /\bcrawl\b/i,
    /\bimpassable\b/i,
    /\bblocked\b/i,
  ];

  // Risk listing & preparedness keywords
  const riskPatterns = [
    /\bprone\b/i,
    /\bprepared\b/i,
    /\bpreparedness\b/i,
    /\bflags\b/i,
    /\bahead of monsoon\b/i,
    /\bsops\b/i,
    /\bsop\b/i,
    /\bplan\b/i,
    /\bplans\b/i,
    /\bplanning\b/i,
    /\bpre-monsoon\b/i,
    /\bchecklist\b/i,
    /\bcleaning drive\b/i,
    /\bdesilting\b/i,
    /\breadiness\b/i,
    /\bdrill\b/i,
    /\bvulnerable\b/i,
    /\blist of spots\b/i,
  ];

  let activeCount = 0;
  for (const p of activePatterns) {
    if (p.test(combined)) activeCount++;
  }

  let riskCount = 0;
  for (const p of riskPatterns) {
    if (p.test(combined)) riskCount++;
  }

  // If risk listing keywords dominate or activeCount is 0 while riskCount > 0
  if (riskCount > 0 && activeCount === 0) {
    return "Risk listing / preparedness";
  }
  if (riskCount > activeCount) {
    return "Risk listing / preparedness";
  }

  if (activeCount > 0) {
    return "Active incident";
  }

  // Default to Risk listing / preparedness if ambiguous
  return "Risk listing / preparedness";
}
