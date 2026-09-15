// 8. src/components/ui/Button.jsx — Button Component
const variants = {
  primary: "bg-app-primary text-white hover:bg-app-primary-hover",
  secondary: "bg-app-surface border border-app-border text-app-text hover:bg-app-surface-muted",
  accent: "bg-app-accent text-white hover:bg-[#9f2f07]",
  ghost: "bg-transparent text-app-text-secondary hover:bg-black/5 hover:text-app-text",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export default function Button({
  variant = "primary",
  size = "md",
  children,
  className = "",
  ...props
}) {
  return (
    <button
      className={`rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-[3px] focus:ring-app-primary/15 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
