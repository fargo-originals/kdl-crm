import OpenAI from 'openai';
import { config } from './config.js';
import type { CrmClient } from './crm.js';

type ChatMessage = OpenAI.Chat.ChatCompletionMessageParam;

const tools: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'book_appointment',
      description: 'Agenda una reunión cuando el lead muestra interés y confirma una franja.',
      parameters: {
        type: 'object',
        properties: {
          confirmedSlot: { type: 'string', description: 'Franja confirmada por el lead' },
          proposedSlots: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'escalate_to_human',
      description: 'Escala a un comercial humano si lo piden o la situación lo requiere.',
      parameters: { type: 'object', properties: { reason: { type: 'string' } } },
    },
  },
  {
    type: 'function',
    function: {
      name: 'log_outcome',
      description: 'Registra el resultado o una objeción relevante. Usa outcome "dnc" si piden no ser llamados.',
      parameters: {
        type: 'object',
        properties: {
          outcome: { type: 'string' },
          objection: { type: 'string' },
          sentiment: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'lookup_knowledge',
      description: 'Consulta el catálogo/precios/FAQ cuando necesitas un dato exacto.',
      parameters: { type: 'object', properties: { query: { type: 'string' } } },
    },
  },
];

function safeParse(s: string | undefined): Record<string, unknown> {
  if (!s) return {};
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export interface BrainContext {
  callId: string;
  leadId: string | null;
  sessionId: string | null;
  assignedUserId: string | null;
  systemPrompt: string;
  firstLine: string;
  crm: CrmClient;
}

// El "cerebro" de la llamada: mantiene el historial y traduce lo que dice el usuario
// en la siguiente frase del agente (resolviendo tool-calls contra el CRM por el camino).
export class CallBrain {
  private openai: OpenAI;
  private messages: ChatMessage[];

  constructor(private ctx: BrainContext) {
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
    this.messages = [
      { role: 'system', content: ctx.systemPrompt },
      { role: 'assistant', content: ctx.firstLine },
    ];
  }

  greeting(): string {
    return this.ctx.firstLine;
  }

  async respondTo(userText: string): Promise<string> {
    this.messages.push({ role: 'user', content: userText });

    for (let step = 0; step < 5; step++) {
      const completion = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: this.messages,
        tools,
        tool_choice: 'auto',
        temperature: 0.6,
        max_tokens: 150,
      });

      const msg = completion.choices[0]?.message;
      if (!msg) break;
      this.messages.push(msg);

      if (msg.tool_calls?.length) {
        for (const tc of msg.tool_calls) {
          if (tc.type !== 'function') continue;
          const result = await this.dispatchTool(tc.function.name, safeParse(tc.function.arguments));
          this.messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
        }
        continue; // re-preguntar al modelo con los resultados de las tools
      }

      return msg.content ?? '';
    }
    return 'Perdona, ¿me lo puedes repetir?';
  }

  history(): ChatMessage[] {
    return this.messages;
  }

  private async dispatchTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const c = this.ctx;
    try {
      switch (name) {
        case 'book_appointment':
          return await c.crm.bookAppointment({
            leadId: c.leadId,
            assignedUserId: c.assignedUserId,
            confirmedSlot: args.confirmedSlot,
            proposedSlots: args.proposedSlots,
          });
        case 'escalate_to_human':
          return await c.crm.escalate({
            sessionId: c.sessionId,
            leadId: c.leadId,
            assignedUserId: c.assignedUserId,
            reason: args.reason,
          });
        case 'log_outcome':
          return await c.crm.logOutcome({
            callId: c.callId,
            leadId: c.leadId,
            outcome: args.outcome,
            objection: args.objection,
            sentiment: args.sentiment,
          });
        case 'lookup_knowledge':
          return await c.crm.lookupKnowledge({ query: args.query });
        default:
          return { error: `tool desconocida: ${name}` };
      }
    } catch (err) {
      return { error: String(err) };
    }
  }
}
