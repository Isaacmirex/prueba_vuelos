"use client"

import { useState, useEffect, useMemo } from "react"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plane, Users, ChevronLeft, ChevronRight } from "lucide-react"
import { format, parseISO } from "date-fns" // parseISO might not be needed if date is just YYYY-MM-DD
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

// --- NUEVO: Interface for API Response from /api/flight-requests/ ---
interface ApiFlightRequestDestination {
  id: number
  name: string
  code: string
  province: string
  is_active: boolean
  image_url: string | null
}

interface ApiFlightRequest {
  id: number
  user_username: string // O user ID si lo tienes
  destination: ApiFlightRequestDestination
  origin: ApiFlightRequestDestination
  travel_date: string // Formato "YYYY-MM-DD"
  status: string // Ej: "PENDING", "APPROVED", "REJECTED", "CONFIRMED" - Ajusta según tu API
  companions: number
  created_at: string
}

// --- NUEVO: Interface ajustada para la UI ---
interface ProcessedFlightRequest {
  id: number
  airline: string // Placeholder, la API no lo incluye
  origin: string
  destination: string
  date: string // Formateada
  time: string // Placeholder
  passengers: number
  verificationCode: string // Usaremos el ID como código temporal
  status: string // Directo de la API
}

// Interface for Paginated API Response (genérica)
interface PaginatedApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export default function MyFlightsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "confirmed">("pending")
  const [loading, setLoading] = useState(true)
  // Estado para guardar los datos de la API
  const [flightRequests, setFlightRequests] = useState<ApiFlightRequest[]>([])
  // Estado para los datos procesados para la UI
  const [processedRequests, setProcessedRequests] = useState<ProcessedFlightRequest[]>([])

  // Estado de Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const flightsPerPage = 5

  // 1. Cargar datos de /api/flight-requests/
  useEffect(() => {
    const token = localStorage.getItem("token")

    // Función genérica para cargar todas las páginas de una API
    const fetchAllPaginated = async <T,>(url: string): Promise<T[]> => {
      let items: T[] = []
      let nextUrl: string | null = url

      while (nextUrl) {
        try {
          const res: Response = await fetch(nextUrl, {
            headers: { Authorization: `Bearer ${token}` }
          })
          if (!res.ok) {
            throw new Error(`API returned status ${res.status} for ${nextUrl}`)
          }
          const data = await res.json() as PaginatedApiResponse<T>
          if (data.results) {
            items = items.concat(data.results)
          } else {
            console.warn(`No 'results' field found in API response from ${nextUrl}`);
          }
          nextUrl = data.next
        } catch (error) {
          console.error(`Error fetching from ${nextUrl}:`, error)
          nextUrl = null
        }
      }
      return items
    }

    const loadFlightRequests = async () => {
      setLoading(true)
      try {
        // Llama a la API correcta
        const requestData = await fetchAllPaginated<ApiFlightRequest>("http://127.0.0.1:8000/api/flight-requests/")
        setFlightRequests(requestData)
      } catch (error) {
        console.error("Error loading flight requests:", error)
        // Considera mostrar un toast al usuario
      } finally {
        // setLoading se manejará en el siguiente useEffect después de procesar
      }
    }

    loadFlightRequests()
  }, []) // Se ejecuta solo una vez al cargar la página

  // 2. Procesar los datos cuando se carguen
  useEffect(() => {
    if (flightRequests.length === 0 && !loading) {
      setProcessedRequests([]) // Si no hay datos, vacía la lista procesada
      setLoading(false)        // Asegúrate de detener la carga
      return
    }
    if (flightRequests.length === 0) return // Si aún no carga, espera

    const processed = flightRequests.map(req => {
      // Formatear fecha (asumiendo que viene como "YYYY-MM-DD")
      let formattedDate = req.travel_date;
      try {
        // Intenta parsear y formatear por si acaso viene con hora
        formattedDate = format(parseISO(req.travel_date), "dd/MM/yyyy", { locale: es });
      } catch (e) {
        // Si falla (ej. solo es "YYYY-MM-DD"), usa el valor original o formatéalo diferente si es necesario
        // Podrías necesitar date-fns-tz si manejas zonas horarias consistentemente
        // O simplemente dividir el string:
        const parts = req.travel_date.split('-');
        if (parts.length === 3) {
            formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
      }


      return {
        id: req.id,
        airline: "Aerolínea (Solicitud)", // Placeholder
        logoUrl: "", // Placeholder
        origin: req.origin.name, // Usa el nombre del objeto anidado
        destination: req.destination.name, // Usa el nombre del objeto anidado
        date: formattedDate,
        time: "--:--", // La API no incluye hora
        passengers: req.companions + 1, // Acompañantes + el usuario
        verificationCode: `REQ-${req.id}`, // Usa el ID como código
        status: req.status, // Usa el status de la API ("PENDING", etc.)
      }
    })

    setProcessedRequests(processed)
    setLoading(false) // Terminamos de procesar

  }, [flightRequests, loading]) // Depende de flightRequests y loading

  // 3. Filtrar según la pestaña activa
  const filteredFlights = useMemo(() => {
    setCurrentPage(1)
    if (activeTab === "pending") {
      // Ajusta "PENDING" si tu API usa otro nombre para el estado pendiente
      return processedRequests.filter(r => r.status === "PENDING")
    }
    if (activeTab === "confirmed") {
      // Muestra todos los que NO sean "PENDING"
      // Ajusta los estados si tienes más (APPROVED, REJECTED, CANCELLED, etc.)
      return processedRequests.filter(r => r.status !== "PENDING")
    }
    return []
  }, [activeTab, processedRequests])

  // 4. Lógica de Paginación (sin cambios)
  const indexOfLastFlight = currentPage * flightsPerPage
  const indexOfFirstFlight = indexOfLastFlight - flightsPerPage
  const currentFlights = filteredFlights.slice(indexOfFirstFlight, indexOfLastFlight)
  const totalPages = Math.ceil(filteredFlights.length / flightsPerPage)

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  // 5. Función de ayuda para el color del Badge
  const getBadgeClass = (status: string) => {
    // Ajusta los casos según los estados REALES de tu API
    switch (status.toUpperCase()) { // Convertir a mayúsculas para ser seguro
      case "CONFIRMED": // O "APPROVED" si es el caso
        return "bg-green-600 hover:bg-green-700 text-white"
      case "CANCELLED": // O "REJECTED"
        return "bg-red-600 hover:bg-red-700 text-white"
      case "PENDING":
        return "bg-yellow-500 hover:bg-yellow-600 text-black" // Amarillo a veces se ve mejor con texto negro
      default:
        return "bg-gray-500 hover:bg-gray-600 text-white"
    }
  }

    // 6. Función para obtener el texto del Badge (más legible)
    const getStatusDisplay = (status: string) => {
        switch (status.toUpperCase()) {
          case "CONFIRMED": return "Confirmado";
          case "APPROVED": return "Aprobado";
          case "CANCELLED": return "Cancelado";
          case "REJECTED": return "Rechazado";
          case "PENDING": return "Pendiente";
          default: return status; // Muestra el estado original si no coincide
        }
      }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Mis solicitudes de vuelo</h1> {/* Título ajustado */}

        <div className="flex gap-4 mb-6">
          <Button
            variant={activeTab === "pending" ? "default" : "outline"}
            onClick={() => setActiveTab("pending")}
            className={activeTab === "pending" ? "bg-black text-white hover:bg-gray-800" : ""}
          >
            Solicitudes Pendientes {/* Texto ajustado */}
          </Button>
          <Button
            variant={activeTab === "confirmed" ? "default" : "outline"}
            onClick={() => setActiveTab("confirmed")}
            className={activeTab === "confirmed" ? "bg-black text-white hover:bg-gray-800" : ""}
          >
            Historial de Solicitudes {/* Texto ajustado */}
          </Button>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
          </div>
        )}

        {/* No Flights Message */}
        {!loading && currentFlights.length === 0 && (
          <Card className="p-12 text-center">
            <Plane className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-bold mb-2">No se encontraron solicitudes</h3>
            <p className="text-gray-600">
              {activeTab === 'pending'
                ? "No tienes solicitudes de vuelo pendientes."
                : "No tienes un historial de solicitudes."}
            </p>
          </Card>
        )}

        {/* Flights List */}
        {!loading && currentFlights.length > 0 && (
          <div className="space-y-4">
            {currentFlights.map((request) => ( // Cambiado a 'request'
              <Card key={request.id} className="overflow-hidden">
                <div className="p-6">
                  <div className="grid lg:grid-cols-3 gap-6 items-center">
                    {/* Flight Info */}
                    <div className="lg:col-span-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
                          <Plane className="w-5 h-5 text-white" />
                        </div>
                        {/* Puedes poner un texto genérico o intentar obtenerlo si la API lo incluyera */}
                        <span className="text-sm text-gray-600">{request.airline}</span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-600" />
                          <span className="text-sm">{request.passengers} persona{request.passengers > 1 ? 's' : ''}</span>
                          <div className="flex gap-1 ml-2">
                            {Array.from({ length: request.passengers }).map((_, i) => (
                              <Users key={i} className="w-4 h-4 text-gray-400" />
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 items-center">
                          <div>
                            <p className="font-bold">{request.origin}</p>
                            {/* La API no tiene hora, podrías omitir esto o dejar placeholder */}
                             <p className="text-sm text-gray-600">{request.time.split(" - ")[0]}</p>
                          </div>
                          <div className="text-center">
                            <div className="h-px bg-gray-300" />
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{request.destination}</p>
                            {/* La API no tiene hora */}
                             <p className="text-sm text-gray-600">{request.time.split(" - ")[1]}</p>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600">Fecha de viaje solicitada</p>
                        <p className="font-bold">{request.date}</p>
                      </div>
                    </div>

                    {/* Verification Code */}
                    <div className="lg:col-span-1 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-2">Código de Solicitud</p>
                        <p className="text-xl font-bold tracking-wider">{request.verificationCode}</p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="lg:col-span-1 lg:text-right">
                      <div className="space-y-3 inline-block lg:block text-left lg:text-right">
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Estado</p>
                          <Badge
                            variant="default"
                            className={cn("text-lg px-4 py-1", getBadgeClass(request.status))}
                          >
                            {getStatusDisplay(request.status)} {/* Muestra texto legible */}
                          </Badge>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm font-medium mb-2">Detalle</p>
                          <div className="p-3 bg-gray-50 rounded border text-left">
                            <p className="text-sm text-gray-600">Sin comentarios</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              size="icon"
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => paginate(page)}
                  className={currentPage === page ? "bg-blue-600" : ""}
                >
                  {page}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </main>
    </div>
  )
}