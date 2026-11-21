export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const hasKey = Boolean(apiKey && apiKey.length > 10 && !apiKey.includes('placeholder'));

  res.status(200).json({
    status: 'operational',
    hasGeminiKey: hasKey,
    provider: hasKey ? 'Google Gemini 1.5 Flash' : 'Rule-Based Operations Engine',
  });
}
