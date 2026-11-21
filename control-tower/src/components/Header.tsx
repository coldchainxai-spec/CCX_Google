import React from 'react';
import { 
  ShieldAlert, 
  RotateCcw, 
  Sun, 
  Moon, 
  Cpu, 
  Radio,
  Volume2
} from 'lucide-react';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onResetDemo: () => void;
  onToggleVoiceAssist: () => void;
  isVoiceOpen: boolean;
  apiStatus: {
    hasGeminiKey: boolean;
    provider: string;
  } | null;
  atRiskCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  onResetDemo,
  onToggleVoiceAssist,
  isVoiceOpen,
  apiStatus,
  atRiskCount,
}) => {
  return (
    <header className="header-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div 
          style={{ 
            width: '42px', 
            height: '42px', 
            borderRadius: '10px', 
            background: 'linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)'
          }}
        >
          <Radio size={24} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
              ColdChain<span style={{ color: 'var(--brand-cyan)' }}>X</span>
            </h1>
            <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
              CONTROL TOWER
            </span>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            AI Operations & Exception Monitoring Agent
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* At Risk Alert Pill */}
        {atRiskCount > 0 && (
          <div className="badge badge-danger pulse-dot" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem' }}>
            <ShieldAlert size={14} />
            <span>{atRiskCount} Shipment At Risk</span>
          </div>
        )}

        {/* Voice Assistant Toggle Button */}
        <button
          onClick={onToggleVoiceAssist}
          className={`btn ${isVoiceOpen ? 'btn-primary' : 'btn-secondary'}`}
          style={{ 
            padding: '0.45rem 0.85rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.45rem',
            boxShadow: isVoiceOpen ? '0 0 14px rgba(6, 182, 212, 0.4)' : undefined
          }}
          title="Open Voice Assistant to hear alerts and ask questions"
        >
          <Volume2 size={16} />
          <span>Voice Assist</span>
        </button>

        {/* Server AI Status Indicator */}
        <div 
          className="badge badge-neutral" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.45rem',
            padding: '0.35rem 0.75rem',
            border: apiStatus?.hasGeminiKey ? '1px solid var(--status-success-border)' : '1px solid var(--border-main)',
            backgroundColor: apiStatus?.hasGeminiKey ? 'var(--status-success-bg)' : 'var(--badge-bg)',
          }}
          title={apiStatus?.hasGeminiKey ? 'Gemini 1.5 Flash live API connected' : 'Local rule engine active'}
        >
          <Cpu size={14} color={apiStatus?.hasGeminiKey ? 'var(--status-success)' : 'var(--brand-cyan)'} />
          <span style={{ fontSize: '0.7rem', color: apiStatus?.hasGeminiKey ? 'var(--status-success)' : 'var(--text-muted)' }}>
            {apiStatus?.provider || 'AI Engine: Loading...'}
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          className="btn btn-ghost"
          style={{ padding: '0.45rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={16} color="var(--status-warning)" /> : <Moon size={16} color="var(--brand-blue)" />}
          <span style={{ fontSize: '0.75rem' }}>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>

        {/* Reset Demo Button */}
        <button
          onClick={onResetDemo}
          className="btn btn-secondary"
          style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem' }}
          title="Restore the demo to its initial simulated state (FR-7)"
        >
          <RotateCcw size={15} />
          <span>Reset Demo</span>
        </button>
      </div>
    </header>
  );
};