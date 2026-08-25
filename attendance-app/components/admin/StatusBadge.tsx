import { cn } from '@/lib/utils'

export type BadgeStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'disabled'
  | 'suspended'
  | 'active'
  | 'closed'

export type StatusType = BadgeStatus

interface StatusBadgeProps {
  status: BadgeStatus
  className?: string
}

const STYLES: Record<BadgeStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  approved: 'bg-green-50 text-green-700 ring-green-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
  disabled: 'bg-slate-100 text-slate-500 ring-slate-200',
  suspended: 'bg-slate-100 text-slate-500 ring-slate-200',
  active: 'bg-blue-50 text-blue-700 ring-blue-200',
  closed: 'bg-slate-100 text-slate-500 ring-slate-200',
}

const LABELS: Record<BadgeStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  disabled: 'Disabled',
  suspended: 'Suspended',
  active: 'Active',
  closed: 'Closed',
}

/**
 * Pill badge for displaying registration / session status values.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = (status.toLowerCase() in STYLES ? status.toLowerCase() : 'disabled') as BadgeStatus
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        STYLES[normalizedStatus],
        className
      )}
    >
      {LABELS[normalizedStatus]}
    </span>
  )
}
