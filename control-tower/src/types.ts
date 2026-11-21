export type ShipmentStatus = 'AT_RISK' | 'NORMAL' | 'DELIVERED';

export type EventSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'ACTION_APPROVED' | 'ACTION_DISMISSED';

export interface TimelineEvent {
  id: string;
  timestamp: string;
  relativeTime: string;
  type: EventSeverity;
  title: string;
  description: string;
  source: 'IoT Reefer Telemetry' | 'GPS Tracking' | 'Control Tower System' | 'Operator Action' | 'AI Operations Agent';
  operatorApproved?: boolean;
}

export interface SafeTemperatureRange {
  min: number;
  max: number;
  unit: string;
}

export interface RouteInfo {
  origin: string;
  destination: string;
  currentGeo: string;
  progressPercent: number;
  distanceRemainingKm: number;
  originCoords?: [number, number]; // [lat, lng]
  destinationCoords?: [number, number]; // [lat, lng]
  currentCoords?: [number, number]; // [lat, lng]
}

export interface TransporterInfo {
  company: string;
  vehicleNo: string;
  driverName: string;
  driverPhone: string;
  reeferModel: string;
  reeferSetpoint: number;
}

export interface Shipment {
  id: string;
  product: string;
  category: 'Dairy' | 'Pharmaceuticals' | 'Frozen Foods' | 'Perishables';
  quantity: string;
  status: ShipmentStatus;
  safeRange: SafeTemperatureRange;
  currentTemp: number;
  tempUnit: string;
  route: RouteInfo;
  transporter: TransporterInfo;
  eta: string;
  excursionDurationMinutes?: number;
  lastTelemetryPing: string;
  timeline: TimelineEvent[];
}

export interface NearbyFacility {
  id: string;
  name: string;
  city: string;
  address: string;
  distanceKm: number;
  estimatedTransitMins: number;
  availableMt: number;
  capacityMt: number;
  temperatureSupported: string;
  ratePerMtMonth: number;
  phone: string;
  owner: string;
  docks: number;
  powerBackup: string;
  fssai: string;
  isRecommended: boolean;
  coords?: [number, number]; // [lat, lng]
}

export interface AlternativeFleet {
  id: string;
  transporterCompany: string;
  vehicleNo: string;
  vehicleType: string;
  payloadCapacityMt: number;
  lengthFeet: number;
  reeferModel: string;
  temperatureRange: {
    min: number;
    max: number;
    unit: string;
  };
  temperatureSupported: string;
  status: 'STANDBY_EMPTY' | 'RETURNING_EMPTY';
  currentLocation: string;
  distanceKm: number;
  etaToShipmentMins: number;
  driverName: string;
  driverPhone: string;
  ratePerKm: number;
  fssaiCertified: boolean;
  preCooledReady: boolean;
  isBestMatch: boolean;
  coords?: [number, number]; // [lat, lng]
}

export interface VoiceChatMessage {
  id: string;
  sender: 'operator' | 'assistant';
  text: string;
  timestamp: string;
}

export interface AgentRecommendation {
  summary: string;
  facts: string[];
  recommendedAction: string;
  recommendation?: string;
  reason: string;
  urgency?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  source?: string;
  timestamp?: string;
  status: 'PENDING' | 'APPROVED' | 'DISMISSED';
  suggestedFacility?: NearbyFacility;
  suggestedFleet?: AlternativeFleet;
  nearbyFacilities?: NearbyFacility[];
  alternativeFleets?: AlternativeFleet[];
}

export interface RecommendationRequest {
  shipment: Shipment;
}

export interface RecommendationResponse {
  recommendation?: AgentRecommendation;
  error?: string;
}