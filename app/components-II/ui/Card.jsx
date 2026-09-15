// 6. src/components/ui/Card.jsx — Reusable Card
export default function Card({ children, className = "", hover = true }) {
  return (
    <div
      className={`bg-app-surface border border-app-border rounded-3xl p-5 transition-all duration-200 ${
        hover
          ? "hover:-translate-y-0.5 hover:shadow-[0_10px_15px_-3px_rgb(0_0_0_/_0.05)]"
          : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
