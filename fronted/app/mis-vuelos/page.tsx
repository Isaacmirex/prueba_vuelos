"use client"

import { useState, useEffect, useMemo } from "react"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plane, Users, ChevronLeft, ChevronRight } from "lucide-react"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

// --- Interfaces ---
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
  user_username: string
  destination: ApiFlightRequestDestination | null
  origin: ApiFlightRequestDestination | null
  travel_date: string
  status: string
  companions: number
  created_at: string
}

interface ProcessedFlightRequest {
  id: number
  airline: string
  origin: string
  destination: string
  date: string
  time: string
  passengers: number
  verificationCode: string
  status: string
}

interface PaginatedApiResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// --- Component ---
export default function MyFlightsPage() {
    const [activeTab, setActiveTab] = useState<"pending" | "confirmed">("pending");
    const [loading, setLoading] = useState(true);
    const [flightRequests, setFlightRequests] = useState<ApiFlightRequest[]>([]);
    const [processedRequests, setProcessedRequests] = useState<ProcessedFlightRequest[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const flightsPerPage = 5;

    // --- Helper Functions ---
    const getBadgeClass = (status: string) => {
        switch ((status || "").toUpperCase()) {
          case "CONFIRMED": case "APPROVED": return "bg-green-600 hover:bg-green-700 text-white";
          case "CANCELLED": case "REJECTED": return "bg-red-600 hover:bg-red-700 text-white";
          case "PENDING": return "bg-yellow-500 hover:bg-yellow-600 text-black";
          default: return "bg-gray-500 hover:bg-gray-600 text-white";
        }
    };
    const getStatusDisplay = (status: string) => {
        switch ((status || "").toUpperCase()) {
            case "CONFIRMED": return "Confirmado";
            case "APPROVED": return "Aprobado";
            case "CANCELLED": return "Cancelado";
            case "REJECTED": return "Rechazado";
            case "PENDING": return "Pendiente";
            default: return status || "Desconocido";
        }
    };
    // --- End Helpers ---

    // 1. Load data
    useEffect(() => {
        let isMounted = true;
        const token = localStorage.getItem("token");
        if (!token) { console.error("Auth Error: No token."); if (isMounted) setLoading(false); return; }

        const fetchAllPaginated = async <T,>(url: string): Promise<T[]> => {
            let items: T[] = []; let nextUrl: string | null = url;
            while (nextUrl && isMounted) {
                try {
                    const res: Response = await fetch(nextUrl, { headers: { Authorization: `Bearer ${token}` } });
                    if (!res.ok) { const txt = await res.text(); throw new Error(`API Error ${res.status}: ${txt || res.statusText}`); }
                    const data = await res.json() as PaginatedApiResponse<T>;
                    items = items.concat(data.results || []); nextUrl = data.next;
                } catch (error) { console.error(`Fetch error:`, error); nextUrl = null; }
            } return items;
        };

        const loadFlightRequests = async () => {
            console.log("Effect 1: Starting fetch...");
            try {
                const requestData = await fetchAllPaginated<ApiFlightRequest>("http://127.0.0.1:8000/api/flight-requests/");
                if (isMounted) { console.log("Effect 1: Fetched Raw Data:", requestData); setFlightRequests(requestData); }
            } catch (error) { console.error("Effect 1: Failed load:", error); if (isMounted) setLoading(false); }
        };
        loadFlightRequests();
        return () => { isMounted = false; };
    }, []);

  
    // 2. Procesar los datos CUANDO flightRequests CAMBIE
  useEffect(() => {
    // This effect runs *only* when flightRequests state updates.
    console.log("Effect 2: Triggered. flightRequests length:", flightRequests.length);

    // If fetch finished and returned empty array
    if (flightRequests.length === 0) {
      console.log("Effect 2: Raw request list is empty, clearing processed list and stopping loading.");
      setProcessedRequests([]); // Clear processed data
      setLoading(false);      // Explicitly stop loading here if empty
      return; // Nothing to process
    }

    console.log("Effect 2: Processing raw data for UI...");
    try { // Add try...catch around processing just in case
        const processed = flightRequests.map((req): ProcessedFlightRequest => {
            let formattedDate = req.travel_date;
            try {
                // Try parsing as ISO first (more robust)
                formattedDate = format(parseISO(req.travel_date), "dd/MM/yyyy", { locale: es });
            } catch (e) {
                // Fallback for simple "YYYY-MM-DD"
                const parts = req.travel_date.split('-');
                if (parts.length === 3) {
                    formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                } else {
                    console.warn(`Could not format date: ${req.travel_date}`);
                    formattedDate = req.travel_date; // Use original if split fails
                }
            }
            return {
                id: req.id,
                airline: "Solicitud Vuelo", // Placeholder
                origin: req.origin?.name || "N/A", // Safer access
                destination: req.destination?.name || "N/A", // Safer access
                date: formattedDate,
                time: "--:--", // No time in API
                passengers: (req.companions ?? 0) + 1, // Safer calculation with nullish coalescing
                verificationCode: `REQ-${req.id}`, // Use request ID
                status: req.status || "UNKNOWN", // Default status
            };
        });

        console.log("Effect 2: Processed Data for UI:", processed);
        setProcessedRequests(processed);

    } catch (error) {
        console.error("Effect 2: Error during processing:", error);
        setProcessedRequests([]); // Clear processed data on error
    } finally {
        console.log("Effect 2: Setting loading false AFTER processing attempt.");
        setLoading(false); // Set loading false HERE, after processing completes or fails
    }


  // Depend ONLY on flightRequests. When the fetch updates this, the effect runs.
  }, [flightRequests]);
    // 3. Reset page on tab change
    useEffect(() => { setCurrentPage(1); }, [activeTab]);

    // 4. Filter
    const filteredFlights = useMemo(() => {
        const upperCaseStatus = (status: string) => (status || "").toUpperCase();
        let result: ProcessedFlightRequest[] = [];
        if (activeTab === "pending") { result = processedRequests.filter(r => upperCaseStatus(r.status) === "PENDING"); }
        else { result = processedRequests.filter(r => upperCaseStatus(r.status) !== "PENDING"); }
        console.log(`Memo: Filtered for tab '${activeTab}': ${result.length}`);
        return result;
    }, [activeTab, processedRequests]);

    // 5. Pagination Logic
    const indexOfLastFlight = currentPage * flightsPerPage;
    const indexOfFirstFlight = indexOfLastFlight - flightsPerPage;
    const currentFlights = filteredFlights.slice(indexOfFirstFlight, indexOfLastFlight);
    const totalPages = Math.ceil(filteredFlights.length / flightsPerPage);
    const paginate = (pageNumber: number) => { if (pageNumber >= 1 && pageNumber <= totalPages) { setCurrentPage(pageNumber); } };

    // --- JSX Rendering ---
    return (
        <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="container mx-auto px-4 py-8">
                {/* ... Title and Tabs ... */}
                <h1 className="text-2xl font-bold mb-6">Mis solicitudes de vuelo</h1>
                 <div className="flex gap-4 mb-6 border-b pb-2">
                    <Button variant="ghost" onClick={() => setActiveTab("pending")} className={cn("pb-2 rounded-none", activeTab === "pending" ? "border-b-2 border-black text-black font-semibold" : "text-gray-500 hover:text-black")}>Pendientes</Button>
                    <Button variant="ghost" onClick={() => setActiveTab("confirmed")} className={cn("pb-2 rounded-none", activeTab === "confirmed" ? "border-b-2 border-black text-black font-semibold" : "text-gray-500 hover:text-black")}>Historial</Button>
                 </div>


                {/* Loading */}
                {loading && ( <div className="flex justify-center items-center py-20"> {/* ... spinner ... */} </div> )}

                {/* No Results */}
                {!loading && filteredFlights.length === 0 && ( <Card className="p-12 text-center border-dashed"> {/* ... no results message ... */} </Card> )}

                {/* Flight List */}
                {!loading && currentFlights.length > 0 && (
                    <div className="space-y-4">
                        {currentFlights.map((request) => (
                            <Card key={request.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <div className="p-6"> <div className="grid lg:grid-cols-3 gap-6 items-center">
                                    {/* Col 1: Info */}
                                    <div className="lg:col-span-1">
                                        <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 bg-blue-100 text-blue-700 rounded flex items-center justify-center ring-1 ring-blue-200"><Plane className="w-5 h-5" /></div><span className="text-sm font-medium text-gray-800">{request.airline}</span></div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-gray-600"><Users className="w-4 h-4" /><span className="text-sm">{request.passengers} pasajero{request.passengers > 1 ? 's' : ''}</span></div>
                                            <div className="grid grid-cols-[1fr,auto,1fr] gap-2 items-center text-sm">
                                                <div className="text-left"><p className="font-semibold text-gray-800">{request.origin}</p></div>
                                                <Plane className="w-4 h-4 text-gray-400 transform rotate-90" />
                                                <div className="text-right"><p className="font-semibold text-gray-800">{request.destination}</p></div>
                                            </div>
                                            <div><p className="text-xs text-gray-500 mt-1">Fecha solicitada</p><p className="font-medium text-gray-800">{request.date}</p></div>
                                        </div>
                                    </div>
                                    {/* Col 2: Code */}
                                    <div className="lg:col-span-1 flex flex-col items-center justify-center text-center border-l border-r border-gray-100 px-4 py-4 lg:py-0">
                                        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Código Solicitud</p>
                                        <p className="text-2xl font-semibold text-gray-800 tracking-wider break-all">{request.verificationCode}</p>
                                    </div>
                                    {/* Col 3: Status */}
                                    <div className="lg:col-span-1 flex flex-col items-center lg:items-end justify-center text-center lg:text-right">
                                        <div className="space-y-2 inline-block lg:block text-left lg:text-right">
                                            <div><p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">Estado</p><Badge variant="default" className={cn("text-sm px-3 py-1 font-medium", getBadgeClass(request.status))}>{getStatusDisplay(request.status)}</Badge></div>
                                        </div>
                                    </div>
                                </div> </div>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Pagination */}
                {!loading && totalPages > 1 && ( <div className="flex items-center justify-center gap-2 mt-8"> {/* ... pagination buttons ... */} </div> )}
            </main>
        </div>
    )
}

// --- DUPLICATED HELPERS (Remove if defined inside component) ---
// const getBadgeClass = (status: string) => { /* ... */ };
// const getStatusDisplay = (status: string) => { /* ... */ };
// --- END HELPERS ---