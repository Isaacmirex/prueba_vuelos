"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Edit, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Pagination } from "@/components/pagination"
import { api, type User, type Destination, type Flight, type Airline } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

export default function AdminPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeView, setActiveView] = useState<"users" | "destinations" | "flights">("users")
  const [users, setUsers] = useState<User[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [flights, setFlights] = useState<Flight[]>([])
  const [airlines, setAirlines] = useState<Airline[]>([])
  const [loading, setLoading] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const { toast } = useToast()

  const [newDestination, setNewDestination] = useState({
    name: "",
    code: "",
    province: "",
    image_url: "",
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

  useEffect(() => {
    fetchData()
  }, [activeView])

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeView === "users") {
        const data = await api.getUsers()
        setUsers(data)
      } else if (activeView === "destinations") {
        const data = await api.getDestinations()
        setDestinations(data)
      } else if (activeView === "flights") {
        const [flightsData, airlinesData, destinationsData] = await Promise.all([
          api.getFlights(),
          api.getAirlines(),
          api.getDestinations(),
        ])
        setFlights(flightsData)
        setAirlines(airlinesData)
        setDestinations(destinationsData)
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
      fetchData()
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
      await api.createDestination(newDestination)
      toast({
        title: "Destino creado",
        description: "El destino ha sido creado exitosamente.",
      })
      setIsCreateDialogOpen(false)
      setNewDestination({ name: "", code: "", province: "", image_url: "" })
      fetchData()
    } catch (error) {
      console.error("[v0] Error creating destination:", error)
      toast({
        title: "Error",
        description: "No se pudo crear el destino.",
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
      fetchData()
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
      user.username.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const filteredDestinations = destinations.filter(
    (dest) =>
      dest.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dest.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const filteredFlights = flights.filter(
    (flight) =>
      flight.flight_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flight.airline.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const totalPagesUsers = Math.ceil(filteredUsers.length / itemsPerPage)
  const totalPagesDestinations = Math.ceil(filteredDestinations.length / itemsPerPage)
  const totalPagesFlights = Math.ceil(filteredFlights.length / itemsPerPage)

  const paginatedUsers = filteredUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const paginatedDestinations = filteredDestinations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
  const paginatedFlights = filteredFlights.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

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
          <Button
            variant={activeView === "flights" ? "default" : "outline"}
            onClick={() => setActiveView("flights")}
            className={activeView === "flights" ? "bg-black text-white hover:bg-gray-800" : ""}
          >
            Crear Vuelo
          </Button>
        </div>

        {loading && <p className="text-center py-8">Cargando datos...</p>}

        {!loading && activeView === "users" && filteredUsers.length === 0 && (
          <p className="text-center py-8 text-gray-500">No hay usuarios disponibles</p>
        )}

        {!loading && activeView === "destinations" && filteredDestinations.length === 0 && (
          <p className="text-center py-8 text-gray-500">No hay destinos disponibles</p>
        )}

        {!loading && activeView === "flights" && filteredFlights.length === 0 && (
          <p className="text-center py-8 text-gray-500">No hay vuelos disponibles</p>
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
                          <a href={`mailto:${user.email}`} className="text-blue-600 underline">
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

            {totalPagesUsers > 1 && (
              <Pagination currentPage={currentPage} totalPages={totalPagesUsers} onPageChange={setCurrentPage} />
            )}
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
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input
                        value={newDestination.name}
                        onChange={(e) => setNewDestination({ ...newDestination, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Codigo</Label>
                      <Input
                        value={newDestination.code}
                        onChange={(e) => setNewDestination({ ...newDestination, code: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Provincia</Label>
                      <Input
                        value={newDestination.province}
                        onChange={(e) => setNewDestination({ ...newDestination, province: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Url_imagen (opcional)</Label>
                      <Input
                        value={newDestination.image_url}
                        onChange={(e) => setNewDestination({ ...newDestination, image_url: e.target.value })}
                      />
                    </div>
                    <Button onClick={handleCreateDestination} className="w-full bg-black text-white hover:bg-gray-800">
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
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-bold">ID</TableHead>
                      <TableHead className="font-bold">Name</TableHead>
                      <TableHead className="font-bold">Code</TableHead>
                      <TableHead className="font-bold">Provincia</TableHead>
                      <TableHead className="font-bold">Url_imagen</TableHead>
                      <TableHead className="font-bold">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDestinations.map((dest) => (
                      <TableRow key={dest.id} className="hover:bg-gray-50">
                        <TableCell>{dest.id}</TableCell>
                        <TableCell>{dest.name}</TableCell>
                        <TableCell className="font-mono">{dest.code}</TableCell>
                        <TableCell>{dest.province}</TableCell>
                        <TableCell className="text-sm truncate max-w-[200px]">{dest.image_url || "N/A"}</TableCell>
                        <TableCell>
                          <Badge className={dest.is_active ? "bg-green-600 text-white" : "bg-gray-400 text-white"}>
                            {dest.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {totalPagesDestinations > 1 && (
              <Pagination currentPage={currentPage} totalPages={totalPagesDestinations} onPageChange={setCurrentPage} />
            )}
          </>
        )}

        {activeView === "flights" && (
          <>
            <div className="mb-6 flex gap-4 items-center">
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-black text-white hover:bg-gray-800">
                    <Plus className="w-4 h-4 mr-2" />
                    Crear un nuevo vuelo
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Crear nuevo vuelo</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Código de vuelo</Label>
                      <Input
                        value={newFlight.flight_code}
                        onChange={(e) => setNewFlight({ ...newFlight, flight_code: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Precio adulto</Label>
                      <Input
                        type="number"
                        value={newFlight.adult_price}
                        onChange={(e) => setNewFlight({ ...newFlight, adult_price: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Aerolínea</Label>
                      <Select
                        value={newFlight.airline}
                        onValueChange={(value) => setNewFlight({ ...newFlight, airline: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {airlines.map((airline) => (
                            <SelectItem key={airline.id} value={airline.id.toString()}>
                              {airline.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Origen</Label>
                      <Select
                        value={newFlight.origin}
                        onValueChange={(value) => setNewFlight({ ...newFlight, origin: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {destinations.map((dest) => (
                            <SelectItem key={dest.id} value={dest.name}>
                              {dest.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Destino</Label>
                      <Select
                        value={newFlight.destination}
                        onValueChange={(value) => setNewFlight({ ...newFlight, destination: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {destinations.map((dest) => (
                            <SelectItem key={dest.id} value={dest.name}>
                              {dest.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha hora de abordaje</Label>
                      <Input
                        type="datetime-local"
                        value={newFlight.departure_datetime}
                        onChange={(e) => setNewFlight({ ...newFlight, departure_datetime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Fecha hora de llegada</Label>
                      <Input
                        type="datetime-local"
                        value={newFlight.arrival_datetime}
                        onChange={(e) => setNewFlight({ ...newFlight, arrival_datetime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Asientos disponibles</Label>
                      <Input
                        type="number"
                        value={newFlight.available_seats}
                        onChange={(e) => setNewFlight({ ...newFlight, available_seats: e.target.value })}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateFlight} className="w-full bg-black text-white hover:bg-gray-800 mt-4">
                    Guardar
                  </Button>
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
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-bold">ID</TableHead>
                      <TableHead className="font-bold">Código de Vuelo</TableHead>
                      <TableHead className="font-bold">Aerolínea</TableHead>
                      <TableHead className="font-bold">Origen</TableHead>
                      <TableHead className="font-bold">Destino</TableHead>
                      <TableHead className="font-bold">Fecha hora de abordaje</TableHead>
                      <TableHead className="font-bold">Fecha hora de llegada</TableHead>
                      <TableHead className="font-bold">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedFlights.map((flight) => (
                      <TableRow key={flight.id} className="hover:bg-gray-50">
                        <TableCell>{flight.id}</TableCell>
                        <TableCell className="font-mono">{flight.flight_code}</TableCell>
                        <TableCell>{flight.airline.name}</TableCell>
                        <TableCell>{flight.origin}</TableCell>
                        <TableCell>{flight.destination}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(flight.departure_datetime).toLocaleString("es-EC")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(flight.arrival_datetime).toLocaleString("es-EC")}
                        </TableCell>
                        <TableCell>
                          <Badge className={flight.is_available ? "bg-green-600 text-white" : "bg-gray-400 text-white"}>
                            {flight.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {totalPagesFlights > 1 && (
              <Pagination currentPage={currentPage} totalPages={totalPagesFlights} onPageChange={setCurrentPage} />
            )}
          </>
        )}
      </main>
    </div>
  )
}
