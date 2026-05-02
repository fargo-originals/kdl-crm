import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export function getModel() {
  const provider = process.env.AI_AGENT_DEFAULT_PROVIDER ?? 'anthropic';
  if (provider === 'openai') return openai('gpt-4o');
  return anthropic('claude-sonnet-4-6');
}
