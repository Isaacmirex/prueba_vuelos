"use client"

import { useRole } from "@/contexts/role-context"
import { Button } from "@/components/ui/button"
import { User, Users, Shield } from "lucide-react"
import { useRouter } from "next/navigation"

export function RoleSwitcher() {
  const { role, setRole } = useRole()
  const router = useRouter()

  const handleRoleChange = (newRole: "user" | "staff" | "admin") => {
    setRole(newRole)
    if (newRole === "staff") {
      router.push("/staff")
    } else if (newRole === "admin") {
      router.push("/admin")
    } else {
      router.push("/")
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-2">
      <div className="text-xs font-medium text-gray-500 mb-2 px-2">Cambiar Rol</div>
      <div className="flex flex-col gap-1">
        <Button
          variant={role === "user" ? "default" : "ghost"}
          size="sm"
          onClick={() => handleRoleChange("user")}
          className="justify-start gap-2"
        >
          <User className="h-4 w-4" />
          Usuario
        </Button>
        <Button
          variant={role === "staff" ? "default" : "ghost"}
          size="sm"
          onClick={() => handleRoleChange("staff")}
          className="justify-start gap-2"
        >
          <Users className="h-4 w-4" />
          Staff
        </Button>
        <Button
          variant={role === "admin" ? "default" : "ghost"}
          size="sm"
          onClick={() => handleRoleChange("admin")}
          className="justify-start gap-2"
        >
          <Shield className="h-4 w-4" />
          Admin
        </Button>
      </div>
    </div>
  )
}
