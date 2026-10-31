import * as Crypto from 'expo-crypto';
import { isAIInputWithinLimit, selectAIProviderSource, type AIProvider } from '../../features/ai/provider';
import { downloadedModelProvider } from './downloaded-model';
import { foundationModelsProvider } from './foundation-models';

export const localAIProvider: AIProvider = {
  createRequestID() {
    return Crypto.randomUUID();
  },
  async availability() {
    const [foundation, downloaded] = await Promise.all([
      foundationModelsProvider.availability(),
      downloadedModelProvider.availability(),
    ]);
    const localState = await downloadedModelProvider.localModelState();
    const source = selectAIProviderSource(foundation.available, localState);
    if (source === 'foundation-models') {
      return {
        ...foundation,
        status: 'available:foundation-models',
        source,
        modelInstalled: localState === 'ready',
      };
    }
    if (source === 'downloaded-model') return downloaded;
    return downloaded;
  },
  downloadModel(onProgress) {
    return downloadedModelProvider.downloadModel(onProgress);
  },
  cancelModelDownload() {
    return downloadedModelProvider.cancelModelDownload();
  },
  deleteModel() {
    return downloadedModelProvider.deleteModel();
  },
  async generate(requestID, action, input, onStage) {
    if (!input.trim()) throw new Error('Add some text before using an AI action.');
    if (!isAIInputWithinLimit(input)) throw new Error('On-device AI can use up to 8,000 characters at a time. Select a shorter passage and try again.');
    const availability = await localAIProvider.availability();
    if (availability.source === 'foundation-models') {
      return foundationModelsProvider.generate(requestID, action, input, onStage);
    }
    if (availability.source === 'downloaded-model') {
      return downloadedModelProvider.generate(requestID, action, input, onStage);
    }
    throw new Error(availability.message);
  },
  async cancel(requestID) {
    await Promise.allSettled([
      foundationModelsProvider.cancel(requestID),
      downloadedModelProvider.cancel(requestID),
    ]);
  },
};
