"use client"
import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Pagination } from "@/components/pagination"
import { Plane, Search } from "lucide-react"
import { format } from "date-fns"

// Modal de texto para aprobación o detalle
function ApproveDialog({ open, onClose, onSubmit, flight, action }) {
  const [mensaje, setMensaje] = useState("")
  useEffect(() => { setMensaje("") }, [open])
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded shadow-lg p-6 w-96">
        <div className="font-bold mb-2">
          {action === "confirmar" ? "Mensaje para confirmar vuelo" : "Detalle y observaciones"}
        </div>
        <div className="mb-2 text-sm">
          <b>Vuelo:</b> {flight?.flight_code}<br />
          <b>Origen:</b> {flight?.origin} <b>Destino:</b> {flight?.destination}
        </div>
        <textarea
          className="w-full border rounded p-2 mb-4 resize-none"
          value={mensaje}
          rows={3}
          onChange={e => setMensaje(e.target.value)}
          placeholder="Escribe un mensaje (opcional)"
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          <Button onClick={() => { onSubmit(mensaje); setMensaje(""); }}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  )
}

function safeFormatDate(dateStr = "", pattern = "dd/MM/yyyy HH:mm") {
  if (!dateStr) return "-"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return "-"
  return format(d, pattern)
}

const API_URL = "http://127.0.0.1:8000/api/flights/"

