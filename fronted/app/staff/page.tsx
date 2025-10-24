"use client"
import React, { useState, useEffect } from "react"
import { Plane, ChevronLeft, ChevronRight, Search, Edit, Check } from "lucide-react"
import { format } from "date-fns"

// --- Placeholder Components (tipados minimalmente) ---
const Header: React.FC = () => (
  <header className="bg-gray-800 text-white p-4 shadow-md">
    <div className="container mx-auto flex justify-between items-center">
      <h1 className="text-2xl font-bold">Staff Dashboard</h1>
      <nav>
        <span className="text-gray-300">Usuario Staff</span>
      </nav>
    </div>
  </header>
)

type PaginationProps = {
  currentPage: number
  totalPages: number
  onPageChange: (n: number) => void
  ButtonComponent?: React.FC<any>
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange, ButtonComponent }) => {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
  const ButtonComp = ButtonComponent || ((p: any) => <button {...p} />)
  return (
    <div className="flex justify-center items-center gap-2 mt-4">
      <ButtonComp onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1} variant="outline" size="icon">
        <ChevronLeft className="w-4 h-4" />
      </ButtonComp>
      {pages.map(page => (
        <ButtonComp key={page} onClick={() => onPageChange(page)} variant={currentPage === page ? "default" : "outline"} size="icon">
          {page}
        </ButtonComp>
      ))}
      <ButtonComp onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} variant="outline" size="icon">
        <ChevronRight className="w-4 h-4" />
      </ButtonComp>
    </div>
  )
}

const Card: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className = "", children }) => (
  <div className={`border rounded-lg shadow-sm ${className}`}>{children}</div>
)

const Button: React.FC<any> = ({ onClick, disabled, variant = "default", size = "default", className = "", children }) => {
  const baseStyle = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
  const variantStyles: Record<string, string> = {
    default: "bg-black text-white hover:bg-gray-800",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
  }
  const sizeStyles: Record<string, string> = {
    default: "h-10 py-2 px-4",
    sm: "h-9 px-3 rounded-md",
    lg: "h-11 px-8 rounded-md",
    icon: "h-10 w-10",
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variantStyles[variant] || variantStyles.default} ${sizeStyles[size] || sizeStyles.default} ${className}`}>
      {children}
    </button>
  )
}

const Badge: React.FC<any> = ({ className = "", children }) => (
  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}>{children}</span>
)

const Input: React.FC<any> = ({ placeholder = "", value = "", onChange = () => {}, className = "" }) => (
  <input type="text" placeholder={placeholder} value={value} onChange={onChange} className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${className}`} />
)

// --- Fin Placeholder Components ---

function safeFormatDate(dateStr?: string, pattern = "dd/MM/yyyy HH:mm") {
  if (!dateStr) return "-"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return "-"
  return format(d, pattern)
}

const API_URL = "http://127.0.0.1:8000/api/flights/"

