import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

/**
 * PageHeader - Swiss Modern Page Title Component
 *
 * Usage:
 * <PageHeader
 *   title="Dashboard"
 *   description="Übersicht Ihrer Finanzen"
 *   actions={<button className="btn-primary">Neu</button>}
 * />
 */
export function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="mb-6">
      {/* Breadcrumbs (optional) */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-2 text-sm text-text-secondary mb-2">
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-2">
              {index > 0 && <span className="text-text-tertiary">/</span>}
              {crumb.href ? (
                <a
                  href={crumb.href}
                  className="hover:text-text-primary transition-colors"
                >
                  {crumb.label}
                </a>
              ) : (
                <span className="text-text-primary">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title Row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-text-secondary">
              {description}
            </p>
          )}
        </div>

        {/* Actions Slot */}
        {actions && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