export default function StaffPage() {
  const [activeView, setActiveView] = useState("dashboard")
  const [activeTab, setActiveTab] = useState("pending")
  const [searchEmail, setSearchEmail] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogFlight, setDialogFlight] = useState(null)
  const [dialogAction, setDialogAction] = useState("confirmar")

  // PATCH con solo los datos a actualizar
  const handleUpdateFlight = async (flightId, updateData = {}) => {
    const token = localStorage.getItem("token")
    try {
      const res = await fetch(`${API_URL}${flightId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(updateData)
      })
      if (!res.ok) {
        const detalle = await res.text()
        throw new Error(detalle)
      }
      await fetchAllFlights()
    } catch (e) {
      setError("No se pudo actualizar el vuelo.")
      console.log(e);
    }
  }

  // GET flights con JWT y paginación
  const fetchAllFlights = async () => {
    setLoading(true)
    let all = []
    let url = API_URL
    const token = localStorage.getItem("token")
    try {
      while (url) {
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error(`Error: ${res.status}`)
        const data = await res.json()
        all = [...all, ...(data.results || data || [])]
        url = data.next || null
      }
      setFlights(all)
      setError(null)
    } catch(e) {
      setFlights([])
      setError("No se pudo obtener los vuelos. Intenta más tarde.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchAllFlights() }, [])

  // Tabs:
  // --- Vuelos por confirmar: status:"scheduled", is_available:false
  // --- Vuelos confirmados: status:"scheduled", is_available:true
  const filteredFlightsForTable = flights.filter(f =>
    activeTab === "pending"
      ? f.status === "scheduled" && !f.is_available
      : f.status === "scheduled" && f.is_available
  )

  const searchedFlightsForTable = searchEmail
    ? filteredFlightsForTable.filter(f =>
        (f.user_username ?? "").toLowerCase().includes(searchEmail.toLowerCase())
      )
    : filteredFlightsForTable

  const totalPages = Math.max(1, Math.ceil(searchedFlightsForTable.length / itemsPerPage))
  const paginatedFlights = searchedFlightsForTable.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  useEffect(() => { setCurrentPage(1) }, [activeTab, searchEmail])

  // Dashboard resumen:
  const totalActive = flights.filter(f => f.status === "scheduled" && f.is_available).length
  const totalPending = flights.filter(f => f.status === "scheduled" && !f.is_available).length
  const now = new Date()
  const proximosVuelos = flights.filter(f => {
      const dep = new Date(f.departure_datetime)
      return dep > now && dep < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    })
    .sort((a, b) => new Date(a.departure_datetime).getTime() - new Date(b.departure_datetime).getTime())

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

        {loading && flights.length === 0 ? (
          <p className="text-center py-8">Cargando datos...</p>
        ) : error ? (
          <p className="text-center py-8 text-red-600">{error}</p>
        ) : (
          <>
            {activeView === "dashboard" && (
              <>
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <Card className="p-8 border-2">
                    <h3 className="text-lg font-semibold mb-2">Total de vuelos activos</h3>
                    <p className="text-5xl font-bold">{totalActive}</p>
                  </Card>
                  <Card className="p-8 border-2">
                    <h3 className="text-lg font-semibold mb-2">Total de vuelos por confirmar</h3>
                    <p className="text-5xl font-bold">{totalPending}</p>
                  </Card>
                </div>
                <Card className="p-6 border-2">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold">Vuelos próximos por salir</h2>
                  </div>
                  {proximosVuelos.length === 0 ? (
                    <p className="text-center py-8 text-gray-500">No hay vuelos próximos</p>
                  ) : (
                    <div className="grid md:grid-cols-3 gap-4">
                      {proximosVuelos.map(flight => (
                        <Card key={flight.id} className="p-4 border-2">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                                <Plane className="w-4 h-4 text-white" />
                              </div>
                              <span className="text-sm font-medium">{flight.airline?.name}</span>
                              <img src={flight.airline?.logo_url} alt="logo" className="w-8 h-8 object-cover rounded-full"/>
                            </div>
                            <Badge className={
                              flight.status === "scheduled"
                                ? (flight.is_available ? "bg-green-600 text-white" : "bg-yellow-500 text-white")
                                : "bg-red-600 text-white"
                            }>
                              {flight.status === "scheduled"
                                ? (flight.is_available ? "Confirmado" : "Por aprobar")
                                : "Inactivo"}
                            </Badge>
                          </div>
                          <div className="space-y-1 mb-3">
                            <p className="text-sm text-gray-600">{flight.origin} → {flight.destination}</p>
                          </div>
                          <div className="mb-3">
                            <p className="text-sm font-bold">SALIDA: {safeFormatDate(flight.departure_datetime)}</p>
                            <p className="text-sm font-bold">LLEGADA: {safeFormatDate(flight.arrival_datetime)}</p>
                          </div>
                          <p className="text-xs text-gray-600">
                            Duración: {flight.duration_minutes} min — Asientos: {flight.available_seats}
                          </p>
                          <div className="flex items-center justify-between mt-3">
                            <div>
                              <span className="text-xs text-gray-600">USD</span>
                              <span className="text-2xl font-bold ml-1">
                                {Number.parseFloat(flight.adult_price).toFixed(2)}
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
                    onChange={e => setSearchEmail(e.target.value)}
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
                        <th className="px-4 py-3 text-left text-sm font-semibold">Vuelo</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Origen</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Destino</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Estado</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Opciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedFlights.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                            No hay vuelos que coincidan
                          </td>
                        </tr>
                      ) : (
                        paginatedFlights.map((flight) => (
                          <tr key={flight.id} className="border-b">
                            <td className="px-4 py-3 text-sm">{flight.id}</td>
                            <td className="px-4 py-3 text-sm font-mono">{flight.flight_code}</td>
                            <td className="px-4 py-3 text-sm">{flight.origin}</td>
                            <td className="px-4 py-3 text-sm">{flight.destination}</td>
                            <td className="px-4 py-3 text-sm">
                              {activeTab === "pending"
                                ? "Por confirmar"
                                : "Confirmado"}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                {activeTab === "pending" && !flight.is_available && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setDialogFlight(flight)
                                        setDialogAction("confirmar")
                                        setDialogOpen(true)
                                      }}
                                      className="bg-black text-white"
                                    >
                                      Confirmar
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setDialogFlight(flight)
                                        setDialogAction("detalle")
                                        setDialogOpen(true)
                                      }}
                                      className="bg-blue-500 text-white"
                                    >
                                      Detalle
                                    </Button>
                                  </>
                                )}
                                {activeTab === "confirmed" && flight.is_available && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setDialogFlight(flight)
                                        setDialogAction("detalle")
                                        setDialogOpen(true)
                                      }}
                                      className="bg-blue-600 text-white"
                                    >
                                      Detalle
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handleUpdateFlight(flight.id, { is_available: false })
                                      }
                                      className="bg-red-600 text-white"
                                    >
                                      Desactivar
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  <ApproveDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    flight={dialogFlight}
                    action={dialogAction}
                    onSubmit={mensaje => {
                      if (!dialogFlight) return
                      if (dialogAction === "confirmar") {
                        handleUpdateFlight(dialogFlight.id, {
                          is_available: true,
                          mensaje
                        })
                      } else {
                        handleUpdateFlight(dialogFlight.id, { mensaje })
                      }
                      setDialogOpen(false)
                    }}
                  />
                  {totalPages > 1 && (
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
