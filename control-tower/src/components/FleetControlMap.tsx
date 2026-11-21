import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Shipment, NearbyFacility, AlternativeFleet } from '../types';
import { 
  Navigation, 
  LocateFixed, 
  Maximize2
} from 'lucide-react';

interface FleetControlMapProps {
  shipment: Shipment;
  facilities: NearbyFacility[];
  fleets: AlternativeFleet[];
  selectedFacilityId?: string;
  selectedFleetId?: string;
  onSelectFacility?: (facility: NearbyFacility) => void;
  onSelectFleet?: (fleet: AlternativeFleet) => void;
  theme?: 'dark' | 'light';
}

export const FleetControlMap: React.FC<FleetControlMapProps> = ({
  shipment,
  facilities,
  fleets,
  selectedFacilityId,
  selectedFleetId,
  onSelectFacility,
  onSelectFleet,
  theme = 'dark',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const layersGroupRef = useRef<L.LayerGroup | null>(null);

  // Layer Visibility State
  const [showFleets, setShowFleets] = useState(true);
  const [showFacilities, setShowFacilities] = useState(true);
  const [showRadiusRings, setShowRadiusRings] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [mapStyle, setMapStyle] = useState<'dark' | 'streets' | 'satellite'>('dark');

  const currentCoords: [number, number] = shipment.route.currentCoords || [19.72, 72.91];
  const originCoords: [number, number] = shipment.route.originCoords || [22.56, 72.95];
  const destCoords: [number, number] = shipment.route.destinationCoords || [19.07, 72.87];

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: currentCoords,
        zoom: 9,
        zoomControl: false,
        attributionControl: false,
      });

      // Add custom zoom control in top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      mapInstanceRef.current = map;
      layersGroupRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Manage Base Tile Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    let attribution = '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

    if (mapStyle === 'streets' || (mapStyle === 'dark' && theme === 'light')) {
      tileUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    } else if (mapStyle === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = '&copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
    }

    const newTileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd',
      attribution,
    });

    newTileLayer.addTo(map);
    tileLayerRef.current = newTileLayer;
  }, [mapStyle, theme]);

  // 3. Render Tactical Layers (Fleet pins, Storage pins, Route, 50km/100km radii)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = layersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    const isAtRisk = shipment.status === 'AT_RISK';

    // A. 50 KM & 100 KM Tactical Radar Rings
    if (showRadiusRings) {
      // 100 KM Outer Ring (100,000 meters)
      const circle100 = L.circle(currentCoords, {
        radius: 100000,
        color: '#0284c7',
        weight: 1.5,
        dashArray: '8, 8',
        fillColor: '#0284c7',
        fillOpacity: 0.03,
      });
      circle100.bindTooltip('100 KM Logistics Radar Zone', { permanent: false, direction: 'top' });
      group.addLayer(circle100);

      // 50 KM Inner Emergency Transshipment Ring (50,000 meters)
      const circle50 = L.circle(currentCoords, {
        radius: 50000,
        color: '#06b6d4',
        weight: 2.2,
        dashArray: '6, 6',
        fillColor: '#06b6d4',
        fillOpacity: 0.08,
      });
      circle50.bindTooltip('50 KM Emergency Transshipment Radius', { permanent: false, direction: 'top' });
      group.addLayer(circle50);
    }

    // B. Highway Route Polylines
    if (showRoute) {
      // Completed Leg: Origin -> Current
      const completedLine = L.polyline([originCoords, currentCoords], {
        color: '#0284c7',
        weight: 4,
        opacity: 0.85,
      });
      completedLine.bindPopup(`<strong>Transit Route Completed:</strong> ${shipment.route.origin} → ${shipment.route.currentGeo}`);
      group.addLayer(completedLine);

      // Remaining Leg: Current -> Destination
      const remainingLine = L.polyline([currentCoords, destCoords], {
        color: '#06b6d4',
        weight: 4,
        dashArray: '8, 8',
        opacity: 0.9,
      });
      remainingLine.bindPopup(`<strong>Remaining Route:</strong> ${shipment.route.currentGeo} → ${shipment.route.destination}`);
      group.addLayer(remainingLine);
    }

    // C. Origin Pin (🏭)
    const originIcon = L.divIcon({
      className: 'custom-map-pin origin-pin',
      html: `
        <div style="background-color: #0f172a; border: 2px solid #0284c7; border-radius: 8px; padding: 4px 8px; box-shadow: 0 4px 14px rgba(0,0,0,0.5); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
          <span style="font-size: 16px;">🏭</span>
          <span style="font-size: 11px; font-weight: 700; color: #94a3b8;">ORIGIN: ${shipment.route.origin.split(' ')[0]}</span>
        </div>
      `,
      iconSize: [110, 32],
      iconAnchor: [55, 16],
    });
    const originMarker = L.marker(originCoords, { icon: originIcon });
    originMarker.bindPopup(`<strong>Origin Facility:</strong><br/>${shipment.route.origin}`);
    group.addLayer(originMarker);

    // D. Destination Pin (🏁 🎯)
    const destIcon = L.divIcon({
      className: 'custom-map-pin dest-pin',
      html: `
        <div style="background-color: #0f172a; border: 2px solid #10b981; border-radius: 8px; padding: 4px 8px; box-shadow: 0 4px 14px rgba(16,185,129,0.3); display: flex; align-items: center; gap: 4px; white-space: nowrap;">
          <span style="font-size: 16px;">🏁</span>
          <span style="font-size: 11px; font-weight: 800; color: #10b981;">DEST: ${shipment.route.destination.split(' ')[0]}</span>
        </div>
      `,
      iconSize: [110, 32],
      iconAnchor: [55, 16],
    });
    const destMarker = L.marker(destCoords, { icon: destIcon });
    destMarker.bindPopup(`<strong>Destination Distribution Center:</strong><br/>${shipment.route.destination}`);
    group.addLayer(destMarker);

    // E. Nearby Cold Storage Facilities (🏢 ❄️)
    if (showFacilities) {
      facilities.forEach((facility) => {
        if (!facility.coords) return;

        const isSelected = selectedFacilityId === facility.id || facility.isRecommended;

        // Vector line from At-Risk fleet to facility
        const vector = L.polyline([currentCoords, facility.coords], {
          color: '#10b981',
          weight: 1.5,
          dashArray: '4, 4',
          opacity: 0.5,
        });
        group.addLayer(vector);

        const facIcon = L.divIcon({
          className: 'custom-map-pin fac-pin',
          html: `
            <div style="cursor: pointer; display: flex; flex-direction: column; align-items: center;">
              <div style="background: ${isSelected ? '#064e3b' : '#0f172a'}; border: 2px solid ${isSelected ? '#10b981' : '#059669'}; border-radius: 50%; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(16,185,129,0.4); transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'}; transition: all 0.2s;">
                <span style="font-size: 18px;">🏢</span>
              </div>
              <div style="background-color: #0f172a; border: 1.5px solid #10b981; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: 700; color: #34d399; margin-top: 3px; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.6);">
                ❄️ ${facility.distanceKm}km • ${facility.availableMt}MT
              </div>
            </div>
          `,
          iconSize: [90, 60],
          iconAnchor: [45, 30],
        });

        const facMarker = L.marker(facility.coords, { icon: facIcon });
        
        facMarker.bindPopup(`
          <div style="font-family: system-ui; min-width: 200px; color: #0f172a;">
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
              <strong style="font-size: 13px;">🏢 ${facility.name}</strong>
            </div>
            <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
              ${facility.address}
            </div>
            <div style="font-size: 11px; margin-bottom: 3px;">
              <strong>Distance:</strong> <span style="color: #0284c7; font-weight: 700;">${facility.distanceKm} km (~${facility.estimatedTransitMins} mins)</span>
            </div>
            <div style="font-size: 11px; margin-bottom: 3px;">
              <strong>Available:</strong> <span style="color: #059669; font-weight: 700;">${facility.availableMt} MT</span> (${facility.temperatureSupported})
            </div>
            <div style="font-size: 11px; margin-bottom: 6px;">
              <strong>Manager:</strong> ${facility.owner} (<a href="tel:${facility.phone}">${facility.phone}</a>)
            </div>
            <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
              Rate: ₹${facility.ratePerMtMonth}/MT/month • ${facility.docks} Docks
            </div>
            <button id="btn-select-fac-${facility.id}" style="width: 100%; padding: 4px 8px; background: #059669; color: white; border: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer;">
              Select for Emergency Divert
            </button>
          </div>
        `);

        facMarker.on('popupopen', () => {
          const btn = document.getElementById(`btn-select-fac-${facility.id}`);
          if (btn) {
            btn.onclick = () => {
              onSelectFacility && onSelectFacility(facility);
              facMarker.closePopup();
            };
          }
        });

        facMarker.on('click', () => {
          onSelectFacility && onSelectFacility(facility);
        });

        group.addLayer(facMarker);
      });
    }

    // F. Alternative Standby Fleets (⚡ 🚚) Within 50 km / 100 km
    if (showFleets) {
      fleets.forEach((fleet) => {
        if (!fleet.coords) return;

        const isSelected = selectedFleetId === fleet.id || fleet.isBestMatch;

        // Vector line from At-Risk fleet to standby fleet
        const vector = L.polyline([currentCoords, fleet.coords], {
          color: '#f59e0b',
          weight: 1.5,
          dashArray: '4, 4',
          opacity: 0.6,
        });
        group.addLayer(vector);

        const fleetIcon = L.divIcon({
          className: 'custom-map-pin fleet-pin',
          html: `
            <div style="cursor: pointer; display: flex; flex-direction: column; align-items: center;">
              <div style="background: ${isSelected ? '#78350f' : '#0f172a'}; border: 2px solid ${isSelected ? '#f59e0b' : '#d97706'}; border-radius: 50%; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(245,158,11,0.4); transform: ${isSelected ? 'scale(1.15)' : 'scale(1)'}; transition: all 0.2s;">
                <span style="font-size: 18px;">🚚</span>
              </div>
              <div style="background-color: #0f172a; border: 1.5px solid #f59e0b; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: 700; color: #fbbf24; margin-top: 3px; white-space: nowrap; box-shadow: 0 2px 8px rgba(0,0,0,0.6);">
                ⚡ ${fleet.distanceKm}km (~${fleet.etaToShipmentMins}m)
              </div>
            </div>
          `,
          iconSize: [90, 60],
          iconAnchor: [45, 30],
        });

        const fleetMarker = L.marker(fleet.coords, { icon: fleetIcon });

        fleetMarker.bindPopup(`
          <div style="font-family: system-ui; min-width: 210px; color: #0f172a;">
            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
              <strong style="font-size: 13px;">⚡ ${fleet.transporterCompany}</strong>
            </div>
            <div style="font-size: 11px; color: #0284c7; font-weight: 700; margin-bottom: 4px;">
              ${fleet.vehicleNo} (${fleet.vehicleType.split('(')[0]})
            </div>
            <div style="font-size: 11px; margin-bottom: 3px;">
              <strong>Distance:</strong> <span style="color: #d97706; font-weight: 700;">${fleet.distanceKm} km (ETA: ~${fleet.etaToShipmentMins} mins)</span>
            </div>
            <div style="font-size: 11px; margin-bottom: 3px;">
              <strong>Payload Capacity:</strong> ${fleet.payloadCapacityMt} MT (${fleet.lengthFeet}ft Box)
            </div>
            <div style="font-size: 11px; margin-bottom: 3px;">
              <strong>Reefer Specs:</strong> ${fleet.reeferModel} (${fleet.temperatureRange.min}°C to ${fleet.temperatureRange.max}°C)
            </div>
            <div style="font-size: 11px; margin-bottom: 6px;">
              <strong>Driver:</strong> ${fleet.driverName} (<a href="tel:${fleet.driverPhone}">${fleet.driverPhone}</a>)
            </div>
            <div style="font-size: 10px; color: #059669; font-weight: 600; margin-bottom: 8px;">
              ✓ Pre-cooled & Sanitized • FSSAI Certified
            </div>
            <button id="btn-select-flt-${fleet.id}" style="width: 100%; padding: 4px 8px; background: #0284c7; color: white; border: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer;">
              Select for Fleet Transshipment
            </button>
          </div>
        `);

        fleetMarker.on('popupopen', () => {
          const btn = document.getElementById(`btn-select-flt-${fleet.id}`);
          if (btn) {
            btn.onclick = () => {
              onSelectFleet && onSelectFleet(fleet);
              fleetMarker.closePopup();
            };
          }
        });

        fleetMarker.on('click', () => {
          onSelectFleet && onSelectFleet(fleet);
        });

        group.addLayer(fleetMarker);
      });
    }

    // G. PRIMARY AT-RISK FLEET MARKER (🚨 🚛)
    const atRiskIcon = L.divIcon({
      className: 'custom-map-pin at-risk-fleet-pin',
      html: `
        <div style="cursor: pointer; display: flex; flex-direction: column; align-items: center; position: relative;">
          <!-- Pulsing Radar Glow -->
          <div style="position: absolute; top: -6px; left: -6px; width: 56px; height: 56px; border-radius: 50%; background: rgba(239, 68, 68, 0.25); animation: pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;"></div>
          
          <!-- Central Icon Badge -->
          <div style="position: relative; z-index: 2; background: #7f1d1d; border: 3px solid #ef4444; border-radius: 50%; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(239, 68, 68, 0.8);">
            <span style="font-size: 22px;">${isAtRisk ? '🚨' : '🚛'}</span>
          </div>

          <!-- Alert Badge -->
          <div style="position: relative; z-index: 3; background-color: #ef4444; border: 1.5px solid #ffffff; border-radius: 4px; padding: 2px 8px; font-size: 10.5px; font-weight: 800; color: #ffffff; margin-top: 4px; white-space: nowrap; box-shadow: 0 2px 10px rgba(0,0,0,0.6);">
            ${isAtRisk ? `🚨 AT RISK: ${shipment.currentTemp}°C` : `🟢 ${shipment.currentTemp}°C`}
          </div>

          <!-- Vehicle Pill -->
          <div style="background-color: #0f172a; border: 1px solid #ef4444; border-radius: 3px; padding: 1px 6px; font-size: 9px; font-weight: 700; color: #f8fafc; margin-top: 2px; font-family: monospace;">
            ${shipment.id} [${shipment.transporter.vehicleNo.split(' ')[0]}]
          </div>
        </div>
      `,
      iconSize: [120, 80],
      iconAnchor: [60, 40],
    });

    const atRiskMarker = L.marker(currentCoords, { icon: atRiskIcon, zIndexOffset: 1000 });
    atRiskMarker.bindPopup(`
      <div style="font-family: system-ui; min-width: 220px; color: #0f172a;">
        <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 4px;">
          <strong style="font-size: 13px; color: #dc2626;">🚨 AT-RISK SHIPMENT: ${shipment.id}</strong>
        </div>
        <div style="font-size: 11px; margin-bottom: 4px;">
          <strong>Cargo:</strong> ${shipment.product} (${shipment.quantity})
        </div>
        <div style="font-size: 11px; margin-bottom: 4px;">
          <strong>Current Temp:</strong> <span style="color: #dc2626; font-weight: 800;">${shipment.currentTemp}°C</span> (Safe: ${shipment.safeRange.min}°C to ${shipment.safeRange.max}°C)
        </div>
        <div style="font-size: 11px; margin-bottom: 4px;">
          <strong>Excursion Duration:</strong> ${shipment.excursionDurationMinutes} minutes continuous
        </div>
        <div style="font-size: 11px; margin-bottom: 4px;">
          <strong>Geo Waypoint:</strong> ${shipment.route.currentGeo}
        </div>
        <div style="font-size: 11px; margin-bottom: 4px;">
          <strong>Driver:</strong> ${shipment.transporter.driverName} (<a href="tel:${shipment.transporter.driverPhone}">${shipment.transporter.driverPhone}</a>)
        </div>
        <div style="font-size: 11px; color: #64748b;">
          Reefer: ${shipment.transporter.reeferModel} (Setpoint: ${shipment.transporter.reeferSetpoint}°C)
        </div>
      </div>
    `);

    group.addLayer(atRiskMarker);

  }, [
    shipment, 
    facilities, 
    fleets, 
    showFleets, 
    showFacilities, 
    showRadiusRings, 
    showRoute, 
    selectedFacilityId, 
    selectedFleetId
  ]);

  // Handler to center map on At-Risk Fleet
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(currentCoords, 10, { duration: 1.2 });
    }
  };

  // Handler to fit all corridor points
  const handleFitBounds = () => {
    if (mapInstanceRef.current) {
      const bounds = L.latLngBounds([originCoords, destCoords, currentCoords]);
      facilities.forEach(f => {
        if (f.coords) bounds.extend(f.coords);
      });
      fleets.forEach(fl => {
        if (fl.coords) bounds.extend(fl.coords);
      });
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1rem' }}>
      {/* Map Control Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-main)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div 
            style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '8px', 
              background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff'
            }}
          >
            <Navigation size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Live Geographic Control Map
              <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>
                OpenStreetMap / Tactical Radar
              </span>
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Real-world road map with satellite & street tiles, excursion pin, cold storages & alternative fleets within 100 KM
            </span>
          </div>
        </div>

        {/* Tactical Controls & Layer Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
          {/* Map Tile Style Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-main)', borderRadius: '6px', overflow: 'hidden' }}>
            <button
              onClick={() => setMapStyle('dark')}
              className={`btn ${mapStyle === 'dark' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.72rem', borderRadius: 0, border: 'none' }}
            >
              Dark
            </button>
            <button
              onClick={() => setMapStyle('streets')}
              className={`btn ${mapStyle === 'streets' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.72rem', borderRadius: 0, border: 'none' }}
            >
              Street
            </button>
            <button
              onClick={() => setMapStyle('satellite')}
              className={`btn ${mapStyle === 'satellite' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.72rem', borderRadius: 0, border: 'none' }}
            >
              Satellite
            </button>
          </div>

          {/* Layer toggles */}
          <button
            onClick={() => setShowRadiusRings(!showRadiusRings)}
            className={`btn ${showRadiusRings ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
            title="Toggle 50 KM and 100 KM Tactical Radii"
          >
            <span>🎯 50k/100k Rings</span>
          </button>

          <button
            onClick={() => setShowFleets(!showFleets)}
            className={`btn ${showFleets ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
            title="Toggle Standby Alternative Fleets"
          >
            <span>⚡ Fleets ({fleets.length})</span>
          </button>

          <button
            onClick={() => setShowFacilities(!showFacilities)}
            className={`btn ${showFacilities ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
            title="Toggle Nearby Cold Storage Facilities"
          >
            <span>🏢 Storages ({facilities.length})</span>
          </button>

          <button
            onClick={() => setShowRoute(!showRoute)}
            className={`btn ${showRoute ? 'btn-primary' : 'btn-ghost'}`}
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem' }}
            title="Toggle Transit Corridor Route"
          >
            <span>🛣️ Route</span>
          </button>

          <button
            onClick={handleRecenter}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            title="Center on At-Risk Fleet"
          >
            <LocateFixed size={13} color="var(--status-danger)" />
            <span>Center Fleet</span>
          </button>

          <button
            onClick={handleFitBounds}
            className="btn btn-secondary"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
            title="Fit Entire Transit Corridor"
          >
            <Maximize2 size={13} />
            <span>Fit All</span>
          </button>
        </div>
      </div>

      {/* Map Legend Bar */}
      <div 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          backgroundColor: 'var(--bg-primary)', 
          padding: '0.45rem 0.85rem', 
          borderRadius: '8px', 
          fontSize: '0.75rem',
          border: '1px solid var(--border-main)',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}
      >
        <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>Map Pins:</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>🚨 🚛</span>
          <strong style={{ color: 'var(--status-danger)' }}>At-Risk Fleet</strong> ({shipment.id} @ {shipment.currentTemp}°C)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>⚡ 🚚</span>
          <strong style={{ color: 'var(--brand-cyan)' }}>Alternative Fleet</strong> (&lt; 50 KM)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>🏢 ❄️</span>
          <strong style={{ color: 'var(--status-success)' }}>Cold Storage Facility</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>🏁 🎯</span>
          <strong style={{ color: 'var(--text-main)' }}>Destination Hub</strong>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>🏭</span>
          <strong style={{ color: 'var(--brand-blue)' }}>Origin Hub</strong>
        </div>
      </div>

      {/* Real Geographic Leaflet Map Canvas */}
      <div 
        ref={mapContainerRef} 
        style={{ 
          width: '100%', 
          height: '520px', 
          borderRadius: '10px', 
          overflow: 'hidden', 
          border: '1px solid var(--border-main)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          position: 'relative',
          zIndex: 1
        }} 
      />
    </div>
  );
};