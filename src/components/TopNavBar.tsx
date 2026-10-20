import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Activity, Home, Scan } from "lucide-react";
import { useAppState } from "../context/AppStateContext";

export default function TopNavBar() {
  const location = useLocation();
  const { currentZone } = useAppState();

  const navLinks = [
    { name: "Dashboard", path: "/dashboard" },
    { name: "Best Fixes", path: "/best-fixes" },
    { name: "Live Feed", path: "/live-feed" },
    { name: "Reports", path: "/reports" },
    { name: "Assumptions", path: "/assumptions" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0B2540] border-b border-[#1A3B5C] shadow-md select-none text-[#E6EEF7]">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Zone Info */}
        <div className="flex items-center gap-6 min-w-0">
          <Link
            to="/"
            className="flex items-center gap-2.5 text-[#E6EEF7] hover:text-white transition-colors shrink-0"
          >
            <div className="w-9 h-9 rounded-lg bg-[#0E7490] border border-[#67E8F9]/40 flex items-center justify-center text-white shadow-xs">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-[#E6EEF7] whitespace-nowrap">
                RoadRisk Delhi
              </span>
              <span className="text-[12px] text-[#9FB3C8] font-medium leading-none">
                {currentZone.isDefault ? "Central Delhi Corridor" : currentZone.name}
              </span>
            </div>
          </Link>

          {/* Navigation Links with Active Underline */}
          <nav className="hidden md:flex items-center gap-6 text-[15px] font-medium pt-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative py-4 transition-colors whitespace-nowrap ${
                    isActive
                      ? "text-white font-bold border-b-2 border-[#67E8F9]"
                      : "text-[#E6EEF7] hover:text-white"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions: Change Area & Dashboard CTA */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Ghost button */}
          <Link
            to="/select-area"
            className="px-3.5 py-2 rounded-lg bg-transparent hover:bg-[#12355A] border border-[#2B4A6B] text-[#E6EEF7] text-[14px] font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Change analysis area"
          >
            <Scan className="w-4 h-4 text-[#F59E0B]" />
            <span className="hidden sm:inline">Change Area</span>
            <span className="sm:hidden">Area</span>
          </Link>

          <Link
            to="/dashboard"
            className="px-3.5 py-2 rounded-lg bg-[#0369A1] hover:bg-[#075985] text-white text-[14px] font-bold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Go to Simulation Dashboard"
          >
            <span>Open Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Mobile Navigation bar for smaller screens */}
      <div className="md:hidden flex items-center overflow-x-auto px-6 border-t border-[#1A3B5C] bg-[#091D33] gap-4 text-[14px] font-medium no-scrollbar">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`py-2.5 transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? "text-white font-bold border-b-2 border-[#67E8F9]"
                  : "text-[#9FB3C8] hover:text-[#E6EEF7]"
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
