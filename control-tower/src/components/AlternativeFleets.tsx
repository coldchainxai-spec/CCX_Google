import React from 'react';
import { AlternativeFleet, Shipment } from '../types';
import { 
  Truck, 
  MapPin, 
  Clock, 
  ShieldCheck, 
  Phone, 
  CheckCircle2, 
  Sparkles, 
  Radio
} from 'lucide-react';

interface AlternativeFleetsProps {
  shipment: Shipment;
  fleets: AlternativeFleet[];
  selectedFleetId?: string;
  onSelectFleet?: (fleet: AlternativeFleet) => void;
}

export const AlternativeFleets: React.FC<AlternativeFleetsProps> = ({
  shipment,
  fleets,
  selectedFleetId,
  onSelectFleet,
}) => {
  if (!fleets || fleets.length === 0) {
    return null;
  }

  const isAtRisk = shipment.status === 'AT_RISK';

  return (
    <div 
      className="card" 
      style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1rem', 
        border: isAtRisk ? '1px solid rgba(6, 182, 212, 0.4)' : undefined 
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-main)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div 
            style={{ 
              width: '32px', 
              height: '32px', 
              borderRadius: '8px', 
              backgroundColor: 'rgba(2, 132, 199, 0.15)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--brand-blue)'
            }}
          >
            <Truck size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              Alternative Fleets in 50 km Radius
              <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                {fleets.length} Matching Fleets
              </span>
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Standby reefer trucks matching vehicle size ({shipment.quantity}) & thermal range ({shipment.safeRange.min}–{shipment.safeRange.max}{shipment.safeRange.unit})
            </span>
          </div>
        </div>

        <span className="badge badge-neutral" style={{ fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <Radio size={11} color="var(--status-success)" />
          Radius: &lt; 50 KM
        </span>
      </div>

      {/* Fleet Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {fleets.map((fleet) => {
          const isBest = fleet.isBestMatch;
          const isSelected = selectedFleetId === fleet.id || (!selectedFleetId && isBest);

          return (
            <div
              key={fleet.id}
              onClick={() => onSelectFleet && onSelectFleet(fleet)}
              className={`card ${onSelectFleet ? 'card-clickable' : ''}`}
              style={{
                padding: '1rem',
                backgroundColor: isSelected ? 'var(--bg-surface-hover)' : 'var(--bg-primary)',
                border: isBest ? '1.5px solid var(--brand-cyan)' : '1px solid var(--border-main)',
                boxShadow: isBest ? '0 0 12px rgba(6, 182, 212, 0.15)' : undefined,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}
            >
              {/* Row 1: Vehicle info & Proximity */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {fleet.transporterCompany}
                    </span>
                    <span className="mono" style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--brand-cyan)' }}>
                      [{fleet.vehicleNo}]
                    </span>
                    {isBest && (
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                        <Sparkles size={11} />
                        Recommended Transfer Fleet
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <MapPin size={13} color="var(--brand-blue)" />
                    <span>Current Location: {fleet.currentLocation}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--brand-cyan)' }}>
                    {fleet.distanceKm} km away
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--status-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'flex-end' }}>
                    <Clock size={12} />
                    ETA: ~{fleet.etaToShipmentMins} mins
                  </div>
                </div>
              </div>

              {/* Row 2: Matching specs */}
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
                  gap: '0.5rem', 
                  padding: '0.6rem 0.75rem', 
                  backgroundColor: 'var(--bg-secondary)', 
                  borderRadius: '6px',
                  fontSize: '0.75rem' 
                }}
              >
                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Vehicle Type: </span>
                  <strong style={{ color: 'var(--text-main)' }}>{fleet.vehicleType.split('(')[0]}</strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Capacity Match: </span>
                  <strong style={{ color: 'var(--status-success)' }}>{fleet.payloadCapacityMt} MT Payload</strong>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}> ({fleet.lengthFeet}ft Box)</span>
                </div>

                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Reefer Unit: </span>
                  <strong style={{ color: 'var(--text-main)' }}>{fleet.reeferModel.split(' ')[0]} {fleet.reeferModel.split(' ')[1] || ''}</strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Thermal Range: </span>
                  <strong style={{ color: 'var(--brand-cyan)' }}>{fleet.temperatureRange.min}°C to {fleet.temperatureRange.max}°C</strong>
                </div>
              </div>

              {/* Row 3: Status & Driver Contact */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', paddingTop: '0.2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--status-success)' }}>
                    <CheckCircle2 size={13} /> Pre-Cooled & Sanitized
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--status-success)' }}>
                    <ShieldCheck size={13} /> FSSAI Certified
                  </span>
                  <span style={{ color: 'var(--text-dim)' }}>
                    Rate: ₹{fleet.ratePerKm}/km
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span>Driver: <strong>{fleet.driverName}</strong></span>
                  <a
                    href={`tel:${fleet.driverPhone}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      color: 'var(--brand-cyan)',
                      textDecoration: 'none',
                      backgroundColor: 'rgba(6, 182, 212, 0.1)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                  >
                    <Phone size={11} />
                    {fleet.driverPhone}
                  </a>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};