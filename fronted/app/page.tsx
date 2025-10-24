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
import { CalendarIcon, Plane, Users, ArrowRightLeft } from "lucide-react"
import { format } from "date-fns"
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
  created_at: string
  updated_at: string
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

export default function HomePage() {
  const router = useRouter()
  const [origin, setOrigin] = useState("")
  const [destination, setDestination] = useState("")
  const [date, setDate] = useState<Date>()
  const [classType, setClassType] = useState("Persona, Económica")
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  const [flights, setFlights] = useState<Flight[]>([])
  const [destinations, setDestinations] = useState<Destination[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const hasRefreshedNow = sessionStorage.getItem("page_refreshed")
    
    if (!hasRefreshedNow) {
      sessionStorage.setItem("page_refreshed", "true")
      setTimeout(() => {
        window.location.reload()
      }, 500)
      return
    }

    const checkAuth = async () => {
      const token = localStorage.getItem("token")
      
      if (!token) {
        sessionStorage.removeItem("page_refreshed")
        router.push("/login")
        return
      }

      try {
        const parts = token.split('.')
        if (parts.length !== 3) {
          throw new Error('Invalid token')
        }

        const payload = JSON.parse(atob(parts[1]))
        
        if (payload.exp && payload.exp * 1000 < Date.now()) {
          throw new Error('Token expired')
        }

        const cookieExists = document.cookie.split('; ').find(row => row.startsWith('auth_token='))
        if (!cookieExists) {
          document.cookie = `auth_token=${token}; path=/; max-age=86400; ${process.env.NODE_ENV === 'production' ? 'secure;' : ''} samesite=lax`
        }

        setIsAuthenticated(true)
      } catch (error) {
        localStorage.removeItem("token")
        localStorage.removeItem("register_completed")
        sessionStorage.removeItem("page_refreshed")
        document.cookie = 'auth_token=; path=/; max-age=0'
        router.push("/login")
      } finally {
        setIsCheckingAuth(false)
      }
    }

    checkAuth()
  }, [router])

  useEffect(() => {
    if (!isAuthenticated) return

    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token")
        
        const [destinationsRes, flightsRes] = await Promise.all([
          fetch("http://127.0.0.1:8000/api/destinations/", {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch("http://127.0.0.1:8000/api/flights/", {
            headers: { Authorization: `Bearer ${token}` }
          })
        ])

        const destinationsData = await destinationsRes.json()
        const flightsData = await flightsRes.json()

        const activeDestinations = destinationsData.results.filter((d: Destination) => d.is_active)

        setDestinations(activeDestinations)
        setFlights(flightsData.results.slice(0, 4))

        if (activeDestinations.length >= 2) {
          setOrigin(activeDestinations[0].code)
          setDestination(activeDestinations[1].code)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setDestinations([])
        setFlights([])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [isAuthenticated])

  const handleSearch = () => {
    const passengersCount = classType.includes("2 Personas") ? 2 : classType.includes("3 Personas") ? 3 : 1
    
    const searchParams = {
      originCode: origin,
      destinationCode: destination,
      date: date ? format(date, "yyyy-MM-dd") : null,
      passengers: passengersCount,
      classType: classType
    }
    
    sessionStorage.setItem("flight_search_params", JSON.stringify(searchParams))
    router.push("/vuelos")
  }

  const swapLocations = () => {
    const temp = origin
    setOrigin(destination)
    setDestination(temp)
  }

  const availableDestinations = (excludeCode: string) => {
    return destinations.filter(dest => dest.code !== excludeCode)
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <Card className="p-6 bg-blue-600 text-white mb-12">
          <h2 className="text-xl font-bold mb-4">Vuelos</h2>

          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px] space-y-2">
              <Label htmlFor="origin" className="text-white text-sm">
                Origen
              </Label>
              <Select value={origin} onValueChange={setOrigin}>
                <SelectTrigger className="bg-white text-black h-11">
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
              className="text-white hover:bg-blue-700 mb-0.5"
            >
              <ArrowRightLeft className="w-5 h-5" />
            </Button>

            <div className="flex-1 min-w-[200px] space-y-2">
              <Label htmlFor="destination" className="text-white text-sm">
                Destino
              </Label>
              <Select value={destination} onValueChange={setDestination}>
                <SelectTrigger className="bg-white text-black h-11">
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

            <div className="flex-1 min-w-[200px] space-y-2">
              <Label htmlFor="date" className="text-white text-sm">
                Fecha
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-11 bg-white text-black hover:bg-gray-50",
                      !date && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex-1 min-w-[200px] space-y-2">
              <Label htmlFor="passengers" className="text-white text-sm">
                Número de personas
              </Label>
              <Select value={classType} onValueChange={setClassType}>
                <SelectTrigger className="bg-white text-black h-11">
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

            <Button onClick={handleSearch} className="bg-red-600 hover:bg-red-700 text-white px-8 h-11">
              Buscar
            </Button>
          </div>
        </Card>

        <div>
          <h2 className="text-2xl font-bold mb-6">Vuelos más baratos</h2>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando vuelos...</p>
            </div>
          ) : flights.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No hay vuelos disponibles</p>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {flights.map((flight) => (
                <Card key={flight.id} className="overflow-hidden border-2 hover:shadow-lg transition-shadow">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                          <Plane className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-sm font-medium">{flight.airline.name}</span>
                      </div>
                      <span className="bg-black text-white text-xs px-2 py-1 rounded">Directo</span>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm text-gray-600">{flight.origin} - Ecuador</p>
                      <p className="text-sm text-gray-600">{flight.destination} - Ecuador</p>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-bold">
                        FECHA: {format(new Date(flight.departure_datetime), "dd/MM/yyyy")}
                      </p>
                      <p className="text-sm font-bold">
                        HORA: {format(new Date(flight.departure_datetime), "HH:mm")}
                      </p>
                    </div>

                    <p className="text-xs text-gray-600 mb-4">Precio especial por temporada por persona desde</p>

                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-gray-600">USD</span>
                        <span className="text-2xl font-bold ml-1">
                          {Number.parseFloat(flight.adult_price).toFixed(0)}
                        </span>
                      </div>
                      <Button
                        onClick={() => router.push(`/vuelos/${flight.id}`)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Reservar →
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
