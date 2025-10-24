"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type UserRole = "user" | "staff" | "admin"

interface RoleContextType {
  role: UserRole
  cycleRole: () => void
  setRole: (role: UserRole) => void
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole>("user")

  const cycleRole = () => {
    setRoleState((current) => {
      if (current === "user") return "staff"
      if (current === "staff") return "admin"
      return "user"
    })
  }

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole)
  }

  return <RoleContext.Provider value={{ role, cycleRole, setRole }}>{children}</RoleContext.Provider>
}

export function useRole() {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider")
  }
  return context
}
