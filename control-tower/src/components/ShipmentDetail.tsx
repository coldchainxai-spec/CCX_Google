import React from 'react';
import { Shipment } from '../types';
import { 
  AlertOctagon, 
  Thermometer, 
  Truck, 
  Phone, 
  Navigation,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface ShipmentDetailProps {
  shipment: Shipment;
}

export const ShipmentDetail: React.FC<ShipmentDetailProps> = ({ shipment }) => {
  const isAtRisk = shipment.status === 'AT_RISK';
  const delta = (shipment.currentTemp - shipment.safeRange.max).toFixed(1);

  // Calculate percentage along a reasonable range for visual gauge
  // E.g. min - 10 to max + 10
  const gaugeMin = shipment.safeRange.min - 8;
  const gaugeMax = shipment.safeRange.max + 8;
  const totalSpan = gaugeMax - gaugeMin;

  const safeLeftPercent = Math.max(0, Math.min(100, ((shipment.safeRange.min - gaugeMin) / totalSpan) * 100));
  const safeWidthPercent = Math.max(5, Math.min(100 - safeLeftPercent, ((shipment.safeRange.max - shipment.safeRange.min) / totalSpan) * 100));
  const currentTempPercent = Math.max(0, Math.min(100, ((shipment.currentTemp - gaugeMin) / totalSpan) * 100));

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Info */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--border-main)', paddingBottom: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span className="mono" style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-cyan)' }}>
              {shipment.id}
            </span>
            <span className="badge badge-neutral">{shipment.category}</span>
            {isAtRisk ? (
              <span className="badge badge-danger">
                <AlertOctagon size={13} />
                Critical Excursion (At Risk)
              </span>
            ) : (
              <span className="badge badge-success">
                <CheckCircle2 size={13} />
                Normal
              </span>
            )}
          </div>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{shipment.product}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Cargo: <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{shipment.quantity}</span>
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Latest Telemetry Ping</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'flex-end' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-success)' }} />
            {shipment.lastTelemetryPing}
          </div>
        </div>
      </div>

      {/* Critical Excursion Banner (FR-3) */}
      {isAtRisk && (
        <div 
          style={{ 
            backgroundColor: 'var(--status-danger-bg)', 
            border: '1px solid var(--status-danger-border)', 
            borderRadius: '10px', 
            padding: '1rem',
            display: 'flex',
            gap: '0.9rem',
            alignItems: 'flex-start'
          }}
        >
          <div style={{ color: 'var(--status-danger)', marginTop: '2px' }}>
            <AlertOctagon size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--status-danger)' }}>
                Active Temperature Excursion Detected
              </h3>
              <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>
                +{delta}°C Above Limit
              </span>
            </div>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
              Current reefer reading is <strong style={{ color: 'var(--status-danger)' }}>{shipment.currentTemp}°C</strong> (safe range: {shipment.safeRange.min}°C to {shipment.safeRange.max}°C). Excursion has been continuously active for <strong>{shipment.excursionDurationMinutes} minutes</strong>. Without intervention, cargo quality threshold will be compromised.
            </p>
          </div>
        </div>
      )}

      {/* Temperature Gauge & Comparison */}
      <div 
        style={{ 
          backgroundColor: 'var(--bg-primary)', 
          border: '1px solid var(--border-main)', 
          borderRadius: '10px', 
          padding: '1.1rem' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Thermometer size={18} color={isAtRisk ? 'var(--status-danger)' : 'var(--status-success)'} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Thermal Telemetry Gauge</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Permitted Range: <strong style={{ color: 'var(--status-success)' }}>{shipment.safeRange.min}°C to {shipment.safeRange.max}°C</strong>
          </div>
        </div>

        {/* Gauge bar */}
        <div style={{ margin: '1.25rem 0 1rem 0', position: 'relative' }}>
          <div className="temp-gauge-track">
            {/* Safe zone */}
            <div 
              className="temp-gauge-safe-zone" 
              style={{ left: `${safeLeftPercent}%`, width: `${safeWidthPercent}%` }}
              title={`Safe Zone: ${shipment.safeRange.min}°C to ${shipment.safeRange.max}°C`}
            />

            {/* Current temperature marker */}
            <div 
              className="temp-gauge-marker"
              style={{ 
                left: `${currentTempPercent}%`, 
                backgroundColor: isAtRisk ? 'var(--status-danger)' : 'var(--status-success)',
                color: isAtRisk ? 'var(--status-danger)' : 'var(--status-success)',
              }}
              title={`Current Reading: ${shipment.currentTemp}°C`}
            />
          </div>

          {/* Scale labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.4rem' }}>
            <span>{gaugeMin}°C</span>
            <span style={{ color: 'var(--status-success)', fontWeight: 600 }}>Safe [{shipment.safeRange.min}°C ... {shipment.safeRange.max}°C]</span>
            <span>+{gaugeMax}°C</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.6rem', borderTop: '1px dashed var(--border-main)', fontSize: '0.825rem' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Latest Pulp Sensor: </span>
            <span className="mono" style={{ fontWeight: 700, color: isAtRisk ? 'var(--status-danger)' : 'var(--status-success)', fontSize: '1rem' }}>
              {shipment.currentTemp > 0 ? `+${shipment.currentTemp}` : shipment.currentTemp}{shipment.tempUnit}
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Setpoint: </span>
            <span className="mono" style={{ fontWeight: 600 }}>
              {shipment.transporter.reeferSetpoint}°C
            </span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Reefer Status: </span>
            <span style={{ fontWeight: 600, color: isAtRisk ? 'var(--status-warning)' : 'var(--status-success)' }}>
              {isAtRisk ? 'Compressor Anomaly' : 'Nominal Cycle'}
            </span>
          </div>
        </div>
      </div>

      {/* Transit & Transporter Metadata Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {/* Route Details */}
        <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-main)', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.75rem', color: 'var(--brand-cyan)' }}>
            <Navigation size={16} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Route & Geo Position</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Origin: </span>
              <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{shipment.route.origin}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Destination: </span>
              <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{shipment.route.destination}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Current Waypoint: </span>
              <span style={{ color: 'var(--brand-blue)', fontWeight: 600 }}>{shipment.route.currentGeo}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem', paddingTop: '0.45rem', borderTop: '1px solid var(--border-subtle)' }}>
              <span>ETA: <strong style={{ color: isAtRisk ? 'var(--status-danger)' : 'var(--text-main)' }}>{shipment.eta}</strong></span>
              <span>Remaining: <strong>{shipment.route.distanceRemainingKm} km</strong></span>
            </div>
          </div>
        </div>

        {/* Transporter Details */}
        <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-main)', borderRadius: '10px', padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.75rem', color: 'var(--brand-cyan)' }}>
            <Truck size={16} />
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Carrier & Driver Asset</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.8rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Logistics Partner: </span>
              <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{shipment.transporter.company}</span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Vehicle Reg: </span>
              <span className="mono" style={{ fontWeight: 600 }}>{shipment.transporter.vehicleNo}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Driver: </span>
                <span style={{ fontWeight: 600 }}>{shipment.transporter.driverName}</span>
              </div>
              <a 
                href={`tel:${shipment.transporter.driverPhone}`}
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.3rem', 
                  fontSize: '0.75rem', 
                  color: 'var(--brand-cyan)', 
                  textDecoration: 'none',
                  backgroundColor: 'rgba(6, 182, 212, 0.1)',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '6px'
                }}
              >
                <Phone size={12} />
                {shipment.transporter.driverPhone}
              </a>
            </div>
            <div style={{ marginTop: '0.25rem', paddingTop: '0.45rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between' }}>
              <span>Reefer Model: <strong>{shipment.transporter.reeferModel}</strong></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--status-success)' }}>
                <ShieldCheck size={14} /> FSSAI Verified
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};