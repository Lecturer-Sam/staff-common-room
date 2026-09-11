// 7. src/components/ui/Badge.jsx — Status Badges
const variants = {
  active: "bg-emerald-500/10 text-emerald-600",
  review: "bg-amber-500/10 text-amber-600",
  paused: "bg-slate-500/10 text-slate-600",
  accent: "bg-app-accent/10 text-app-accent",
};

export default function Badge({ variant = "active", children, dot = true }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.7rem] font-semibold ${variants[variant]}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${variant === "active" ? "bg-emerald-500" : variant === "review" ? "bg-amber-500" : "bg-slate-500"}`} />
      )}
      {children}
    </span>
  );
}
