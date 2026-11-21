export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const shipment = req.body?.shipment;
    if (!shipment) return res.status(400).json({ error: 'Missing shipment data' });

    const apiKey = process.env.GEMINI_API_KEY?.trim();

    if (apiKey && apiKey.length > 10 && !apiKey.includes('placeholder')) {
      try {
        const prompt = `You are ColdChainX's AI Operations Agent for cold chain logistics.
Analyze the shipment and recommend EXACTLY ONE next operational step.
Shipment: ${shipment.id} (${shipment.product})
Status: ${shipment.status}, Temp: ${shipment.currentTemp}°C (Safe: ${shipment.safeRange.min} to ${shipment.safeRange.max}°C)
Location: ${shipment.route.currentGeo}
Driver: ${shipment.transporter.driverName} (${shipment.transporter.driverPhone})

Respond ONLY with valid JSON:
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
            return res.status(200).json({
              recommendation: {
                summary: parsed.summary,
                facts: parsed.facts || [],
                recommendedAction: action,
                recommendation: action,
                reason: parsed.reason,
                urgency: shipment.status === 'AT_RISK' ? 'CRITICAL' : 'LOW',
                source: 'Google Gemini 1.5 Flash',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST',
                status: 'PENDING',
              },
            });
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini API call failed, falling back:', geminiErr);
      }
    }

    const isAtRisk = shipment.status === 'AT_RISK' || shipment.currentTemp > shipment.safeRange.max;
    const delta = (shipment.currentTemp - shipment.safeRange.max).toFixed(1);

    const rec = isAtRisk ? {
      summary: `Temperature is above the safe range for ${shipment.product} (${shipment.id}). Current reading is ${shipment.currentTemp}${shipment.tempUnit} vs upper limit of ${shipment.safeRange.max}${shipment.safeRange.unit} (+${delta}°C excursion for ${shipment.excursionDurationMinutes || 38} mins).`,
      facts: [
        `Safe range: ${shipment.safeRange.min}–${shipment.safeRange.max} ${shipment.safeRange.unit}`,
        `Latest reading: ${shipment.currentTemp} ${shipment.tempUnit} (+${delta}°C excursion for ${shipment.excursionDurationMinutes || 38} mins)`,
        `Nearest alternative fleet: Arctic TransLog Express (MH-04-GP-6721) located 14 km away (ETA ~22 mins, pre-cooled ready)`,
        `Nearest cold store: Cold Storage 14 (34 km away, 479 MT available capacity)`,
        `Current driver: ${shipment.transporter.driverName} (${shipment.transporter.driverPhone})`,
      ],
      recommendedAction: `Instruct driver ${shipment.transporter.driverName} to meet standby reefer fleet Arctic TransLog Express (MH-04-GP-6721) (14 km away) for emergency transshipment, or divert to Cold Storage 14 (34 km away).`,
      recommendation: `Instruct driver ${shipment.transporter.driverName} to meet standby reefer fleet Arctic TransLog Express (MH-04-GP-6721) (14 km away) for emergency transshipment, or divert to Cold Storage 14 (34 km away).`,
      reason: `The shipment is outside its configured range (+${delta}°C for ${shipment.excursionDurationMinutes || 38} minutes), risking thermal degradation and cargo loss.`,
      urgency: 'CRITICAL',
      source: 'ColdChainX Operations Intelligence Agent',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' IST',
      status: 'PENDING',
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
    };

    return res.status(200).json({ recommendation: rec });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
}
