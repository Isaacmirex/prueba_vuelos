"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LogOut } from "lucide-react"

interface UserData {
  id: number
  email: string
  first_name: string
  last_name: string
  profile_image_url: string
  city: string
  country: string
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token")
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const res = await fetch("http://127.0.0.1:8000/api/users/", {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (!res.ok) throw new Error("Error fetching user")

        const data = await res.json()
        const currentUser = data.results?.[0]

        if (currentUser) {
          setUser(currentUser)
        }
      } catch (error) {
        console.error("Error loading user:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("register_completed")
    sessionStorage.removeItem("page_refreshed")
    document.cookie = "auth_token=; path=/; max-age=0"
    router.push("/login")
  }

  const isActive = (path: string) => pathname === path

  return (
    <header className="bg-black text-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-2xl font-bold text-white hover:text-gray-300 transition-colors">
              Aerigo
            </Link>

            <nav className="flex gap-6">
              <Link 
                href="/" 
                className={`hover:text-gray-300 transition-colors ${
                  isActive('/') ? 'text-white' : 'text-gray-400'
                }`}
              >
                Inicio
              </Link>
              {user && (
                <Link 
                  href="/mis-vuelos" 
                  className={`hover:text-gray-300 transition-colors ${
                    isActive('/mis-vuelos') ? 'text-white' : 'text-gray-400'
                  }`}
                >
                  Mis Vuelos
                </Link>
              )}
              <Link 
                href="/destinos" 
                className={`hover:text-gray-300 transition-colors ${
                  isActive('/destinos') ? 'text-white' : 'text-gray-400'
                }`}
              >
                Destinos
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {isLoading ? (
              <div className="w-10 h-10 rounded-full bg-gray-700 animate-pulse" />
            ) : user ? (
              <>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 cursor-pointer">
                    <AvatarImage 
                      src={user.profile_image_url} 
                      alt={`${user.first_name} ${user.last_name}`} 
                    />
                    <AvatarFallback className="bg-white text-black">
                      {user.first_name?.[0]}{user.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <div className="font-medium">{user.first_name} {user.last_name}</div>
                    <div className="text-gray-400 text-xs">
                      {user.city} - {user.country}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="text-white hover:bg-gray-800">
                  <LogOut className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <Link href="/login">
                <Button variant="ghost" className="text-white hover:bg-gray-800">
                  Ingresar
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
