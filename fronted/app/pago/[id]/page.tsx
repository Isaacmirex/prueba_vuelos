"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Plane, Users, HelpCircle, ArrowLeft, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// --- Interfaces ---
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

interface PassengerForm {
  name: string
  lastName: string
  country: string
  documentId: string
  dateOfBirth: string
  gender: string
}

export default function PaymentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { toast } = useToast()
  const [timeLeft, setTimeLeft] = useState(1800) // 30 minutos
  const [currentPassengerIndex, setCurrentPassengerIndex] = useState(0)
  const [showPaymentAnimation, setShowPaymentAnimation] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({})

  const [flightData, setFlightData] = useState<Flight | null>(null)
  const [passengerCount, setPassengerCount] = useState(1)
  const [totalAmount, setTotalAmount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [passengers, setPassengers] = useState<PassengerForm[]>([])
  const [paymentData, setPaymentData] = useState({
    cardNumber: "",
    cardHolder: "",
    expiryDate: "",
    idNumber: "",
    cvv: "",
  })

  // useEffect para cargar datos del vuelo desde sessionStorage
  useEffect(() => {
    const flightSearchData = sessionStorage.getItem("selected_flight")

    if (!flightSearchData) {
      toast({
        title: "Error de reservación",
        description: "No se encontró ningún vuelo seleccionado. Redirigiendo...",
        variant: "destructive",
      })
      router.replace("/vuelos")
      return
    }

    try {
      const parsedData = JSON.parse(flightSearchData)

      if (!parsedData.flight || !parsedData.passengers) {
        throw new Error("Datos de vuelo incompletos")
      }

      const total = parseFloat(parsedData.flight.adult_price) * parsedData.passengers

      setFlightData(parsedData.flight)
      setPassengerCount(parsedData.passengers)
      setTotalAmount(total)

      setPassengers(
        Array.from({ length: parsedData.passengers }, () => ({
          name: "",
          lastName: "",
          country: "",
          documentId: "",
          dateOfBirth: "",
          gender: "",
        })),
      )

      setLoading(false)
    } catch (error) {
      console.error("Error parsing flight data:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del vuelo. Intenta de nuevo.",
        variant: "destructive",
      })
      router.replace("/vuelos")
    }
  }, [router, toast])

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer)
          toast({
            title: "Tiempo agotado",
            description: "Tu sesión ha expirado, por favor selecciona un vuelo de nuevo.",
            variant: "destructive",
          })
          router.push("/vuelos")
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [router, toast])

  // Formato de tiempo MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Manejo de cambios en formulario de pasajeros
  const handlePassengerChange = (index: number, field: string, value: string) => {
    const newPassengers = [...passengers]
    newPassengers[index] = { ...newPassengers[index], [field]: value }
    setPassengers(newPassengers)
    setFieldErrors((prev) => ({ ...prev, [`passenger-${index}-${field}`]: false }))
  }

  // Manejo de cambios en formulario de pago (ejemplo)
  const handlePaymentChange = (field: string, value: string) => {
    if (field === "cardNumber" || field === "cvv") {
      if (value && !/^\d*$/.test(value)) return
    }
    if (field === "expiryDate") {
      let formatted = value.replace(/\D/g, "")
      if (formatted.length >= 2) {
        formatted = formatted.slice(0, 2) + "/" + formatted.slice(2, 4)
      }
      setPaymentData({ ...paymentData, [field]: formatted })
      setFieldErrors((prev) => ({ ...prev, [field]: false }))
      return
    }
    setPaymentData({ ...paymentData, [field]: value })
    setFieldErrors((prev) => ({ ...prev, [field]: false }))
  }

  // Guardar datos del pasajero actual (solo en el estado local)
  const handleSavePassenger = () => {
    const currentPassenger = passengers[currentPassengerIndex]
    const errors: Record<string, boolean> = {}

    Object.entries(currentPassenger).forEach(([key, value]) => {
      if (!value) {
        errors[`passenger-${currentPassengerIndex}-${key}`] = true
      }
    })

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      toast({
        title: "Campos incompletos",
        description: "Por favor completa todos los campos del pasajero",
        variant: "destructive",
      })
      return
    }

    if (currentPassengerIndex < passengers.length - 1) {
      setCurrentPassengerIndex(currentPassengerIndex + 1)
      toast({
        title: "Pasajero guardado",
        description: `Datos del pasajero ${currentPassengerIndex + 1} listos.`,
      })
    } else {
      toast({
        title: "Todos los pasajeros listos",
        description: "Puedes proceder con el pago simulado.",
      })
    }
  }

  // --- handleSubmit SIMULADO (NO GUARDA NADA) ---
  const handleSubmit = async () => {
    const errors: Record<string, boolean> = {}

    // 1. Validar pasajeros
    passengers.forEach((passenger, index) => {
      Object.entries(passenger).forEach(([key, value]) => {
        if (!value) {
          errors[`passenger-${index}-${key}`] = true
        }
      })
    })

    // 2. Validar datos de pago (de ejemplo)
    Object.entries(paymentData).forEach(([key, value]) => {
      if (!value) {
        errors[key] = true
      }
    })

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      toast({
        title: "Campos incompletos",
        description: "Falta llenar algunos campos requeridos en el formulario.",
        variant: "destructive",
      })
      return
    }

    // 3. Iniciar animación de éxito (simulación)
    setShowPaymentAnimation(true)

    // 4. Esperar 3 segundos, mostrar toast y redirigir
    setTimeout(() => {
      setShowPaymentAnimation(false)
      toast({
        title: "¡Reserva Exitosa! (Simulación)",
        description: "Tu vuelo ha sido reservado visualmente.",
      })
      sessionStorage.removeItem("selected_flight") // Limpia la selección
      router.push("/mis-vuelos") // Va a la página de "Mis Vuelos"
    }, 3000) // Simula 3 segundos
  }

  // Pantalla de carga
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
      </div>
    )
  }

  // Renderizado del formulario (JSX)
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Animación */}
      {showPaymentAnimation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-2xl text-center animate-in fade-in zoom-in duration-500">
            <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-4 animate-pulse" />
            <h2 className="text-2xl font-bold mb-2">Procesando...</h2>
            <p className="text-gray-600">Simulando reserva</p>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-8">
        {/* Botón Volver */}
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver
        </Button>

        <h1 className="text-2xl font-bold mb-6">Detalle de pago</h1>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Resumen del Vuelo */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
                    <Plane className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm text-gray-600">{flightData?.airline.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">
                    {passengerCount} persona{passengerCount > 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 items-center mb-4">
                <div>
                  <p className="font-bold text-lg">{flightData?.origin}</p>
                  <p className="text-sm text-gray-600">
                    {flightData && format(parseISO(flightData.departure_datetime), "HH:mm")}
                  </p>
                </div>
                <div className="text-center"><div className="h-px bg-gray-300" /></div>
                <div className="text-right">
                  <p className="font-bold text-lg">{flightData?.destination}</p>
                  <p className="text-sm text-gray-600">
                    {flightData && format(parseISO(flightData.arrival_datetime), "HH:mm")}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-600">Subtotal</p>
                <p className="text-2xl font-bold">
                  <span className="text-sm">USD</span> {totalAmount.toFixed(2)}
                </p>
              </div>
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm font-medium">Tiempo para confirmar</p>
                <p className="text-3xl font-bold">{formatTime(timeLeft)}</p>
              </div>
            </Card>

            {/* Información del Pasajero */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">¿Quién viaja?</h2>
              <div className="flex gap-2 mb-6">
                {passengers.map((_, index) => (
                  <Button
                    key={index}
                    variant={currentPassengerIndex === index ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPassengerIndex(index)}
                    className={currentPassengerIndex === index ? "bg-blue-600" : ""}
                  >
                    Pasajero {index + 1}
                  </Button>
                ))}
              </div>
              <div className="space-y-4">
                <h3 className="font-medium">Pasajero {currentPassengerIndex + 1}</h3>
                {/* Campos del formulario de pasajero... */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Nombre */}
                  <div className="space-y-2">
                    <Label className={fieldErrors[`passenger-${currentPassengerIndex}-name`] ? "text-red-600" : ""}>
                      Nombre {fieldErrors[`passenger-${currentPassengerIndex}-name`] && "*"}
                    </Label>
                    <Input
                      value={passengers[currentPassengerIndex]?.name || ""}
                      onChange={(e) => handlePassengerChange(currentPassengerIndex, "name", e.target.value)}
                      placeholder="Nombre"
                      className={cn(fieldErrors[`passenger-${currentPassengerIndex}-name`] && "border-red-600 focus-visible:ring-red-600")}
                    />
                     {fieldErrors[`passenger-${currentPassengerIndex}-name`] && (<p className="text-xs text-red-600">Campo requerido</p>)}
                  </div>
                  {/* Apellido */}
                   <div className="space-y-2">
                     <Label className={fieldErrors[`passenger-${currentPassengerIndex}-lastName`] ? "text-red-600" : ""}>
                       Apellido {fieldErrors[`passenger-${currentPassengerIndex}-lastName`] && "*"}
                     </Label>
                     <Input
                       value={passengers[currentPassengerIndex]?.lastName || ""}
                       onChange={(e) => handlePassengerChange(currentPassengerIndex, "lastName", e.target.value)}
                       placeholder="Apellido"
                       className={cn(fieldErrors[`passenger-${currentPassengerIndex}-lastName`] && "border-red-600 focus-visible:ring-red-600")}
                     />
                     {fieldErrors[`passenger-${currentPassengerIndex}-lastName`] && (<p className="text-xs text-red-600">Campo requerido</p>)}
                   </div>
                </div>
                 <div className="grid md:grid-cols-2 gap-4">
                   {/* País */}
                    <div className="space-y-2">
                       <Label className={fieldErrors[`passenger-${currentPassengerIndex}-country`] ? "text-red-600" : ""}>
                         País de residencia {fieldErrors[`passenger-${currentPassengerIndex}-country`] && "*"}
                       </Label>
                       <Input
                         value={passengers[currentPassengerIndex]?.country || ""}
                         onChange={(e) => handlePassengerChange(currentPassengerIndex, "country", e.target.value)}
                         placeholder="País"
                         className={cn(fieldErrors[`passenger-${currentPassengerIndex}-country`] && "border-red-600 focus-visible:ring-red-600")}
                       />
                       {fieldErrors[`passenger-${currentPassengerIndex}-country`] && (<p className="text-xs text-red-600">Campo requerido</p>)}
                     </div>
                   {/* Documento */}
                   <div className="space-y-2">
                     <Label className={fieldErrors[`passenger-${currentPassengerIndex}-documentId`] ? "text-red-600" : ""}>
                       Documento de identidad {fieldErrors[`passenger-${currentPassengerIndex}-documentId`] && "*"}
                     </Label>
                     <Input
                       value={passengers[currentPassengerIndex]?.documentId || ""}
                       onChange={(e) => handlePassengerChange(currentPassengerIndex, "documentId", e.target.value)}
                       placeholder="Documento"
                       className={cn(fieldErrors[`passenger-${currentPassengerIndex}-documentId`] && "border-red-600 focus-visible:ring-red-600")}
                     />
                     {fieldErrors[`passenger-${currentPassengerIndex}-documentId`] && (<p className="text-xs text-red-600">Campo requerido</p>)}
                   </div>
                 </div>
                 <div className="grid md:grid-cols-2 gap-4">
                   {/* Fecha Nacimiento */}
                    <div className="space-y-2">
                       <Label className={fieldErrors[`passenger-${currentPassengerIndex}-dateOfBirth`] ? "text-red-600" : ""}>
                         Fecha de nacimiento {fieldErrors[`passenger-${currentPassengerIndex}-dateOfBirth`] && "*"}
                       </Label>
                       <Input
                         type="date"
                         value={passengers[currentPassengerIndex]?.dateOfBirth || ""}
                         onChange={(e) => handlePassengerChange(currentPassengerIndex, "dateOfBirth", e.target.value)}
                         className={cn(fieldErrors[`passenger-${currentPassengerIndex}-dateOfBirth`] && "border-red-600 focus-visible:ring-red-600")}
                       />
                       {fieldErrors[`passenger-${currentPassengerIndex}-dateOfBirth`] && (<p className="text-xs text-red-600">Campo requerido</p>)}
                     </div>
                   {/* Sexo */}
                   <div className="space-y-2">
                     <Label className={fieldErrors[`passenger-${currentPassengerIndex}-gender`] ? "text-red-600" : ""}>
                       Sexo {fieldErrors[`passenger-${currentPassengerIndex}-gender`] && "*"}
                     </Label>
                     <RadioGroup
                       value={passengers[currentPassengerIndex]?.gender || ""}
                       onValueChange={(value) => handlePassengerChange(currentPassengerIndex, "gender", value)}
                       className="flex gap-4 pt-2" // Added padding-top for alignment
                     >
                       <div className="flex items-center space-x-2">
                         <RadioGroupItem value="masculino" id={`masculino-${currentPassengerIndex}`} />
                         <Label htmlFor={`masculino-${currentPassengerIndex}`} className="font-normal cursor-pointer">Masculino</Label>
                       </div>
                       <div className="flex items-center space-x-2">
                         <RadioGroupItem value="femenino" id={`femenino-${currentPassengerIndex}`} />
                         <Label htmlFor={`femenino-${currentPassengerIndex}`} className="font-normal cursor-pointer">Femenino</Label>
                       </div>
                     </RadioGroup>
                     {fieldErrors[`passenger-${currentPassengerIndex}-gender`] && (<p className="text-xs text-red-600">Campo requerido</p>)}
                   </div>
                 </div>
                <Button onClick={handleSavePassenger} className="w-full bg-blue-600 hover:bg-blue-700 mt-4"> {/* Added margin-top */}
                  Guardar pasajero {currentPassengerIndex + 1}
                </Button>
              </div>
            </Card>

            {/* Información de Pago (Ejemplo) */}
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Información de pago (Ejemplo)</h2>
              <div className="space-y-4">
                {/* Campos del formulario de pago... */}
                 <div className="space-y-2">
                   <Label className={fieldErrors.cardNumber ? "text-red-600" : ""}>
                     NÚMERO DE TARJETA {fieldErrors.cardNumber && "*"}
                   </Label>
                   <Input
                     value={paymentData.cardNumber}
                     onChange={(e) => handlePaymentChange("cardNumber", e.target.value)}
                     placeholder="XXXX XXXX XXXX XXXX"
                     maxLength={19} // Allow space for formatting if added later
                     className={cn(fieldErrors.cardNumber && "border-red-600 focus-visible:ring-red-600")}
                   />
                   {fieldErrors.cardNumber && <p className="text-xs text-red-600">Campo requerido</p>}
                 </div>
                 <div className="space-y-2">
                   <Label className={fieldErrors.cardHolder ? "text-red-600" : ""}>
                     TITULAR DE LA TARJETA {fieldErrors.cardHolder && "*"}
                   </Label>
                   <Input
                     value={paymentData.cardHolder}
                     onChange={(e) => handlePaymentChange("cardHolder", e.target.value)}
                     placeholder="Nombre como aparece en la tarjeta"
                     className={cn(fieldErrors.cardHolder && "border-red-600 focus-visible:ring-red-600")}
                   />
                   {fieldErrors.cardHolder && <p className="text-xs text-red-600">Campo requerido</p>}
                 </div>
                 <div className="grid grid-cols-3 gap-4">
                   {/* Vencimiento */}
                   <div className="space-y-2">
                     <Label className={fieldErrors.expiryDate ? "text-red-600" : ""}>
                       VENCIMIENTO {fieldErrors.expiryDate && "*"}
                     </Label>
                     <Input
                       value={paymentData.expiryDate}
                       onChange={(e) => handlePaymentChange("expiryDate", e.target.value)}
                       placeholder="MM/AA"
                       maxLength={5}
                       className={cn(fieldErrors.expiryDate && "border-red-600 focus-visible:ring-red-600")}
                     />
                     {fieldErrors.expiryDate && <p className="text-xs text-red-600">Campo requerido</p>}
                   </div>
                   {/* CVV */}
                   <div className="space-y-2">
                     <Label className={cn("flex items-center gap-1", fieldErrors.cvv && "text-red-600")}>
                       CÓD. SEGURIDAD {fieldErrors.cvv && "*"}
                       <HelpCircle className="w-4 h-4 text-gray-400" />
                     </Label>
                     <Input
                       value={paymentData.cvv}
                       onChange={(e) => handlePaymentChange("cvv", e.target.value)}
                       placeholder="CVV"
                       maxLength={4}
                       type="password"
                       className={cn(fieldErrors.cvv && "border-red-600 focus-visible:ring-red-600")}
                     />
                     {fieldErrors.cvv && <p className="text-xs text-red-600">Campo requerido</p>}
                   </div>
                   {/* Cédula */}
                   <div className="space-y-2">
                     <Label className={fieldErrors.idNumber ? "text-red-600" : ""}>
                       CÉDULA DE IDENTIDAD {fieldErrors.idNumber && "*"}
                     </Label>
                     <Input
                       value={paymentData.idNumber}
                       onChange={(e) => handlePaymentChange("idNumber", e.target.value)}
                       placeholder="Cédula"
                       className={cn(fieldErrors.idNumber && "border-red-600 focus-visible:ring-red-600")}
                     />
                     {fieldErrors.idNumber && <p className="text-xs text-red-600">Campo requerido</p>}
                   </div>
                 </div>
                <Button onClick={handleSubmit} className="w-full bg-black hover:bg-gray-800 text-white h-12 mt-4"> {/* Added margin-top */}
                  Proceder al pago (Simulación)
                </Button>
              </div>
            </Card>
          </div>

          {/* Resumen de Precio */}
          <div>
            <Card className="p-6 sticky top-4">
              <h3 className="font-bold mb-4">Resumen de precio</h3>
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">USD {totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Impuestos</span>
                  <span className="font-medium">USD 0.00</span>
                </div>
                <div className="border-t pt-3 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-xl">USD {totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}