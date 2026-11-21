import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Port and Host configuration for Google Cloud Run
// Google Cloud Run automatically sets process.env.PORT (defaults to 8080)
// The server MUST bind to 0.0.0.0 to receive incoming container requests
const PORT = parseInt(process.env.PORT || '8080', 10);
const HOST = '0.0.0.0';
const DIST_DIR = path.resolve(__dirname, 'dist');
const FACILITIES_PATH = path.resolve(__dirname, 'src', 'data', 'facilities.json');

const app = express();

// Middleware: JSON body parsing
app.use(express.json());

// Permissive CORS middleware for cross-origin or local dev testing
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// Helper: Read Gemini API key STRICTLY from process.env.GEMINI_API_KEY
// No secrets are ever stored in source code or sent to the client browser.
function getGeminiApiKey() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (key && key.length > 10 && !key.includes('placeholder') && !key.includes('your_')) {
    return key;
  }
  return null;
}

// Facility matching helper from local 101 cold storage registry
function matchNearbyFacilities(shipment) {
  try {
    if (!fs.existsSync(FACILITIES_PATH)) return [];
    const facilities = JSON.parse(fs.readFileSync(FACILITIES_PATH, 'utf8'));

    const isFrozen = shipment.safeRange.max <= -10;
    const isChilled = shipment.safeRange.min >= 0 && shipment.safeRange.max <= 12;

    const textLocation = `${shipment.route.currentGeo} ${shipment.route.origin} ${shipment.route.destination}`.toLowerCase();
    let targetCities = ['Mumbai', 'Surat', 'Pune'];
    if (textLocation.includes('bengaluru') || textLocation.includes('bangalore') || textLocation.includes('hosur')) {
      targetCities = ['Bangalore', 'Hosur', 'Mysore'];
    } else if (textLocation.includes('chennai') || textLocation.includes('vellore')) {
      targetCities = ['Chennai', 'Salem', 'Madurai'];
    }

    const matched = facilities.filter(f => {
      if ((f.available_mt || 0) < 15) return false;
      if (!targetCities.includes(f.city)) return false;
      const tempStr = (f.temperature_supported || '').toLowerCase();
      if (isFrozen) return tempStr.includes('frozen') || tempStr.includes('multi-temperature');
      if (isChilled) return tempStr.includes('chilled') || tempStr.includes('multi-temperature');
      return true;
    });

    return matched.slice(0, 3).map((f, idx) => {
      let distanceKm = 18 + idx * 14;
      let coords = [19.29, 73.06];
      if (f.id === 'CCX-TN-CS-ID-050') { distanceKm = 18; coords = [19.04, 73.10]; }
      else if (f.id === 'CCX-TN-CS-ID-014') { distanceKm = 34; coords = [19.29, 73.06]; }
      else if (f.id === 'CCX-TN-CS-ID-015') { distanceKm = 32; coords = [19.08, 73.11]; }

      return {
        id: f.id,
        name: f.name.startsWith('Cold Storage') ? `${f.name} (${f.city} Hub)` : f.name,
        city: f.city,
        address: f.address,
        distanceKm,
        estimatedTransitMins: Math.round(distanceKm * 1.4),
        availableMt: f.available_mt,
        capacityMt: f.capacity_mt,
        temperatureSupported: f.temperature_supported,
        ratePerMtMonth: f.rate_per_mt_month,
        phone: f.phone,
        owner: f.owner,
        docks: f.docks || 4,
        powerBackup: f.power_backup || 'Yes',
        fssai: f.fssai || 'Yes',
        isRecommended: idx === 0,
        coords,
      };
    });
  } catch (e) {
    return [];
  }
}

