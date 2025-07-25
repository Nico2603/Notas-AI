/**
 * ClínicAI - Asistente de IA para Notas Clínicas
 * 
 * Autor: Nicolas Ceballos Brito
 * Portfolio: https://nico2603.github.io/PersonalPage/
 * GitHub: https://github.com/Nico2603
 * LinkedIn: https://www.linkedin.com/in/nicolas-ceballos-brito/
 * 
 * Desarrollado para Teilur.ai
 */

import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from '@/components/Providers'
import { AuthProvider } from '@/contexts/AuthContext'
import ClientOnly from '@/components/ClientOnly'
import LogSetup from '@/components/LogSetup'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ClinicAI - Asistente de IA para Notas Clínicas',
  description: 'Genera notas clínicas profesionales con IA',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
    shortcut: '/logo.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#3b82f6',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="ClinicAI" />
        <meta name="theme-color" content="#3b82f6" />
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
      </head>
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <ClientOnly fallback={
          <div className="flex items-center justify-center flex-1">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
          </div>
        }>
          <LogSetup />
          <Providers>
            <AuthProvider>
              <main className="flex-1 flex flex-row w-full">
                {/* Sidebar a la izquierda */}
                {/* El Sidebar se inyecta desde el children en AuthenticatedApp, así que solo estructuramos el espacio */}
                {children}
              </main>
            </AuthProvider>
          </Providers>
        </ClientOnly>
      </body>
    </html>
  )
}
