import { Shipment, AlternativeFleet } from '../types';
import { FLEET_INVENTORY } from '../data/fleets';

export function findNearbyFleets(shipment: Shipment): AlternativeFleet[] {
  // Extract needed MT from shipment quantity (e.g., "18 Metric Tons" -> 18)
  const mtMatch = shipment.quantity.match(/(\d+(\.\d+)?)\s*(MT|Metric Ton)/i);
  const neededMt = mtMatch ? parseFloat(mtMatch[1]) : 15;

  const textLocation = `${shipment.route.currentGeo} ${shipment.route.origin} ${shipment.route.destination}`.toLowerCase();

  // Match corridor
  let corridorMatches = FLEET_INVENTORY;
  if (textLocation.includes('manor') || textLocation.includes('mumbai') || textLocation.includes('anand') || textLocation.includes('palghar') || textLocation.includes('surat')) {
    corridorMatches = FLEET_INVENTORY.filter(f => f.id.startsWith('FLT-MH') || f.id.startsWith('FLT-GJ'));
  } else if (textLocation.includes('vellore') || textLocation.includes('chennai') || textLocation.includes('bengaluru') || textLocation.includes('bangalore') || textLocation.includes('hosur')) {
    corridorMatches = FLEET_INVENTORY.filter(f => f.id.startsWith('FLT-KA') || f.id.startsWith('FLT-TN'));
  }

  // Filter by:
  // 1. Distance <= 50 km radius
  // 2. Capacity: payloadCapacityMt >= neededMt (size match)
  // 3. Temperature: reefer can support shipment's safe range
  const matching = corridorMatches.filter((fleet) => {
    // 50 km radius constraint
    if (fleet.distanceKm > 50) return false;

    // Size / payload capacity match
    if (fleet.payloadCapacityMt < neededMt) return false;

    // Temperature profile match
    const canCoolToMin = fleet.temperatureRange.min <= shipment.safeRange.min;
    const canWarmToMax = fleet.temperatureRange.max >= shipment.safeRange.max;
    if (!canCoolToMin || !canWarmToMax) return false;

    return true;
  });

  // Sort by distance (closest first)
  matching.sort((a, b) => a.distanceKm - b.distanceKm);

  // Mark the closest as best match
  return matching.map((f, idx) => ({
    ...f,
    isBestMatch: idx === 0,
  }));
}