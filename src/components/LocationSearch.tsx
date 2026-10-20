import React, { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, X, Loader2, Navigation } from "lucide-react";

export interface GeocodeResult {
  place_id: string;
  display_name: string;
  lat: number;
  lon: number;
  boundingbox?: string[]; // [south, north, west, east]
  type?: string;
  class?: string;
}

interface LocationSearchProps {
  onSelectLocation: (lat: number, lon: number, name: string, bbox?: [number, number, number, number]) => void;
  className?: string;
}

export default function LocationSearch({ onSelectLocation, className = "" }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // In-memory client cache
  const clientCache = useRef<Map<string, GeocodeResult[]>>(new Map());
  const debounceTimer = useRef<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchLocation = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    const cacheKey = trimmed.toLowerCase();
    if (clientCache.current.has(cacheKey)) {
      setResults(clientCache.current.get(cacheKey)!);
      setIsOpen(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      const items: GeocodeResult[] = (data.results || []).slice(0, 5);
      clientCache.current.set(cacheKey, items);
      setResults(items);
      setIsOpen(items.length > 0);
    } catch (err) {
      console.info("Geocoding lookup failed:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedIndex(-1);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (!val.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      searchLocation(val);
    }, 300);
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleSelect = (item: GeocodeResult) => {
    setQuery(item.display_name.split(",")[0]);
    setIsOpen(false);
    setSelectedIndex(-1);

    let bbox: [number, number, number, number] | undefined = undefined;
    if (item.boundingbox && item.boundingbox.length === 4) {
      const s = parseFloat(item.boundingbox[0]);
      const n = parseFloat(item.boundingbox[1]);
      const w = parseFloat(item.boundingbox[2]);
      const e = parseFloat(item.boundingbox[3]);
      if (!isNaN(s) && !isNaN(n) && !isNaN(w) && !isNaN(e)) {
        bbox = [s, w, n, e];
      }
    }

    onSelectLocation(item.lat, item.lon, item.display_name, bbox);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className={`relative font-sans text-xs ${className}`}>
      <div className="relative flex items-center">
        <div className="absolute left-3.5 pointer-events-none text-[#475569]">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#0369A1]" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search location in India (e.g. Lajpat Nagar, Rohini, Noida, Connaught Place)..."
          className="w-full pl-10 pr-9 py-2.5 bg-white border border-[#94A9BF] focus:border-[#0369A1] focus:ring-1 focus:ring-[#0369A1] rounded-xl text-[#1E293B] placeholder-[#94A9BF] text-[13px] outline-none shadow-2xs transition-all"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-1 rounded hover:bg-[#EAF1F8] text-[#475569] hover:text-[#0B2540] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-[#CBD8E6] rounded-xl shadow-xl z-[3000] overflow-hidden max-h-64 overflow-y-auto divide-y divide-[#CBD8E6]">
          <div className="px-3.5 py-2 text-[12px] font-bold text-[#0B2540] uppercase tracking-wider bg-[#EAF1F8] border-b border-[#CBD8E6]">
            Location Matches ({results.length})
          </div>
          {results.map((item, idx) => {
            const parts = item.display_name.split(",");
            const title = parts[0]?.trim() || item.display_name;
            const subtitle = parts.slice(1, 4).join(", ").trim();
            const isSelected = idx === selectedIndex;

            return (
              <button
                key={item.place_id || idx}
                type="button"
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 transition-colors cursor-pointer ${
                  isSelected ? "bg-[#E0F2FE] text-[#0369A1]" : "hover:bg-[#EAF1F8] text-[#1E293B]"
                }`}
              >
                <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? "text-[#0369A1]" : "text-[#475569]"}`} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[13px] truncate text-[#0B2540]">{title}</div>
                  {subtitle && (
                    <div className="text-[12px] text-[#475569] truncate">{subtitle}</div>
                  )}
                </div>
                <Navigation className="w-3.5 h-3.5 text-[#94A9BF] shrink-0 mt-1" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
