import { requireOptionalNativeModule } from 'expo';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import { describeAIStatus, isAIInputWithinLimit, type AIAction, type AIProvider } from '../../features/ai/provider';

type NativeLocalAI = {
  availability(): Promise<string>;
  generate(requestID: string, action: AIAction, input: string): Promise<string>;
  cancel(requestID: string): Promise<void>;
};

const nativeModule = requireOptionalNativeModule<NativeLocalAI>('LocalAI');
export const localAIProvider: AIProvider = {
  createRequestID() {
    return Crypto.randomUUID();
  },
  async availability() {
    if (!nativeModule) return describeAIStatus(Platform.OS === 'ios' ? 'native_module_missing' : 'unsupported_platform');
    try { return describeAIStatus(await nativeModule.availability()); }
    catch { return describeAIStatus('unavailable'); }
  },
  async generate(requestID, action, input) {
    if (!nativeModule) throw new Error('On-device AI is not available in this build.');
    if (!input.trim()) throw new Error('Add some text before using an AI action.');
    if (!isAIInputWithinLimit(input)) throw new Error('On-device AI can use up to 8,000 characters at a time. Select a shorter passage and try again.');
    return nativeModule.generate(requestID, action, input);
  },
  async cancel(requestID) {
    if (nativeModule) await nativeModule.cancel(requestID);
  },
};
