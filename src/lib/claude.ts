import Anthropic from '@anthropic-ai/sdk';
import { CLAUDE_MODEL } from '../config/constants';

const client = new Anthropic();

let totalTokens = { input: 0, output: 0 };

export function getTokenUsage() {
  return { ...totalTokens };
}

export function resetTokenUsage() {
  totalTokens = { input: 0, output: 0 };
}

export async function callClaude(prompt: string, systemPrompt?: string): Promise<string> {
  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: systemPrompt || '',
    messages: [{ role: 'user', content: prompt }],
  });

  totalTokens.input += message.usage.input_tokens;
  totalTokens.output += message.usage.output_tokens;

  const textBlock = message.content.find((block) => block.type === 'text');
  return textBlock ? textBlock.text : '';
}
