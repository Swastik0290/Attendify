import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'AttendanceIQ',
    template: '%s | AttendanceIQ',
  },
  description:
    'Institutional classroom attendance management system for students and faculty.',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <div className="flex-1 flex flex-col">{children}</div>
      </body>
    </html>
  )
}
