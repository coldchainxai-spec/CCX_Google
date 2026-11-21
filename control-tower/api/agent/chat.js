export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

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

  return res.status(200).json({ answer, spokenText: answer });
}
