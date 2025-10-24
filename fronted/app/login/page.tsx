"use client"

import type React from "react"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()

      console.log("Login response:", data)

      const token = data.access || data.token || data.key

      if (res.ok && token) {
        localStorage.setItem("token", token)

        document.cookie = `auth_token=${token}; path=/; max-age=86400; ${process.env.NODE_ENV === 'production' ? 'secure;' : ''} samesite=lax`

        toast({
          title: "Bienvenido",
          description: "Has iniciado sesión correctamente",
        })

        const userRes = await fetch("http://127.0.0.1:8000/api/users/", {
          headers: { Authorization: `Bearer ${token}` }
        })
        const userData = await userRes.json()
        const user = userData.results?.find((u: any) => u.email === email)

        if (user) {
          const registerCompleted = localStorage.getItem("register_completed")
          
          if (!registerCompleted) {
            localStorage.setItem("userPartial", JSON.stringify(user))
            router.push("/register")
          } else {
            const redirectTo = searchParams.get('redirect') || '/'
            router.push(redirectTo)
          }
        } else {
          toast({
            title: "Error",
            description: "Usuario no encontrado. Contacta soporte.",
            variant: "destructive",
            className: "text-white",
          })
        }
      } else {
        const errorMsg = data?.detail || data?.non_field_errors?.[0] || "Credenciales incorrectas."
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
          className: "text-white",
        })
      }

    } catch (error) {
      console.error("Login error:", error)
      toast({
        title: "Error",
        description: "Error de red o servidor.",
        variant: "destructive",
        className: "text-white",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-gray-900 via-black to-gray-800 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-red-600/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-lg shadow-2xl relative z-10">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bienvenido a Aerigo</h1>
          <p className="text-gray-600">
            Más que una reserva, somos la forma #1 de viajar desde Ecuador, ofreciendo rapidez, confianza y el mundo a tu alcance.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="isaacmirex@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
           
          </div>
          <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
            {isLoading ? "Ingresando..." : "Ingresar"}
          </Button>
        </form>
      </div>
    </div>
  )
}
