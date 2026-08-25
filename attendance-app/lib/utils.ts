import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges class names using clsx + tailwind-merge.
 * Resolves Tailwind CSS conflicts correctly (e.g. p-2 + p-4 → p-4).
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-blue-500', 'text-sm')
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Formats a Date object to a locale-aware readable string.
 */
export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Formats a Date object to a locale-aware time string.
 */
export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
