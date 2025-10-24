"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plane } from "lucide-react"

// Tipos
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

interface ApiResponse {
  count: number
  next: string | null
  previous: string | null
  results: Flight[]
}

const API_URL = "http://127.0.0.1:8000/api/flights/"

function formatDateTime(dt: string) {
  const d = new Date(dt)
  // Devuelve formato: DD/MM/YYYY H:MM
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getFullYear()} ${d.getHours().toString().padStart(2,"0")}:${d.getMinutes().toString().padStart(2,"0")}`
}

export default function DestinationsPage() {
  const [flights, setFlights] = useState<Flight[]>([])
  const [next, setNext] = useState<string | null>(null)
  const [previous, setPrevious] = useState<string | null>(null)
  const [count, setCount] = useState<number>(0)
  const [page, setPage] = useState<number>(1)

  async function fetchFlights(url = API_URL) {
    const res = await fetch(url)
    const data: ApiResponse = await res.json()
    setFlights(data.results)
    setNext(data.next)
    setPrevious(data.previous)
    setCount(data.count)
  }

  useEffect(() => {
    fetchFlights()
  }, [])

  function handlePagination(url: string|null, dir: "next"|"previous") {
    if(!url) return
    fetchFlights(url)
    setPage((p)=>dir==="next"?p+1:p-1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Vuelos</h1>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {flights.map((f) => (
            <Card key={f.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative">
                <div className="absolute top-2 right-2 bg-black text-white px-3 py-1 rounded text-sm font-medium z-10">
                  {f.status}
                </div>
                <div className="h-32 relative flex items-center justify-center bg-gray-200">
                  <img src={"data:image/png;base64,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"} alt={f.airline.name} className="max-h-24 max-w-full object-contain" />
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
                    <Plane className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-xs text-gray-600">{f.airline.name}</span>
                  <span className="text-xs text-gray-500 ml-2 font-mono">{f.flight_code}</span>
                </div>
                <div className="space-y-1 mb-3">
                  <p className="text-sm">
                    <span className="font-medium">{f.origin}</span> -{" "}
                    <span className="font-medium">{f.destination}</span>
                  </p>
                  <p className="text-xs text-gray-600">Salida: {formatDateTime(f.departure_datetime)}</p>
                  <p className="text-xs text-gray-600">Llegada: {formatDateTime(f.arrival_datetime)}</p>
                  <p className="text-xs text-gray-600">Duración: {f.duration_minutes} min</p>
                  <p className="text-xs text-gray-600">Asientos disponibles: {f.available_seats}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm">USD</span>
                    <span className="text-2xl font-bold ml-1">{parseFloat(f.adult_price).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        {/* Paginación bonita */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handlePagination(previous, "previous")}
            disabled={!previous}
          >
            ←
          </Button>
          <span className="text-sm">{`Página ${page} / ${Math.ceil(count/10)}`}</span>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => handlePagination(next, "next")}
            disabled={!next}
          >
            →
          </Button>
        </div>
      </main>
    </div>
  )
}
