"use client"
import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Pagination } from "@/components/pagination"
import { Plane, ChevronLeft, ChevronRight, Search, Edit, Check } from "lucide-react"
import { api, type Flight, type FlightRequest } from "@/lib/api"
import { format } from "date-fns"

const MOCK_FLIGHTS: Flight[] = [
  {
    id: 1,
    flight_code: "LA001",
    airline: {
      id: 1,
      name: "LATAM Airlines",
      code: "LA",
      logo_url: "https://example.com/latam.png",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    origin: { id: 1, name: "Quito", code: "UIO", province: "Pichincha", is_active: true, image_url: null },
    destination: { id: 2, name: "Guayaquil", code: "GYE", province: "Guayas", is_active: true, image_url: null },
    departure_date: "2025-11-15",
    departure_time: "08:30:00",
    arrival_time: "09:15:00",
    price_per_person: "89.00",
    available_seats: 45,
    status: "active",
    status_display: "Activo",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    flight_code: "AV102",
    airline: {
      id: 2,
      name: "Avianca",
      code: "AV",
      logo_url: "https://example.com/avianca.png",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    origin: { id: 3, name: "Cuenca", code: "CUE", province: "Azuay", is_active: true, image_url: null },
    destination: { id: 1, name: "Quito", code: "UIO", province: "Pichincha", is_active: true, image_url: null },
    departure_date: "2025-11-16",
    departure_time: "14:00:00",
    arrival_time: "15:30:00",
    price_per_person: "125.00",
    available_seats: 32,
    status: "delayed",
    status_display: "Retraso",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 3,
    flight_code: "CM205",
    airline: {
      id: 3,
      name: "Copa Airlines",
      code: "CM",
      logo_url: "https://example.com/copa.png",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    origin: { id: 2, name: "Guayaquil", code: "GYE", province: "Guayas", is_active: true, image_url: null },
    destination: { id: 4, name: "Manta", code: "MEC", province: "Manabí", is_active: true, image_url: null },
    departure_date: "2025-11-17",
    departure_time: "10:45:00",
    arrival_time: "11:30:00",
    price_per_person: "75.00",
    available_seats: 28,
    status: "cancelled",
    status_display: "Cancelado",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const MOCK_FLIGHT_REQUESTS: FlightRequest[] = [
  {
    id: 1,
    user_username: "maria.lopez@email.com",
    destination: { id: 1, name: "Quito", code: "UIO", province: "Pichincha", is_active: true, image_url: null },
    origin: { id: 2, name: "Guayaquil", code: "GYE", province: "Guayas", is_active: true, image_url: null },
    travel_date: "2025-11-10",
    status: "PENDING",
    companions: 2,
    created_at: "2025-10-23T10:30:00-05:00",
  },
  {
    id: 2,
    user_username: "carlos.ruiz@email.com",
    destination: { id: 3, name: "Cuenca", code: "CUE", province: "Azuay", is_active: true, image_url: null },
    origin: { id: 1, name: "Quito", code: "UIO", province: "Pichincha", is_active: true, image_url: null },
    travel_date: "2025-11-15",
    status: "CONFIRMED",
    companions: 1,
    created_at: "2025-10-23T11:15:00-05:00",
  },
  {
    id: 3,
    user_username: "ana.torres@email.com",
    destination: { id: 4, name: "Manta", code: "MEC", province: "Manabí", is_active: true, image_url: null },
    origin: { id: 2, name: "Guayaquil", code: "GYE", province: "Guayas", is_active: true, image_url: null },
    travel_date: "2025-11-20",
    status: "PENDING",
    companions: 3,
    created_at: "2025-10-23T12:00:00-05:00",
  },
  {
    id: 4,
    user_username: "pedro.sanchez@email.com",
    destination: { id: 2, name: "Guayaquil", code: "GYE", province: "Guayas", is_active: true, image_url: null },
    origin: { id: 1, name: "Quito", code: "UIO", province: "Pichincha", is_active: true, image_url: null },
    travel_date: "2025-11-25",
    status: "CONFIRMED",
    companions: 2,
    created_at: "2025-10-23T13:45:00-05:00",
  },
  {
    id: 5,
    user_username: "lucia.mendez@email.com",
    destination: { id: 1, name: "Quito", code: "UIO", province: "Pichincha", is_active: true, image_url: null },
    origin: { id: 3, name: "Cuenca", code: "CUE", province: "Azuay", is_active: true, image_url: null },
    travel_date: "2025-11-30",
    status: "PENDING",
    companions: 4,
    created_at: "2025-10-23T14:20:00-05:00",
  },
]

export default function StaffPage() {
  const [activeView, setActiveView] = useState<"dashboard" | "flights">("dashboard")
  const [activeTab, setActiveTab] = useState<"pending" | "confirmed">("pending")
  const [searchEmail, setSearchEmail] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  const [flights, setFlights] = useState<Flight[]>([])
  const [flightRequests, setFlightRequests] = useState<FlightRequest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [flightsData, requestsData] = await Promise.all([api.getFlights(), api.getFlightRequests()])

        setFlights(flightsData)
        setFlightRequests(requestsData)
      } catch (error) {
        console.error("[v0] Error fetching data:", error)
        setFlights([])
        setFlightRequests([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const stats = {
    totalActive: flights.filter((f) => f.status === "active").length,
    totalPending: flightRequests.filter((r) => r.status === "PENDING").length,
  }

  const upcomingFlights = flights.slice(0, 3)

  const filteredRequests = flightRequests.filter((r) =>
    activeTab === "pending" ? r.status === "PENDING" : r.status === "CONFIRMED",
  )

  const searchedRequests = searchEmail
    ? filteredRequests.filter((r) => r.user_username.toLowerCase().includes(searchEmail.toLowerCase()))
    : filteredRequests

  const totalPages = Math.ceil(searchedRequests.length / itemsPerPage)
  const paginatedRequests = searchedRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchEmail])

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex gap-4 mb-6">
          <Button
            variant={activeView === "dashboard" ? "default" : "outline"}
            onClick={() => setActiveView("dashboard")}
            className={activeView === "dashboard" ? "bg-black text-white" : ""}
          >
            Inicio
          </Button>
          <Button
            variant={activeView === "flights" ? "default" : "outline"}
            onClick={() => setActiveView("flights")}
            className={activeView === "flights" ? "bg-black text-white" : ""}
          >
            Vuelos por confirmar
          </Button>
        </div>

        {loading ? (
          <p className="text-center py-8">Cargando datos...</p>
        ) : (
          <>
            {activeView === "dashboard" && (
              <>
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <Card className="p-8 border-2">
                    <h3 className="text-lg font-semibold mb-2">Total de vuelos activos</h3>
                    <p className="text-5xl font-bold">{stats.totalActive}</p>
                  </Card>
                  <Card className="p-8 border-2">
                    <h3 className="text-lg font-semibold mb-2">Total de vuelos por confirmar</h3>
                    <p className="text-5xl font-bold">{stats.totalPending}</p>
                  </Card>
                </div>

                <Card className="p-6 border-2">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Vuelos activos por salir</h2>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon">
                        <ChevronLeft className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>

                  {upcomingFlights.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">No hay vuelos activos</p>
                  ) : (
                    <div className="grid md:grid-cols-3 gap-4">
                      {upcomingFlights.map((flight) => (
                        <Card key={flight.id} className="p-4 border-2">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                                <Plane className="w-4 h-4 text-white" />
                              </div>
                              <span className="text-sm font-medium">{flight.airline.name}</span>
                            </div>
                            <Badge
                              className={
                                flight.status === "active"
                                  ? "bg-black text-white"
                                  : flight.status === "delayed"
                                    ? "bg-yellow-500 text-white"
                                    : "bg-red-600 text-white"
                              }
                            >
                              {flight.status_display}
                            </Badge>
                          </div>

                          <div className="space-y-1 mb-3">
                            <p className="text-sm text-gray-600">{flight.origin.name} - Ecuador</p>
                            <p className="text-sm text-gray-600">{flight.destination.name} - Ecuador</p>
                          </div>

                          <div className="mb-3">
                            <p className="text-sm font-bold">
                              FECHA: {format(new Date(flight.departure_date), "dd/MM/yyyy")}
                            </p>
                            <p className="text-sm font-bold">HORA: {flight.departure_time}</p>
                            {flight.status === "cancelled" && (
                              <p className="text-sm font-bold text-red-600">Cancelado</p>
                            )}
                          </div>

                          <p className="text-xs text-gray-600 mb-3">Precio especial por temporada por persona desde</p>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs text-gray-600">USD</span>
                              <span className="text-2xl font-bold ml-1">
                                {Number.parseFloat(flight.price_per_person).toFixed(0)}
                              </span>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </Card>
              </>
            )}

            {activeView === "flights" && (
              <div className="space-y-4">
                <div className="flex gap-4 items-center">
                  <Input
                    placeholder="Buscar correo del cliente"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="max-w-md"
                  />
                  <Button variant="outline" size="icon">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant={activeTab === "pending" ? "default" : "outline"}
                    onClick={() => setActiveTab("pending")}
                    className={activeTab === "pending" ? "bg-black text-white" : ""}
                  >
                    Vuelos por confirmar
                  </Button>
                  <Button
                    variant={activeTab === "confirmed" ? "default" : "outline"}
                    onClick={() => setActiveTab("confirmed")}
                    className={activeTab === "confirmed" ? "bg-black text-white" : ""}
                  >
                    Vuelos confirmados
                  </Button>
                </div>

                <div className="overflow-x-auto border-2 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-white border-b-2">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">ID</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Cliente</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Código</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Personas</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Estatus</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">ID Vuelo</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Fecha</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Total</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Opciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRequests.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                            No hay solicitudes de vuelo
                          </td>
                        </tr>
                      ) : (
                        paginatedRequests.map((request) => (
                          <tr key={request.id} className="border-b">
                            <td className="px-4 py-3 text-sm">{request.id}</td>
                            <td className="px-4 py-3 text-sm">
                              <span className="text-blue-600">{request.user_username}</span>
                            </td>
                            <td className="px-4 py-3 text-sm">RES-{String(request.id).padStart(3, "0")}</td>
                            <td className="px-4 py-3 text-sm">{request.companions}</td>
                            <td className="px-4 py-3 text-sm">
                              {request.status === "PENDING" ? "Pendiente" : "Confirmada"}
                            </td>
                            <td className="px-4 py-3 text-sm">{request.id}</td>
                            <td className="px-4 py-3 text-sm">
                              {format(new Date(request.travel_date), "dd/MM/yyyy-HH:mm:ss")}
                            </td>
                            <td className="px-4 py-3 text-sm">${(request.companions * 89).toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button variant="default" size="sm" className="bg-black text-white">
                                  Detalles
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
