import React from 'react';

// =============================================
// Card
// =============================================
export const Card = ({ children, className = '', hover = true, padding = 'p-5', ...props }) => (
  <div
    className={`bg-app-surface border border-app-border rounded-3xl ${padding} ${
      hover ? 'transition-all hover:-translate-y-0.5 hover:shadow-md' : ''
    } ${className}`}
    {...props}
  >
    {children}
  </div>
);

Card.Header = ({ children, className = '' }) => (
  <div className={`flex items-center justify-between mb-4 ${className}`}>{children}</div>
);

Card.Title = ({ children, className = '' }) => (
  <h3 className={`font-semibold text-app-text ${className}`}>{children}</h3>
);

Card.Description = ({ children, className = '' }) => (
  <p className={`text-sm text-app-text-secondary ${className}`}>{children}</p>
);

Card.Footer = ({ children, className = '' }) => (
  <div className={`mt-4 pt-4 border-t border-app-border ${className}`}>{children}</div>
);

// =============================================
// Badge
// =============================================
export const Badge = ({ children, variant = 'default', dot = false, className = '' }) => {
  const variants = {
    default: 'bg-app-surface-muted text-app-text-secondary',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    danger: 'bg-red-100 text-red-700',
    primary: 'bg-app-primary text-white',
    accent: 'bg-app-accent text-white',
  };
  const dotColors = {
    default: 'bg-app-text-secondary',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    primary: 'bg-white',
    accent: 'bg-white',
  };

  return (
    <span
      className={`inline-flex items-center gap-x-1.5 px-3 py-1 text-xs font-medium rounded-2xl ${variants[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};

// =============================================
// Avatar
// =============================================
const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('');

const avatarSizes = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
};

export const Avatar = ({ src, name = '', size = 'md', className = '' }) => (
  <div
    className={`relative flex-shrink-0 rounded-2xl overflow-hidden bg-app-primary flex items-center justify-center ring-1 ring-white ${avatarSizes[size]} ${className}`}
    title={name}
  >
    {src ? (
      <img src={src} alt={name} className="w-full h-full object-cover" />
    ) : (
      <span className="font-semibold text-white">{initials(name)}</span>
    )}
  </div>
);

export const AvatarGroup = ({ avatars = [], max = 4, size = 'md' }) => {
  const shown = avatars.slice(0, max);
  const overflow = avatars.length - shown.length;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((a, i) => (
        <Avatar key={i} {...a} size={size} className="ring-2 ring-app-surface" />
      ))}
      {overflow > 0 && (
        <div
          className={`relative flex-shrink-0 rounded-2xl bg-app-surface-muted text-app-text-secondary flex items-center justify-center ring-2 ring-app-surface font-semibold ${avatarSizes[size]}`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
};

// =============================================
// Table — simple, responsive, sortable-ready
// =============================================
export const Table = ({ columns = [], data = [], onRowClick, emptyMessage = 'No records to show', className = '' }) => {
  if (!data.length) {
    return (
      <div className="border border-app-border rounded-3xl py-12 text-center text-sm text-app-text-secondary">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`border border-app-border rounded-3xl overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-app-surface-muted/60 text-left">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-5 py-3 font-semibold text-xs uppercase tracking-wider text-app-text-secondary whitespace-nowrap"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-app-border">
            {data.map((row, i) => (
              <tr
                key={row.id ?? i}
                onClick={() => onRowClick?.(row)}
                className={`bg-app-surface ${onRowClick ? 'cursor-pointer hover:bg-app-surface-muted/40' : ''} transition-colors`}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-5 py-3.5 text-app-text whitespace-nowrap">
                    {col.render ? col.render(row) : row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default { Card, Badge, Avatar, AvatarGroup, Table };
