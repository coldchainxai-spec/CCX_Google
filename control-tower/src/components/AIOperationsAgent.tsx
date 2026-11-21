import React from 'react';
import { AgentRecommendation, Shipment } from '../types';
import { 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  ShieldAlert, 
  CheckCheck, 
  AlertCircle,
  Loader2,
  BrainCircuit,
  HelpCircle,
  FileText,
  RotateCcw,
  Volume2
} from 'lucide-react';

interface AIOperationsAgentProps {
  shipment: Shipment;
  recommendation?: AgentRecommendation;
  isLoading: boolean;
  errorMessage?: string | null;
  onGenerateRecommendation: () => void;
  onApproveRecommendation: () => void;
  onDismissRecommendation: () => void;
  onSpeakBriefing?: () => void;
}

export const AIOperationsAgent: React.FC<AIOperationsAgentProps> = ({
  shipment,
  recommendation,
  isLoading,
  errorMessage,
  onGenerateRecommendation,
  onApproveRecommendation,
  onDismissRecommendation,
  onSpeakBriefing,
}) => {
  const isApproved = recommendation?.status === 'APPROVED';
  const isDismissed = recommendation?.status === 'DISMISSED';
  const isPending = recommendation?.status === 'PENDING';

  // Validate response structure before rendering (FR-4 & Step 5)
  const isValidRecommendation = Boolean(
    recommendation &&
    typeof recommendation.summary === 'string' &&
    Array.isArray(recommendation.facts) &&
    (typeof recommendation.recommendedAction === 'string' || typeof recommendation.recommendation === 'string') &&
    typeof recommendation.reason === 'string'
  );

  const displayAction = recommendation?.recommendedAction || recommendation?.recommendation || '';

  return (
    <div 
      className="card" 
      style={{ 
        border: '1px solid rgba(6, 182, 212, 0.4)', 
        background: 'linear-gradient(180deg, var(--bg-surface) 0%, rgba(6, 182, 212, 0.03) 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Top Banner & Guardrail Badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-main)', paddingBottom: '0.85rem', marginBottom: '1rem' }}>
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
            <BrainCircuit size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              AI Operations Agent
              <span className="badge badge-neutral" style={{ fontSize: '0.65rem', textTransform: 'none' }}>
                Advisory Only
              </span>
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Assists operators with instant exception synthesis & single recommended next step
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {onSpeakBriefing && (
            <button
              onClick={onSpeakBriefing}
              className="btn btn-secondary"
              style={{ padding: '0.45rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              title="Speak alert problem in short"
            >
              <Volume2 size={14} color="var(--brand-cyan)" />
              <span>Voice Alert</span>
            </button>
          )}

          <button
            onClick={onGenerateRecommendation}
            disabled={isLoading}
            className="btn btn-primary"
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
          >
            {isLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} />
                <span>{recommendation ? 'Re-Analyze Shipment' : 'Analyze Exception'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Advisory Guardrail Notice (BRD Section 7) */}
      <div 
        style={{ 
          backgroundColor: 'rgba(2, 132, 199, 0.08)', 
          border: '1px solid rgba(2, 132, 199, 0.25)', 
          borderRadius: '8px', 
          padding: '0.65rem 0.85rem', 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.5rem',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          marginBottom: '1rem'
        }}
      >
        <HelpCircle size={14} color="var(--brand-cyan)" style={{ flexShrink: 0 }} />
        <span>
          <strong>Operational Guardrail:</strong> Recommendations are strictly advisory. The agent will not contact any party, execute external bookings, or modify dispatch without operator confirmation.
        </span>
      </div>

      {/* State: Error with Retry */}
      {errorMessage && !isLoading && (
        <div 
          style={{ 
            backgroundColor: 'var(--status-danger-bg)', 
            border: '1px solid var(--status-danger-border)', 
            borderRadius: '8px', 
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            marginBottom: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={20} color="var(--status-danger)" />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--status-danger)' }}>
                Analysis Request Failed
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {errorMessage}
              </div>
            </div>
          </div>
          <button
            onClick={onGenerateRecommendation}
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.78rem' }}
          >
            <RotateCcw size={13} />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* State 1: Loading */}
      {isLoading && (
        <div style={{ padding: '2.5rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
          <Loader2 size={32} className="animate-spin" color="var(--brand-cyan)" />
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
            Querying Server-Side Operations Agent...
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '400px' }}>
            Evaluating telemetric temperature readings, safe parameters, transporter contact points, and nearest cold-chain response assets.
          </div>
        </div>
      )}

      {/* State 2: No recommendation yet */}
      {!isLoading && !recommendation && !errorMessage && (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={28} color="var(--text-dim)" />
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
            No Analysis Active for {shipment.id}
          </div>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', maxWidth: '420px' }}>
            Click <strong>"Analyze Exception"</strong> above to generate an automated operational briefing and single recommended response.
          </p>
        </div>
      )}

      {/* State 3: Valid Recommendation Available */}
      {!isLoading && isValidRecommendation && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Section A: Exception Summary (FR-4.1) */}
          <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-main)', borderRadius: '8px', padding: '0.9rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--brand-cyan)', textTransform: 'uppercase', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <ShieldAlert size={14} />
              1. Exception Summary
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: 1.5 }}>
              {recommendation!.summary}
            </p>
          </div>

          {/* Section B: Facts Used (FR-4.2) */}
          <div style={{ backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-main)', borderRadius: '8px', padding: '0.9rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              2. Relevant Shipment Facts Evaluated
            </div>
            <ul style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {recommendation!.facts.map((fact, index) => (
                <li key={index} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {fact}
                </li>
              ))}
            </ul>
          </div>

          {/* Section C: Single Recommended Next Action (FR-4.3 & FR-4.4) */}
          <div 
            style={{ 
              backgroundColor: 'rgba(6, 182, 212, 0.06)', 
              border: '1.5px solid var(--brand-cyan)', 
              borderRadius: '10px', 
              padding: '1.1rem' 
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand-cyan)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Sparkles size={14} />
                3. Recommended Next Operational Action
              </div>
              <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                Urgency: {recommendation!.urgency || 'HIGH'}
              </span>
            </div>

            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem', lineHeight: 1.4 }}>
              {displayAction}
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px dashed var(--border-main)', paddingTop: '0.5rem' }}>
              <strong style={{ color: 'var(--text-main)' }}>Operational Rationale: </strong>
              {recommendation!.reason}
            </div>
          </div>

          {/* Section D: Human Approval Controls (FR-5 & Step 6) */}
          {isPending && (
            <div 
              style={{ 
                backgroundColor: 'var(--bg-secondary)', 
                border: '1px solid var(--border-main)', 
                borderRadius: '10px', 
                padding: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap'
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  Operator Decision Required
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Approve to log this response into the shipment event timeline.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <button
                  onClick={onDismissRecommendation}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 0.9rem', fontSize: '0.8rem' }}
                >
                  <XCircle size={15} color="var(--text-dim)" />
                  <span>Dismiss</span>
                </button>

                <button
                  onClick={onApproveRecommendation}
                  className="btn btn-success"
                  style={{ padding: '0.5rem 1.1rem', fontSize: '0.825rem' }}
                >
                  <CheckCircle size={16} />
                  <span>Approve Recommendation</span>
                </button>
              </div>
            </div>
          )}

          {/* Section E: Decision Status Banners */}
          {isApproved && (
            <div 
              style={{ 
                backgroundColor: 'var(--status-success-bg)', 
                border: '1px solid var(--status-success-border)', 
                borderRadius: '8px', 
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCheck size={18} color="var(--status-success)" />
                <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--status-success)' }}>
                  Action Approved by Operator & Recorded in Shipment Event Timeline
                </span>
              </div>
              <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                {recommendation!.timestamp}
              </span>
            </div>
          )}

          {isDismissed && (
            <div 
              style={{ 
                backgroundColor: 'var(--bg-secondary)', 
                border: '1px solid var(--border-main)', 
                borderRadius: '8px', 
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={16} color="var(--text-dim)" />
                <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  Recommendation Dismissed by Operator (Recorded in Timeline)
                </span>
              </div>
            </div>
          )}

          {/* Attribution Footer */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-dim)', paddingTop: '0.25rem' }}>
            <span>Source: {recommendation!.source || 'ColdChainX Operations Intelligence'}</span>
            <span>Generated: {recommendation!.timestamp}</span>
          </div>
        </div>
      )}
    </div>
  );
};