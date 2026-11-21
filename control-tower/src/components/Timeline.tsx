import React from 'react';
import { TimelineEvent } from '../types';
import { 
  AlertTriangle, 
  AlertOctagon, 
  Info, 
  UserCheck, 
  UserX,
  Clock,
  Radio
} from 'lucide-react';

interface TimelineProps {
  events: TimelineEvent[];
}

export const Timeline: React.FC<TimelineProps> = ({ events }) => {
  const getEventIcon = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'ACTION_APPROVED':
        return <UserCheck size={16} color="#ffffff" />;
      case 'ACTION_DISMISSED':
        return <UserX size={15} color="#ffffff" />;
      case 'CRITICAL':
        return <AlertOctagon size={16} color="#ffffff" />;
      case 'WARNING':
        return <AlertTriangle size={16} color="#ffffff" />;
      case 'INFO':
      default:
        return <Info size={16} color="#ffffff" />;
    }
  };

  const getEventBadgeColor = (type: TimelineEvent['type']) => {
    switch (type) {
      case 'ACTION_APPROVED':
        return {
          bg: 'var(--status-success)',
          cardBg: 'var(--status-success-bg)',
          cardBorder: 'var(--status-success-border)',
        };
      case 'ACTION_DISMISSED':
        return {
          bg: 'var(--text-dim)',
          cardBg: 'var(--bg-primary)',
          cardBorder: 'var(--border-main)',
        };
      case 'CRITICAL':
        return {
          bg: 'var(--status-danger)',
          cardBg: 'var(--status-danger-bg)',
          cardBorder: 'var(--status-danger-border)',
        };
      case 'WARNING':
        return {
          bg: 'var(--status-warning)',
          cardBg: 'var(--status-warning-bg)',
          cardBorder: 'var(--status-warning-border)',
        };
      case 'INFO':
      default:
        return {
          bg: 'var(--brand-blue)',
          cardBg: 'var(--bg-primary)',
          cardBorder: 'var(--border-main)',
        };
    }
  };

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-main)', paddingBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clock size={18} color="var(--brand-cyan)" />
          <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Shipment Event Timeline</h3>
        </div>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {events.length} Recorded Events
        </span>
      </div>

      <div style={{ position: 'relative', paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Continuous vertical timeline connector line */}
        <div 
          style={{ 
            position: 'absolute', 
            top: '12px', 
            bottom: '12px', 
            left: '11px', 
            width: '2px', 
            backgroundColor: 'var(--border-main)' 
          }} 
        />

        {events.map((event) => {
          const styling = getEventBadgeColor(event.type);
          const isOperatorAction = event.type === 'ACTION_APPROVED';
          const isOperatorDismiss = event.type === 'ACTION_DISMISSED';

          return (
            <div key={event.id} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {/* Event node icon */}
              <div 
                style={{ 
                  position: 'absolute', 
                  left: '-1.5rem', 
                  top: '2px', 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  backgroundColor: styling.bg, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: isOperatorAction ? '0 0 10px rgba(16, 185, 129, 0.5)' : undefined,
                  zIndex: 2,
                }}
              >
                {getEventIcon(event.type)}
              </div>

              {/* Event details card */}
              <div 
                style={{ 
                  backgroundColor: styling.cardBg, 
                  border: `1px solid ${styling.cardBorder}`, 
                  borderRadius: '8px', 
                  padding: '0.85rem 1rem',
                  marginLeft: '0.5rem',
                  boxShadow: isOperatorAction ? '0 2px 12px rgba(16, 185, 129, 0.15)' : undefined
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.3rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: isOperatorAction ? 'var(--status-success)' : 'var(--text-main)' }}>
                      {event.title}
                    </span>
                    {isOperatorAction && (
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                        Approved by Operator
                      </span>
                    )}
                    {isOperatorDismiss && (
                      <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                        Dismissed
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    <span>{event.timestamp}</span>
                    <span>•</span>
                    <span className="mono">{event.relativeTime}</span>
                  </div>
                </div>

                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  {event.description}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  <Radio size={12} />
                  <span>Source: {event.source}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};