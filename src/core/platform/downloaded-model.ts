import { Directory, File, Paths, type DownloadTask } from 'expo-file-system';
import { Platform } from 'react-native';
import { initLlama, toggleNativeLog, type LlamaContext } from 'llama.rn';
import {
  assessLocalModel,
  buildLocalAIPrompt,
  isLocalModelArtifactValid,
  LOCAL_MODEL,
  type LocalModelState,
} from '../../features/ai/model';
import { describeAIStatus, type AIAction, type AIAvailability, type AIGenerationStage, type AIModelProgress } from '../../features/ai/provider';

const MODEL_DIRECTORY = 'quiet-notes-models';
const VERIFY_MARKER = `${LOCAL_MODEL.fileName}.verified`;
const TEMP_FILE = `${LOCAL_MODEL.fileName}.download`;
const MAX_PROMPT_TOKENS = 7_600;

const modelDirectory = () => new Directory(Paths.cache, MODEL_DIRECTORY);
const modelFile = () => new File(modelDirectory(), LOCAL_MODEL.fileName);
const markerFile = () => new File(modelDirectory(), VERIFY_MARKER);
const temporaryFile = () => new File(modelDirectory(), TEMP_FILE);

let activeDownload: DownloadTask | null = null;
let downloadCancelled = false;
let context: LlamaContext | null = null;
let contextPromise: Promise<LlamaContext> | null = null;
let activeRequestID: string | null = null;
let completionRequestID: string | null = null;
let runtimeAvailabilityPromise: Promise<boolean> | null = null;
const cancelledRequests = new Set<string>();

function ensureModelDirectory(): void {
  modelDirectory().create({ idempotent: true, intermediates: true });
}

function deleteIfPresent(file: File): void {
  if (file.exists) file.delete();
}

async function writeVerifiedMarker(): Promise<void> {
  const marker = markerFile();
  marker.create({ overwrite: true });
  await marker.write(LOCAL_MODEL.sha256);
}

async function readVerifiedDigest(): Promise<string | null> {
  const marker = markerFile();
  if (!marker.exists) return null;
  try {
    return (await marker.text()).trim();
  } catch {
    return null;
  }
}

async function verifyExistingModel(file: File): Promise<LocalModelState> {
  let state = assessLocalModel({ exists: file.exists, size: file.size }, await readVerifiedDigest());
  if (state !== 'needs_verification') return state;

  try {
    const digest = await file.digest('SHA-256');
    if (!isLocalModelArtifactValid(file.size, digest)) return 'invalid';
    ensureModelDirectory();
    await writeVerifiedMarker();
    state = 'ready';
  } catch {
    state = 'invalid';
  }
  return state;
}

async function localModelState(): Promise<LocalModelState> {
  return verifyExistingModel(modelFile());
}

async function localRuntimeAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  if (!runtimeAvailabilityPromise) {
    runtimeAvailabilityPromise = toggleNativeLog(false)
      .then(() => true)
      .catch(() => false);
  }
  return runtimeAvailabilityPromise;
}

async function loadedContext(onStage?: (stage: AIGenerationStage) => void): Promise<LlamaContext> {
  if (context) return context;
  if (!contextPromise) {
    onStage?.('preparing');
    contextPromise = (async () => {
      await toggleNativeLog(false);
      const loaded = await initLlama({
        model: modelFile().uri,
        n_ctx: 8_192,
        n_batch: 256,
        n_gpu_layers: Platform.OS === 'ios' ? 99 : 0,
        use_mlock: false,
      });
      context = loaded;
      return loaded;
    })().finally(() => {
      contextPromise = null;
    });
  }
  return contextPromise;
}

async function releaseContext(): Promise<void> {
  const loading = contextPromise;
  if (loading) {
    try {
      await loading;
    } catch {
      // A failed load has no native context to release.
    }
  }
  const loaded = context;
  context = null;
  if (loaded) await loaded.release();
}

function cancelledError(): Error {
  return new Error('The local AI request was cancelled.');
}

