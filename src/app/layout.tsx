import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PwaRegistration } from '@/components/pwa-registration'

export const metadata: Metadata = {
  title: 'Gasoline', description: 'Preços de combustível compartilhados pelo seu grupo.',
  applicationName: 'Gasoline', appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Gasoline' },
  icons: { apple: '/icon-192.png', icon: '/icon-192.png' },
  formatDetection: { telephone: false },
}
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#ffffff' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}<PwaRegistration /></body></html>
}