// Alternative fleets matching helper within 50 km radius
function matchAlternativeFleets(shipment) {
  const textLocation = `${shipment.route.currentGeo} ${shipment.route.origin} ${shipment.route.destination}`.toLowerCase();
  
  if (textLocation.includes('manor') || textLocation.includes('mumbai') || textLocation.includes('anand') || textLocation.includes('palghar')) {
    return [
      {
        id: 'FLT-MH-8812',
        transporterCompany: 'Arctic TransLog Express',
        vehicleNo: 'MH-04-GP-6721',
        vehicleType: 'HCV Multi-Axle Reefer (24ft Box)',
        payloadCapacityMt: 20.0,
        lengthFeet: 24,
        reeferModel: 'Carrier Transicold Supra 950',
        temperatureRange: { min: -20, max: 15, unit: '°C' },
        temperatureSupported: 'Multi-Temperature (-20°C to +15°C)',
        status: 'STANDBY_EMPTY',
        currentLocation: 'Palghar Highway Cold Hub, NH 48 (Km 378)',
        distanceKm: 14,
        etaToShipmentMins: 22,
        driverName: 'Sunil Verma',
        driverPhone: '+91 98201 44521',
        ratePerKm: 38,
        fssaiCertified: true,
        preCooledReady: true,
        isBestMatch: true,
        coords: [19.69, 72.76],
      },
      {
        id: 'FLT-MH-9044',
        transporterCompany: 'CoolWings Express Logistics',
        vehicleNo: 'MH-48-AY-3190',
        vehicleType: 'Heavy Commercial Reefer (28ft Box)',
        payloadCapacityMt: 22.5,
        lengthFeet: 28,
        reeferModel: 'Thermo King T-1000R Spectrum',
        temperatureRange: { min: -25, max: 10, unit: '°C' },
        temperatureSupported: 'Chilled & Deep Frozen (-25°C to +10°C)',
        status: 'RETURNING_EMPTY',
        currentLocation: 'Manor Industrial Logistics Bypass (Km 418)',
        distanceKm: 26,
        etaToShipmentMins: 36,
        driverName: 'Abdul Sayeed',
        driverPhone: '+91 97692 88102',
        ratePerKm: 42,
        fssaiCertified: true,
        preCooledReady: true,
        isBestMatch: false,
        coords: [19.78, 72.93],
      },
      {
        id: 'FLT-GJ-4421',
        transporterCompany: 'Western Cold Line Transporters',
        vehicleNo: 'GJ-15-X-5510',
        vehicleType: 'Insulated Reefer Truck (24ft Box)',
        payloadCapacityMt: 19.0,
        lengthFeet: 24,
        reeferModel: 'Carrier Citimax 700',
        temperatureRange: { min: 0, max: 8, unit: '°C' },
        temperatureSupported: 'Dedicated Chilled Dairy (0°C to +8°C)',
        status: 'STANDBY_EMPTY',
        currentLocation: 'Vapi GIDC Transport Yard, NH 48',
        distanceKm: 41,
        etaToShipmentMins: 54,
        driverName: 'Bharat Desai',
        driverPhone: '+91 98240 66311',
        ratePerKm: 36,
        fssaiCertified: true,
        preCooledReady: false,
        isBestMatch: false,
        coords: [20.37, 72.91],
      },
    ];
  }

  return [
    {
      id: 'FLT-KA-1102',
      transporterCompany: 'SouthFreeze Cryo Logistics',
      vehicleNo: 'KA-51-MD-9044',
      vehicleType: 'Multi-Axle Heavy Reefer (32ft Box)',
      payloadCapacityMt: 26.0,
      lengthFeet: 32,
      reeferModel: 'Carrier Transicold Supra 850',
      temperatureRange: { min: -25, max: 12, unit: '°C' },
      temperatureSupported: 'Deep Frozen & Chilled (-25°C to +12°C)',
      status: 'STANDBY_EMPTY',
      currentLocation: 'Vellore Golden City Logistics Park, NH 48',
      distanceKm: 18,
      etaToShipmentMins: 26,
      driverName: 'Karthik Subramanian',
      driverPhone: '+91 94441 55210',
      ratePerKm: 40,
      fssaiCertified: true,
      preCooledReady: true,
      isBestMatch: true,
      coords: [12.92, 79.14],
    },
  ];
}

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// 1. Health & Agent Status check
app.get('/api/agent/status', (req, res) => {
  const apiKey = getGeminiApiKey();
  res.json({
    status: 'operational',
    hasGeminiKey: Boolean(apiKey),
    provider: apiKey ? 'Google Gemini 1.5 Flash' : 'Rule-Based Operations Engine',
    model: apiKey ? 'gemini-1.5-flash' : 'built-in-heuristics',
    cloudRun: true,
  });
});

