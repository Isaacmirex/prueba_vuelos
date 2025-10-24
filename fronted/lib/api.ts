// API configuration and utilities
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api"

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  username: string
  first_name: string
  last_name: string
  phone: string
  date_of_birth: string
  country: string
  city: string
  password: string
  password_confirm: string
  profile_image?: File
}

export interface User {
  id: number
  email: string
  username: string
  first_name: string
  last_name: string
  phone: string
  date_of_birth: string | null
  age: number | null
  country: string | null
  city: string | null
  profile_image_url: string | null
  is_operator: boolean
  is_staff: boolean
  is_active: boolean
  date_joined: string
  created_at: string
  updated_at: string
}

export interface AuthResponse {
  access: string
  refresh: string
  user: User
}

export interface Airline {
  id: number
  name: string
  code: string
  logo_url: string
  created_at?: string
  updated_at?: string
}

export interface Destination {
  id: number
  name: string
  code: string
  province: string
  is_active: boolean
  image_url: string | null
}

export interface Flight {
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

export interface Reservation {
  id: number
  reservation_code: string
  user: number
  user_username: string
  flight: number
  flight_id: number
  reservation_date: string
  total_passengers: number
  total_amount: string
  status: string
  status_display: string
  created_at: string
  updated_at: string
}

export interface ReservationPassenger {
  id: number
  full_name: string
  reservation: number
  reservation_code: string
  passenger_type: string
  passenger_category: string
  seat_number: string
  created_at: string
}

export interface FlightRequest {
  id: number
  user_username: string
  destination: Destination
  origin: Destination
  travel_date: string
  status: string
  companions: number
  created_at: string
}

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface CreateFlightData {
  flight_code: string
  airline: number
  origin: string
  destination: string
  departure_datetime: string
  arrival_datetime: string
  adult_price: string
  available_seats: number
  status?: string
}

export interface CreateDestinationData {
  name: string
  code: string
  province: string
  image_url?: string
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  private getAuthHeader(): HeadersInit {
    const token = localStorage.getItem("access_token")
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await fetch(`${this.baseUrl}/auth/login/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || error.message || "Login failed")
    }

    const data = await response.json()

    // Store JWT tokens and user data
    if (data.access) {
      localStorage.setItem("access_token", data.access)
    }
    if (data.refresh) {
      localStorage.setItem("refresh_token", data.refresh)
    }
    if (data.user) {
      localStorage.setItem("user", JSON.stringify(data.user))
    }

    return data
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const formData = new FormData()
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null && key !== "password_confirm") {
        formData.append(key, value)
      }
    })

    const response = await fetch(`${this.baseUrl}/users/`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Registration failed")
    }

    const responseData = await response.json()

    // Store user data after successful registration
    localStorage.setItem("user", JSON.stringify(responseData))

    return {
      access: "",
      refresh: "",
      user: responseData,
    }
  }

  async getUsers(): Promise<User[]> {
    const response = await fetch(`${this.baseUrl}/users/`, {
      headers: {
        ...this.getAuthHeader(),
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch users")
    }

    const data = await response.json()
    return data.results || data
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const response = await fetch(`${this.baseUrl}/users/${id}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeader(),
      },
      body: JSON.stringify(userData),
    })

    if (!response.ok) {
      throw new Error("Failed to update user")
    }

    return await response.json()
  }

  async getFlights(): Promise<Flight[]> {
    const response = await fetch(`${this.baseUrl}/flights/`, {
      headers: {
        ...this.getAuthHeader(),
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch flights")
    }

    const data: PaginatedResponse<Flight> = await response.json()
    return data.results
  }

  async getReservations(): Promise<Reservation[]> {
    const response = await fetch(`${this.baseUrl}/reservations/`, {
      headers: {
        ...this.getAuthHeader(),
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch reservations")
    }

    const data: PaginatedResponse<Reservation> = await response.json()
    return data.results
  }

  async getReservationPassengers(reservationId?: number): Promise<ReservationPassenger[]> {
    const url = reservationId
      ? `${this.baseUrl}/reservation-passengers/?reservation=${reservationId}`
      : `${this.baseUrl}/reservation-passengers/`

    const response = await fetch(url, {
      headers: {
        ...this.getAuthHeader(),
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch reservation passengers")
    }

    const data: PaginatedResponse<ReservationPassenger> = await response.json()
    return data.results
  }

  async getFlightRequests(): Promise<FlightRequest[]> {
    const response = await fetch(`${this.baseUrl}/flight-requests/`, {
      headers: {
        ...this.getAuthHeader(),
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch flight requests")
    }

    const data: PaginatedResponse<FlightRequest> = await response.json()
    return data.results
  }

  async updateFlightRequestStatus(id: number, status: string): Promise<FlightRequest> {
    const response = await fetch(`${this.baseUrl}/flight-requests/${id}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeader(),
      },
      body: JSON.stringify({ status }),
    })

    if (!response.ok) {
      throw new Error("Failed to update flight request")
    }

    return await response.json()
  }

  async getDestinations(): Promise<Destination[]> {
    const response = await fetch(`${this.baseUrl}/destinations/`, {
      headers: {
        ...this.getAuthHeader(),
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch destinations")
    }

    const data: PaginatedResponse<Destination> = await response.json()
    return data.results
  }

  async getAirlines(): Promise<Airline[]> {
    const response = await fetch(`${this.baseUrl}/airlines/`, {
      headers: {
        ...this.getAuthHeader(),
      },
    })

    if (!response.ok) {
      throw new Error("Failed to fetch airlines")
    }

    const data: PaginatedResponse<Airline> = await response.json()
    return data.results
  }

  async createDestination(destination: CreateDestinationData): Promise<Destination> {
    const response = await fetch(`${this.baseUrl}/destinations/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeader(),
      },
      body: JSON.stringify(destination),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to create destination")
    }

    return await response.json()
  }

  async updateDestination(id: number, destination: Partial<Destination>): Promise<Destination> {
    const response = await fetch(`${this.baseUrl}/destinations/${id}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeader(),
      },
      body: JSON.stringify(destination),
    })

    if (!response.ok) {
      throw new Error("Failed to update destination")
    }

    return await response.json()
  }

  async createFlight(flightData: CreateFlightData): Promise<Flight> {
    const response = await fetch(`${this.baseUrl}/flights/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeader(),
      },
      body: JSON.stringify(flightData),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Failed to create flight")
    }

    return await response.json()
  }

  async updateFlight(id: number, flightData: Partial<CreateFlightData>): Promise<Flight> {
    const response = await fetch(`${this.baseUrl}/flights/${id}/`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...this.getAuthHeader(),
      },
      body: JSON.stringify(flightData),
    })

    if (!response.ok) {
      throw new Error("Failed to update flight")
    }

    return await response.json()
  }

  logout() {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("user")
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem("user")
    return userStr ? JSON.parse(userStr) : null
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem("access_token")
  }
}

export const api = new ApiClient(API_BASE_URL)
