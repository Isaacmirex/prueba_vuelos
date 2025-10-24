"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"

interface User {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  phone: string
  date_of_birth: string | null
  country: string
  city: string
  profile_image_url: string | null
  is_operator: boolean
  is_staff: boolean
  is_active: boolean
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
  setToken: (token: string | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Cargar token desde localStorage al iniciar
    const savedToken = localStorage.getItem("token")
    if (savedToken) {
      setTokenState(savedToken)
      loadUserFromToken(savedToken)
    } else {
      setIsLoading(false)
    }
  }, [])

  const loadUserFromToken = async (authToken: string) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/users/", {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      const data = await res.json()
      
      // Obtener el usuario actual (puedes usar el email del token decodificado o buscar por ID)
      if (data.results && data.results.length > 0) {
        // Por ahora toma el primer resultado, ajusta según tu lógica
        setUser(data.results[0])
      }
    } catch (error) {
      console.error("Error cargando usuario:", error)
      logout()
    } finally {
      setIsLoading(false)
    }
  }

  const setToken = (newToken: string | null) => {
    setTokenState(newToken)
    if (newToken) {
      localStorage.setItem("token", newToken)
    } else {
      localStorage.removeItem("token")
    }
  }

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/login/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.detail || "Error al iniciar sesión")
      }

      const authToken = data.access || data.token || data.key
      setToken(authToken)

      // Obtener datos completos del usuario
      const userRes = await fetch("http://127.0.0.1:8000/api/users/", {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      const userData = await userRes.json()
      const userFound = userData.results?.find((u: any) => u.email === email)

      if (userFound) {
        setUser(userFound)

        // Verificar campos obligatorios
        const requiredFields = ["phone", "date_of_birth", "country", "city", "profile_image_url"]
        const missing = requiredFields.filter(field => {
          const value = userFound[field]
          return !value || value === null || value === "" || value === "null"
        })

        console.log("Usuario:", userFound)
        console.log("Campos faltantes:", missing)

        if (missing.length > 0) {
          // Guardar usuario parcial y redirigir a completar perfil
          localStorage.setItem("userPartial", JSON.stringify(userFound))
          router.push("/register")
        } else {
          // Navegar según rol
          if (userFound.is_staff) {
            router.push("/staff")
          } else if (userFound.is_operator) {
            router.push("/admin")
          } else {
            router.push("/")
          }
        }
      }
    } catch (error) {
      console.error("Error en login:", error)
      throw error
    }
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem("token")
    localStorage.removeItem("userPartial")
    router.push("/login")
  }

  const refreshUser = async () => {
    if (token) {
      await loadUserFromToken(token)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        logout,
        refreshUser,
        setToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
