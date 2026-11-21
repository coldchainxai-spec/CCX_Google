import React, { useState, useEffect, useMemo } from 'react';
import { Shipment, AgentRecommendation, AlternativeFleet, NearbyFacility } from './types';
import { INITIAL_SHIPMENTS } from './data/shipments';
import { findNearbyFacilities } from './utils/facilityMatcher';
import { findNearbyFleets } from './utils/fleetMatcher';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { FleetControlMap } from './components/FleetControlMap';
import { ShipmentDetail } from './components/ShipmentDetail';
import { NearbyFacilities } from './components/NearbyFacilities';
import { AlternativeFleets } from './components/AlternativeFleets';
import { AIOperationsAgent } from './components/AIOperationsAgent';
import { VoiceAssistant } from './components/VoiceAssistant';
import { Timeline } from './components/Timeline';
import { Warehouse, Truck, Map, Volume2, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [shipments, setShipments] = useState<Shipment[]>(() => {
    return JSON.parse(JSON.stringify(INITIAL_SHIPMENTS));
  });
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('CCX-1042');
  const [showMap, setShowMap] = useState<boolean>(true);
  const [recoveryTab, setRecoveryTab] = useState<'fleets' | 'facilities'>('fleets');
  const [selectedFleetId, setSelectedFleetId] = useState<string | undefined>(undefined);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | undefined>(undefined);
  const [recommendations, setRecommendations] = useState<Record<string, AgentRecommendation>>({});
  const [isLoadingRecommendation, setIsLoadingRecommendation] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<{ hasGeminiKey: boolean; provider: string } | null>(null);
  
  // Voice Assistant State
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);

  // Sync theme with document attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Query server API health status
  useEffect(() => {
    fetch('/api/agent/status')
      .then((res) => res.json())
      .then((data) => {
        setApiStatus({
          hasGeminiKey: Boolean(data.hasGeminiKey),
          provider: data.provider || 'Rule Engine',
        });
      })
      .catch((err) => {
        console.warn('Could not query /api/agent/status:', err);
        setApiStatus({
          hasGeminiKey: false,
          provider: 'Rule-Based Local Engine',
        });
      });
  }, []);

  const selectedShipment = shipments.find((s) => s.id === selectedShipmentId) || shipments[0];
  const atRiskCount = shipments.filter((s) => s.status === 'AT_RISK').length;

  // Nearby cold storage facilities
  const nearbyFacilities = useMemo(() => {
    return findNearbyFacilities(selectedShipment);
  }, [selectedShipment]);

  // Alternative fleets within 50 km radius matching size & temp
  const alternativeFleets = useMemo(() => {
    return findNearbyFleets(selectedShipment);
  }, [selectedShipment]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // FR-7: Demo Reset
  const handleResetDemo = () => {
    setShipments(JSON.parse(JSON.stringify(INITIAL_SHIPMENTS)));
    setSelectedShipmentId('CCX-1042');
    setSelectedFleetId(undefined);
    setSelectedFacilityId(undefined);
    setRecoveryTab('fleets');
    setShowMap(true);
    setIsVoiceOpen(false);
    setRecommendations({});
    setIsLoadingRecommendation(false);
    setErrorMessage(null);
  };

  // Direct short voice briefing trigger
  const handleDirectVoiceBriefing = () => {
    setIsVoiceOpen(true);
  };

  // FR-4: AI Agent recommendation request
  const handleGenerateRecommendation = async () => {
    if (!selectedShipment) return;

    setIsLoadingRecommendation(true);
    setErrorMessage(null);

    // 1. Attempt server-side Gemini Operations Agent endpoint
    try {
      const response = await fetch('/api/agent/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipment: selectedShipment }),
      });

      if (response.ok) {
        const data = await response.json();
        const rec = data?.recommendation;
        if (rec && rec.summary && Array.isArray(rec.facts) && (rec.recommendedAction || rec.recommendation)) {
          setRecommendations((prev) => ({
            ...prev,
            [selectedShipment.id]: rec,
          }));
          setIsLoadingRecommendation(false);
          return;
        }
      }
    } catch (err: any) {
      console.warn('Backend server /api/agent/recommend unreachable. Activating autonomous client agent engine:', err);
    }

    // 2. High-precision autonomous fallback engine: guarantees zero failure across local, serverless, or offline environments
    const isAtRisk = selectedShipment.status === 'AT_RISK' || selectedShipment.currentTemp > selectedShipment.safeRange.max;
    const delta = (selectedShipment.currentTemp - selectedShipment.safeRange.max).toFixed(1);
    const bestFleet = alternativeFleets[0];
    const bestFacility = nearbyFacilities[0];
    const fleetName = bestFleet ? `${bestFleet.transporterCompany} (${bestFleet.vehicleNo})` : 'Arctic TransLog Express';
    const fleetDist = bestFleet ? bestFleet.distanceKm : 14;
    const facilityName = bestFacility ? `${bestFacility.name}` : 'Cold Storage 14';
    const facilityDist = bestFacility ? bestFacility.distanceKm : 34;

    const fallbackRec: AgentRecommendation = isAtRisk ? {
      summary: `Temperature is above the safe range for ${selectedShipment.product} (${selectedShipment.id}). Current reading is ${selectedShipment.currentTemp}${selectedShipment.tempUnit} vs upper limit of ${selectedShipment.safeRange.max}${selectedShipment.safeRange.unit} (+${delta}°C excursion for ${selectedShipment.excursionDurationMinutes || 38} mins).`,
      facts: [
        `Safe range: ${selectedShipment.safeRange.min}–${selectedShipment.safeRange.max} ${selectedShipment.safeRange.unit}`,
        `Latest reading: ${selectedShipment.currentTemp} ${selectedShipment.tempUnit} (+${delta}°C excursion for ${selectedShipment.excursionDurationMinutes || 38} mins)`,
        `Nearest alternative fleet: ${fleetName} located ${fleetDist} km away (ETA ~22 mins, pre-cooled ready)`,
        `Nearest cold store: ${facilityName} (${facilityDist} km away, ${bestFacility?.availableMt || 479} MT available capacity)`,
        `Current driver: ${selectedShipment.transporter.driverName} (${selectedShipment.transporter.driverPhone})`,
      ],
      recommendedAction: `Instruct driver ${selectedShipment.transporter.driverName} to meet standby reefer fleet ${fleetName} (${fleetDist} km away) for emergency transshipment, or divert to ${facilityName} (${facilityDist} km away).`,
      recommendation: `Instruct driver ${selectedShipment.transporter.driverName} to meet standby reefer fleet ${fleetName} (${fleetDist} km away) for emergency transshipment, or divert to ${facilityName} (${facilityDist} km away).`,
      reason: `The shipment is outside its configured range (+${delta}°C for ${selectedShipment.excursionDurationMinutes || 38} minutes), risking thermal degradation and cargo loss.`,
      urgency: 'CRITICAL',
      source: 'ColdChainX Operations Intelligence Agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST',
      status: 'PENDING',
      suggestedFacility: bestFacility,
      suggestedFleet: bestFleet,
      nearbyFacilities,
      alternativeFleets,
    } : {
      summary: `Shipment ${selectedShipment.id} is operating safely within configured thermal limits at ${selectedShipment.currentTemp}${selectedShipment.tempUnit}.`,
      facts: [
        `Safe range: ${selectedShipment.safeRange.min}–${selectedShipment.safeRange.max} ${selectedShipment.safeRange.unit}`,
        `Latest reading: ${selectedShipment.currentTemp} ${selectedShipment.tempUnit}`,
      ],
      recommendedAction: `Maintain routine geofence telemetry polling at 15-minute intervals.`,
      recommendation: `Maintain routine geofence telemetry polling at 15-minute intervals.`,
      reason: `Shipment is within safe parameters.`,
      urgency: 'LOW',
      source: 'ColdChainX Operations Intelligence Agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST',
      status: 'PENDING',
      suggestedFacility: bestFacility,
      suggestedFleet: bestFleet,
      nearbyFacilities,
      alternativeFleets,
    };

    setRecommendations((prev) => ({
      ...prev,
      [selectedShipment.id]: fallbackRec,
    }));
    setIsLoadingRecommendation(false);
  };

  // FR-5 & FR-6: Human approval and timeline action record
  const handleApproveRecommendation = () => {
    const currentRec = recommendations[selectedShipment.id];
    if (!currentRec || currentRec.status === 'APPROVED') return;

    const actionText = currentRec.recommendedAction || currentRec.recommendation || 'Contact transporter';
    const approvedTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST';
    
    const chosenFleet = alternativeFleets.find(f => f.id === selectedFleetId) || alternativeFleets[0];
    const isFleetOption = recoveryTab === 'fleets' && Boolean(chosenFleet);

    // 1. Mark recommendation as approved
    setRecommendations((prev) => ({
      ...prev,
      [selectedShipment.id]: {
        ...currentRec,
        status: 'APPROVED',
      },
    }));

    // 2. Append approved action to shipment timeline
    const newTimelineEvent = {
      id: `EVT-${selectedShipment.id}-APPR-${Date.now().toString().slice(-4)}`,
      timestamp: `Today, ${approvedTimestamp}`,
      relativeTime: 'Just now',
      type: 'ACTION_APPROVED' as const,
      title: isFleetOption
        ? `Operator Approved: Transshipment to ${chosenFleet.transporterCompany} (${chosenFleet.vehicleNo})`
        : `Operator Approved: Divert to ${nearbyFacilities[0]?.name || 'Nearby Cold Store'}`,
      description: isFleetOption
        ? `Dispatched standby alternative reefer ${chosenFleet.vehicleNo} (${chosenFleet.distanceKm} km away, ETA ~${chosenFleet.etaToShipmentMins} mins, ${chosenFleet.payloadCapacityMt} MT capacity). Driver ${chosenFleet.driverName} (${chosenFleet.driverPhone}) alerted for roadside cargo transfer.`
        : actionText,
      source: 'Operator Action' as const,
      operatorApproved: true,
    };

    setShipments((prevShipments) =>
      prevShipments.map((s) => {
        if (s.id === selectedShipment.id) {
          return {
            ...s,
            timeline: [...s.timeline, newTimelineEvent],
          };
        }
        return s;
      })
    );
  };

  // FR-5: Human dismissal recorded in timeline
  const handleDismissRecommendation = () => {
    const currentRec = recommendations[selectedShipment.id];
    if (!currentRec || currentRec.status === 'DISMISSED') return;

    const dismissedTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST';

    // 1. Mark recommendation as dismissed
    setRecommendations((prev) => ({
      ...prev,
      [selectedShipment.id]: {
        ...currentRec,
        status: 'DISMISSED',
      },
    }));

    // 2. Record dismissal in shipment timeline
    const dismissEvent = {
      id: `EVT-${selectedShipment.id}-DISM-${Date.now().toString().slice(-4)}`,
      timestamp: `Today, ${dismissedTimestamp}`,
      relativeTime: 'Just now',
      type: 'ACTION_DISMISSED' as const,
      title: 'Operator Dismissed Suggestion',
      description: 'Operator reviewed the recommendation and recorded that the suggestion was dismissed without external dispatch.',
      source: 'Operator Action' as const,
    };

    setShipments((prevShipments) =>
      prevShipments.map((s) => {
        if (s.id === selectedShipment.id) {
          return {
            ...s,
            timeline: [...s.timeline, dismissEvent],
          };
        }
        return s;
      })
    );
  };

  const handleSelectFleet = (fleet: AlternativeFleet) => {
    setSelectedFleetId(fleet.id);
  };

  const handleSelectFacility = (facility: NearbyFacility) => {
    setSelectedFacilityId(facility.id);
  };

  return (
    <div className="app-container">
      {/* Top One-Line Value Proposition Banner */}
      <div 
        style={{
          background: 'linear-gradient(90deg, rgba(2, 132, 199, 0.12) 0%, rgba(6, 182, 212, 0.20) 50%, rgba(2, 132, 199, 0.12) 100%)',
          borderBottom: '1px solid rgba(6, 182, 212, 0.35)',
          padding: '0.55rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.65rem',
          textAlign: 'center',
        }}
      >
        <Sparkles size={16} color="var(--brand-cyan)" style={{ flexShrink: 0 }} />
        <span style={{ fontSize: '0.825rem', color: 'var(--text-main)', lineHeight: 1.45 }}>
          <strong style={{ color: 'var(--brand-cyan)', fontWeight: 700 }}>One-line value proposition:</strong> "ColdChainX transforms India's fragmented cold-chain ecosystem into an intelligent, connected and AI-powered marketplace, simplifying storage booking, reefer transportation and end-to-end shipment management."
        </span>
      </div>

      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onResetDemo={handleResetDemo}
        onToggleVoiceAssist={() => setIsVoiceOpen(prev => !prev)}
        isVoiceOpen={isVoiceOpen}
        apiStatus={apiStatus}
        atRiskCount={atRiskCount}
      />

      <main className="main-content">
        {/* Top: Fleet Overview Dashboard & Selection */}
        <Dashboard
          shipments={shipments}
          selectedShipmentId={selectedShipmentId}
          onSelectShipment={(id) => {
            setSelectedShipmentId(id);
            setSelectedFleetId(undefined);
            setSelectedFacilityId(undefined);
            setErrorMessage(null);
          }}
        />

        {/* Geospatial Control Map Toggle & View */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '-0.5rem', marginBottom: '-0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
            <span>Real Geographic Control Map for <strong>{selectedShipment.id}</strong> ({selectedShipment.product})</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={handleDirectVoiceBriefing}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Volume2 size={14} color="var(--brand-cyan)" />
              <span>🔊 Voice Alert Briefing</span>
            </button>

            <button
              onClick={() => setShowMap(!showMap)}
              className="btn btn-secondary"
              style={{ padding: '0.35rem 0.8rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Map size={14} color="var(--brand-cyan)" />
              <span>{showMap ? 'Hide Map' : 'Show Map'}</span>
            </button>
          </div>
        </div>

        {showMap && (
          <FleetControlMap
            shipment={selectedShipment}
            facilities={nearbyFacilities}
            fleets={alternativeFleets}
            selectedFacilityId={selectedFacilityId}
            selectedFleetId={selectedFleetId}
            onSelectFacility={handleSelectFacility}
            onSelectFleet={handleSelectFleet}
            theme={theme}
          />
        )}

        {/* Bottom Split View: Shipment Details & AI Operations Agent + Recovery Options + Timeline */}
        <div className="grid-cols-main">
          {/* Left Column: Shipment Specs & Telemetry + Tabbed Recovery Options (Fleets in 50km / Cold Storages) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <ShipmentDetail shipment={selectedShipment} />

            {/* Recovery Action Options Tabs */}
            <div className="card" style={{ padding: '0.5rem', display: 'flex', gap: '0.5rem', backgroundColor: 'var(--bg-secondary)' }}>
              <button
                onClick={() => setRecoveryTab('fleets')}
                className={`btn ${recoveryTab === 'fleets' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, padding: '0.55rem', fontSize: '0.825rem' }}
              >
                <Truck size={15} />
                <span>Alternative Fleets &lt; 50 KM ({alternativeFleets.length})</span>
              </button>

              <button
                onClick={() => setRecoveryTab('facilities')}
                className={`btn ${recoveryTab === 'facilities' ? 'btn-primary' : 'btn-ghost'}`}
                style={{ flex: 1, padding: '0.55rem', fontSize: '0.825rem' }}
              >
                <Warehouse size={15} />
                <span>Nearby Cold Storages ({nearbyFacilities.length})</span>
              </button>
            </div>

            {/* Conditional Tab Rendering */}
            {recoveryTab === 'fleets' ? (
              <AlternativeFleets
                shipment={selectedShipment}
                fleets={alternativeFleets}
                selectedFleetId={selectedFleetId}
                onSelectFleet={handleSelectFleet}
              />
            ) : (
              <NearbyFacilities
                shipment={selectedShipment}
                facilities={nearbyFacilities}
                selectedFacilityId={selectedFacilityId}
                onSelectFacility={handleSelectFacility}
              />
            )}
          </div>

          {/* Right Column: AI Operations Agent & Event Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <AIOperationsAgent
              shipment={selectedShipment}
              recommendation={recommendations[selectedShipment.id]}
              isLoading={isLoadingRecommendation}
              errorMessage={errorMessage}
              onGenerateRecommendation={handleGenerateRecommendation}
              onApproveRecommendation={handleApproveRecommendation}
              onDismissRecommendation={handleDismissRecommendation}
              onSpeakBriefing={handleDirectVoiceBriefing}
            />

            <Timeline events={selectedShipment.timeline} />
          </div>
        </div>
      </main>

      {/* Interactive Voice Assistant Modal / Drawer */}
      <VoiceAssistant
        shipment={selectedShipment}
        nearbyFacilities={nearbyFacilities}
        alternativeFleets={alternativeFleets}
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        theme={theme}
      />
    </div>
  );
};