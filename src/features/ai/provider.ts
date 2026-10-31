export type AIAction = 'summary' | 'rewrite' | 'key-points';
export type AIAvailability = {
  available: boolean;
  status: string;
  message: string;
  source?: 'foundation-models' | 'downloaded-model';
  modelInstalled?: boolean;
};
export type AIModelProgress = {
  phase: 'downloading' | 'verifying';
  fraction: number;
  bytesWritten: number;
  totalBytes: number;
};
export type AIGenerationStage = 'preparing' | 'generating';
export const MAX_AI_INPUT_LENGTH = 8_000;

export {
  assessLocalModel,
  buildLocalAIPrompt,
  isLocalModelArtifactValid,
  LOCAL_MODEL,
  selectAIProviderSource,
} from './model.ts';
export type { AIProviderSource, LocalModelState } from './model.ts';

export function isAIInputWithinLimit(input: string): boolean {
  return input.length <= MAX_AI_INPUT_LENGTH;
}

export interface AIProvider {
  createRequestID(): string;
  availability(): Promise<AIAvailability>;
  downloadModel(onProgress: (progress: AIModelProgress) => void): Promise<void>;
  cancelModelDownload(): Promise<void>;
  deleteModel(): Promise<void>;
  generate(requestID: string, action: AIAction, input: string, onStage?: (stage: AIGenerationStage) => void): Promise<string>;
  cancel(requestID: string): Promise<void>;
}

const unavailableMessages: Record<string, string> = {
  native_module_missing: 'On-device AI needs the Quiet Notes development build. Your notes still work here.',
  unsupported_os: 'On-device AI needs iOS 26 or later. Your notes are available as usual.',
  unsupported_platform: 'On-device AI is not supported on this platform. Your notes still work.',
  deviceNotEligible: 'This device does not support Apple Intelligence. Your notes are available as usual.',
  modelNotReady: 'Apple Intelligence is still preparing its on-device model. Try again later; your notes are available.',
  appleIntelligenceNotEnabled: 'Turn on Apple Intelligence in Settings to use on-device AI. Your notes remain on this device.',
  download_required: 'Download the local model to use AI on this device. Your notes stay available.',
  model_invalid: 'The local model could not be verified. Remove it and download it again.',
  unsupported_architecture: 'Local AI needs a supported 64-bit device. Your notes are available as usual.',
  local_runtime_missing: 'Local AI needs a new Quiet Notes development build on a supported 64-bit device. Your notes are available as usual.',
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