export default function StaffPage() {
  const [activeView, setActiveView] = useState<"dashboard" | "flights">("dashboard")
  const [activeTab, setActiveTab] = useState<"pending" | "confirmed">("pending")
  const [searchEmail, setSearchEmail] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5

  const [flights, setFlights] = useState<any[]>([])
  const [flightRequests, setFlightRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editingFlightId, setEditingFlightId] = useState<number | null>(null)
  const [statusText, setStatusText] = useState("")

  const fetchAllFlights = async () => {
    setLoading(true)
    let allFlights: any[] = []
    let url: string | null = API_URL
    try {
      while (url) {
        const res: Response = await fetch(url)
        if (!res.ok) throw new Error(`Error: ${res.status}`)
        const data: any = await res.json()
        allFlights = [...allFlights, ...(data.results || data || [])]
        url = data.next || null
      }
      setFlights(allFlights)
      setError(null)
    } catch (e: any) {
      setFlights([])
      setError("No se pudo obtener los vuelos. Intenta más tarde.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllFlights()
  }, [])

  const handleUpdateFlight = async (flightId: number, dataToUpdate: Record<string, any> = {}) => {
    try {
    const res: Response = await fetch(`${API_URL}${flightId}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToUpdate),
      })
      if (!res.ok) throw new Error("Error al actualizar vuelo")
      await fetchAllFlights()
      setEditingFlightId(null)
      setStatusText("")
    } catch (err) {
      setError("No se pudo actualizar el vuelo. Intenta más tarde.")
    }
  }

  const totalActive = flights.filter(f => f.status === "active").length
  const totalScheduled = flights.filter(f => f.is_available === false).length

  const now = new Date()
  const proximosVuelos = flights
    .filter(f => {
      const dep = new Date(f.departure_datetime)
      return dep > now && dep < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    })
    .sort((a, b) => new Date(a.departure_datetime).getTime() - new Date(b.departure_datetime).getTime())

  const filteredFlightsForTable = flights.filter(f => (activeTab === "pending" ? f.is_available === false : f.is_available === true))
  const searchedFlightsForTable = searchEmail ? filteredFlightsForTable.filter(f => f.user_username?.toLowerCase().includes(searchEmail.toLowerCase())) : filteredFlightsForTable
  const totalPages = Math.max(1, Math.ceil(searchedFlightsForTable.length / itemsPerPage))
  const paginatedFlights = searchedFlightsForTable.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  useEffect(() => { setCurrentPage(1) }, [activeTab, searchEmail])

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex gap-4 mb-6">
          <Button variant={activeView === "dashboard" ? "default" : "outline"} onClick={() => setActiveView("dashboard")} className={activeView === "dashboard" ? "bg-black text-white" : ""}>Inicio</Button>
          <Button variant={activeView === "flights" ? "default" : "outline"} onClick={() => setActiveView("flights")} className={activeView === "flights" ? "bg-black text-white" : ""}>Vuelos por confirmar</Button>
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
                    <p className="text-5xl font-bold">{totalScheduled}</p>
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
                              {flight.airline?.logo_url && <img src={flight.airline.logo_url} alt="logo" className="w-8 h-8 object-cover rounded-full" />}
                            </div>
                            <Badge className={flight.status === "active" ? "bg-black text-white" : flight.is_available ? "bg-green-500 text-white" : "bg-yellow-600 text-white"}>
                              {flight.status === "active" ? "Activo" : flight.is_available ? "Disponible" : "No Disponible"}
                            </Badge>
                          </div>
                          <div className="space-y-1 mb-3">
                            <p className="text-sm text-gray-600">{flight.origin} → {flight.destination}</p>
                          </div>
                          <div className="mb-3">
                            <p className="text-sm font-bold">SALIDA: {safeFormatDate(flight.departure_datetime)}</p>
                            <p className="text-sm font-bold">LLEGADA: {safeFormatDate(flight.arrival_datetime)}</p>
                            <p className="text-sm">Duración: {flight.duration_minutes} min — Asientos: {flight.available_seats}</p>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <div>
                              <span className="text-xs text-gray-600">USD</span>
                              <span className="text-2xl font-bold ml-1">{Number.parseFloat(flight.adult_price || "0").toFixed(2)}</span>
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
                  <Input placeholder="Buscar correo del cliente" value={searchEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchEmail(e.target.value)} className="max-w-md" />
                  <Button variant="outline" size="icon"><Search className="w-4 h-4" /></Button>
                </div>
                <div className="flex gap-2">
                  <Button variant={activeTab === "pending" ? "default" : "outline"} onClick={() => setActiveTab("pending")} className={activeTab === "pending" ? "bg-black text-white" : ""}>Vuelos por confirmar (No Disponibles)</Button>
                  <Button variant={activeTab === "confirmed" ? "default" : "outline"} onClick={() => setActiveTab("confirmed")} className={activeTab === "confirmed" ? "bg-black text-white" : ""}>Vuelos confirmados (Disponibles)</Button>
                </div>

                <div className="overflow-x-auto border-2 rounded-lg">
                  <table className="w-full">
                    <thead className="bg-white border-b-2">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold">ID</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Cliente</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Origen</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Destino</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Dispo. (is_available)</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Status (Texto)</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Opciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedFlights.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No hay vuelos que coincidan</td>
                        </tr>
                      ) : (
                        paginatedFlights.map((flight: any) => (
                          <tr key={flight.id} className="border-b">
                            <td className="px-4 py-3 text-sm">{flight.id}</td>
                            <td className="px-4 py-3 text-sm"><span className="text-blue-600">{flight.user_username || "N/A"}</span></td>
                            <td className="px-4 py-3 text-sm">{flight.origin}</td>
                            <td className="px-4 py-3 text-sm">{flight.destination}</td>
                            <td className="px-4 py-3 text-sm">{flight.is_available ? <span className="text-green-600 font-medium">Disponible (True)</span> : <span className="text-red-600 font-medium">No Disponible (False)</span>}</td>
                            <td className="px-4 py-3 text-sm">{editingFlightId === flight.id ? <Input value={statusText} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatusText(e.target.value)} className="h-8 text-sm" /> : flight.status}</td>
                            <td className="px-4 py-3">
                              <div className="flex gap-2 items-center">
                                {editingFlightId === flight.id ? (
                                  <Button onClick={() => handleUpdateFlight(flight.id, { status: statusText })} className="bg-green-600 text-white hover:bg-green-700" size="icon"><Check className="w-4 h-4" /></Button>
                                ) : (
                                  <Button onClick={() => { setEditingFlightId(flight.id); setStatusText(flight.status || "") }} className="bg-gray-400 text-white hover:bg-gray-500" size="icon"><Edit className="w-4 h-4" /></Button>
                                )}

                                {activeTab === "pending" && <Button onClick={() => handleUpdateFlight(flight.id, { is_available: true })} className="bg-green-600 text-white hover:bg-green-700" size="sm">Activar (true)</Button>}
                                {activeTab === "confirmed" && <Button onClick={() => handleUpdateFlight(flight.id, { is_available: false })} className="bg-red-600 text-white hover:bg-red-700" size="sm">Desactivar (false)</Button>}

                                <Button onClick={() => alert(JSON.stringify(flight, null, 2))} className="bg-blue-600 text-white hover:bg-blue-700 ml-2" size="sm">Detalle</Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} ButtonComponent={Button} />}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}