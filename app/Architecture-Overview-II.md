Architecture Overview
The layout follows a three-zone responsive strategy:

| Zone           | Mobile (<1024px)                                  | Desktop (≥1024px)                                       |
| -------------- | ------------------------------------------------- | ------------------------------------------------------- |
| **Navigation** | Bottom tab bar (5 items) + hamburger sheet drawer | Fixed left sidebar (16rem)                              |
| **Header**     | Sticky top, minimal, hamburger + search icon      | Sticky top with breadcrumb + search input               |
| **Content**    | Full-width, 1rem padding, single-column bento     | `margin-left: 16rem`, wider padding, multi-column bento |


Key Design Decisions
1. Mobile-First Bento Grid
The dashboard uses a CSS grid that scales responsively:
Mobile: Single column (grid-template-columns: 1fr)
Tablet (640px+): 2 columns
Desktop (1024px+): 3 columns
Wide (1280px+): 4 columns
The large chart card spans 2 columns on desktop using .bento-span-2.

2. Color System Integration
Theme tokens are mapped throughout:
#e8e8e8 → --app-bg (page background)
#bababa → --navbar-bg (sidebar + header)
#0f766e → --app-primary (active states, buttons)
#c2410c → --app-accent (badges, highlights)
#ffffff → --app-surface (cards)
#111827 / #57534e → text hierarchy

3. Component Patterns Included

| Component         | Location           | Notes                                      |
| ----------------- | ------------------ | ------------------------------------------ |
| **Stat Cards**    | Bento grid         | Icon + trend badge + value + label         |
| **Activity Feed** | Bento grid         | Avatar/icon + title + subtitle + timestamp |
| **Event Cards**   | Bento grid         | Date block + title + time/location         |
| **Data Table**    | Full-width section | Responsive with `overflow-x:auto`          |
| **Bottom Nav**    | Mobile only        | 5-icon tab bar with active state           |
| **Sheet Drawer**  | Mobile overlay     | Slides in from left, backdrop blur         |


File Structure Recommendation

src/
├── components/
│   ├── layout/
│   │   ├── AppShell.jsx          # Main wrapper (sidebar + main + mobile nav)
│   │   ├── Sidebar.jsx           # Desktop navigation
│   │   ├── MobileNav.jsx         # Bottom tab bar
│   │   ├── MobileSheet.jsx       # Hamburger drawer overlay
│   │   ├── TopHeader.jsx         # Sticky header
│   │   └── PageHeader.jsx        # Title + breadcrumb + actions
│   ├── ui/
│   │   ├── Card.jsx              # .card-base wrapper
│   │   ├── StatCard.jsx          # KPI card component
│   │   ├── Badge.jsx             # Status badges
│   │   ├── Button.jsx            # btn / btn-primary / btn-secondary / btn-accent
│   │   ├── Avatar.jsx            # Initials avatar
│   │   └── DataTable.jsx         # Table wrapper
│   └── dashboard/
│       ├── BentoGrid.jsx
│       ├── ActivityFeed.jsx
│       ├── EventList.jsx
│       └── ChartPlaceholder.jsx
├── pages/
│   ├── Dashboard.jsx
│   ├── Projects.jsx
│   ├── Members.jsx
│   └── ...
└── index.css                     # Your theme (already provided)


Responsive Breakpoints Used
| Name | Width  | Usage                                                         |
| ---- | ------ | ------------------------------------------------------------- |
| `sm` | 640px  | Bento grid → 2 columns                                        |
| `lg` | 1024px | Sidebar visible, bottom nav hidden, main content shifts right |
| `xl` | 1280px | Bento grid → 4 columns                                        |



Next Steps
1. Extract components from the widget HTML into your React project
2. Add React Router — wrap nav links with <Link> or <NavLink>
3. Add state management for the mobile sheet toggle (or use a headless UI library like Radix Dialog)
4. Replace chart placeholder with a real charting library (Recharts, Chart.js, or Tremor)
5. Add dark mode toggle using Tailwind's dark: modifier or a CSS class swap



App.jsx
  └── BrowserRouter
        └── AppShell (wraps every page)
              ├── Sidebar (lg+ only, fixed left)
              ├── TopHeader (sticky, all breakpoints)
              ├── <main> content area
              │     └── Page-specific content (Dashboard, Projects, etc.)
              └── MobileNav (lg:hidden, sticky bottom)
        └── MobileSheet (overlay, toggled by hamburger)
