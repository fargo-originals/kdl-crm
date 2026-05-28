import OpenAI from 'openai';
import { config } from './config.js';
import type { TranscriptEntry } from './types.js';

export interface CallSummary {
  summary: string;
  outcome: string | null;
  objections: string[];
  sentiment: string | null;
}

// Análisis offline post-llamada (sin presión de latencia). El plan prevé Claude para esta tarea;
// aquí se usa OpenAI por simplicidad de dependencias. Es sustituible sin tocar el resto.
export async function summarizeCall(transcript: TranscriptEntry[]): Promise<CallSummary> {
  if (transcript.length === 0) {
    return { summary: 'Llamada sin conversación.', outcome: null, objections: [], sentiment: null };
  }

  const openai = new OpenAI({ apiKey: config.openai.apiKey });
  const text = transcript.map((t) => `${t.role === 'assistant' ? 'Agente' : 'Lead'}: ${t.text}`).join('\n');

  const completion = await openai.chat.completions.create({
    model: config.openai.model,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Analiza esta transcripción de una llamada comercial en español. Devuelve JSON con: ' +
          'summary (resumen breve), outcome (uno de: appointment_booked, callback_requested, ' +
          'not_interested, qualified, dnc, no_answer), objections (array de objeciones detectadas), ' +
          'sentiment (positive|neutral|negative).',
      },
      { role: 'user', content: text },
    ],
  });

  try {
    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? '{}');
    return {
      summary: String(parsed.summary ?? ''),
      outcome: parsed.outcome ? String(parsed.outcome) : null,
      objections: Array.isArray(parsed.objections) ? parsed.objections.map(String) : [],
      sentiment: parsed.sentiment ? String(parsed.sentiment) : null,
    };
  } catch {
    return { summary: text.slice(0, 500), outcome: null, objections: [], sentiment: null };
  }
}
