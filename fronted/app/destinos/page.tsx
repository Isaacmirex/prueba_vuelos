"use client"

import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plane } from "lucide-react"

interface Destination {
  id: number
  airline: string
  origin: string
  destination: string
  date: string
  time: string
  price: number
  label: string
  image: string
  city: string
}

export default function DestinationsPage() {
  const destinations: Destination[] = [
    {
      id: 1,
      airline: "Copa Airlines",
      origin: "Quito",
      destination: "Manta",
      date: "22/10/2025",
      time: "HORA: 17:30:00",
      price: 245,
      label: "Directo",
      image: "/quito-city.jpg",
      city: "Quito",
    },
    {
      id: 2,
      airline: "Copa Airlines",
      origin: "Guayaquil",
      destination: "Cuenca",
      date: "23/10/2025",
      time: "HORA: 14:20:00",
      price: 189,
      label: "Directo",
      image: "/guayaquil-city.jpg",
      city: "Guayaquil",
    },
    {
      id: 3,
      airline: "Copa Airlines",
      origin: "Quito",
      destination: "Galápagos",
      date: "24/10/2025",
      time: "HORA: 09:15:00",
      price: 420,
      label: "Directo",
      image: "/galapagos.jpg",
      city: "Galápagos",
    },
    {
      id: 4,
      airline: "Copa Airlines",
      origin: "Cuenca",
      destination: "Quito",
      date: "25/10/2025",
      time: "HORA: 16:45:00",
      price: 195,
      label: "Directo",
      image: "/cuenca-city.jpg",
      city: "Cuenca",
    },
    {
      id: 5,
      airline: "Copa Airlines",
      origin: "Manta",
      destination: "Guayaquil",
      date: "26/10/2025",
      time: "HORA: 11:30:00",
      price: 165,
      label: "Directo",
      image: "/manta-beach.jpg",
      city: "Manta",
    },
    {
      id: 6,
      airline: "Copa Airlines",
      origin: "Quito",
      destination: "Loja",
      date: "27/10/2025",
      time: "HORA: 13:00:00",
      price: 210,
      label: "Directo",
      image: "/loja-city.jpg",
      city: "Loja",
    },
    {
      id: 7,
      airline: "Copa Airlines",
      origin: "Guayaquil",
      destination: "Quito",
      date: "28/10/2025",
      time: "HORA: 18:20:00",
      price: 230,
      label: "Directo",
      image: "/quito-night.jpg",
      city: "Quito",
    },
    {
      id: 8,
      airline: "Copa Airlines",
      origin: "Quito",
      destination: "Esmeraldas",
      date: "29/10/2025",
      time: "HORA: 10:45:00",
      price: 175,
      label: "Directo",
      image: "/esmeraldas-beach.jpg",
      city: "Esmeraldas",
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Destinos</h1>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {destinations.map((dest) => (
            <Card key={dest.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <div className="absolute top-2 right-2 bg-black text-white px-3 py-1 rounded text-sm font-medium z-10">
                  {dest.label}
                </div>
                <div className="h-32 relative">
                  <img src={dest.image || "/placeholder.svg"} alt={dest.city} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                    <Plane className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs text-gray-600">{dest.airline}</span>
                </div>

                <div className="space-y-1 mb-3">
                  <p className="text-sm">
                    <span className="font-medium">{dest.origin}</span> -{" "}
                    <span className="font-medium">{dest.destination}</span>
                  </p>
                  <p className="text-xs text-gray-600">FECHA: {dest.date}</p>
                  <p className="text-xs text-gray-600">{dest.time}</p>
                  <p className="text-xs text-gray-600">Precio especial por temporada por persona desde</p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm">USD</span>
                    <span className="text-2xl font-bold ml-1">{dest.price}</span>
                  </div>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">Reservar →</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button variant="ghost" size="icon">
            ←
          </Button>
          <span className="text-sm">1, 2, 3</span>
          <Button variant="ghost" size="icon">
            →
          </Button>
        </div>
      </main>
    </div>
  )
}
