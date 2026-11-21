import React from 'react';
import { Shipment } from '../types';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Truck, 
  Thermometer, 
  Package
} from 'lucide-react';

interface DashboardProps {
  shipments: Shipment[];
  selectedShipmentId: string;
  onSelectShipment: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  shipments,
  selectedShipmentId,
  onSelectShipment,
}) => {
  const atRiskCount = shipments.filter((s) => s.status === 'AT_RISK').length;
  const normalCount = shipments.filter((s) => s.status === 'NORMAL').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* KPI Overview Cards */}
      <div className="grid-cols-kpi">
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div 
            style={{ 
              width: '44px', 
              height: '44px', 
              borderRadius: '10px', 
              background: 'rgba(2, 132, 199, 0.15)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            <Package size={22} color="var(--brand-blue)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Active Shipments
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{shipments.length}</div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: atRiskCount > 0 ? '4px solid var(--status-danger)' : undefined }}>
          <div 
            style={{ 
              width: '44px', 
              height: '44px', 
              borderRadius: '10px', 
              background: 'var(--status-danger-bg)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            <AlertTriangle size={22} color="var(--status-danger)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Exceptions (At Risk)
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: atRiskCount > 0 ? 'var(--status-danger)' : 'var(--text-main)' }}>
              {atRiskCount}
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div 
            style={{ 
              width: '44px', 
              height: '44px', 
              borderRadius: '10px', 
              background: 'var(--status-success-bg)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            <CheckCircle2 size={22} color="var(--status-success)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Thermal Safe & Normal
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--status-success)' }}>
              {normalCount}
            </div>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div 
            style={{ 
              width: '44px', 
              height: '44px', 
              borderRadius: '10px', 
              background: 'rgba(6, 182, 212, 0.15)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}
          >
            <Clock size={22} color="var(--brand-cyan)" />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
              Telemetry Frequency
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '2px' }}>
              60s Real-time
            </div>
          </div>
        </div>
      </div>

      {/* Shipment List Section */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', padding: '0 0.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Live In-Transit Cold Chain Fleet</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Select a shipment below to inspect telemetric sensor readings, route progress, and AI operations analysis.
            </p>
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            Showing {shipments.length} shipments
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {shipments.map((shipment) => {
            const isSelected = shipment.id === selectedShipmentId;
            const isAtRisk = shipment.status === 'AT_RISK';

            return (
              <div
                key={shipment.id}
                onClick={() => onSelectShipment(shipment.id)}
                className={`card card-clickable ${isSelected ? 'card-selected' : ''}`}
                style={{
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  borderLeft: isAtRisk ? '4px solid var(--status-danger)' : '4px solid var(--status-success)',
                  backgroundColor: isSelected ? 'var(--bg-surface-hover)' : undefined,
                }}
              >
                {/* ID & Product */}
                <div style={{ minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                    <span className="mono" style={{ fontWeight: 700, fontSize: '0.9rem', color: isSelected ? 'var(--brand-cyan)' : 'var(--text-main)' }}>
                      {shipment.id}
                    </span>
                    <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                      {shipment.category}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                    {shipment.product}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {shipment.quantity}
                  </div>
                </div>

                {/* Route */}
                <div style={{ flex: 1, minWidth: '180px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <MapPin size={13} color="var(--brand-blue)" />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                      {shipment.route.origin.split(',')[0]} → {shipment.route.destination.split(',')[0]}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    Near {shipment.route.currentGeo.split('(')[0]}
                  </div>
                </div>

                {/* Transporter */}
                <div style={{ minWidth: '160px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <Truck size={13} />
                    <span style={{ fontWeight: 500 }}>{shipment.transporter.company.split(' ')[0]}</span>
                  </div>
                  <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    {shipment.transporter.vehicleNo.split(' ')[0]}
                  </div>
                </div>

                {/* Temperature Reading */}
                <div style={{ minWidth: '140px', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Thermometer size={16} color={isAtRisk ? 'var(--status-danger)' : 'var(--status-success)'} />
                    <span 
                      className="mono" 
                      style={{ 
                        fontSize: '1.15rem', 
                        fontWeight: 700, 
                        color: isAtRisk ? 'var(--status-danger)' : 'var(--status-success)' 
                      }}
                    >
                      {shipment.currentTemp > 0 ? `+${shipment.currentTemp}` : shipment.currentTemp}{shipment.tempUnit}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Safe: {shipment.safeRange.min} to {shipment.safeRange.max}{shipment.safeRange.unit}
                  </div>
                </div>

                {/* Status Badge */}
                <div style={{ minWidth: '110px', textAlign: 'right' }}>
                  {isAtRisk ? (
                    <span className="badge badge-danger">
                      <AlertTriangle size={12} />
                      At Risk
                    </span>
                  ) : (
                    <span className="badge badge-success">
                      <CheckCircle2 size={12} />
                      Normal
                    </span>
                  )}
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    ETA: {shipment.eta.split('(')[0]}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};