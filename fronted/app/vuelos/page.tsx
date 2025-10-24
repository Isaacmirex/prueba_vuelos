"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Plane, Users, ArrowRightLeft, User, ArrowLeft } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

export default function VuelosPage() {
  const router = useRouter()
  const [origin, setOrigin] = useState("Quito - Ecuador")
  const [destination, setDestination] = useState("Manta - Ecuador")
  const [date, setDate] = useState<Date>()
  const [passengers, setPassengers] = useState(2)
  const [classType, setClassType] = useState("Persona, Economica")
  const [selectedFlight, setSelectedFlight] = useState<any>(null)

  const flights = [
    {
      id: 1,
      airline: "Copa Airlines",
      origin: "QUITO",
      destination: "MANTA",
      departureTime: "18:10",
      arrivalTime: "18:50",
      stops: "1 escala",
      price: 230,
      passengers: 1,
      image: "/airplane-window.png",
    },
    {
      id: 2,
      airline: "Copa Airlines",
      origin: "QUITO",
      destination: "MANTA",
      departureTime: "15:30",
      arrivalTime: "16:20",
      stops: "Directo",
      price: 280,
      passengers: 1,
      image: "/airplane-cabin.jpg",
    },
    {
      id: 3,
      airline: "Copa Airlines",
      origin: "QUITO",
      destination: "MANTA",
      departureTime: "20:00",
      arrivalTime: "20:50",
      stops: "1 escala",
      price: 230,
      passengers: 1,
      image: "/airplane-sunset.png",
    },
    {
      id: 4,
      airline: "Copa Airlines",
      origin: "QUITO",
      destination: "MANTA",
      departureTime: "08:00",
      arrivalTime: "08:50",
      stops: "Directo",
      price: 300,
      passengers: 1,
      image: "/airplane-morning.jpg",
    },
  ]

  const swapLocations = () => {
    const temp = origin
    setOrigin(destination)
    setDestination(temp)
  }

  const handleSelectFlight = (flight: any) => {
    setSelectedFlight(flight)
  }

  const handleGuardar = () => {
    if (selectedFlight) {
      router.push(`/pago/${selectedFlight.id}`)
    }
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
            {/* Search card */}
            <Card className="p-6 bg-blue-600 text-white">
              <h2 className="text-xl font-bold mb-4">Vuelos</h2>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-white text-sm">Origen</Label>
                  <Select value={origin} onValueChange={setOrigin}>
                    <SelectTrigger className="bg-white text-black">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Quito - Ecuador">Quito - Ecuador</SelectItem>
                      <SelectItem value="Guayaquil - Ecuador">Guayaquil - Ecuador</SelectItem>
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
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Manta - Ecuador">Manta - Ecuador</SelectItem>
                      <SelectItem value="Quito - Ecuador">Quito - Ecuador</SelectItem>
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
                        {date ? format(date, "PPP", { locale: es }) : <span>2025-05-21</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-white text-sm">Número de personas</Label>
                  <Select value={classType} onValueChange={setClassType}>
                    <SelectTrigger className="bg-white text-black">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Persona, Economica">Persona, Economica</SelectItem>
                      <SelectItem value="2 Personas, Economica">2 Personas, Economica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {selectedFlight && (
              <Card className="p-6 bg-white">
                <h3 className="font-bold mb-4">Vuelos</h3>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">
                      <Plane className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm">Copa Airlines</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="text-sm">{passengers} persona</span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">
                      {selectedFlight.origin} {selectedFlight.departureTime}
                    </p>
                    <p className="font-medium">
                      {selectedFlight.destination} {selectedFlight.arrivalTime}
                    </p>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-sm text-gray-600">Subtotal</p>
                    <p className="text-2xl font-bold">
                      <span className="text-sm">USD</span> {selectedFlight.price * passengers}
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
            </div>

            <div className="space-y-4">
              {flights.map((flight) => (
                <Card
                  key={flight.id}
                  className={cn(
                    "p-6 cursor-pointer transition-all hover:shadow-lg",
                    selectedFlight?.id === flight.id && "ring-2 ring-blue-600 bg-blue-50",
                  )}
                  onClick={() => handleSelectFlight(flight)}
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Flight image */}
                    <img
                      src={flight.image || "/placeholder.svg"}
                      alt="Flight"
                      className="w-24 h-16 object-cover rounded"
                    />

                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
                        <Plane className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 mb-1">Copa Airlines</p>
                        <div className="flex items-center gap-6">
                          <div>
                            <p className="font-bold">{flight.origin}</p>
                            <p className="text-sm">{flight.departureTime}</p>
                          </div>
                          <div>
                            <p className="font-bold">{flight.destination}</p>
                            <p className="text-sm">{flight.arrivalTime}</p>
                          </div>
                          <p className="text-sm text-gray-600">{flight.stops}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">USD</p>
                      <p className="text-3xl font-bold">{flight.price}</p>
                      <div className="flex items-center gap-1 text-sm text-gray-600 mt-1">
                        <User className="w-4 h-4" />
                        <span>{flight.passengers} persona</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
