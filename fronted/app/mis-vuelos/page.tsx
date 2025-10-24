"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plane, Users } from "lucide-react"

interface Flight {
  id: number
  airline: string
  origin: string
  destination: string
  date: string
  time: string
  passengers: number
  verificationCode: string
  status: "Activo" | "Cancelado"
  statusDetail: string
  passengerIcons: number
}

export default function MyFlightsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "confirmed">("pending")

  // Mock flight data
  const flights: Flight[] = [
    {
      id: 1,
      airline: "Copa Airlines",
      origin: "QUITO",
      destination: "MANTA",
      date: "22/10/2025",
      time: "18:10 - 18:50",
      passengers: 2,
      verificationCode: "1748754654254",
      status: "Activo",
      statusDetail: "El encargado validó el pago en el sistema",
      passengerIcons: 2,
    },
    {
      id: 2,
      airline: "Copa Airlines",
      origin: "QUITO",
      destination: "MANTA",
      date: "21/10/2025",
      time: "18:10 - 18:50",
      passengers: 2,
      verificationCode: "3423423412212",
      status: "Cancelado",
      statusDetail: "Sin asistencia",
      passengerIcons: 2,
    },
    {
      id: 3,
      airline: "Copa Airlines",
      origin: "QUITO",
      destination: "MANTA",
      date: "21/10/2025",
      time: "18:10 - 18:50",
      passengers: 2,
      verificationCode: "56532131231232",
      status: "Cancelado",
      statusDetail: "Sin asistencia",
      passengerIcons: 2,
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Mis vuelos</h1>

        <div className="flex gap-4 mb-6">
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

        {/* Flights List */}
        <div className="space-y-4">
          {flights.map((flight) => (
            <Card key={flight.id} className="overflow-hidden">
              <div className="p-6">
                <div className="grid lg:grid-cols-3 gap-6">
                  {/* Flight Info */}
                  <div className="lg:col-span-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
                        <Plane className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-sm text-gray-600">{flight.airline}</span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-600" />
                        <span className="text-sm">{flight.passengers} persona</span>
                        <div className="flex gap-1 ml-2">
                          {Array.from({ length: flight.passengerIcons }).map((_, i) => (
                            <Users key={i} className="w-4 h-4 text-gray-400" />
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 items-center">
                        <div>
                          <p className="font-bold">{flight.origin}</p>
                          <p className="text-sm text-gray-600">{flight.time.split(" - ")[0]}</p>
                        </div>
                        <div className="text-center">
                          <div className="h-px bg-gray-300" />
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{flight.destination}</p>
                          <p className="text-sm text-gray-600">{flight.time.split(" - ")[1]}</p>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600">Fecha para del vuelo</p>
                      <p className="font-bold">{flight.date}</p>
                    </div>
                  </div>

                  {/* Verification Code */}
                  <div className="lg:col-span-1 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 mb-2">Código de verificación</p>
                      <p className="text-3xl font-bold tracking-wider">{flight.verificationCode}</p>
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">Estado</p>
                        <Badge
                          variant={flight.status === "Activo" ? "default" : "destructive"}
                          className={`text-lg px-4 py-1 ${flight.status === "Activo" ? "bg-green-600" : "bg-red-600 text-white"}`}
                        >
                          {flight.status}
                        </Badge>
                      </div>

                      <div className="mt-4">
                        <p className="text-sm font-medium mb-2">Detalle</p>
                        <div className="p-3 bg-gray-50 rounded border">
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
