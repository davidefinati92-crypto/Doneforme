
const allowedCategories = new Set([
  'shopping', 'booking', 'returns', 'support'
]);

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const betaCode = process.env.DONEFORME_BETA_CODE;

  if (!apiKey || !betaCode) {
    return res.status(503).json({ error: 'AI non configurata sul server' });
  }

  if (req.headers['x-beta-code'] !== betaCode) {
    return res.status(401).json({ error: 'Codice beta non corretto' });
  }

  const { category, request, country } = req.body || {};

  if (
    !allowedCategories.has(category) ||
    typeof request !== 'string' ||
    request.trim().length < 8 ||
    request.length > 600 ||
    typeof country !== 'string' ||
    country.length > 40
  ) {
    return res.status(400).json({ error: 'Richiesta non valida' });
  }

  const instructions =
    'Sei DoneForMe, un assistente pratico. Rispondi in italiano ' +
    'in massimo 230 parole. Fornisci suggerimenti concreti. ' +
    'Non hai accesso a prezzi o disponibilita in tempo reale. ' +
    'Non dichiarare di aver effettuato acquisti, prenotazioni ' +
    'o invii. Non chiedere password o dati di pagamento.';

  try {
    const response = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          max_tokens: 430,
          messages: [
            { role: 'system', content: instructions },
            {
              role: 'user',
              content: `Categoria: ${category}\nPaese: ${country}\nRichiesta: ${request}`
            }
          ]
        })
      }
    );

    if (!response.ok) {
      return res.status(502).json({
        error: 'Servizio AI temporaneamente non disponibile'
      });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;

    return res.status(200).json({
      answer: answer || 'Nessuna risposta disponibile'
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Errore durante la richiesta AI'
    });
  }
};
