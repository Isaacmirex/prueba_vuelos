import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { AuthProvider } from "@/contexts/auth-context"
import { RoleProvider } from "@/contexts/role-context"
import { Toaster } from "@/components/ui/toaster"
import { RoleSwitcher } from "@/components/role-switcher"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Aerigo - Sistema de Reservas de Vuelos",
  description: "La forma #1 de viajar desde Ecuador",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body className={`font-sans antialiased`}>
        <AuthProvider>
          <RoleProvider>
            {children}
            <Toaster />
            <RoleSwitcher />
          </RoleProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