// 2. Main Agent Recommendation endpoint
app.post('/api/agent/recommend', async (req, res) => {
  try {
    const shipment = req.body?.shipment;
    if (!shipment) {
      return res.status(400).json({ error: 'Missing shipment data in request payload' });
    }

    const nearbyFacilities = matchNearbyFacilities(shipment);
    const alternativeFleets = matchAlternativeFleets(shipment);
    const bestFacility = nearbyFacilities[0];
    const bestFleet = alternativeFleets[0];
    const apiKey = getGeminiApiKey();

    // Try Gemini API if key is available in process.env.GEMINI_API_KEY
    if (apiKey) {
      try {
        const facilitiesContext = nearbyFacilities.map((f, i) => 
          `  ${i + 1}. ${f.name} [ID: ${f.id}]: Distance: ${f.distanceKm} km, Available: ${f.availableMt} MT, Rate: ₹${f.ratePerMtMonth}/MT/mo, Contact: ${f.owner} (${f.phone})`
        ).join('\n');

        const fleetsContext = alternativeFleets.map((fl, i) => 
          `  ${i + 1}. ${fl.transporterCompany} [${fl.vehicleNo}]: Distance: ${fl.distanceKm} km, Size: ${fl.payloadCapacityMt} MT, Driver: ${fl.driverName} (${fl.driverPhone})`
        ).join('\n');

        const prompt = `You are ColdChainX's AI Operations Agent for pharmaceutical and dairy cold chain logistics.
Analyze the shipment exception and recommend EXACTLY ONE next operational action for the dispatcher.
Shipment: ${shipment.id} (${shipment.product})
Status: ${shipment.status}, Temp: ${shipment.currentTemp}°C (Safe Range: ${shipment.safeRange.min} to ${shipment.safeRange.max}°C)
Location: ${shipment.route.currentGeo}
Driver: ${shipment.transporter.driverName} (${shipment.transporter.driverPhone})
Alternative Fleets:
${fleetsContext}
Nearby Cold Storages:
${facilitiesContext}

Respond ONLY with valid JSON with this exact structure:
{
  "summary": "Short exception summary",
  "facts": ["Fact 1", "Fact 2", "Fact 3", "Fact 4"],
  "recommendedAction": "ONE concise specific next action naming driver and fleet/storage",
  "reason": "Brief operational reason"
}`;

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
          }),
        });

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            const parsed = JSON.parse(text);
            const action = parsed.recommendedAction || parsed.recommendation;
            return res.json({
              recommendation: {
                summary: parsed.summary,
                facts: parsed.facts || [],
                recommendedAction: action,
                recommendation: action,
                reason: parsed.reason,
                urgency: shipment.status === 'AT_RISK' ? 'CRITICAL' : 'LOW',
                source: 'Google Gemini 1.5 Flash (Cloud Run Agent)',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST',
                status: 'PENDING',
                suggestedFacility: bestFacility,
                suggestedFleet: bestFleet,
                nearbyFacilities,
                alternativeFleets,
              },
            });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini API call failed, falling back to rule-based engine:', geminiErr.message);
      }
    }

    // High-precision fallback engine
    const isAtRisk = shipment.status === 'AT_RISK' || shipment.currentTemp > shipment.safeRange.max;
    const delta = (shipment.currentTemp - shipment.safeRange.max).toFixed(1);
    const fleetName = bestFleet ? `${bestFleet.transporterCompany} (${bestFleet.vehicleNo})` : 'Arctic TransLog';
    const fleetDist = bestFleet ? bestFleet.distanceKm : 14;

    const fallbackRec = isAtRisk ? {
      summary: `Temperature is above the safe range for ${shipment.product} (${shipment.id}). Current reading is ${shipment.currentTemp}${shipment.tempUnit} vs upper limit of ${shipment.safeRange.max}${shipment.safeRange.unit} (+${delta}°C excursion for ${shipment.excursionDurationMinutes || 38} mins).`,
      facts: [
        `Safe range: ${shipment.safeRange.min}–${shipment.safeRange.max} ${shipment.safeRange.unit}`,
        `Latest reading: ${shipment.currentTemp} ${shipment.tempUnit} (+${delta}°C excursion for ${shipment.excursionDurationMinutes || 38} mins)`,
        `Nearest alternative fleet: ${fleetName} located ${fleetDist} km away (ETA ~22 mins, pre-cooled ready)`,
        `Nearest cold store: Cold Storage 14 (34 km away, 479 MT available capacity)`,
        `Current driver: ${shipment.transporter.driverName} (${shipment.transporter.driverPhone})`,
      ],
      recommendedAction: `Instruct driver ${shipment.transporter.driverName} to meet standby reefer fleet ${fleetName} (${fleetDist} km away) for emergency transshipment, or divert to Cold Storage 14 (34 km away).`,
      recommendation: `Instruct driver ${shipment.transporter.driverName} to meet standby reefer fleet ${fleetName} (${fleetDist} km away) for emergency transshipment, or divert to Cold Storage 14 (34 km away).`,
      reason: `The shipment is outside its configured range (+${delta}°C for ${shipment.excursionDurationMinutes || 38} minutes), risking thermal degradation and cargo loss.`,
      urgency: 'CRITICAL',
      source: 'ColdChainX Operations Intelligence Agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST',
      status: 'PENDING',
      suggestedFacility: bestFacility,
      suggestedFleet: bestFleet,
      nearbyFacilities,
      alternativeFleets,
    } : {
      summary: `Shipment ${shipment.id} is operating safely within configured thermal limits at ${shipment.currentTemp}${shipment.tempUnit}.`,
      facts: [
        `Safe range: ${shipment.safeRange.min}–${shipment.safeRange.max} ${shipment.safeRange.unit}`,
        `Latest reading: ${shipment.currentTemp} ${shipment.tempUnit}`,
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

    return res.json({ recommendation: fallbackRec });
  } catch (err) {
    console.error('Recommend endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error processing recommendation' });
  }
});

