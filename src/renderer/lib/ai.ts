const DEFAULT_API_KEY = 'AIzaSyAUGk2qiTwg1KWzFmQ15QELkjHhKNzzxsE'
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

type Msg = { role: 'user' | 'assistant'; content: string }

type AiRequest = {
  system: string
  messages: Msg[]
}

export async function generateContent(req: AiRequest) {
  const headers = { 'Content-Type': 'application/json' }
  const body = {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: req.messages.map(m => ({ role: m.role, parts: [{ text: m.content }] })),
    generationConfig: { temperature: 0.4, topP: 0.9, topK: 40, maxOutputTokens: 2048 }
  }
  const url = `${BASE_URL}?key=${DEFAULT_API_KEY}`
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  if (!res.ok) throw new Error('AI request failed')
  const json = await res.json()
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text || ''
  return text as string
} 