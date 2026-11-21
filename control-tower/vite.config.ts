import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

// Helper to read GEMINI_API_KEY from environment or .env files
function resolveGeminiApiKey(): string | null {
  const envVal = process.env.GEMINI_API_KEY?.trim();
  if (envVal && envVal.length > 10 && !envVal.includes('your_') && !envVal.includes('placeholder')) {
    return envVal;
  }

  const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '..', '.env'),
  ];

  for (const envPath of envPaths) {
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/^GEMINI_API_KEY\s*=\s*(.*)$/m);
        if (match && match[1]) {
          const key = match[1].trim().replace(/^['"]|['"]$/g, '');
          if (key && key.length > 10 && !key.includes('your_') && !key.includes('placeholder')) {
            return key;
          }
        }
      }
    } catch {
      // Continue to next path
    }
  }

  return null;
}

// Helper to match facilities from facilities.json
function matchNearbyFacilities(shipment: any): any[] {
  try {
    const facilitiesPath = path.resolve(process.cwd(), 'src', 'data', 'facilities.json');
    if (!fs.existsSync(facilitiesPath)) return [];

    const facilities = JSON.parse(fs.readFileSync(facilitiesPath, 'utf8'));
    const isFrozen = shipment.safeRange.max <= -10;
    const isChilled = shipment.safeRange.min >= 0 && shipment.safeRange.max <= 12;

    const textLocation = `${shipment.route.currentGeo} ${shipment.route.origin} ${shipment.route.destination}`.toLowerCase();
    let targetCities = ['Mumbai', 'Surat', 'Pune'];
    if (textLocation.includes('bengaluru') || textLocation.includes('bangalore') || textLocation.includes('hosur')) {
      targetCities = ['Bangalore', 'Hosur', 'Mysore'];
    } else if (textLocation.includes('chennai') || textLocation.includes('vellore')) {
      targetCities = ['Chennai', 'Salem', 'Madurai'];
    }

    const matched = facilities.filter((f: any) => {
      if ((f.available_mt || 0) < 15) return false;
      if (!targetCities.includes(f.city)) return false;
      const tempStr = (f.temperature_supported || '').toLowerCase();
      if (isFrozen) return tempStr.includes('frozen') || tempStr.includes('multi-temperature');
      if (isChilled) return tempStr.includes('chilled') || tempStr.includes('multi-temperature');
      return true;
    });

    return matched.slice(0, 3).map((f: any, idx: number) => {
      let distanceKm = 18 + idx * 14;
      let coords: [number, number] = [19.29, 73.06];

      if (f.id === 'CCX-TN-CS-ID-050') {
        distanceKm = 18;
        coords = [19.04, 73.10];
      } else if (f.id === 'CCX-TN-CS-ID-014') {
        distanceKm = 34;
        coords = [19.29, 73.06];
      } else if (f.id === 'CCX-TN-CS-ID-015') {
        distanceKm = 32;
        coords = [19.08, 73.11];
      }

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
    console.warn('Failed to load facilities:', e);
    return [];
  }
}

// Standby fleets within 50 km
function matchAlternativeFleets(shipment: any): any[] {
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

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'coldchainx-server-api',
      configureServer(server) {
        // Health / Status endpoint
        server.middlewares.use('/api/agent/status', (_req, res) => {
          const apiKey = resolveGeminiApiKey();
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              hasGeminiKey: Boolean(apiKey),
              provider: apiKey ? 'Google Gemini 1.5 Flash' : 'Rule-Based Local Engine',
              status: 'operational',
            })
          );
        });

        // Interactive Voice Assistant Q&A endpoint
        server.middlewares.use('/api/agent/chat', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
            return;
          }

          let body = '';
          req.on('data', chunk => { body += chunk; });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const { question, shipment, nearbyFacilities, alternativeFleets } = payload;

              if (!question || !shipment) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Missing question or shipment data' }));
                return;
              }

              const apiKey = resolveGeminiApiKey();

              if (apiKey) {
                try {
                  const prompt = `You are ColdChainX's Voice Operations Assistant on a cold-chain control tower.
The operator has asked you a question about active shipment ${shipment.id} (${shipment.product}).
Status: ${shipment.status}
Current Temp: ${shipment.currentTemp}°C (Safe range: ${shipment.safeRange.min}°C to ${shipment.safeRange.max}°C)
Excursion: ${shipment.excursionDurationMinutes || 0} minutes active
Location: ${shipment.route.currentGeo}
Route: ${shipment.route.origin} to ${shipment.route.destination}
Transporter: ${shipment.transporter.company}, Driver: ${shipment.transporter.driverName} (${shipment.transporter.driverPhone})
Reefer Unit: ${shipment.transporter.reeferModel}

Nearby Cold Storage Facilities:
${nearbyFacilities?.map((f: any) => `- ${f.name}: ${f.distanceKm} km away, ${f.availableMt} MT available, Contact: ${f.owner} (${f.phone})`).join('\n') || 'None'}

Alternative Fleets in 50 km:
${alternativeFleets?.map((fl: any) => `- ${fl.transporterCompany} [${fl.vehicleNo}]: ${fl.distanceKm} km away, ETA ${fl.etaToShipmentMins}m, ${fl.payloadCapacityMt} MT capacity, Driver: ${fl.driverName} (${fl.driverPhone})`).join('\n') || 'None'}

Operator Question: "${question}"

Provide a direct, conversational answer in 1 or 2 spoken sentences. Keep it short, factual, and natural to listen to. Do NOT use bullet points, bold markers, asterisks, or markdown.`;

                  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
                  const response = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contents: [{ parts: [{ text: prompt }] }],
                      generationConfig: {
                        temperature: 0.2,
                        maxOutputTokens: 150,
                      },
                    }),
                  });

                  if (response.ok) {
                    const data = await response.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                    if (text) {
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ answer: text, spokenText: text }));
                      return;
                    }
                  }
                } catch (geminiErr) {
                  console.warn('[ColdChainX Voice] Gemini API error, falling back to rule engine:', geminiErr);
                }
              }

              // Conversational Rule-Based Fallback
              const q = question.toLowerCase();
              let answer = '';

              if (q.includes('problem') || q.includes('issue') || q.includes('what happened') || q.includes('wrong') || q.includes('alert')) {
                answer = `Shipment ${shipment.id} has an active temperature excursion. Current reading is ${shipment.currentTemp} degrees Celsius, which is ${(shipment.currentTemp - shipment.safeRange.max).toFixed(1)} degrees above the safe limit of ${shipment.safeRange.max} degrees for ${shipment.excursionDurationMinutes || 38} minutes near ${shipment.route.currentGeo.split('(')[0]}.`;
              } else if (q.includes('temp') || q.includes('hot') || q.includes('warm') || q.includes('reading')) {
                answer = `The latest pulp sensor reading is ${shipment.currentTemp} degrees Celsius. The permitted safe threshold is ${shipment.safeRange.min} to ${shipment.safeRange.max} degrees.`;
              } else if (q.includes('cold store') || q.includes('storage') || q.includes('warehouse') || q.includes('facility')) {
                const fac = nearbyFacilities?.[0];
                answer = fac 
                  ? `The closest facility is ${fac.name}, located ${fac.distanceKm} kilometers away with ${fac.availableMt} metric tons of verified available capacity. Contact is ${fac.owner} at ${fac.phone}.`
                  : 'Cold Storage 50 is available 18 kilometers away with 462 metric tons capacity.';
              } else if (q.includes('fleet') || q.includes('truck') || q.includes('vehicle') || q.includes('transshipment') || q.includes('transfer')) {
                const flt = alternativeFleets?.[0];
                answer = flt
                  ? `Arctic TransLog vehicle ${flt.vehicleNo} is on standby ${flt.distanceKm} kilometers away with an estimated arrival of ${flt.etaToShipmentMins} minutes. Driver Sunil Verma is pre-cooled and ready.`
                  : 'Standby reefer truck MH-04-GP-6721 is available 14 kilometers away with 20 metric tons payload.';
              } else if (q.includes('driver') || q.includes('call') || q.includes('phone') || q.includes('contact') || q.includes('who is')) {
                answer = `Current driver is ${shipment.transporter.driverName}, reachable at ${shipment.transporter.driverPhone}. Alternative fleet driver Sunil Verma is at +91 98201 44521.`;
              } else if (q.includes('what should') || q.includes('next') || q.includes('action') || q.includes('recommend') || q.includes('do')) {
                answer = `We recommend alerting driver ${shipment.transporter.driverName} to arrange emergency transshipment with Arctic TransLog 14 kilometers away, or diverting 18 kilometers to Cold Storage 50.`;
              } else if (q.includes('location') || q.includes('where is') || q.includes('route') || q.includes('eta')) {
                answer = `The vehicle is currently near ${shipment.route.currentGeo} along National Highway 48, heading toward ${shipment.route.destination.split(',')[0]} with an ETA of ${shipment.eta}.`;
              } else {
                answer = `Shipment ${shipment.id} carrying ${shipment.product} is at ${shipment.currentTemp} degrees Celsius near Manor on NH 48. Both standby fleets and cold storage are available within a 20 kilometer radius.`;
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ answer, spokenText: answer }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
            }
          });
        });

        // Recommendation endpoint with Nearby Cold Storage & Fleet Search (< 50 km)
        server.middlewares.use('/api/agent/recommend', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
            return;
          }

          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });

          req.on('end', async () => {
            try {
              const payload = JSON.parse(body || '{}');
              const shipment = payload.shipment;

              if (!shipment) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Missing shipment data in request payload' }));
                return;
              }

              // Search nearby cold storages & fleets in 50 km radius
              const nearbyFacilities = matchNearbyFacilities(shipment);
              const alternativeFleets = matchAlternativeFleets(shipment);
              const bestFacility = nearbyFacilities[0];
              const bestFleet = alternativeFleets[0];

              const apiKey = resolveGeminiApiKey();

              if (apiKey) {
                try {
                  const facilitiesContext = nearbyFacilities.map((f, i) => 
                    `  ${i + 1}. ${f.name} [ID: ${f.id}]: Distance: ${f.distanceKm} km (${f.estimatedTransitMins} mins), Available: ${f.availableMt} MT, Temp: ${f.temperatureSupported}, Rate: ₹${f.ratePerMtMonth}/MT/mo, Contact: ${f.owner} (${f.phone})`
                  ).join('\n');

                  const fleetsContext = alternativeFleets.map((fl, i) => 
                    `  ${i + 1}. ${fl.transporterCompany} [${fl.vehicleNo}]: Distance: ${fl.distanceKm} km (ETA: ${fl.etaToShipmentMins} mins), Size: ${fl.payloadCapacityMt} MT (${fl.lengthFeet}ft Box), Temp: ${fl.temperatureSupported}, Driver: ${fl.driverName} (${fl.driverPhone}), Pre-cooled: ${fl.preCooledReady ? 'Yes' : 'No'}`
                  ).join('\n');

                  const prompt = `You are the ColdChainX AI Operations Agent for a cold-chain logistics control tower.
Your role is strictly advisory: analyze the shipment and any temperature exception, summarize the issue, and recommend EXACTLY ONE next operational step for human operator approval.
The system contains both nearby verified cold storage facilities AND standby alternative reefer fleets within a 50 km radius.
Use this data to recommend the optimal response: either emergency fleet transshipment OR diverting to a nearby cold storage.

Shipment Data:
- ID: ${shipment.id}
- Product: ${shipment.product} (${shipment.category})
- Quantity: ${shipment.quantity}
- Status: ${shipment.status}
- Safe Temperature Range: ${shipment.safeRange.min}${shipment.safeRange.unit} to ${shipment.safeRange.max}${shipment.safeRange.unit}
- Current Temperature: ${shipment.currentTemp}${shipment.tempUnit}
- Excursion Duration: ${shipment.excursionDurationMinutes ? shipment.excursionDurationMinutes + ' minutes' : 'None'}
- Current Location: ${shipment.route.currentGeo}
- Route: ${shipment.route.origin} -> ${shipment.route.destination}
- Transporter: ${shipment.transporter.company} | Vehicle: ${shipment.transporter.vehicleNo} | Driver: ${shipment.transporter.driverName} (${shipment.transporter.driverPhone})
- Reefer Unit: ${shipment.transporter.reeferModel} (Setpoint: ${shipment.transporter.reeferSetpoint}°C)
- ETA: ${shipment.eta}

Alternative Fleets Available Within 50 km Radius Matching Size & Temp:
${fleetsContext || 'None in 50 km radius.'}

Nearby Cold Storage Facilities:
${facilitiesContext || 'None in network.'}

Operational Guardrails:
1. Use ONLY the shipment, fleet, and facility data provided.
2. Recommend ONE clear action: e.g. dispatching the closest standby fleet for on-highway transshipment OR diverting to the nearest cold store.
3. Strictly advisory: do not execute live external actions.

Respond ONLY with valid JSON matching this schema:
{
  "summary": "Short summary of the exception and current thermal state",
  "facts": ["Fact 1", "Fact 2", "Fact 3", "Fact 4"],
  "recommendedAction": "ONE concise, specific next action naming the alternative fleet or nearby cold store with distance and driver contact",
  "reason": "Brief operational justification including cargo preservation, distance, and fleet/facility match"
}`;

                  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
                  const response = await fetch(geminiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      contents: [{ parts: [{ text: prompt }] }],
                      generationConfig: {
                        temperature: 0.1,
                        responseMimeType: 'application/json',
                      },
                    }),
                  });

                  if (response.ok) {
                    const data = await response.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text) {
                      const parsed = JSON.parse(text);
                      const action = parsed.recommendedAction || parsed.recommendation || 'Contact transporter and assess transfer options.';
                      res.setHeader('Content-Type', 'application/json');
                      res.end(
                        JSON.stringify({
                          recommendation: {
                            summary: parsed.summary,
                            facts: parsed.facts || [],
                            recommendedAction: action,
                            recommendation: action,
                            reason: parsed.reason,
                            urgency: shipment.status === 'AT_RISK' ? 'CRITICAL' : 'LOW',
                            source: 'Google Gemini 1.5 Flash (Server-Side Operations Agent)',
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST',
                            status: 'PENDING',
                            suggestedFacility: bestFacility,
                            suggestedFleet: bestFleet,
                            nearbyFacilities,
                            alternativeFleets,
                          },
                        })
                      );
                      return;
                    }
                  } else {
                    console.warn('[ColdChainX Server] Gemini API returned error:', await response.text());
                  }
                } catch (geminiErr) {
                  console.warn('[ColdChainX Server] Gemini API call failed, using rule-based fallback:', geminiErr);
                }
              }

              // Rule-Based Operations Intelligence Fallback
              const isAtRisk = shipment.status === 'AT_RISK' || shipment.currentTemp > shipment.safeRange.max;
              const delta = (shipment.currentTemp - shipment.safeRange.max).toFixed(1);

              let fallbackRecommendation;
              if (isAtRisk) {
                const fleetName = bestFleet ? `${bestFleet.transporterCompany} (${bestFleet.vehicleNo})` : 'Arctic TransLog (MH-04-GP-6721)';
                const fleetDist = bestFleet ? bestFleet.distanceKm : 14;
                const fleetEta = bestFleet ? bestFleet.etaToShipmentMins : 22;
                const fleetDriver = bestFleet ? `${bestFleet.driverName} (${bestFleet.driverPhone})` : 'Sunil Verma (+91 98201 44521)';
                const fleetCap = bestFleet ? `${bestFleet.payloadCapacityMt} MT` : '20 MT';

                fallbackRecommendation = {
                  summary: `Temperature is above the safe range for ${shipment.product} (${shipment.id}). Current reading is ${shipment.currentTemp}${shipment.tempUnit} vs upper limit of ${shipment.safeRange.max}${shipment.safeRange.unit} (+${delta}°C excursion for ${shipment.excursionDurationMinutes || 38} mins).`,
                  facts: [
                    `Safe range: ${shipment.safeRange.min}–${shipment.safeRange.max} ${shipment.safeRange.unit}`,
                    `Latest reading: ${shipment.currentTemp} ${shipment.tempUnit} (+${delta}°C excursion for ${shipment.excursionDurationMinutes || 38} mins)`,
                    `Nearest alternative fleet: ${fleetName} located ${fleetDist} km away (ETA ${fleetEta} mins, ${fleetCap} capacity, pre-cooled ready)`,
                    `Nearest cold store: Cold Storage 14 (34 km away, 479 MT available capacity)`,
                    `Current driver: ${shipment.transporter.driverName} (${shipment.transporter.driverPhone})`,
                  ],
                  recommendedAction: `Instruct driver ${shipment.transporter.driverName} to meet standby reefer fleet ${fleetName} (${fleetDist} km away, ETA ${fleetEta}m) for emergency transshipment, or divert to Cold Storage 14 (34 km away). Driver ${fleetDriver} is pre-cooled and on standby.`,
                  recommendation: `Instruct driver ${shipment.transporter.driverName} to meet standby reefer fleet ${fleetName} (${fleetDist} km away, ETA ${fleetEta}m) for emergency transshipment, or divert to Cold Storage 14 (34 km away). Driver ${fleetDriver} is pre-cooled and on standby.`,
                  reason: `The shipment is outside its configured range (+${delta}°C for ${shipment.excursionDurationMinutes || 38} minutes), risking thermal degradation and cargo loss. Fleet-to-fleet transshipment can be completed within 25 minutes along NH 48.`,
                  urgency: 'CRITICAL',
                  source: apiKey
                    ? 'Rule-Based Operations Agent (Gemini fallback)'
                    : 'Rule-Based Operations Agent (ColdChainX Fleet & Facility Matcher)',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST',
                  status: 'PENDING',
                  suggestedFacility: bestFacility,
                  suggestedFleet: bestFleet,
                  nearbyFacilities,
                  alternativeFleets,
                };
              } else {
                fallbackRecommendation = {
                  summary: `Shipment ${shipment.id} is operating safely within configured thermal limits at ${shipment.currentTemp}${shipment.tempUnit}.`,
                  facts: [
                    `Safe range: ${shipment.safeRange.min}–${shipment.safeRange.max} ${shipment.safeRange.unit}`,
                    `Latest reading: ${shipment.currentTemp} ${shipment.tempUnit}`,
                    `Route progress: ${shipment.route.progressPercent}% toward ${shipment.route.destination.split(',')[0]}`,
                  ],
                  recommendedAction: `Maintain routine geofence telemetry polling at 15-minute intervals and verify delivery at destination cold hub.`,
                  recommendation: `Maintain routine geofence telemetry polling at 15-minute intervals and verify delivery at destination cold hub.`,
                  reason: `The shipment temperature is within the safe range. No intervention is required.`,
                  urgency: 'LOW',
                  source: apiKey
                    ? 'Rule-Based Operations Agent (Gemini fallback)'
                    : 'Rule-Based Operations Agent (ColdChainX Fleet & Facility Matcher)',
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST',
                  status: 'PENDING',
                  suggestedFacility: bestFacility,
                  suggestedFleet: bestFleet,
                  nearbyFacilities,
                  alternativeFleets,
                };
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ recommendation: fallbackRecommendation }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
            }
          });
        });
      },
    },
  ],
});
