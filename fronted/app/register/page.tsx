"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    id: 0,
    email: "",
    first_name: "",
    last_name: "",
    country: "",
    city: "",
    phone: "",
    date_of_birth: "",
    username: "",
    profile_image_url: "",
  })
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    const loadUserData = async () => {
      const token = localStorage.getItem("token")

      if (!token) {
        router.push("/login")
        return
      }

      try {
        const res = await fetch("http://127.0.0.1:8000/api/users/", {
          headers: { Authorization: `Bearer ${token}` }
        })

        if (!res.ok) throw new Error("Error API")

        const data = await res.json()
        
        const userPartial = localStorage.getItem("userPartial")
        let user = null
        
        if (userPartial) {
          const partial = JSON.parse(userPartial)
          user = data.results?.find((u: any) => u.email === partial.email)
        } else {
          user = data.results?.[0]
        }

        if (!user) {
          console.log("❌ No se encontró usuario")
          router.push("/login")
          return
        }

        console.log("=== DATOS DEL USUARIO ===")
        console.log(JSON.stringify(user, null, 2))

        setFormData({
          id: user.id,
          email: user.email || "",
          first_name: user.first_name || "",
          last_name: user.last_name || "",
          country: user.country || "",
          city: user.city || "",
          phone: user.phone || "",
          date_of_birth: user.date_of_birth || "",
          username: user.username || "",
          profile_image_url: user.profile_image_url || "",
        })
      } catch (error) {
        console.error("❌ Error:", error)
        router.push("/login")
      } finally {
        setIsLoading(false)
      }
    }

    loadUserData()
  }, [router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.first_name || !formData.last_name || !formData.country || !formData.city || !formData.phone || !formData.date_of_birth || !formData.profile_image_url) {
      toast({
        title: "Campos incompletos",
        description: "Completa todos los campos obligatorios.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const token = localStorage.getItem("token")

      console.log("=== GUARDANDO DATOS ===")
      const updateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        country: formData.country,
        city: formData.city,
        phone: formData.phone,
        date_of_birth: formData.date_of_birth,
        profile_image_url: formData.profile_image_url,
      }
      console.log("Datos a enviar:", updateData)

      const res = await fetch(`http://127.0.0.1:8000/api/users/${formData.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      })

      const responseData = await res.json()
      console.log("Respuesta servidor:", responseData)

      if (res.ok) {
        document.cookie = `auth_token=${token}; path=/; max-age=86400; ${process.env.NODE_ENV === 'production' ? 'secure;' : ''} samesite=lax`

        localStorage.setItem("register_completed", "true")

        toast({ 
          title: "✅ Perfil actualizado",
          description: "Datos guardados correctamente"
        })
        localStorage.removeItem("userPartial")
        
        setTimeout(() => {
          window.location.href = "/"
        }, 1000)
      } else {
        toast({ 
          title: "Error al guardar", 
          description: JSON.stringify(responseData),
          variant: "destructive" 
        })
      }
    } catch (error) {
      console.error("Error:", error)
      toast({ title: "Error de red", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-fdl9XdWwuG7p2YdrVlt8I1eZWI5jNe.png"
          alt="Airplane"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-md space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Completa tu perfil</h1>
            <p className="text-gray-600 text-sm">Revisa y completa tu información antes de continuar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={formData.email} disabled className="h-11 bg-gray-100 cursor-not-allowed" />
              <p className="text-xs text-gray-500">Este campo no se puede modificar</p>
            </div>

            <div className="space-y-2">
              <Label>Nombres *</Label>
              <Input
                name="first_name"
                value={formData.first_name}
                onChange={handleChange}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>Apellidos *</Label>
              <Input
                name="last_name"
                value={formData.last_name}
                onChange={handleChange}
                required
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>País *</Label>
                <Input
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>Ciudad *</Label>
                <Input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="h-11"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Teléfono *</Label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha nacimiento *</Label>
                <Input
                  name="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  required
                  className="h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Documento de Identidad</Label>
              <Input value={formData.username} disabled className="h-11 bg-gray-100 cursor-not-allowed" />
              <p className="text-xs text-gray-500">Este campo no se puede modificar</p>
            </div>

            <div className="space-y-2">
              <Label>Foto de Perfil (URL) *</Label>
              <Input
                name="profile_image_url"
                type="url"
                value={formData.profile_image_url}
                onChange={handleChange}
                required
                className="h-11"
                placeholder="https://ejemplo.com/foto.jpg"
              />
              {formData.profile_image_url && (
                <img
                  src={formData.profile_image_url}
                  alt="Preview"
                  className="w-20 h-20 rounded-full object-cover border-2 mt-2"
                  onError={(e) => { e.currentTarget.src = "/placeholder.svg" }}
                />
              )}
            </div>

            <Button type="submit" className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar y Continuar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
