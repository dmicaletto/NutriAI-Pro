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

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: jsonMode ? { responseMimeType: "application/json" } : {}
      })
    });

    if (!response.ok) throw new Error(`Errore API Gemini: ${response.status}`);

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
    console.error("Errore Gemini:", error);
    return null;
  }
}
