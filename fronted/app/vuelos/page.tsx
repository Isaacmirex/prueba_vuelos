"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Plane, Users, ArrowRightLeft, User, ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { format, parseISO, startOfDay } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface Destination {
  id: number
  name: string
  code: string
  province: string
  is_active: boolean
  image_url: string | null
}

interface Airline {
  id: number
  name: string
  code: string
  logo_url: string
}

interface Flight {
  id: number
  flight_code: string
  airline: Airline
  origin: string
  destination: string
  departure_datetime: string
  arrival_datetime: string
  duration_minutes: number
  adult_price: string
  available_seats: number
  status: string
  is_available: boolean
}

export default function VuelosPage() {
  const router = useRouter()
  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")
  const [date, setDate] = useState<Date>()
  const [classType, setClassType] = useState("Persona, Económica")
  const [passengers, setPassengers] = useState(1)
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null)
  
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [allFlights, setAllFlights] = useState<Flight[]>([])
  const [filteredFlights, setFilteredFlights] = useState<Flight[]>([])
  const [loading, setLoading] = useState(true)
  
  const [currentPage, setCurrentPage] = useState(1)
  const flightsPerPage = 5

  // useEffect para Cargar Todos los Datos (con paginación)
  useEffect(() => {
    
    // Función para cargar TODAS las páginas de vuelos
    const fetchAllFlights = async (token: string | null) => {
      let allFlights: Flight[] = [];
      let url: string | null = "http://127.0.0.1:8000/api/flights/";
      try {
        while (url) {
          console.log(`Fetching flights from: ${url}`);
          const res: Response = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (!res.ok) {
            throw new Error(`Error HTTP: ${res.status} - ${res.statusText}`);
          }
          let data;
          try {
            data = await res.json();
          } catch (jsonError) {
            throw new Error("Error parsing JSON de la respuesta de vuelos");
          }
          if (data.results) {
            allFlights = allFlights.concat(data.results);
          }
          url = data.next;
        }
        return allFlights;
      } catch (error) {
        console.error("Error fetching paginated flights:", error);
        return allFlights;
      }
    }

    const loadData = async () => {
      try {
        const token = localStorage.getItem("token")
        const searchData = sessionStorage.getItem("flight_search_params")
        
        if (searchData) {
          const parsed = JSON.parse(searchData)
          setOrigin(parsed.originCode || "")
          setDestination(parsed.destinationCode || "")
          if (parsed.date) setDate(new Date(parsed.date))
          setPassengers(parsed.passengers || 1)
          setClassType(parsed.classType || "Persona, Económica")
        }

        const destinationsPromise = fetch("http://127.0.0.1:8000/api/destinations/", {
          headers: { Authorization: `Bearer ${token}` }
        }).then(res => res.json())
        
        const flightsPromise = fetchAllFlights(token) // Carga todos los vuelos

        const [destinationsData, allFlightsData] = await Promise.all([
          destinationsPromise,
          flightsPromise
        ])

        console.log("Destinations loaded:", destinationsData.results)
        console.log(`ALL Flights loaded (from all pages): ${allFlightsData.length} flights`)

        setDestinations(destinationsData.results.filter((d: Destination) => d.is_active))
        setAllFlights(allFlightsData) 

      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])


  // --- INICIO: useEffect DE FILTRADO (NUEVA LÓGICA) ---
  useEffect(() => {
    if (allFlights.length === 0) {
      setFilteredFlights([])
      return
    }

    let filtered = [...allFlights]
    const today = new Date() // Fecha de HOY (para ordenar)

    console.log("=== FILTRADO (CANTIDAD) INICIADO ===")
    console.log("Total vuelos disponibles (todos):", filtered.length)
    console.log("Origen seleccionado:", origin)
    console.log("Destino seleccionado:", destination)
    console.log("Fecha seleccionada:", date ? format(date, "yyyy-MM-dd") : "Sin fecha")

    // 1. Filtrar por Origen
    if (origin) {
      filtered = filtered.filter(flight => 
        flight.origin.trim().toUpperCase() === origin.trim().toUpperCase()
      )
      console.log(`Resultado después de filtrar origen: ${filtered.length} vuelos`)
    }

    // 2. Filtrar por Destino
    if (destination) {
      filtered = filtered.filter(flight => 
        flight.destination.trim().toUpperCase() === destination.trim().toUpperCase()
      )
      console.log(`Resultado después de filtrar destino: ${filtered.length} vuelos`)
    }

    // 3. Filtrar por Fecha (NUEVA LÓGICA)
    // Solo filtramos si el usuario PUSO una fecha.
    if (date) {
      const searchDateStart = startOfDay(date)
      console.log(`\nFiltrando vuelos EN O DESPUÉS DE: ${format(searchDateStart, "yyyy-MM-dd")}`)
      
      filtered = filtered.filter(flight => {
        const flightDate = parseISO(flight.departure_datetime)
        // Compara si la fecha/hora del vuelo es posterior o igual al INICIO del día de búsqueda
        return flightDate.getTime() >= searchDateStart.getTime()
      })
      console.log(`Resultado después de filtrar fecha: ${filtered.length} vuelos`)

    } else {
      // SI NO HAY FECHA: No filtramos nada. Dejamos pasar todos (cantidad).
      console.log("\nSin fecha seleccionada. Mostrando todos los vuelos (pasados y futuros).")
    }

    // 4. Filtrar por asientos y estado
    filtered = filtered.filter(flight => {
      return flight.available_seats >= passengers && flight.status === "scheduled"
    })
    console.log(`Resultado después de filtrar capacidad/estado: ${filtered.length} vuelos`)

    // 5. Ordenar resultados (NUEVA LÓGICA)
    // Ordenar por "más cercano" a la fecha seleccionada, o a "hoy" si no hay fecha
    const referenceDate = date ? date.getTime() : today.getTime()
    console.log(`Ordenando por proximidad a: ${format(referenceDate, "yyyy-MM-dd")}`)

    filtered.sort((a, b) => {
      const dateA = parseISO(a.departure_datetime).getTime()
      const dateB = parseISO(b.departure_datetime).getTime()

      // Calcula la diferencia absoluta (distancia) a la fecha de referencia
      const diffA = Math.abs(dateA - referenceDate)
      const diffB = Math.abs(dateB - referenceDate)

      return diffA - diffB // Ordena por la diferencia más pequeña
    })

    console.log("=== FILTRADO COMPLETADO ===")
    console.log(`Total vuelos encontrados: ${filtered.length}\n`)
    
    setFilteredFlights(filtered)
    setCurrentPage(1) 

  }, [allFlights, origin, destination, date, passengers])
  // --- FIN DEL BLOQUE MODIFICADO ---

  const swapLocations = () => {
    const temp = origin
    setOrigin(destination)
    setDestination(temp)
  }

  const availableDestinations = (excludeCode: string) => {
    return destinations.filter(dest => dest.code !== excludeCode)
  }

  const handleSelectFlight = (flight: Flight) => {
    setSelectedFlight(flight)
  }

  const handleGuardar = () => {
    if (selectedFlight) {
      sessionStorage.setItem("selected_flight", JSON.stringify({
        flight: selectedFlight,
        passengers,
        date: date ? format(date, "yyyy-MM-dd") : null
      }))
      router.push(`/pago/${selectedFlight.id}`)
    }
  }

  // --- INICIO: FUNCIÓN DE AYUDA MODIFICADA ---
  // Esta función ahora devuelve el OBJETO de destino completo
  // para manejar datos inconsistentes (ej. "UIO" vs "Quito")
  const getDestinationObject = (codeOrName: string) => {
    if (!codeOrName || destinations.length === 0) return null;
    const upperInput = codeOrName.trim().toUpperCase();
    return destinations.find(d => 
      d.code.toUpperCase() === upperInput || 
      d.name.toUpperCase() === upperInput
    );
  }
  // --- FIN: FUNCIÓN DE AYUDA MODIFICADA ---


  const indexOfLastFlight = currentPage * flightsPerPage
  const indexOfFirstFlight = indexOfLastFlight - flightsPerPage
  const currentFlights = filteredFlights.slice(indexOfFirstFlight, indexOfLastFlight)
  const totalPages = Math.ceil(filteredFlights.length / flightsPerPage)

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver
        </Button>

        <div className="grid lg:grid-cols-[320px_1fr] gap-6">
          <div className="space-y-6">
            <Card className="p-6 bg-blue-600 text-white">
              <h2 className="text-xl font-bold mb-4">Vuelos</h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white text-sm">Origen</Label>
                  <Select value={origin} onValueChange={setOrigin}>
                    <SelectTrigger className="bg-white text-black">
                      <SelectValue placeholder="Seleccionar origen" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDestinations(destination).map((dest) => (
                        <SelectItem key={dest.id} value={dest.code}>
                          <div className="flex flex-col">
                            <span className="font-medium">{dest.code}</span>
                            <span className="text-xs text-gray-500">{dest.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={swapLocations}
                  className="w-full text-white hover:bg-blue-700"
                >
                  <ArrowRightLeft className="w-5 h-5" />
                </Button>

                <div className="space-y-2">
                  <Label className="text-white text-sm">Destino</Label>
                  <Select value={destination} onValueChange={setDestination}>
                    <SelectTrigger className="bg-white text-black">
                      <SelectValue placeholder="Seleccionar destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDestinations(origin).map((dest) => (
                        <SelectItem key={dest.id} value={dest.code}>
                          <div className="flex flex-col">
                            <span className="font-medium">{dest.code}</span>
                            <span className="text-xs text-gray-500">{dest.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-white text-sm">Fecha</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white text-black hover:bg-gray-50",
                          !date && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date ? format(date, "dd 'de' MMMM 'de' yyyy", { locale: es }) : <span>Seleccionar fecha</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar 
                        mode="single" 
                        selected={date} 
                        onSelect={setDate} 
                        initialFocus 
                        defaultMonth={new Date()} 
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-white text-sm">Número de personas</Label>
                  <Select value={classType} onValueChange={(val) => {
                    setClassType(val)
                    const count = val.includes("2 Personas") ? 2 : val.includes("3 Personas") ? 3 : 1
                    setPassengers(count)
                  }}>
                    <SelectTrigger className="bg-white text-black">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Persona, Económica">Persona, Económica</SelectItem>
                      <SelectItem value="2 Personas, Económica">2 Personas, Económica</SelectItem>
                      <SelectItem value="3 Personas, Económica">3 Personas, Económica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {selectedFlight && (
              <Card className="p-6 bg-white">
                <h3 className="font-bold mb-4">Vuelo Seleccionado</h3>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                      <Plane className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm">{selectedFlight.airline.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">{passengers} persona{passengers > 1 ? 's' : ''}</span>
                  </div>
                  <div className="text-sm">
                    {/* --- INICIO: LÓGICA DE TARJETA MODIFICADA --- */}
                    {(() => {
                      const originObj = getDestinationObject(selectedFlight.origin);
                      const destObj = getDestinationObject(selectedFlight.destination);
                      return (
                        <>
                          <p className="font-medium">
                            {originObj ? originObj.name : selectedFlight.origin}{" "}
                            {format(parseISO(selectedFlight.departure_datetime), "HH:mm")}
                          </p>
                          <p className="font-medium">
                            {destObj ? destObj.name : selectedFlight.destination}{" "}
                            {format(parseISO(selectedFlight.arrival_datetime), "HH:mm")}
                          </p>
                        </>
                      )
                    })()}
                    {/* --- FIN: LÓGICA DE TARJETA MODIFICADA --- */}
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-sm text-gray-600">Subtotal</p>
                    <p className="text-2xl font-bold">
                      <span className="text-sm">USD</span> {(parseFloat(
selectedFlight.adult_price) * passengers).toFixed(2)}
                    </p>
                  </div>
                </div>
                <Button onClick={handleGuardar} className="w-full bg-red-600 hover:bg-red-700 text-white">
                  Guardar
                </Button>
              </Card>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-6">
              <Plane className="w-6 h-6" />
              <h2 className="text-xl font-bold">Seleccionar vuelo</h2>
              <span className="text-sm text-gray-600">({filteredFlights.length} resultados)</span>
            </div>

            {currentFlights.length === 0 ? (
              <Card className="p-12 text-center">
                <Plane className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-bold mb-2">No se encontraron vuelos</h3>
                <p className="text-gray-600">
                  {allFlights.length === 0 
                    ? "No hay vuelos disponibles en el sistema" 
                    : "Intenta cambiar los filtros de búsqueda"}
                </p>
              </Card>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {/* --- INICIO: LÓGICA DE RENDERIZADO DE TARJETA MODIFICADA --- */}
                  {currentFlights.map((flight) => {
                    const originObj = getDestinationObject(flight.origin);
                    const destObj = getDestinationObject(flight.destination);
                    
                    return (
                      <Card
                        key={flight.id}
                        className={cn(
                          "p-6 cursor-pointer transition-all hover:shadow-lg",
                          selectedFlight?.id === flight.id && "ring-2 ring-blue-600 bg-blue-50",
                        )}
                        onClick={() => handleSelectFlight(flight)}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <img
                            src={flight.airline.logo_url || "/placeholder.svg"}
                            alt={flight.airline.name}
                            className="w-24 h-16 object-cover rounded"
                          />

                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
                              <Plane className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm text-gray-600 mb-1">{flight.airline.name}</p>
                              <div className="flex items-center gap-6">
                                <div>
                                  <p className="font-bold text-lg">{originObj ? originObj.code : flight.origin}</p>
                                  <p className="text-xs text-gray-500">{originObj ? originObj.name : flight.origin}</p>
                                  <p className="text-sm mt-1">{format(parseISO(flight.departure_datetime), "HH:mm")}</p>
                                </div>
                                <div>
                                  <p className="font-bold text-lg">{destObj ? destObj.code : flight.destination}</p>
                                  <p className="text-xs text-gray-500">{destObj ? destObj.name : flight.destination}</p>
                                  <p className="text-sm mt-1">{format(parseISO(flight.arrival_datetime), "HH:mm")}</p>
                                </div>
                                <div className="text-sm text-gray-600">
                                  <p>Directo</p>
                                  <p className="text-xs">{format(parseISO(flight.departure_datetime), "dd MMM", { locale: es })}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">USD</p>
                            <p className="text-3xl font-bold">{parseFloat(flight.adult_price).toFixed(0)}</p>
                            <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                              <User className="w-4 h-4" />
                              <span>1 persona</span>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                  {/* --- FIN: LÓGICA DE RENDERIZADO DE TARJETA MODIFICADA --- */}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
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
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}