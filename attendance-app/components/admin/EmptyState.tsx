import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  /** Lucide icon to display */
  icon: LucideIcon
  /** Short heading */
  title: string
  /** Supporting description (1–2 sentences) */
  description: string
  /** Optional additional class names on the wrapper */
  className?: string
}

/**
 * Reusable empty state for sections with no data yet.
 * Intentionally minimal — no fake buttons or placeholder actions.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-16 text-center',
        className
      )}
    >
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
        <Icon className="h-5 w-5 text-slate-400" aria-hidden="true" />
      </div>
      <h3 className="mb-1 text-sm font-semibold text-slate-800">{title}</h3>
      <p className="max-w-xs text-sm leading-relaxed text-slate-500">{description}</p>
    </div>
  )
}
