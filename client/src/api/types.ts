export type Role = "admin" | "staff" | "farmer" | "market_woman" | "trader" | "learner";

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  pagination?: { page: number; limit: number; total: number; pages: number };
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  organization?: Organization | string;
  location?: { community?: string; state?: string; country?: string };
  isActive: boolean;
  createdAt: string;
}

export interface Organization {
  _id: string;
  name: string;
  type: "cooperative" | "community_group" | "training_center" | "market_association" | "ngo";
  community?: string;
  state?: string;
  contactPerson?: User | string;
  memberCount: number;
}

export interface CoolingHub {
  _id: string;
  name: string;
  organization?: Organization | string;
  community: string;
  state: string;
  energySource: "solar" | "solar_hybrid" | "grid" | "generator";
  status: "operational" | "maintenance" | "offline";
  managedBy?: User | string;
}

export type CoolingUnitType =
  | "cold_room"
  | "evaporative_cooler"
  | "solar_fridge"
  | "freezer"
  | "mobile_trailer";

export interface CoolingUnit {
  _id: string;
  hub: CoolingHub | string;
  unitCode: string;
  type: CoolingUnitType;
  capacityKg: number;
  basketCapacity?: number;
  currentTemperatureC?: number;
  status: "active" | "maintenance" | "decommissioned";
  deviceKey?: string; // only present right after create/rotate
}

export interface ColdBoxLog {
  _id: string;
  unit: CoolingUnit | string;
  eventType: "load" | "unload";
  produceType: string;
  quantityKg: number;
  crateSizeKg?: 15 | 25;
  doorOpenSeconds?: number;
  occurredAt: string;
  loggedBy?: User | string;
  comments?: string;
}

export interface Basket {
  _id: string;
  unit: CoolingUnit | string;
  basketNumber: number;
  status: "available" | "occupied" | "maintenance";
  capacityKg?: number;
}

export interface BasketRentalItem {
  produceType: string;
  quantityKg: number;
}

export interface BasketRental {
  _id: string;
  basket: Basket | string;
  renter: User | string;
  items: BasketRentalItem[];
  totalQuantityKg: number;
  startAt: string;
  endAt?: string;
  rateKoboPerDay: number;
  totalDays?: number;
  amountDueKobo?: number;
  estimatedDays?: number;
  estimatedAmountDueKobo?: number;
  status: "active" | "closed" | "cancelled";
  notes?: string;
}

export interface BasketRentalDailyPoint {
  date: string;
  transactions: number;
  weightKg: number;
  revenueKobo: number;
}

export interface BasketRentalSummary {
  windowDays: number;
  totals: {
    totalTransactions: number;
    totalWeightKg: number;
    totalRevenueKobo: number;
    activeCount: number;
    closedCount: number;
    cancelledCount: number;
  };
  daily: BasketRentalDailyPoint[];
}

export interface Payment {
  _id: string;
  rental: BasketRental | string;
  amountKobo: number;
  method: "cash" | "transfer" | "mobile_money" | "card";
  status: "pending" | "paid" | "failed" | "refunded";
  reference?: string;
  recordedBy?: User | string;
  paidAt: string;
}

export interface TelemetryReading {
  _id: string;
  unit: CoolingUnit | string;
  recordedAt: string;
  temperatureC: number;
  batteryPercent?: number;
  solarInputWatts?: number;
  energyConsumedWh?: number;
  source: "sensor" | "manual";
}

export interface TelemetrySummary {
  unit: string;
  windowHours: number;
  minTemperatureC: number | null;
  maxTemperatureC: number | null;
  avgTemperatureC: number | null;
  avgBatteryPercent: number | null;
  totalEnergyConsumedWh: number | null;
  readingCount: number;
}

export type CourseCategory =
  | "sustainable_cooling"
  | "solar_energy"
  | "food_preservation"
  | "business_skills";

export interface Course {
  _id: string;
  title: string;
  description: string;
  category: CourseCategory;
  level: "beginner" | "intermediate" | "advanced";
  durationHours: number;
  instructor?: User | string;
  isPublished: boolean;
}

export interface CourseModule {
  _id: string;
  course: Course | string;
  title: string;
  content: string;
  order: number;
}

export interface Enrollment {
  _id: string;
  learner: User | string;
  course: Course | string;
  completedModules: (CourseModule | string)[];
  progressPercent: number;
  status: "in_progress" | "completed" | "dropped";
  enrolledAt: string;
  completedAt?: string;
  certificateIssued: boolean;
}
