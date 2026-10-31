import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import { describeAIStatus, type AIAction, type AIAvailability, type AIGenerationStage } from '../../features/ai/provider';

type NativeLocalAI = {
  availability(): Promise<string>;
  generate(requestID: string, action: AIAction, input: string): Promise<string>;
  cancel(requestID: string): Promise<void>;
};

const nativeModule = requireOptionalNativeModule<NativeLocalAI>('LocalAI');

export const foundationModelsProvider = {
  async availability(): Promise<AIAvailability> {
    if (!nativeModule) return describeAIStatus(Platform.OS === 'ios' ? 'native_module_missing' : 'unsupported_platform');
    try {
      return describeAIStatus(await nativeModule.availability());
    } catch {
      return describeAIStatus('unavailable');
    }
  },
  async generate(
    requestID: string,
    action: AIAction,
    input: string,
    onStage?: (stage: AIGenerationStage) => void,
  ): Promise<string> {
    if (!nativeModule) throw new Error('Apple on-device AI is not available in this build.');
    onStage?.('generating');
    return nativeModule.generate(requestID, action, input);
  },
  async cancel(requestID: string): Promise<void> {
    if (nativeModule) await nativeModule.cancel(requestID);
  },
};
