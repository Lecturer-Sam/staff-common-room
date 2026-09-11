import React, { forwardRef } from 'react';

// =============================================
// Button
// Variants: primary, secondary, accent, ghost, outline, danger
// Sizes: xs, sm, md, lg
// =============================================

const Spinner = ({ className = '' }) => (
  <svg
    className={`animate-spin ${className}`}
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 0 1 8-8v3a5 5 0 0 0-5 5H4z"
    />
  </svg>
);

const variants = {
  primary: 'bg-app-primary hover:bg-app-primary-hover text-white focus-visible:ring-app-primary disabled:hover:bg-app-primary',
  secondary: 'bg-app-surface hover:bg-app-surface-muted border border-app-border text-app-text focus-visible:ring-app-border',
  accent: 'bg-app-accent hover:bg-[#9f2f07] text-white focus-visible:ring-app-accent',
  outline: 'bg-transparent border border-app-primary text-app-primary hover:bg-app-primary/10 focus-visible:ring-app-primary',
  ghost: 'text-app-text-secondary hover:bg-app-surface-muted hover:text-app-text focus-visible:ring-app-border',
  danger: 'bg-red-600 hover:bg-red-700 text-white focus-visible:ring-red-600',
};

const sizes = {
  xs: 'px-3 py-1.5 text-xs gap-x-1.5',
  sm: 'px-4 py-2 text-sm gap-x-1.5',
  md: 'px-5 py-2.5 text-sm gap-x-2',
  lg: 'px-7 py-3.5 text-base gap-x-2.5',
};

const iconSizes = {
  xs: 'w-3.5 h-3.5',
  sm: 'w-4 h-4',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    isLoading = false,
    leftIcon = null,
    rightIcon = null,
    disabled = false,
    className = '',
    type = 'button',
    ...props
  },
  ref
) {
  const isDisabled = disabled || isLoading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={`inline-flex items-center justify-center font-semibold transition-all duration-200 active:scale-[0.985] rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {isLoading && <Spinner className={iconSizes[size]} />}
      {!isLoading && leftIcon && <span className={iconSizes[size]}>{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className={iconSizes[size]}>{rightIcon}</span>}
    </button>
  );
});

// Icon-only button — square, no label, requires aria-label
export const IconButton = forwardRef(function IconButton(
  { icon, variant = 'ghost', size = 'md', className = '', 'aria-label': ariaLabel, ...props },
  ref
) {
  const squarePadding = { xs: 'p-1.5', sm: 'p-2', md: 'p-2.5', lg: 'p-3' };
  return (
    <button
      ref={ref}
      type="button"
      aria-label={ariaLabel}
      className={`inline-flex items-center justify-center rounded-2xl transition-all duration-200 active:scale-[0.985] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${variants[variant]} ${squarePadding[size]} ${className}`}
      {...props}
    >
      <span className={iconSizes[size]}>{icon}</span>
    </button>
  );
});

export default Button;
