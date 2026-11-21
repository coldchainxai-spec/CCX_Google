import { Shipment, NearbyFacility } from '../types';
import rawFacilities from '../data/facilities.json';

interface RawFacility {
  id: string;
  name: string;
  city: string;
  state: string;
  address: string;
  category: string;
  temperature_supported: string;
  capacity_mt: number;
  available_mt: number;
  rate_per_mt_month: number;
  owner: string;
  phone: string;
  docks: number;
  power_backup: string;
  fssai: string;
  distance_city_km?: number;
}

const facilitiesData = rawFacilities as unknown as RawFacility[];

export function findNearbyFacilities(shipment: Shipment): NearbyFacility[] {
  // Extract needed MT from quantity string (e.g. "18 Metric Tons" -> 18)
  const mtMatch = shipment.quantity.match(/(\d+(\.\d+)?)\s*(MT|Metric Ton)/i);
  const neededMt = mtMatch ? parseFloat(mtMatch[1]) : 15;

  const isFrozen = shipment.safeRange.max <= -10;
  const isChilled = shipment.safeRange.min >= 0 && shipment.safeRange.max <= 12;

  // Identify relevant corridor
  const textLocation = `${shipment.route.currentGeo} ${shipment.route.origin} ${shipment.route.destination}`.toLowerCase();
  
  let targetCities: string[] = [];
  if (textLocation.includes('manor') || textLocation.includes('mumbai') || textLocation.includes('maharashtra') || textLocation.includes('anand') || textLocation.includes('surat')) {
    targetCities = ['Mumbai', 'Surat', 'Pune'];
  } else if (textLocation.includes('bengaluru') || textLocation.includes('bangalore') || textLocation.includes('hosur') || textLocation.includes('tumakuru')) {
    targetCities = ['Bangalore', 'Hosur', 'Mysore'];
  } else if (textLocation.includes('chennai') || textLocation.includes('vellore') || textLocation.includes('tamil nadu')) {
    targetCities = ['Chennai', 'Salem', 'Madurai'];
  } else {
    targetCities = ['Mumbai', 'Bangalore', 'Chennai'];
  }

  // Filter facilities
  const matching = facilitiesData.filter((f) => {
    // 1. Must have sufficient available capacity
    if ((f.available_mt || 0) < neededMt) return false;

    // 2. City proximity
    if (!targetCities.includes(f.city)) return false;

    // 3. Temperature compatibility
    const tempStr = (f.temperature_supported || '').toLowerCase();
    if (isFrozen) {
      return tempStr.includes('frozen') || tempStr.includes('multi-temperature');
    }
    if (isChilled) {
      return tempStr.includes('chilled') || tempStr.includes('multi-temperature');
    }

    return true;
  });

  // Calculate synthetic highway distances based on location relevance
  const results: NearbyFacility[] = matching.map((f, index) => {
    let distanceKm = 18 + index * 14;
    let coords: [number, number] = [19.29, 73.06];

    if (f.id === 'CCX-TN-CS-ID-050') {
      distanceKm = 18;
      coords = [19.04, 73.10]; // Taloja MIDC
    } else if (f.id === 'CCX-TN-CS-ID-014') {
      distanceKm = 34;
      coords = [19.29, 73.06]; // Bhiwandi Logistics Hub
    } else if (f.id === 'CCX-TN-CS-ID-015') {
      distanceKm = 32;
      coords = [19.08, 73.11]; // Taloja Phase 4
    } else if (f.id === 'CCX-TN-CS-ID-017') {
      distanceKm = 46;
      coords = [18.73, 73.68]; // Talegaon
    } else {
      // Offset by index for realism
      coords = [19.20 + (index * 0.05), 73.00 + (index * 0.04)];
    }

    const estimatedTransitMins = Math.round(distanceKm * 1.4);

    return {
      id: f.id,
      name: f.name.startsWith('Cold Storage') ? `${f.name} (${f.city} Hub)` : f.name,
      city: f.city,
      address: f.address,
      distanceKm,
      estimatedTransitMins,
      availableMt: f.available_mt,
      capacityMt: f.capacity_mt,
      temperatureSupported: f.temperature_supported,
      ratePerMtMonth: f.rate_per_mt_month,
      phone: f.phone,
      owner: f.owner,
      docks: f.docks || 4,
      powerBackup: f.power_backup || 'Yes',
      fssai: f.fssai || 'Yes',
      isRecommended: false,
      coords,
    };
  });

  // Sort by distance
  results.sort((a, b) => a.distanceKm - b.distanceKm);

  // Mark the best candidate
  if (results.length > 0) {
    results[0].isRecommended = true;
  }

  // Return top 3 nearby facilities
  return results.slice(0, 3);
}