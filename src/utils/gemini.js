const RETRYABLE_STATUSES = [429, 502, 503, 504];
const MAX_RETRIES = 3;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function callGemini(prompt, apiKey, imageBase64 = null, jsonMode = true) {
  if (!apiKey) {
    console.error("API Key mancante");
    return null;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const contents = [{
    role: "user",
    parts: [{ text: prompt }, imageBase64 ? { inlineData: { mimeType: "image/jpeg", data: imageBase64 } } : null].filter(Boolean)
  }];
  const body = JSON.stringify({
    contents,
    generationConfig: jsonMode ? { responseMimeType: "application/json" } : {}
  });

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });

      if (!response.ok) {
        if (RETRYABLE_STATUSES.includes(response.status) && attempt < MAX_RETRIES) {
          // 429: rispetta Retry-After o usa 30s di default
          const retryAfter = response.status === 429
            ? (parseInt(response.headers.get('Retry-After') || '30') * 1000)
            : Math.pow(2, attempt) * 1000;
          console.warn(`Gemini ${response.status} — retry ${attempt + 1}/${MAX_RETRIES} tra ${retryAfter}ms`);
          await sleep(retryAfter);
          continue;
        }
        throw new Error(`Errore API Gemini: ${response.status}`);
      }

      const data = await response.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;

      if (jsonMode) {
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
          return JSON.parse(text);
        } catch (e) {
          console.error("Errore parsing JSON:", e, text);
          return null;
        }
      }
      return text;

    } catch (error) {
      if (attempt < MAX_RETRIES) {
        const delay = Math.pow(2, attempt) * 1000;
        console.warn(`Gemini errore di rete — retry ${attempt + 1}/${MAX_RETRIES} tra ${delay}ms`, error);
        await sleep(delay);
      } else {
        console.error("Gemini: tentativi esauriti", error);
        return null;
      }
    }
  }
  return null;
}