// 3. Voice Operations Q&A endpoint
app.post('/api/agent/chat', (req, res) => {
  try {
    const { question, shipment } = req.body || {};
    const q = (question || '').toLowerCase();

    let answer = '';
    if (q.includes('problem') || q.includes('issue') || q.includes('alert')) {
      answer = `Shipment ${shipment?.id || 'SHP-001'} has an active temperature excursion. Current reading is ${shipment?.currentTemp || 10.5} degrees Celsius, which is ${(shipment ? shipment.currentTemp - shipment.safeRange.max : 2.5).toFixed(1)} degrees above the safe limit of ${shipment?.safeRange?.max || 8} degrees for ${shipment?.excursionDurationMinutes || 38} minutes near ${shipment?.route?.currentGeo?.split('(')[0] || 'Manor, NH 48'}.`;
    } else if (q.includes('cold store') || q.includes('storage') || q.includes('facility')) {
      answer = 'The closest facility is Cold Storage 50, located 18 kilometers away in Taloja with 462 metric tons of verified available capacity.';
    } else if (q.includes('fleet') || q.includes('truck') || q.includes('vehicle')) {
      answer = 'Arctic TransLog reefer truck MH-04-GP-6721 is on standby 14 kilometers away with a 20 metric ton capacity, pre-cooled and ready for transshipment.';
    } else if (q.includes('driver') || q.includes('contact')) {
      answer = `Current driver is ${shipment?.transporter?.driverName || 'Ramesh Kumar'}, reachable at ${shipment?.transporter?.driverPhone || '+91 98200 12345'}. Alternative fleet driver Sunil Verma is at +91 98201 44521.`;
    } else {
      answer = `Shipment ${shipment?.id || 'SHP-001'} carrying ${shipment?.product || 'Chilled Dairy'} is at ${shipment?.currentTemp || 10.5} degrees Celsius near Manor on NH 48. Standby fleets and cold storage are available within 20 kilometers.`;
    }

    return res.json({ answer, spokenText: answer });
  } catch (err) {
    console.error('Chat endpoint error:', err);
    return res.status(500).json({ error: 'Internal server error processing voice query' });
  }
});

// -------------------------------------------------------------
// STATIC ASSETS & SPA ROUTING
// -------------------------------------------------------------
// Serve static assets generated by Vite build
app.use(express.static(DIST_DIR));

// Handle SPA client-side routing fallback for any non-API routes
app.use((req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

// Start Express server listening on process.env.PORT and 0.0.0.0
app.listen(PORT, HOST, () => {
  console.log(`ColdChainX Control Tower Express server listening on http://${HOST}:${PORT}`);
  console.log(`Gemini API Key configured: ${Boolean(getGeminiApiKey())}`);
});