export const downloadedModelProvider = {
  async availability(): Promise<AIAvailability> {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return describeAIStatus('unsupported_platform');
    if (!(await localRuntimeAvailable())) {
      return { ...describeAIStatus('local_runtime_missing'), modelInstalled: modelFile().exists };
    }
    const state = await localModelState();
    if (state === 'ready') {
      return {
        available: true,
        status: 'available:downloaded-model',
        message: 'Local model ready. Your text stays on this device.',
        source: 'downloaded-model',
        modelInstalled: true,
      };
    }
    if (state === 'invalid') return { ...describeAIStatus('model_invalid'), modelInstalled: true };
    return { ...describeAIStatus('download_required'), modelInstalled: false };
  },

  async downloadModel(onProgress: (progress: AIModelProgress) => void): Promise<void> {
    if (activeDownload) throw new Error('The local model is already downloading.');
    if (!(await localRuntimeAvailable())) {
      throw new Error('Install a new Quiet Notes development build on a supported 64-bit device before downloading the local model.');
    }
    if (Paths.availableDiskSpace < LOCAL_MODEL.minimumFreeBytes) {
      throw new Error('Not enough free space. Free at least 775 MB, then try the model download again.');
    }

    ensureModelDirectory();
    deleteIfPresent(temporaryFile());
    deleteIfPresent(markerFile());
    downloadCancelled = false;
    const destination = temporaryFile();
    const task = File.createDownloadTask(LOCAL_MODEL.downloadURL, destination, {
      sessionType: 'foreground',
      onProgress: ({ bytesWritten, totalBytes }) => {
        const expected = totalBytes > 0 ? totalBytes : LOCAL_MODEL.sizeBytes;
        onProgress({
          phase: 'downloading',
          bytesWritten,
          totalBytes: expected,
          fraction: Math.min(1, bytesWritten / expected),
        });
      },
    });
    activeDownload = task;

    try {
      const downloaded = await task.downloadAsync();
      if (!downloaded || downloadCancelled) throw cancelledError();
      onProgress({ phase: 'verifying', fraction: 1, bytesWritten: downloaded.size, totalBytes: LOCAL_MODEL.sizeBytes });
      const digest = await downloaded.digest('SHA-256');
      if (downloadCancelled) throw cancelledError();
      if (!isLocalModelArtifactValid(downloaded.size, digest)) {
        throw new Error('The downloaded model failed its integrity check. Try downloading it again.');
      }

      const installed = modelFile();
      deleteIfPresent(installed);
      await downloaded.move(installed);
      if (downloadCancelled) {
        deleteIfPresent(installed);
        throw cancelledError();
      }
      await writeVerifiedMarker();
      if (downloadCancelled) {
        deleteIfPresent(markerFile());
        deleteIfPresent(installed);
        throw cancelledError();
      }
    } catch (error) {
      deleteIfPresent(temporaryFile());
      throw error;
    } finally {
      task.release();
      if (activeDownload === task) activeDownload = null;
      downloadCancelled = false;
    }
  },

  async cancelModelDownload(): Promise<void> {
    downloadCancelled = true;
    activeDownload?.cancel();
  },

  async deleteModel(): Promise<void> {
    await releaseContext();
    deleteIfPresent(temporaryFile());
    deleteIfPresent(markerFile());
    deleteIfPresent(modelFile());
  },

  async generate(
    requestID: string,
    action: AIAction,
    input: string,
    onStage?: (stage: AIGenerationStage) => void,
  ): Promise<string> {
    if (activeRequestID) throw new Error('The local model is already working on another request.');
    activeRequestID = requestID;
    cancelledRequests.delete(requestID);
    try {
      if (await localModelState() !== 'ready') throw new Error('Download and verify the local model before using AI.');
      const loaded = await loadedContext(onStage);
      if (cancelledRequests.has(requestID)) throw cancelledError();
      await loaded.clearCache();

      const prompt = buildLocalAIPrompt(action, input);
      const tokenized = await loaded.tokenize(prompt);
      if (tokenized.tokens.length > MAX_PROMPT_TOKENS) {
        throw new Error('This passage is too long for the local model. Select a shorter passage and try again.');
      }
      if (cancelledRequests.has(requestID)) throw cancelledError();

      completionRequestID = requestID;
      onStage?.('generating');
      const result = await loaded.completion({
        prompt,
        n_predict: action === 'rewrite' ? 512 : 384,
        temperature: 0.2,
        top_p: 0.9,
        penalty_repeat: 1.1,
        stop: ['<|im_end|>', '<|endoftext|>'],
      });
      if (cancelledRequests.has(requestID)) throw cancelledError();
      return result.text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    } finally {
      if (completionRequestID === requestID) completionRequestID = null;
      await releaseContext().catch(() => {});
      if (activeRequestID === requestID) activeRequestID = null;
      cancelledRequests.delete(requestID);
    }
  },

  async cancel(requestID: string): Promise<void> {
    cancelledRequests.add(requestID);
    if (completionRequestID === requestID && context) await context.stopCompletion();
  },

  localModelState,
};
