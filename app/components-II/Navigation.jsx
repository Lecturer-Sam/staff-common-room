import React, { useState } from 'react';
import { Dropdown } from './Overlay';

// =============================================
// Navbar
// Layout: [logo + brand] —— [links, centered] —— [menu]
// The right-hand menu button opens Sign in / Sign out / Portal.
// Links collapse into a slide-down panel under the bar on mobile.
// =============================================

const menuIcons = {
  signIn: (
    <path
      fillRule="evenodd"
      d="M3 4a1 1 0 0 1 1-1h5a1 1 0 1 1 0 2H5v10h4a1 1 0 1 1 0 2H4a1 1 0 0 1-1-1V4Zm10.293 2.293a1 1 0 0 1 1.414 0l3 3a1 1 0 0 1 0 1.414l-3 3a1 1 0 0 1-1.414-1.414L14.586 11H8a1 1 0 1 1 0-2h6.586l-1.293-1.293a1 1 0 0 1 0-1.414Z"
      clipRule="evenodd"
    />
  ),
  signOut: (
    <path
      fillRule="evenodd"
      d="M17 4a1 1 0 0 0-1-1h-5a1 1 0 1 0 0 2h4v10h-4a1 1 0 1 0 0 2h5a1 1 0 0 0 1-1V4ZM6.707 6.293a1 1 0 0 1 0 1.414L5.414 9H12a1 1 0 1 1 0 2H5.414l1.293 1.293a1 1 0 0 1-1.414 1.414l-3-3a1 1 0 0 1 0-1.414l3-3a1 1 0 0 1 1.414 0Z"
      clipRule="evenodd"
    />
  ),
  portal: (
    <path d="M4 3a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1H4Zm0 8a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1H4Zm8-8a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1h-3Zm0 8a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-3Z" />
  ),
};

