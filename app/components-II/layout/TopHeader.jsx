// 3. src/components/layout/TopHeader.jsx — Sticky Header

import { useState } from "react";

export default function TopHeader({ pageTitle, onMenuToggle }) {
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="sticky top-0 z-30 h-14 bg-navbar-bg/85 backdrop-blur-xl border-b border-app-border flex items-center justify-between px-4">
      {/* Left: Mobile hamburger + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-xl hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-app-primary/20"
        >
          <MenuIcon className="w-5 h-5" />
        </button>
        <div className="hidden lg:flex items-center gap-2 text-sm text-app-text-secondary">
          <span className="hover:text-app-text cursor-pointer transition-colors">
            Dashboard
          </span>
          <ChevronRightIcon className="w-3.5 h-3.5" />
          <span className="font-semibold text-app-text">Overview</span>
        </div>
      </div>

      {/* Right: Search + Actions */}
      <div className="flex items-center gap-2">
        {/* Desktop Search */}
        <div className="hidden md:block relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-secondary" />
          <input
            type="text"
            placeholder="Search..."
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className={`bg-white/60 border border-app-border rounded-xl py-2 pl-9 pr-3 text-sm w-64 text-app-text placeholder:text-app-text-secondary/60 transition-all focus:outline-none focus:ring-[3px] focus:ring-app-primary/15 focus:border-app-primary ${
              searchFocused ? "bg-white shadow-sm" : ""
            }`}
          />
        </div>

        {/* Mobile search toggle */}
        <button className="md:hidden p-2 rounded-xl hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-app-primary/20">
          <SearchIcon className="w-[18px] h-[18px] text-app-text-secondary" />
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-xl hover:bg-black/5 transition-colors focus:outline-none focus:ring-2 focus:ring-app-primary/20">
          <BellIcon className="w-[18px] h-[18px] text-app-text-secondary" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-app-accent rounded-full" />
        </button>
      </div>
    </header>
  );
}

function MenuIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function SearchIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function BellIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function ChevronRightIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
