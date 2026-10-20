import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Radio,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Droplets,
  Navigation,
  ExternalLink,
  Info,
  ArrowRight,
  Activity,
  Terminal,
  ChevronDown,
  ChevronUp,
  MapPin,
  Play,
  ShieldAlert,
} from "lucide-react";
import TopNavBar from "../components/TopNavBar";
import { useAppState } from "../context/AppStateContext";
import {
  classifyRecency,
  getNewestRecency,
  classifyEventType,
  isExcludedSourceUrl,
  normalizeUrl,
  type RecencyLabel,
  type EventType,
} from "../utils/liveFeedClassifier";

export default function LiveFeedPage() {
  const navigate = useNavigate();
  const {
    currentZone,
    liveFeed,
    isLiveFeedLoading,
    fetchLiveFeed,
    useLiveTinyFish,
    setUseLiveTinyFish,
    isReplayMode,
    setIsReplayMode,
    qualifyingMatches,
    qualifyingCount,
    liveMatchedHotspotIds,
    liveMatchedRoadIds,
    activeZoneHotspots,
  } = useAppState();

  const [showRawSample, setShowRawSample] = useState(false);
  const [isOutsideZoneOpen, setIsOutsideZoneOpen] = useState(false);
  const isLive = liveFeed?.mode === "live";

  // Check if a hotspot belongs to the current zone's hotspot list
  const isMatchInZone = useCallback(
    (m: any) => {
      if (m.inZone !== undefined) return m.inZone;
      const lower = String(m.hotspotName || "").toLowerCase().trim();
      return activeZoneHotspots.some(
        (h) =>
          h.name.toLowerCase().trim() === lower ||
          (h.aliases && h.aliases.some((a: string) => a.toLowerCase().trim() === lower))
      );
    },
    [activeZoneHotspots]
  );

  // Helper to filter dropped social media sources and de-duplicate by URL
  const sanitizeSources = useCallback((sources: any[] = [], fallbackSnippet: string = "") => {
    const clean: any[] = [];
    const seenUrls = new Set<string>();

    for (const s of sources) {
      if (!s.url || isExcludedSourceUrl(s.url)) continue;
      const norm = normalizeUrl(s.url);
      if (seenUrls.has(norm)) continue;
      seenUrls.add(norm);

      const srcRecency: RecencyLabel = s.recencyLabel || classifyRecency(s.date, fallbackSnippet);
      clean.push({
        ...s,
        recencyLabel: srcRecency,
      });
    }
    return clean;
  }, []);

  // Partition matches into:
  // 1. In-zone matches (belongs to current zone's hotspot list)
  // 2. Outside-zone matches (e.g. Dwarka, Okhla)
  const { inZoneMatches, outsideZoneMatches } = useMemo(() => {
    const rawMatches = liveFeed?.matches || [];
    const inZone: any[] = [];
    const outsideZone: any[] = [];

    for (const m of rawMatches) {
      const cleanSources = sanitizeSources(m.sources, m.snippet);
      const cardRecency: RecencyLabel =
        m.recencyLabel || getNewestRecency(cleanSources.map((s) => s.recencyLabel));
      const eventType: EventType = m.eventType || classifyEventType(m.snippet, m.hotspotName);
      const isInCurrentZone = isMatchInZone(m);

      const processedMatch = {
        ...m,
        sources: cleanSources,
        recencyLabel: cardRecency,
        eventType,
        inZone: isInCurrentZone,
      };

      if (isInCurrentZone) {
        inZone.push(processedMatch);
      } else {
        outsideZone.push(processedMatch);
      }
    }

    return { inZoneMatches: inZone, outsideZoneMatches: outsideZone };
  }, [liveFeed, isMatchInZone, sanitizeSources]);

  // Clean matched roads
  const sanitizedMatchedRoads = useMemo(() => {
    const rawRoads = liveFeed?.matchedRoads || [];
    return rawRoads.map((r) => {
      const cleanSources = sanitizeSources(r.sources, r.snippet);
      const cardRecency: RecencyLabel =
        r.recencyLabel || getNewestRecency(cleanSources.map((s) => s.recencyLabel));
      const eventType: EventType = r.eventType || classifyEventType(r.snippet, r.roadName);
      return {
        ...r,
        sources: cleanSources,
        recencyLabel: cardRecency,
        eventType,
      };
    });
  }, [liveFeed, sanitizeSources]);

  // Recency badge styling
  const getRecencyBadgeClasses = (label: RecencyLabel) => {
    switch (label) {
      case "Recent (last 7 days)":
        return "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]";
      case "This season (7 to 120 days)":
        return "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]";
      case "Historical (older than 120 days)":
      default:
        return "bg-[#E2E8F0] text-[#475569] border-[#CBD5E1]";
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-[#EAF1F8] text-[#1E293B] flex flex-col justify-between overflow-x-hidden font-sans select-none">
      {/* Consistent Shared Top Navigation Bar */}
      <TopNavBar />

      {/* Main Full-Width Content Container (max-width 1440px, 24 to 32px side padding) */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 sm:px-8 py-8 space-y-6">
        {/* Page Header: Keeps "LIVE DATA via TinyFish Search" to indicate the search itself is live */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CBD8E6] pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B2540]">
              Live Monsoon Feed
            </h1>
            <p className="text-[15px] text-[#475569] mt-1">
              Automated live web intelligence &amp; traffic advisory ingestion for {currentZone.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Header Badge: Keeps "LIVE DATA via TinyFish Search" as required in Requirement 1 */}
            <span
              className={`text-[13px] px-3.5 py-1.5 rounded-md font-bold border flex items-center gap-2 ${
                isLive
                  ? "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]"
                  : "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isLive ? "bg-[#166534] animate-ping" : "bg-[#92400E]"
                }`}
              />
              <span>
                {isLive ? "LIVE DATA via TinyFish Search" : "CACHED SNAPSHOT via TinyFish Search"}
              </span>
            </span>

            <button
              type="button"
              onClick={() => fetchLiveFeed(true)}
              disabled={isLiveFeedLoading}
              title="Refresh live intelligence"
              className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-[#EAF1F8] border border-[#CBD8E6] text-[#0B2540] text-[13px] font-semibold flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-[#0369A1] ${isLiveFeedLoading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ========================================================
              LEFT COLUMN: Pipeline, Toggle Card & Summary, Diagnostics, API Key
              ======================================================== */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            {/* 1. Pipeline Description Card */}
            <div className="p-5 rounded-2xl bg-white border border-[#CBD8E6] shadow-sm space-y-4">
              <div className="flex items-center gap-2 text-[12px] font-bold text-[#0B2540] uppercase tracking-wider border-b border-[#CBD8E6] pb-3">
                <Radio className="w-4 h-4 text-[#0369A1]" />
                <span>Ingestion Pipeline</span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#E0F2FE] border border-[#BAE6FD] text-[13px] text-[#0369A1] leading-relaxed">
                <strong className="block text-[#0B2540] mb-1 font-bold">Live Processing Pipeline:</strong>
                TinyFish Search API query &rarr; parse structured results &rarr; classify recency &amp; event type &rarr; filter current zone &rarr; cascade &amp; hospital impact update.
              </div>

              <div className="space-y-2 text-[13px] text-[#475569] pt-1">
                <div className="flex justify-between">
                  <span>Fetch Timestamp:</span>
                  <strong className="text-[#0B2540] font-mono">
                    {liveFeed?.fetchedAt ? new Date(liveFeed.fetchedAt).toLocaleTimeString() : "Recent"}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span>Cache Strategy:</span>
                  <span className="text-[#475569]">10-min cache per area</span>
                </div>
                <div className="flex justify-between">
                  <span>Target Zone:</span>
                  <span className="font-semibold text-[#0B2540]">{currentZone.name}</span>
                </div>
              </div>
            </div>

            {/* 2. TOGGLE CARD: USE LIVE CONDITIONS & SUMMARY LINE */}
            <div
              className={`p-5 rounded-2xl shadow-sm transition-all space-y-4 border ${
                useLiveTinyFish
                  ? "bg-[#E0F2FE] border-2 border-[#0369A1]"
                  : "bg-white border-[#CBD8E6]"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[15px] font-bold text-[#0B2540] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#0369A1]" />
                    <span>Use live TinyFish conditions</span>
                  </div>
                  <p className="text-[13px] text-[#475569] leading-relaxed">
                    When enabled, qualifying active incident reports in this zone flood the road network and recalculate secondary cascade overloads and hospital accessibility.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setUseLiveTinyFish(!useLiveTinyFish)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 border ${
                    useLiveTinyFish
                      ? "bg-[#0369A1] border-[#075985]"
                      : "bg-[#CBD8E6] border-[#94A9BF]"
                  }`}
                  aria-pressed={useLiveTinyFish}
                  title="Toggle live conditions simulation"
                >
                  <span
                    className={`block w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                      useLiveTinyFish ? "translate-x-6" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Requirement 6: Summary line under toggle: "N hotspots would be flooded by live reports" */}
              <div className="pt-3 border-t border-[#CBD8E6] space-y-2">
                <div className="text-[13px] font-semibold text-[#0B2540] flex items-center justify-between">
                  <span>
                    {isReplayMode
                      ? `${qualifyingCount} hotspot${qualifyingCount === 1 ? "" : "s"} would be flooded by replayed reports (Replay mode)`
                      : `${qualifyingCount} hotspot${qualifyingCount === 1 ? "" : "s"} would be flooded by live reports`}
                  </span>
                  {isReplayMode && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
                      REPLAY MODE
                    </span>
                  )}
                </div>

                {/* Requirement 5: If nothing qualifies, show "No recent active waterlogging reports found for this zone right now" and "Replay documented past events" */}
                {qualifyingCount === 0 && !isReplayMode && (
                  <div className="p-3.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-[#92400E] space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-start gap-2 text-xs">
                      <Info className="w-4 h-4 text-[#92400E] shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-medium">
                        No recent active waterlogging reports found for this zone right now
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsReplayMode(true)}
                      className="w-full py-2 px-3 rounded-lg bg-white hover:bg-[#EAF1F8] border border-[#CBD8E6] text-[#0B2540] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-[#0369A1]" />
                      <span>Replay documented past events</span>
                    </button>
                  </div>
                )}

                {/* When Replay mode is active, display clear replay banner and option to exit */}
                {isReplayMode && (
                  <div className="p-3 rounded-xl bg-[#DCFCE7] border border-[#BBF7D0] text-[#166534] text-xs flex items-center justify-between gap-2">
                    <span className="font-medium">
                      Replaying documented past events from Delhi monsoon records.
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsReplayMode(false)}
                      className="text-[11px] font-bold underline hover:text-[#0B2540] cursor-pointer shrink-0"
                    >
                      Exit Replay
                    </button>
                  </div>
                )}
              </div>

              {/* Status and Action when Toggle is Active */}
              {useLiveTinyFish && (
                <div className="pt-3 border-t border-[#CBD8E6] space-y-3">
                  <div className="flex items-center gap-2 text-[#166534] text-[13px] font-bold">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-[#166534]" />
                    <span>
                      Live severance active: {liveMatchedHotspotIds.length} hotspots flooded &amp;{" "}
                      {liveMatchedRoadIds.size} roads closed
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate("/dashboard")}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#0369A1] hover:bg-[#075985] text-white font-bold text-[14px] flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <span>View impact on map</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* 3. INTEGRATION DIAGNOSTICS CARD */}
            <div className="p-5 rounded-2xl bg-white border border-[#CBD8E6] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#CBD8E6] pb-3">
                <div className="flex items-center gap-2 text-[12px] font-bold text-[#0B2540] uppercase tracking-wider">
                  <Activity className="w-4 h-4 text-[#0369A1]" />
                  <span>Integration Diagnostics</span>
                </div>
                <span
                  className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold uppercase border ${
                    isLive
                      ? "bg-[#DCFCE7] text-[#166534] border-[#BBF7D0]"
                      : "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
                  }`}
                >
                  {isLive ? "LIVE API MODE" : "CACHED MODE"}
                </span>
              </div>

              {/* Status Note */}
              <div className="p-3 rounded-xl bg-[#EAF1F8] border border-[#CBD8E6] space-y-1">
                <div className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                  Operational Status:
                </div>
                <div className="text-[13px] text-[#0B2540] font-medium leading-relaxed">
                  {liveFeed?.reason || (isLive ? "Live data from TinyFish Search API." : "Bundled baseline fallback snapshot in use.")}
                </div>
              </div>

              {/* Endpoint & parameters */}
              <div className="space-y-2 text-[12px] text-[#475569]">
                <div className="flex justify-between items-center py-1 border-b border-[#EAF1F8]">
                  <span>API Endpoint:</span>
                  <code className="text-[#0369A1] font-mono bg-[#EAF1F8] px-2 py-0.5 rounded text-[11px]">
                    {liveFeed?.diagnostics?.endpoint || "https://api.search.tinyfish.ai"}
                  </code>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#EAF1F8]">
                  <span>Query Location:</span>
                  <span className="font-semibold text-[#0B2540]">IN (India) &bull; en</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#EAF1F8]">
                  <span>Social Filter:</span>
                  <span className="font-semibold text-[#166534]">Dropped FB, YT, IG, X</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#EAF1F8]">
                  <span>Total Results:</span>
                  <strong className="text-[#0B2540] font-mono">
                    {liveFeed?.diagnostics?.total_results ?? (liveFeed?.matches?.length || 0)}
                  </strong>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#EAF1F8]">
                  <span>Parsed Articles:</span>
                  <strong className="text-[#0B2540] font-mono">
                    {liveFeed?.diagnostics?.results_count ?? (liveFeed?.matches?.length || 0)}
                  </strong>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#EAF1F8]">
                  <span>Latency:</span>
                  <span className="font-mono text-[#0B2540]">
                    {liveFeed?.diagnostics?.latency_ms ? `${liveFeed.diagnostics.latency_ms} ms` : "Instant (cached)"}
                  </span>
                </div>
              </div>

              {/* Collapsible raw sample results */}
              {liveFeed?.diagnostics?.results_sample && liveFeed.diagnostics.results_sample.length > 0 && (
                <div className="pt-2 border-t border-[#CBD8E6]">
                  <button
                    type="button"
                    onClick={() => setShowRawSample(!showRawSample)}
                    className="w-full flex items-center justify-between text-[12px] font-bold text-[#0369A1] hover:text-[#075985] cursor-pointer py-1"
                  >
                    <span className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Parsed Search Results ({liveFeed.diagnostics.results_sample.length})</span>
                    </span>
                    {showRawSample ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showRawSample && (
                    <div className="mt-2 space-y-2 max-h-60 overflow-y-auto pr-1">
                      {liveFeed.diagnostics.results_sample.map((item, idx) => (
                        <div
                          key={item.url || idx}
                          className="p-2.5 rounded-lg bg-[#EAF1F8] border border-[#CBD8E6] text-[11px] space-y-1 font-sans"
                        >
                          <div className="flex items-center justify-between gap-1 text-[#475569]">
                            <span className="font-mono font-bold text-[#0369A1]">#{item.position || idx + 1}</span>
                            <span className="font-mono truncate">{item.site_name || "news"}</span>
                            {item.date && <span className="shrink-0">{item.date}</span>}
                          </div>
                          <div className="font-semibold text-[#0B2540] truncate">{item.title}</div>
                          <p className="text-[#475569] text-[11px] line-clamp-2 leading-relaxed">{item.snippet}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 4. API Key Configuration Notice */}
            <div className="p-5 rounded-2xl bg-white border border-[#CBD8E6] shadow-sm space-y-2 text-[13px]">
              <div className="flex items-center gap-2 text-[#92400E] font-bold uppercase tracking-wider text-[12px]">
                <Info className="w-4 h-4 text-[#92400E]" />
                <span>API Configuration</span>
              </div>
              <p className="text-[#475569] leading-relaxed">
                Add <code className="text-[#0369A1] font-mono bg-[#EAF1F8] px-1.5 py-0.5 rounded border border-[#CBD8E6]">TINYFISH_API_KEY</code> in the <strong>Secrets panel</strong> or in <code className="text-[#0369A1] font-mono bg-[#EAF1F8] px-1.5 py-0.5 rounded border border-[#CBD8E6]">.env.local</code>.
              </p>
              <div className="text-[12px] text-[#475569] pt-1">
                When unset or during API rate limits, the app seamlessly serves the realistic bundled snapshot.
              </div>
            </div>
          </div>

          {/* ========================================================
              RIGHT COLUMN:
              1. In-zone Hotspot Matches (Recency badge of newest source, Event type badge)
              2. Collapsed Outside-the-zone section (Dwarka, Okhla)
              3. Matched Road Closures
              ======================================================== */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-8">
            {/* 1. MATCHED HOTSPOTS IN CURRENT PILOT ZONE */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#CBD8E6] pb-2">
                <span className="text-[13px] font-bold text-[#0B2540] uppercase tracking-wider flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-[#991B1B]" />
                  <span>Matched Hotspots in Current Zone ({inZoneMatches.length})</span>
                </span>
                <span className="text-[12px] text-[#475569]">
                  {liveFeed?.areaName || currentZone.name}
                </span>
              </div>

              {inZoneMatches.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inZoneMatches.map((match, idx) => {
                    const isQualifying =
                      match.eventType === "Active incident" &&
                      (isReplayMode ||
                        match.recencyLabel === "Recent (last 7 days)" ||
                        match.recencyLabel === "This season (7 to 120 days)");

                    return (
                      <div
                        key={match.hotspotName || idx}
                        className={`p-4 rounded-xl border shadow-2xs space-y-3 transition-all ${
                          useLiveTinyFish && isQualifying
                            ? "bg-[#FEE2E2] border-[#FECACA]"
                            : "bg-white border-[#CBD8E6]"
                        }`}
                      >
                        {/* Header: Name, Recency Badge (newest source), Event Type Badge */}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  useLiveTinyFish && isQualifying
                                    ? "bg-[#991B1B] animate-ping"
                                    : "bg-[#0369A1]"
                                }`}
                              />
                              <span className="font-bold text-[#0B2540] text-[15px] truncate">
                                {match.hotspotName}
                              </span>
                            </div>

                            {/* Requirement 1: Card badge is the recency of its NEWEST source */}
                            <span
                              className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold uppercase shrink-0 border ${getRecencyBadgeClasses(
                                match.recencyLabel
                              )}`}
                              title={`Recency of newest source: ${match.recencyLabel}`}
                            >
                              {match.recencyLabel}
                            </span>
                          </div>

                          {/* Requirement 2: Event Type Badge ("Active incident" or "Risk listing / preparedness") */}
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-md font-bold uppercase border ${
                                match.eventType === "Active incident"
                                  ? "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]"
                                  : "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
                              }`}
                            >
                              {match.eventType}
                            </span>

                            {/* If Risk listing: marked "informational, not used in simulation" */}
                            {match.eventType === "Risk listing / preparedness" && (
                              <span className="text-[11px] font-medium text-[#475569] bg-[#EAF1F8] border border-[#CBD8E6] px-2 py-0.5 rounded-md">
                                informational, not used in simulation
                              </span>
                            )}

                            {/* Replay indicator */}
                            {isReplayMode && match.recencyLabel === "Historical (older than 120 days)" && (
                              <span className="text-[11px] font-bold text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 rounded-md">
                                Replayed past event
                              </span>
                            )}

                            {/* If Flooded in simulation */}
                            {useLiveTinyFish && isQualifying && (
                              <span className="text-[11px] font-bold text-[#166534] bg-[#DCFCE7] border border-[#BBF7D0] px-2 py-0.5 rounded-md">
                                Flooded in simulation
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Snippet */}
                        {match.snippet && (
                          <div className="p-3 rounded-lg bg-white border border-[#CBD8E6] text-[13px] text-[#475569] italic leading-relaxed">
                            &ldquo;{match.snippet}&rdquo;
                          </div>
                        )}

                        {/* Sources with individual Recency Label on every source link */}
                        {match.sources && match.sources.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-[#CBD8E6]">
                            <span className="text-[11px] font-bold text-[#475569] uppercase block">
                              Source Reports ({match.sources.length}):
                            </span>
                            <div className="space-y-1.5">
                              {match.sources.map((src: any, sIdx: number) => (
                                <a
                                  key={src.url || sIdx}
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#EAF1F8] hover:bg-[#E0F2FE] border border-[#CBD8E6] text-[12px] text-[#0369A1] hover:text-[#075985] transition-colors group cursor-pointer"
                                >
                                  <div className="min-w-0 pr-2">
                                    <div className="truncate font-semibold text-[#0B2540] group-hover:text-[#0369A1]">
                                      {src.title || "Read Article"}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#475569] mt-1">
                                      {src.site_name && (
                                        <span className="font-mono text-[#0369A1]">{src.site_name}</span>
                                      )}
                                      {src.site_name && src.date && <span>&bull;</span>}
                                      {src.date && <span>{src.date}</span>}
                                      <span>&bull;</span>
                                      {/* Requirement 1: Show recency label on every source link */}
                                      <span
                                        className={`font-semibold px-1.5 py-0.2 rounded border text-[10.5px] ${getRecencyBadgeClasses(
                                          src.recencyLabel
                                        )}`}
                                      >
                                        {src.recencyLabel}
                                      </span>
                                    </div>
                                  </div>
                                  <ExternalLink className="w-3.5 h-3.5 text-[#94A9BF] group-hover:text-[#0369A1] shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white border border-[#CBD8E6] text-center text-[14px] text-[#475569] space-y-1.5 shadow-sm">
                  <Info className="w-6 h-6 text-[#94A9BF] mx-auto" />
                  <div className="font-bold text-[#0B2540]">No flood hotspots currently matched in this zone.</div>
                  <div className="text-[13px] text-[#475569]">
                    Reports are scanned and filtered to include only hotspots belonging to {currentZone.name}.
                  </div>
                </div>
              )}
            </div>

            {/* Requirement 3: ZONE FILTER - Outside the pilot zone (not simulated) in a separate collapsed section */}
            {outsideZoneMatches.length > 0 && (
              <div className="p-5 rounded-2xl bg-white border border-[#CBD8E6] shadow-sm space-y-3">
                <button
                  type="button"
                  onClick={() => setIsOutsideZoneOpen(!isOutsideZoneOpen)}
                  className="w-full flex items-center justify-between text-left cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-[#EAF1F8] border border-[#CBD8E6] text-[#475569]">
                      <MapPin className="w-4 h-4 text-[#475569]" />
                    </div>
                    <div>
                      <div className="text-[14px] font-bold text-[#0B2540] group-hover:text-[#0369A1] transition-colors">
                        Outside the pilot zone (not simulated) ({outsideZoneMatches.length})
                      </div>
                      <div className="text-xs text-[#475569]">
                        Reports for areas outside current zone (e.g. Dwarka, Okhla) - shown for awareness, excluded from simulation
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#0369A1] bg-[#EAF1F8] px-3 py-1.5 rounded-lg border border-[#CBD8E6]">
                    <span>{isOutsideZoneOpen ? "Collapse section" : "Expand section"}</span>
                    {isOutsideZoneOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </div>
                </button>

                {isOutsideZoneOpen && (
                  <div className="pt-4 border-t border-[#CBD8E6] grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                    {outsideZoneMatches.map((match, idx) => (
                      <div
                        key={match.hotspotName || idx}
                        className="p-4 rounded-xl bg-[#F8FAFC] border border-[#CBD8E6] space-y-3 opacity-90 hover:opacity-100 transition-opacity"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-[#0B2540] text-[15px] truncate">
                              {match.hotspotName}
                            </span>
                            {/* Recency badge */}
                            <span
                              className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold uppercase shrink-0 border ${getRecencyBadgeClasses(
                                match.recencyLabel
                              )}`}
                            >
                              {match.recencyLabel}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-md font-bold uppercase border ${
                                match.eventType === "Active incident"
                                  ? "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]"
                                  : "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
                              }`}
                            >
                              {match.eventType}
                            </span>
                            <span className="text-[11px] font-semibold text-[#475569] bg-[#E2E8F0] border border-[#CBD5E1] px-2 py-0.5 rounded-md">
                              Outside pilot zone (not simulated)
                            </span>
                          </div>
                        </div>

                        {/* Snippet */}
                        {match.snippet && (
                          <div className="p-3 rounded-lg bg-white border border-[#CBD8E6] text-[13px] text-[#475569] italic leading-relaxed">
                            &ldquo;{match.snippet}&rdquo;
                          </div>
                        )}

                        {/* Sources */}
                        {match.sources && match.sources.length > 0 && (
                          <div className="space-y-1.5 pt-2 border-t border-[#CBD8E6]">
                            <span className="text-[11px] font-bold text-[#475569] uppercase block">
                              Source Reports:
                            </span>
                            <div className="space-y-1.5">
                              {match.sources.map((src: any, sIdx: number) => (
                                <a
                                  key={src.url || sIdx}
                                  href={src.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-between p-2 rounded-lg bg-white hover:bg-[#E0F2FE] border border-[#CBD8E6] text-[12px] text-[#0369A1] hover:text-[#075985] transition-colors group cursor-pointer"
                                >
                                  <div className="min-w-0 pr-2">
                                    <div className="truncate font-semibold text-[#0B2540] group-hover:text-[#0369A1]">
                                      {src.title || "Read Report"}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[11px] text-[#475569] mt-0.5">
                                      {src.site_name && (
                                        <span className="font-mono text-[#0369A1]">{src.site_name}</span>
                                      )}
                                      {src.date && <span>&bull; {src.date}</span>}
                                      <span>&bull;</span>
                                      <span
                                        className={`font-semibold px-1.5 py-0.2 rounded border text-[10px] ${getRecencyBadgeClasses(
                                          src.recencyLabel
                                        )}`}
                                      >
                                        {src.recencyLabel}
                                      </span>
                                    </div>
                                  </div>
                                  <ExternalLink className="w-3.5 h-3.5 text-[#94A9BF] group-hover:text-[#0369A1] shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. MATCHED ROADS FROM LIVE ADVISORIES */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#CBD8E6] pb-2">
                <span className="text-[13px] font-bold text-[#0B2540] uppercase tracking-wider flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[#92400E]" />
                  <span>Matched Road Closures from Advisories ({sanitizedMatchedRoads.length})</span>
                </span>
                <span className="text-[12px] text-[#475569]">OpenStreetMap Corridors</span>
              </div>

              {sanitizedMatchedRoads.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sanitizedMatchedRoads.map((roadMatch, idx) => (
                    <div
                      key={roadMatch.roadName || idx}
                      className={`p-4 rounded-xl border shadow-2xs space-y-3 transition-all ${
                        useLiveTinyFish
                          ? "bg-[#FEF3C7] border-[#FDE68A]"
                          : "bg-white border-[#CBD8E6]"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                useLiveTinyFish ? "bg-[#92400E] animate-ping" : "bg-[#0369A1]"
                              }`}
                            />
                            <span className="font-bold text-[#0B2540] text-[15px] truncate">
                              {roadMatch.roadName}
                            </span>
                          </div>
                          {/* Recency label of newest source */}
                          <span
                            className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold uppercase shrink-0 border ${getRecencyBadgeClasses(
                              roadMatch.recencyLabel
                            )}`}
                          >
                            {roadMatch.recencyLabel}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded-md font-bold uppercase border ${
                              roadMatch.eventType === "Active incident"
                                ? "bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]"
                                : "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]"
                            }`}
                          >
                            {roadMatch.eventType}
                          </span>
                          {useLiveTinyFish && (
                            <span className="text-[11px] font-bold text-[#92400E] bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 rounded-md">
                              Closed in simulation
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Snippet */}
                      {roadMatch.snippet && (
                        <div className="p-3 rounded-lg bg-white border border-[#CBD8E6] text-[13px] text-[#475569] italic leading-relaxed">
                          &ldquo;{roadMatch.snippet}&rdquo;
                        </div>
                      )}

                      {/* Sources */}
                      {roadMatch.sources && roadMatch.sources.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-[#CBD8E6]">
                          <span className="text-[11px] font-bold text-[#475569] uppercase block">
                            Source Police / News Advisories:
                          </span>
                          <div className="space-y-1.5">
                            {roadMatch.sources.map((src: any, sIdx: number) => (
                              <a
                                key={src.url || sIdx}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-between p-2.5 rounded-lg bg-[#EAF1F8] hover:bg-[#E0F2FE] border border-[#CBD8E6] text-[12px] text-[#0369A1] hover:text-[#075985] transition-colors group cursor-pointer"
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="truncate font-semibold text-[#0B2540] group-hover:text-[#0369A1]">
                                    {src.title || "Read Advisory"}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#475569] mt-1">
                                    {src.site_name && (
                                      <span className="font-mono text-[#0369A1]">{src.site_name}</span>
                                    )}
                                    {src.site_name && src.date && <span>&bull;</span>}
                                    {src.date && <span>{src.date}</span>}
                                    <span>&bull;</span>
                                    <span
                                      className={`font-semibold px-1.5 py-0.2 rounded border text-[10px] ${getRecencyBadgeClasses(
                                        src.recencyLabel
                                      )}`}
                                    >
                                      {src.recencyLabel}
                                    </span>
                                  </div>
                                </div>
                                <ExternalLink className="w-3.5 h-3.5 text-[#94A9BF] group-hover:text-[#0369A1] shrink-0" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-white border border-[#CBD8E6] text-center text-[14px] text-[#475569] space-y-1.5 shadow-sm">
                  <Info className="w-6 h-6 text-[#94A9BF] mx-auto" />
                  <div className="font-bold text-[#0B2540]">No road closures identified in news advisories for this area.</div>
                  <div className="text-[13px] text-[#475569]">
                    Corridors are matched case-insensitively against the loaded OpenStreetMap network.
                  </div>
                </div>
              )}
            </div>
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
