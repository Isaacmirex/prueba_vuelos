"use client"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Plane, Users } from "lucide-react"

interface Flight {
  id: number
  airline: string
  origin: string
  destination: string
  date: string
  time: string
  stops: number
  price: number
  passengers: number
}

export default function SearchFlightsPage() {
  const router = useRouter()

  // Mock flight data - will be replaced with API
  const flights: Flight[] = [
    {
      id: 1,
      airline: "Copa Airlines",
      origin: "Quito - Ecuador",
      destination: "Manta - Ecuador",
      date: "22/10/2025",
      time: "18:10 - 18:50",
      stops: 1,
      price: 230,
      passengers: 1,
    },
    {
      id: 2,
      airline: "Copa Airlines",
      origin: "Quito - Ecuador",
      destination: "Manta - Ecuador",
      date: "22/10/2025",
      time: "18:10 - 18:50",
      stops: 1,
      price: 230,
      passengers: 1,
    },
    {
      id: 3,
      airline: "Copa Airlines",
      origin: "Quito - Ecuador",
      destination: "Manta - Ecuador",
      date: "22/10/2025",
      time: "18:10 - 18:50",
      stops: 1,
      price: 230,
      passengers: 1,
    },
    {
      id: 4,
      airline: "Copa Airlines",
      origin: "Quito - Ecuador",
      destination: "Manta - Ecuador",
      date: "22/10/2025",
      time: "18:10 - 18:50",
      stops: 1,
      price: 230,
      passengers: 1,
    },
  ]

  const handleSelectFlight = (flightId: number) => {
    router.push(`/pago/${flightId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Plane className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Seleccionar vuelo</h1>
        </div>

        <div className="grid gap-4">
          {flights.map((flight) => (
            <Card key={flight.id} className="p-6 bg-white hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
                      <Plane className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-sm text-gray-600">{flight.airline}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 items-center">
                    <div>
                      <p className="font-bold text-lg">{flight.origin.split(" - ")[0]}</p>
                      <p className="text-sm text-gray-600">{flight.time.split(" - ")[0]}</p>
                    </div>

                    <div className="text-center">
                      <p className="text-sm text-gray-600">{flight.stops} escala</p>
                      <div className="h-px bg-gray-300 my-1" />
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-lg">{flight.destination.split(" - ")[0]}</p>
                      <p className="text-sm text-gray-600">{flight.time.split(" - ")[1]}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6 ml-8">
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      <Users className="w-4 h-4 inline mr-1" />
                      {flight.passengers} persona
                    </p>
                    <p className="text-2xl font-bold">
                      USD <span className="text-3xl">{flight.price}</span>
                    </p>
                  </div>

                  <Button
                    onClick={() => handleSelectFlight(flight.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6"
                  >
                    Reservar →
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  )
}
