import { createContext, useContext } from 'react';
import type { NotesService } from '../../features/notes/service';

const NotesContext = createContext<NotesService | null>(null);
export const NotesProvider = NotesContext.Provider;

export function useNotesService(): NotesService {
  const service = useContext(NotesContext);
  if (!service) throw new Error('Notes service is not available outside its provider.');
  return service;
}
