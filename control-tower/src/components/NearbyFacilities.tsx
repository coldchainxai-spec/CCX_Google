import React from 'react';
import { NearbyFacility, Shipment } from '../types';
import { 
  MapPin, 
  ShieldCheck, 
  Phone, 
  Zap, 
  Warehouse
} from 'lucide-react';

interface NearbyFacilitiesProps {
  shipment: Shipment;
  facilities: NearbyFacility[];
  selectedFacilityId?: string;
  onSelectFacility?: (facility: NearbyFacility) => void;
}

export const NearbyFacilities: React.FC<NearbyFacilitiesProps> = ({
  shipment,
  facilities,
  selectedFacilityId,
  onSelectFacility,
}) => {
  if (!facilities || facilities.length === 0) {
    return null;
  }

  const isAtRisk = shipment.status === 'AT_RISK';

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: isAtRisk ? '1px solid rgba(6, 182, 212, 0.4)' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-main)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div 
            style={{ 
              width: '30px', 
              height: '30px', 
              borderRadius: '8px', 
              backgroundColor: 'rgba(6, 182, 212, 0.15)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: 'var(--brand-cyan)'
            }}
          >
            <Warehouse size={17} />
          </div>
          <div>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Nearby Available Cold Storages
              <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                {facilities.length} Verified Online
              </span>
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Filtered from ColdChainX facilities database matching {shipment.category} ({shipment.safeRange.min}–{shipment.safeRange.max}{shipment.safeRange.unit})
            </span>
          </div>
        </div>

        <span style={{ fontSize: '0.75rem', color: 'var(--brand-cyan)', fontWeight: 600 }}>
          Proximity Matched
        </span>
      </div>

      {/* Facilities Cards Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {facilities.map((facility) => {
          const isBestMatch = facility.isRecommended;
          const isUserSelected = selectedFacilityId === facility.id || (!selectedFacilityId && isBestMatch);

          return (
            <div
              key={facility.id}
              onClick={() => onSelectFacility && onSelectFacility(facility)}
              className={`card ${onSelectFacility ? 'card-clickable' : ''}`}
              style={{
                padding: '1rem',
                backgroundColor: isUserSelected ? 'var(--bg-surface-hover)' : 'var(--bg-primary)',
                border: isBestMatch ? '1.5px solid var(--brand-cyan)' : '1px solid var(--border-main)',
                boxShadow: isBestMatch ? '0 0 12px rgba(6, 182, 212, 0.15)' : undefined,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
                position: 'relative',
              }}
            >
              {/* Header: Name, Distance, Badges */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                    <span style={{ fontSize: '0.925rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {facility.name}
                    </span>
                    <span className="mono" style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                      [{facility.id}]
                    </span>
                    {isBestMatch && (
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                        ⭐ Best Match
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <MapPin size={13} color="var(--brand-blue)" />
                    <span>{facility.address}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--brand-cyan)' }}>
                    {facility.distanceKm} km
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                    ~{facility.estimatedTransitMins} mins transit
                  </div>
                </div>
              </div>

              {/* Specs Grid */}
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
                  <span style={{ color: 'var(--text-dim)' }}>Available Capacity: </span>
                  <strong style={{ color: 'var(--status-success)' }}>{facility.availableMt} MT</strong>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}> / {facility.capacityMt} MT</span>
                </div>

                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Temp Profile: </span>
                  <strong style={{ color: 'var(--text-main)' }}>{facility.temperatureSupported.split('(')[0]}</strong>
                </div>

                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Monthly Rate: </span>
                  <strong style={{ color: 'var(--brand-blue)' }}>₹{facility.ratePerMtMonth}</strong>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.68rem' }}>/MT/mo</span>
                </div>

                <div>
                  <span style={{ color: 'var(--text-dim)' }}>Docks / Infrastructure: </span>
                  <strong style={{ color: 'var(--text-main)' }}>{facility.docks} Docks</strong>
                </div>
              </div>

              {/* Footer: Certifications & Contact */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)', paddingTop: '0.2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--status-success)' }}>
                    <ShieldCheck size={13} /> FSSAI Verified
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--status-warning)' }}>
                    <Zap size={13} /> 100% DG Backup
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span>Contact: <strong>{facility.owner}</strong></span>
                  <a
                    href={`tel:${facility.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      color: 'var(--brand-cyan)',
                      textDecoration: 'none',
                      backgroundColor: 'rgba(6, 182, 212, 0.1)',
                      padding: '0.2rem 0.45rem',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                  >
                    <Phone size={11} />
                    {facility.phone}
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