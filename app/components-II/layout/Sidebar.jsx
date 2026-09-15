// 2. src/components/layout/Sidebar.jsx — Desktop Navigation

import { NavLink } from "react-router-dom";

const navGroups = [
  {
    label: "Main",
    items: [
      { to: "/", label: "Dashboard", icon: GridIcon },
      { to: "/projects", label: "Projects", icon: FolderIcon },
      { to: "/members", label: "Members", icon: UsersIcon },
      { to: "/documents", label: "Documents", icon: FileIcon },
      { to: "/calendar", label: "Calendar", icon: CalendarIcon },
    ],
  },
  {
    label: "Analytics",
    items: [
      { to: "/reports", label: "Reports", icon: BarChartIcon },
      { to: "/timeline", label: "Timeline", icon: ClockIcon },
    ],
  },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 z-40 bg-navbar-bg border-r border-app-border flex flex-col overflow-y-auto custom-scroll">
      {/* Logo */}
      <div className="p-4 border-b border-black/5 flex items-center gap-3">
        <div className="w-9 h-9 bg-app-primary rounded-xl flex items-center justify-center shrink-0">
          <ConsortiumLogo />
        </div>
        <div className="overflow-hidden">
          <div className="font-bold text-[0.95rem] text-app-text whitespace-nowrap">
            Consortium
          </div>
          <div className="text-[0.7rem] text-app-text-secondary whitespace-nowrap">
            Research Portal
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="text-[0.65rem] font-semibold uppercase tracking-wider text-app-text-secondary px-3 py-2 mb-1">
              {group.label}
            </div>
            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[0.875rem] font-medium mb-1 transition-colors ${
                    isActive
                      ? "bg-app-primary/10 text-app-primary border-r-[3px] border-app-primary"
                      : "text-app-text-secondary hover:bg-black/5 hover:text-app-text"
                  }`
                }
              >
                <item.icon className="w-[18px] h-[18px]" />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-3 border-t border-black/5">
        <button className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-black/5 transition-colors text-left">
          <div className="w-8 h-8 bg-app-primary rounded-full flex items-center justify-center text-white font-semibold text-xs shrink-0">
            JD
          </div>
          <div className="overflow-hidden flex-1">
            <div className="text-[0.8rem] font-semibold text-app-text whitespace-nowrap">
              John Doe
            </div>
            <div className="text-[0.7rem] text-app-text-secondary whitespace-nowrap">
              Research Lead
            </div>
          </div>
          <ChevronDownIcon className="w-4 h-4 text-app-text-secondary shrink-0" />
        </button>
      </div>
    </aside>
  );
}

// --- Icons ---

function GridIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function FolderIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function UsersIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function FileIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function CalendarIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function BarChartIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function ClockIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function ChevronDownIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ConsortiumLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}
