export type AIAction = 'summary' | 'rewrite' | 'key-points';
export type AIAvailability = { available: boolean; status: string; message: string };
export const MAX_AI_INPUT_LENGTH = 8_000;

export function isAIInputWithinLimit(input: string): boolean {
  return input.length <= MAX_AI_INPUT_LENGTH;
}

export interface AIProvider {
  createRequestID(): string;
  availability(): Promise<AIAvailability>;
  generate(requestID: string, action: AIAction, input: string): Promise<string>;
  cancel(requestID: string): Promise<void>;
}

const unavailableMessages: Record<string, string> = {
  native_module_missing: 'On-device AI needs the Quiet Notes development build. Your notes still work here.',
  unsupported_os: 'On-device AI needs iOS 26 or later. Your notes are available as usual.',
  unsupported_platform: 'On-device AI is currently available only on supported Apple devices. Your notes still work.',
  deviceNotEligible: 'This device does not support Apple Intelligence. Your notes are available as usual.',
  modelNotReady: 'Apple Intelligence is still preparing its on-device model. Try again later; your notes are available.',
  appleIntelligenceNotEnabled: 'Turn on Apple Intelligence in Settings to use on-device AI. Your notes remain on this device.',
};

export function describeAIStatus(status: string): AIAvailability {
  if (status === 'available') return { available: true, status, message: 'Ready on this device. Your text stays here.' };
  const reason = status.startsWith('unavailable:') ? status.slice('unavailable:'.length) : status;
  return {
    available: false,
    status,
    message: unavailableMessages[reason] ?? 'On-device AI is not ready on this device. Your notes and search still work.',
  };
}
