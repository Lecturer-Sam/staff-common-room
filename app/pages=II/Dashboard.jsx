// 9. src/pages/Dashboard.jsx — Example Page Using the Layout

import AppShell from "../components/layout/AppShell";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

export default function Dashboard() {
  return (
    <AppShell pageTitle="Dashboard" pageSubtitle="Welcome back, John. Here's what's happening across the consortium.">
      {/* Quick Actions */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button variant="primary" className="flex items-center gap-2">
          <PlusIcon className="w-4 h-4" />
          New Project
        </Button>
        <Button variant="secondary" className="flex items-center gap-2">
          <DownloadIcon className="w-4 h-4" />
          Export Report
        </Button>
        <Button variant="ghost" className="flex items-center gap-2">
          <MoreIcon className="w-4 h-4" />
          More
        </Button>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Stat Cards */}
        <StatCard
          icon={<FolderIcon className="w-[18px] h-[18px]" />}
          iconBg="bg-app-primary/10"
          iconColor="text-app-primary"
          trend="+12%"
          trendColor="text-emerald-600 bg-emerald-500/10"
          value="24"
          label="Active Projects"
        />
        <StatCard
          icon={<UsersIcon className="w-[18px] h-[18px]" />}
          iconBg="bg-app-accent/10"
          iconColor="text-app-accent"
          trend="+3"
          trendColor="text-emerald-600 bg-emerald-500/10"
          value="156"
          label="Consortium Members"
        />
        <StatCard
          icon={<FileIcon className="w-[18px] h-[18px]" />}
          iconBg="bg-app-primary/10"
          iconColor="text-app-primary"
          trend="-2"
          trendColor="text-red-600 bg-red-500/10"
          value="89"
          label="Documents"
        />
        <StatCard
          icon={<CalendarIcon className="w-[18px] h-[18px]" />}
          iconBg="bg-app-accent/10"
          iconColor="text-app-accent"
          trend="This week"
          trendColor="text-emerald-600 bg-emerald-500/10"
          value="7"
          label="Upcoming Events"
        />

        {/* Chart Card — spans 2 columns */}
        <Card className="sm:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold text-app-text text-[0.95rem]">Project Activity</div>
              <div className="text-xs text-app-text-secondary">Last 30 days</div>
            </div>
            <select className="bg-app-surface-muted border border-app-border rounded-lg px-3 py-1.5 text-xs text-app-text focus:outline-none focus:ring-2 focus:ring-app-primary/20">
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>This year</option>
            </select>
          </div>
          {/* Chart placeholder */}
          <div className="h-44 flex items-end gap-2 px-2">
            {[45, 65, 55, 80, 60, 75, 90].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t-md opacity-80"
                style={{
                  height: `${h}%`,
                  background: i === 6 ? "var(--color-app-accent)" : "var(--color-app-primary)",
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 px-2">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <span key={d} className="text-[0.65rem] text-app-text-secondary">{d}</span>
            ))}
          </div>
        </Card>

        {/* Activity Feed */}
        <Card>
          <div className="font-semibold text-app-text mb-4 text-[0.95rem]">Recent Activity</div>
          <div className="flex flex-col gap-4">
            <ActivityItem
              icon={<FileIcon className="w-3.5 h-3.5" />}
              iconBg="bg-app-primary/10"
              iconColor="text-app-primary"
              title="New document uploaded"
              subtitle="Research Proposal v2.pdf"
              time="2 min ago"
            />
            <ActivityItem
              icon={<UsersIcon className="w-3.5 h-3.5" />}
              iconBg="bg-app-accent/10"
              iconColor="text-app-accent"
              title="Member joined"
              subtitle="Dr. Sarah Chen — MIT"
              time="1 hour ago"
            />
            <ActivityItem
              icon={<FolderIcon className="w-3.5 h-3.5" />}
              iconBg="bg-app-primary/10"
              iconColor="text-app-primary"
              title="Project milestone"
              subtitle="Phase 2 completed — Climate Data"
              time="3 hours ago"
            />
          </div>
        </Card>

        {/* Upcoming Events */}
        <Card>
          <div className="font-semibold text-app-text mb-4 text-[0.95rem]">Upcoming Events</div>
          <div className="flex flex-col gap-3">
            <EventCard month="Jul" day="18" title="Quarterly Review" time="10:00 AM · Virtual" />
            <EventCard month="Jul" day="22" title="Workshop: Data Ethics" time="2:00 PM · Room 304" />
            <EventCard month="Aug" day="05" title="Consortium Summit" time="All day · Berlin" />
          </div>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="mt-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-4 min-w-[500px]">
          <div className="font-semibold text-app-text text-[0.95rem]">Recent Projects</div>
          <a href="/projects" className="text-sm text-app-primary font-medium hover:underline">
            View all →
          </a>
        </div>
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-app-border">
              {["Project", "Lead", "Status", "Progress"].map((h) => (
                <th
                  key={h}
                  className={`text-left py-3 px-2 text-[0.7rem] font-semibold uppercase tracking-wider text-app-text-secondary ${
                    h === "Progress" ? "text-right" : ""
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <TableRow
              project="Climate Data Initiative"
              category="Environmental Research"
              lead="Alice Cooper"
              leadInitials="AC"
              leadColor="bg-app-primary"
              status="active"
              progress="78%"
            />
            <TableRow
              project="Neural Network Standards"
              category="AI Governance"
              lead="Mark Kim"
              leadInitials="MK"
              leadColor="bg-app-accent"
              status="review"
              progress="45%"
            />
            <TableRow
              project="Open Source Policy"
              category="Legal Framework"
              lead="Lisa Park"
              leadInitials="LP"
              leadColor="bg-violet-600"
              status="active"
              progress="92%"
            />
          </tbody>
        </table>
      </Card>
    </AppShell>
  );
}

// --- Sub-components ---

function StatCard({ icon, iconBg, iconColor, trend, trendColor, value, label }) {
  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center ${iconColor}`}>
          {icon}
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${trendColor}`}>{trend}</span>
      </div>
      <div className="text-2xl font-bold text-app-text mb-1">{value}</div>
      <div className="text-xs text-app-text-secondary">{label}</div>
    </Card>
  );
}

function ActivityItem({ icon, iconBg, iconColor, title, subtitle, time }) {
  return (
    <div className="flex gap-3 items-start">
      <div className={`w-8 h-8 ${iconBg} rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
        {icon}
      </div>
      <div>
        <div className="text-xs font-medium text-app-text">{title}</div>
        <div className="text-[0.7rem] text-app-text-secondary">{subtitle}</div>
        <div className="text-[0.65rem] text-app-text-secondary mt-0.5">{time}</div>
      </div>
    </div>
  );
}

function EventCard({ month, day, title, time }) {
  return (
    <div className="flex gap-3 items-center p-3 bg-app-surface-muted rounded-2xl">
      <div className="text-center min-w-[2.5rem]">
        <div className="text-[0.65rem] font-semibold text-app-accent uppercase">{month}</div>
        <div className="text-lg font-bold text-app-text">{day}</div>
      </div>
      <div className="flex-1">
        <div className="text-xs font-semibold text-app-text">{title}</div>
        <div className="text-[0.7rem] text-app-text-secondary">{time}</div>
      </div>
    </div>
  );
}

function TableRow({ project, category, lead, leadInitials, leadColor, status, progress }) {
  return (
    <tr className="border-b border-app-border last:border-0">
      <td className="py-3 px-2">
        <div className="font-medium text-sm text-app-text">{project}</div>
        <div className="text-[0.7rem] text-app-text-secondary">{category}</div>
      </td>
      <td className="py-3 px-2">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 ${leadColor} rounded-full flex items-center justify-center text-white text-[0.6rem] font-semibold`}>
            {leadInitials}
          </div>
          <span className="text-xs text-app-text">{lead}</span>
        </div>
      </td>
      <td className="py-3 px-2">
        <Badge variant={status}>{status === "active" ? "Active" : "Review"}</Badge>
      </td>
      <td className="py-3 px-2 text-right">
        <div className="text-sm font-semibold text-app-text">{progress}</div>
      </td>
    </tr>
  );
}

// --- Icons ---

function PlusIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function DownloadIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function MoreIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
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
