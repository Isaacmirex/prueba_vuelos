"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Edit, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Pagination } from "@/components/pagination"
import { api, type User, type Destination, type Flight, type Airline } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function AdminPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeView, setActiveView] = useState<"users" | "destinations" | "flights">("users")
  const [users, setUsers] = useState<User[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [totalDestinations, setTotalDestinations] = useState(0)
  const [flights, setFlights] = useState<Flight[]>([])
  const [airlines, setAirlines] = useState<Airline[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [forceTableKey, setForceTableKey] = useState(0) // para forzar el rerender de la tabla
  const itemsPerPage = 10
  const { toast } = useToast()

  const [newDestination, setNewDestination] = useState({
    name: "",
    code: "",
    province: "",
    is_active: true,
  })

  const [newFlight, setNewFlight] = useState({
    flight_code: "",
    airline: "",
    origin: "",
    destination: "",
    departure_datetime: "",
    arrival_datetime: "",
    adult_price: "",
    available_seats: "",
  })

  const fetchData = async (page = 1) => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      if (activeView === "users") {
        const res = await fetch(`http://127.0.0.1:8000/api/users/?page=${page}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const data = await res.json()
        setUsers(data.results || data)
      } else if (activeView === "destinations") {
        const res = await fetch(`http://127.0.0.1:8000/api/destinations/?page=${page}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const data = await res.json()
        setDestinations(data.results || data)
        setTotalDestinations(data.count || (data.results ? data.results.length : 0))
        setCurrentPage(page)
        setForceTableKey(k => k + 1) // fuerza la tabla a renderizarse de nuevo
      } else if (activeView === "flights") {
        const [flightsRes, airlinesRes, destinationsRes] = await Promise.all([
          fetch(`http://127.0.0.1:8000/api/flights/?page=${page}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          fetch("http://127.0.0.1:8000/api/airlines/", { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
          fetch("http://127.0.0.1:8000/api/destinations/", { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
        ])
        const flightsData = await flightsRes.json()
        const airlinesData = await airlinesRes.json()
        const destinationsData = await destinationsRes.json()
        setFlights(flightsData.results || flightsData)
        setAirlines(airlinesData.results || airlinesData)
        setDestinations(destinationsData.results || destinationsData)
        setForceTableKey(k => k + 1)
      }
    } catch (error) {
      console.error("[v0] Error fetching data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeView])

  const handleRoleChange = async (userId: number, role: "user" | "staff" | "admin") => {
    try {
      const updates: Partial<User> = {
        is_staff: role === "staff" || role === "admin",
        is_operator: role === "admin",
      }
      await api.updateUser(userId, updates)
      toast({
        title: "Rol actualizado",
        description: "El rol del usuario ha sido actualizado exitosamente.",
      })
      fetchData(currentPage)
    } catch (error) {
      console.error("[v0] Error updating user role:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el rol del usuario.",
        variant: "destructive",
      })
    }
  }

  const handleCreateDestination = async () => {
    try {
      const token = localStorage.getItem("token")
      if (!token) {
        toast({
          title: "Error",
          description: "No tienes sesión iniciada o el token no está disponible.",
          variant: "destructive"
        })
        return
      }
      const res = await fetch("http://127.0.0.1:8000/api/destinations/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newDestination.name,
          code: newDestination.code,
          province: newDestination.province,
          is_active: newDestination.is_active
        })
      })
      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(JSON.stringify(errorData))
      }
      toast({
        title: "Destino creado",
        description: "El destino ha sido creado exitosamente.",
      })
      setIsCreateDialogOpen(false)
      setNewDestination({ name: "", code: "", province: "", is_active: true })
      await fetchData(1)
    } catch (error) {
      let mensaje = "No se pudo crear el destino."
      if (error instanceof Error) {
        mensaje += " " + error.message
        console.log(error.message)
      } else {
        console.log(error)
      }
      toast({
        title: "Error",
        description: mensaje,
        variant: "destructive",
      })
    }
  }

  const handleCreateFlight = async () => {
    try {
      await api.createFlight({
        flight_code: newFlight.flight_code,
        airline: Number(newFlight.airline),
        origin: newFlight.origin,
        destination: newFlight.destination,
        departure_datetime: newFlight.departure_datetime,
        arrival_datetime: newFlight.arrival_datetime,
        adult_price: newFlight.adult_price,
        available_seats: Number(newFlight.available_seats),
      })
      toast({
        title: "Vuelo creado",
        description: "El vuelo ha sido creado exitosamente.",
      })
      setIsCreateDialogOpen(false)
      setNewFlight({
        flight_code: "",
        airline: "",
        origin: "",
        destination: "",
        departure_datetime: "",
        arrival_datetime: "",
        adult_price: "",
        available_seats: "",
      })
      fetchData(currentPage)
    } catch (error) {
      console.error("[v0] Error creating flight:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el vuelo.",
        variant: "destructive",
      })
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredDestinations = destinations.filter(
    (dest) =>
      dest.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPagesUsers = Math.ceil(filteredUsers.length / itemsPerPage)
  const totalPagesDestinations = Math.ceil(totalDestinations / itemsPerPage)
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [activeView, searchQuery])

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex gap-4 mb-8">
          <Button
            variant={activeView === "users" ? "default" : "outline"}
            onClick={() => setActiveView("users")}
            className={activeView === "users" ? "bg-black text-white hover:bg-gray-800" : ""}
          >
            Usuarios
          </Button>
          <Button
            variant={activeView === "destinations" ? "default" : "outline"}
            onClick={() => setActiveView("destinations")}
            className={activeView === "destinations" ? "bg-black text-white hover:bg-gray-800" : ""}
          >
            Añadir destino
          </Button>
        </div>
        {loading && <p className="text-center py-8">Cargando datos...</p>}
        {!loading && activeView === "users" && filteredUsers.length === 0 && (
          <p className="text-center py-8 text-gray-500">No hay usuarios disponibles</p>
        )}
        {!loading && activeView === "destinations" && destinations.length === 0 && (
          <p className="text-center py-8 text-gray-500">No hay destinos disponibles</p>
        )}
        {activeView === "users" && (
          <>
            <div className="mb-6 flex gap-4 items-center">
              <div className="relative flex-1">
                <Input
                  placeholder="Buscar correo"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Search className="w-4 h-4" />
              </Button>
            </div>
            <Card className="overflow-hidden border-2">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-bold">ID</TableHead>
                      <TableHead className="font-bold">Correo</TableHead>
                      <TableHead className="font-bold">Usuario</TableHead>
                      <TableHead className="font-bold">Admin</TableHead>
                      <TableHead className="font-bold">Staff</TableHead>
                      <TableHead className="font-bold">active</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((user) => (
                      <TableRow key={user.id} className="hover:bg-gray-50">
                        <TableCell>{user.id}</TableCell>
                        <TableCell>
                          <a
                            href={`mailto:${user.email}`}
                            className="text-blue-600 underline"
                          >
                            {user.email}
                          </a>
                        </TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>{user.is_operator ? "true" : "false"}</TableCell>
                        <TableCell>{user.is_staff ? "true" : "false"}</TableCell>
                        <TableCell>{user.is_active ? "true" : "false"}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleRoleChange(user.id, "user")}>
                                Usuario
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRoleChange(user.id, "staff")}>
                                Staff
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleRoleChange(user.id, "admin")}>
                                Admin
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPagesUsers}
              onPageChange={setCurrentPage}
            />
          </>
        )}
        {activeView === "destinations" && (
          <>
            <div className="mb-6 flex gap-4 items-center">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-black text-white hover:bg-gray-800">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear un destino
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Crear nuevo destino</DialogTitle>
                    <DialogDescription>
                      Completa los campos para agregar un destino. Solo se requiere nombre, código, provincia y estado activo.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input
                        value={newDestination.name}
                        onChange={(e) =>
                          setNewDestination({
                            ...newDestination,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Código</Label>
                      <Input
                        value={newDestination.code}
                        onChange={(e) =>
                          setNewDestination({
                            ...newDestination,
                            code: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Provincia</Label>
                      <Input
                        value={newDestination.province}
                        onChange={(e) =>
                          setNewDestination({
                            ...newDestination,
                            province: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2 flex items-center gap-2">
                      <Label>Activo</Label>
                      <input
                        type="checkbox"
                        checked={newDestination.is_active}
                        onChange={(e) =>
                          setNewDestination({
                            ...newDestination,
                            is_active: e.target.checked,
                          })
                        }
                        style={{ width: 16, height: 16 }}
                      />
                    </div>
                    <Button
                      onClick={handleCreateDestination}
                      className="w-full bg-black text-white hover:bg-gray-800"
                    >
                      Guardar
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
              <div className="relative flex-1">
                <Input
                  placeholder="Buscar codigo"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon">
                <Search className="w-4 h-4" />
              </Button>
            </div>
            <Card className="overflow-hidden border-2">
              <div className="overflow-x-auto">
                <Table key={forceTableKey}>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-bold">ID</TableHead>
                      <TableHead className="font-bold">Nombre</TableHead>
                      <TableHead className="font-bold">Código</TableHead>
                      <TableHead className="font-bold">Provincia</TableHead>
                      <TableHead className="font-bold">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDestinations.map((dest) => (
                      <TableRow key={dest.id} className="hover:bg-gray-50">
                        <TableCell>{dest.id}</TableCell>
                        <TableCell>{dest.name}</TableCell>
                        <TableCell className="font-mono">{dest.code}</TableCell>
                        <TableCell>{dest.province}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              dest.is_active
                                ? "bg-green-600 text-white"
                                : "bg-gray-400 text-white"
                            }
                          >
                            {dest.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPagesDestinations}
              onPageChange={(page) => fetchData(page)}
            />
          </>
        )}
        {/* ...flights igual... */}
      </main>
    </div>
  )
}
