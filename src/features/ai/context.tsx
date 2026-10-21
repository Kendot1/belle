import { createContext, useContext } from 'react';
import type { AIProvider } from './provider';

const AIProviderContext = createContext<AIProvider | null>(null);

export const AIProviderProvider = AIProviderContext.Provider;

export function useAIProvider(): AIProvider {
  const provider = useContext(AIProviderContext);
  if (!provider) throw new Error('AI provider is not available outside its provider.');
  return provider;
}
