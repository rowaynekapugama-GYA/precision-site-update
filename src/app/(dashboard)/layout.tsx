import type { Metadata } from 'next'
import '@/dashboard/dashboard.css'
import { ToastProvider } from '@/dashboard/ui/Toast'

export const metadata: Metadata = {
  title: { default: 'Dashboard | Precision Dental', template: '%s | Precision Dental dashboard' },
  robots: { index: false, follow: false },
  icons: { icon: '/assets/img/favicon.png' },
}

export default function DashboardRoot({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body className="pd"><ToastProvider>{children}</ToastProvider></body>
    </html>
  )
}
