import { type ReactNode } from 'react'

interface PageHeaderProps {
  /** Page title — rendered as an h1 */
  title: string
  /** Optional supporting description */
  description?: string
  /**
   * Optional action slot (e.g. a primary button).
   * Stacks below title on mobile, appears to the right on sm+.
   */
  action?: ReactNode
}

/**
 * Consistent page-level heading shared across all admin sections.
 */
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