export const Navbar = ({
  logo = 'BEC',
  brand = 'Beacon Edu. Consult',
  links = ['Dashboard', 'Projects', 'Team', 'Insights'],
  isAuthenticated = false,
  userName,
  onSignIn,
  onSignOut,
  onPortalClick,
}) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = isAuthenticated
    ? [
        { label: 'Portal', onClick: onPortalClick, icon: <svg viewBox="0 0 20 20" fill="currentColor">{menuIcons.portal}</svg> },
        { divider: true },
        {
          label: 'Sign out',
          onClick: onSignOut,
          danger: true,
          icon: <svg viewBox="0 0 20 20" fill="currentColor">{menuIcons.signOut}</svg>,
        },
      ]
    : [
        {
          label: 'Sign in',
          onClick: onSignIn,
          icon: <svg viewBox="0 0 20 20" fill="currentColor">{menuIcons.signIn}</svg>,
        },
        { label: 'Portal', onClick: onPortalClick, icon: <svg viewBox="0 0 20 20" fill="currentColor">{menuIcons.portal}</svg> },
      ];

  return (
    <nav className="bg-navbar-bg border-b border-app-border sticky top-0 z-50">
      <div className="max-w-screen-xl mx-auto px-8">
        <div className="py-5 grid grid-cols-[auto_1fr_auto] items-center gap-x-4">
          {/* Left — logo + brand */}
          <a href="#" className="flex items-center gap-x-2.5 min-w-0">
            <div className="w-9 h-9 flex-shrink-0 bg-app-primary flex items-center justify-center rounded-2xl shadow-inner">
              <span className="flex items-center gap-2">
                <img src="/beaconlogo.png" alt="" className="h-7 w-7 shrink-0 object-contain" />
                {/* Short on very small, full on sm+ */}
                <div className="hidden sm:block">
                  <p className="text-sm font-bold leading-tight text-indigo-700">Beacon Educational</p>
                  <p className="text-sm font-bold leading-tight text-amber-500">Consult</p>
                </div>
              </span>
            </div>
            <span className="font-display text-2xl font-semibold tracking-tighter truncate hidden sm:block">
              {brand}
            </span>
          </a>

          {/* Middle — links, centered, hidden below md */}
          <div className="hidden md:flex items-center justify-center gap-x-8 text-sm">
            {links.map((link, index) => (
              <a key={index} href="#" className="font-medium text-app-text-secondary hover:text-app-text transition-colors whitespace-nowrap">
                {link}
              </a>
            ))}
          </div>

          {/* Right — mobile links toggle + account menu */}
          <div className="flex items-center justify-end gap-x-2">
            <button
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle navigation links"
              aria-expanded={mobileOpen}
              className="md:hidden p-2 rounded-2xl text-app-text-secondary hover:bg-app-surface-muted transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            <Dropdown
              align="right"
              items={menuItems}
              trigger={
                <button className="flex items-center gap-x-1.5 pl-4 pr-2.5 py-2 rounded-3xl border border-app-border bg-app-surface hover:bg-app-surface-muted transition-colors text-sm font-semibold">
                  <span>{isAuthenticated && userName ? userName : 'Menu'}</span>
                  <svg className="w-3.5 h-3.5 text-app-text-secondary" viewBox="0 0 16 16" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              }
            />
          </div>
        </div>

        {/* Mobile links panel */}
        {mobileOpen && (
          <div className="md:hidden pb-4 flex flex-col gap-y-1 border-t border-app-border pt-3">
            {links.map((link, index) => (
              <a
                key={index}
                href="#"
                className="px-2 py-2.5 rounded-2xl text-sm font-medium text-app-text-secondary hover:bg-app-surface-muted hover:text-app-text transition-colors"
              >
                {link}
              </a>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};

// =============================================
// Tabs — controlled or uncontrolled
// =============================================
export const Tabs = ({ tabs = [], defaultValue, value, onChange, className = '' }) => {
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.value);
  const active = value ?? internal;
  const setActive = onChange ?? setInternal;

  return (
    <div className={className}>
      <div role="tablist" className="flex items-center gap-x-1 border-b border-app-border">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            role="tab"
            aria-selected={active === tab.value}
            onClick={() => setActive(tab.value)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              active === tab.value ? 'text-app-primary' : 'text-app-text-secondary hover:text-app-text'
            }`}
          >
            {tab.label}
            {active === tab.value && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-app-primary rounded-full" />}
          </button>
        ))}
      </div>
      {tabs.map((tab) => (
        <div key={tab.value} hidden={active !== tab.value} className="pt-5">
          {tab.content}
        </div>
      ))}
    </div>
  );
};

// =============================================
// Breadcrumbs
// =============================================
export const Breadcrumbs = ({ items = [], className = '' }) => (
  <nav aria-label="Breadcrumb" className={className}>
    <ol className="flex items-center flex-wrap gap-x-1.5 text-sm">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <li key={i} className="flex items-center gap-x-1.5">
            {i > 0 && (
              <svg className="w-3.5 h-3.5 text-app-text-secondary/60" viewBox="0 0 16 16" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            )}
            {isLast || !item.href ? (
              <span className={isLast ? 'font-medium text-app-text' : 'text-app-text-secondary'}>{item.label}</span>
            ) : (
              <a href={item.href} className="text-app-text-secondary hover:text-app-text transition-colors">
                {item.label}
              </a>
            )}
          </li>
        );
      })}
    </ol>
  </nav>
);

// =============================================
// Pagination
// =============================================
export const Pagination = ({ page = 1, totalPages = 1, onChange, className = '' }) => {
  const canPrev = page > 1;
  const canNext = page < totalPages;

  const pageNumbers = () => {
    const nums = [];
    const window = 1;
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= page - window && p <= page + window)) {
        nums.push(p);
      } else if (nums[nums.length - 1] !== '...') {
        nums.push('...');
      }
    }
    return nums;
  };

  return (
    <nav className={`flex items-center gap-x-1.5 ${className}`} aria-label="Pagination">
      <button
        onClick={() => canPrev && onChange?.(page - 1)}
        disabled={!canPrev}
        className="w-9 h-9 flex items-center justify-center rounded-2xl text-app-text-secondary hover:bg-app-surface-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
        aria-label="Previous page"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M9.78 11.78a.75.75 0 0 1-1.06 0L4.47 7.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 1 1 1.06 1.06L6.06 7l3.72 3.72a.75.75 0 0 1 0 1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {pageNumbers().map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center text-app-text-secondary text-sm">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange?.(p)}
            aria-current={p === page ? 'page' : undefined}
            className={`w-9 h-9 flex items-center justify-center rounded-2xl text-sm font-medium transition-colors ${
              p === page ? 'bg-app-primary text-white' : 'text-app-text hover:bg-app-surface-muted'
            }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => canNext && onChange?.(page + 1)}
        disabled={!canNext}
        className="w-9 h-9 flex items-center justify-center rounded-2xl text-app-text-secondary hover:bg-app-surface-muted disabled:opacity-40 disabled:pointer-events-none transition-colors"
        aria-label="Next page"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M6.22 4.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </nav>
  );
};

// =============================================
// Accordion
// =============================================
export const Accordion = ({ items = [], allowMultiple = false, className = '' }) => {
  const [openIds, setOpenIds] = useState([]);

  const toggle = (id) => {
    setOpenIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return allowMultiple ? [...prev, id] : [id];
    });
  };

  return (
    <div className={`border border-app-border rounded-3xl divide-y divide-app-border overflow-hidden ${className}`}>
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        return (
          <div key={item.id} className="bg-app-surface">
            <button
              onClick={() => toggle(item.id)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between px-5 py-4 text-left"
            >
              <span className="text-sm font-semibold text-app-text">{item.title}</span>
              <svg
                className={`w-4 h-4 text-app-text-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.22 6.22a.75.75 0 0 1 1.06 0L8 8.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 7.28a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            {isOpen && <div className="px-5 pb-4 text-sm text-app-text-secondary">{item.content}</div>}
          </div>
        );
      })}
    </div>
  );
};

export default { Navbar, Tabs, Breadcrumbs, Pagination, Accordion };
