import { request } from "./client";
import type {
  ApiEnvelope,
  Basket,
  BasketRental,
  BasketRentalItem,
  BasketRentalSummary,
  ColdBoxLog,
  Course,
  CourseModule,
  CoolingHub,
  CoolingUnit,
  Enrollment,
  Organization,
  Payment,
  Role,
  TelemetryReading,
  TelemetrySummary,
  User,
} from "./types";

export const AuthApi = {
  login: (email: string, password: string) =>
    request<ApiEnvelope<{ user: User; token: string }>>("/auth/login", {
      method: "POST",
      body: { email, password },
    }),
  me: () => request<ApiEnvelope<User>>("/auth/me"),
};

export const UsersApi = {
  list: (query?: { role?: Role }) => request<ApiEnvelope<User[]>>("/users", { query }),
  update: (id: string, body: Partial<Pick<User, "role" | "isActive" | "name">>) =>
    request<ApiEnvelope<User>>(`/users/${id}`, { method: "PATCH", body }),
  remove: (id: string) => request<void>(`/users/${id}`, { method: "DELETE" }),
};

export const OrganizationsApi = {
  list: () => request<ApiEnvelope<Organization[]>>("/organizations"),
  create: (body: Partial<Organization>) =>
    request<ApiEnvelope<Organization>>("/organizations", { method: "POST", body }),
};

export const CoolingHubsApi = {
  list: () => request<ApiEnvelope<CoolingHub[]>>("/cooling-hubs"),
  create: (body: Partial<CoolingHub>) =>
    request<ApiEnvelope<CoolingHub>>("/cooling-hubs", { method: "POST", body }),
};

export const CoolingUnitsApi = {
  list: (query?: { hub?: string }) => request<ApiEnvelope<CoolingUnit[]>>("/cooling-units", { query }),
  create: (body: Partial<CoolingUnit>) =>
    request<ApiEnvelope<CoolingUnit>>("/cooling-units", { method: "POST", body }),
  rotateDeviceKey: (id: string) =>
    request<ApiEnvelope<{ deviceKey: string }>>(`/cooling-units/${id}/rotate-device-key`, {
      method: "PATCH",
    }),
};

export const ColdBoxLogsApi = {
  list: (query?: { unit?: string; eventType?: string }) =>
    request<ApiEnvelope<ColdBoxLog[]>>("/cold-box-logs", { query }),
  create: (body: Partial<ColdBoxLog> & { unit: string }) =>
    request<ApiEnvelope<ColdBoxLog>>("/cold-box-logs", { method: "POST", body }),
};

export const BasketsApi = {
  list: (query?: { unit?: string; status?: string }) =>
    request<ApiEnvelope<Basket[]>>("/baskets", { query }),
  create: (body: { unit: string; basketNumber: number; capacityKg?: number }) =>
    request<ApiEnvelope<Basket>>("/baskets", { method: "POST", body }),
};

export const BasketRentalsApi = {
  list: (query?: { basket?: string; renter?: string; status?: string }) =>
    request<ApiEnvelope<BasketRental[]>>("/basket-rentals", { query }),
  create: (body: { basket: string; items: BasketRentalItem[]; notes?: string }) =>
    request<ApiEnvelope<BasketRental>>("/basket-rentals", { method: "POST", body }),
  close: (id: string) =>
    request<ApiEnvelope<BasketRental>>(`/basket-rentals/${id}/close`, { method: "PATCH" }),
  summary: (days = 30) =>
    request<ApiEnvelope<BasketRentalSummary>>("/basket-rentals/summary", { query: { days } }),
};

export const PaymentsApi = {
  list: (query?: { rental?: string }) => request<ApiEnvelope<Payment[]>>("/payments", { query }),
  create: (body: { rental: string; amountKobo: number; method: Payment["method"]; reference?: string }) =>
    request<ApiEnvelope<Payment>>("/payments", { method: "POST", body }),
};

export const TelemetryApi = {
  list: (query?: { unit?: string }) => request<ApiEnvelope<TelemetryReading[]>>("/telemetry", { query }),
  latest: (unit: string) => request<ApiEnvelope<TelemetryReading | null>>("/telemetry/latest", { query: { unit } }),
  summary: (unit: string, hours = 24) =>
    request<ApiEnvelope<TelemetrySummary>>("/telemetry/summary", { query: { unit, hours } }),
  /** Simulates a device push using its device key — for testing without real hardware. */
  simulate: (unit: string, deviceKey: string, temperatureC: number, batteryPercent?: number) =>
    request<ApiEnvelope<TelemetryReading>>("/telemetry", {
      method: "POST",
      body: { unit, temperatureC, batteryPercent, source: "sensor" },
      headers: { "x-device-key": deviceKey },
    }),
};

export const CoursesApi = {
  list: () => request<ApiEnvelope<Course[]>>("/courses"),
  create: (body: Partial<Course>) => request<ApiEnvelope<Course>>("/courses", { method: "POST", body }),
};

export const ModulesApi = {
  list: (query?: { course?: string }) => request<ApiEnvelope<CourseModule[]>>("/modules", { query }),
  create: (body: { course: string; title: string; content: string; order?: number }) =>
    request<ApiEnvelope<CourseModule>>("/modules", { method: "POST", body }),
};

export const EnrollmentsApi = {
  list: (query?: { learner?: string; course?: string }) =>
    request<ApiEnvelope<Enrollment[]>>("/enrollments", { query }),
  create: (course: string) => request<ApiEnvelope<Enrollment>>("/enrollments", { method: "POST", body: { course } }),
  completeModule: (id: string, moduleId: string) =>
    request<ApiEnvelope<Enrollment>>(`/enrollments/${id}/complete-module`, {
      method: "PATCH",
      body: { moduleId },
    }),
};
