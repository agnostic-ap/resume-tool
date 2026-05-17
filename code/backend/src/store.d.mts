export type BackendStore = {
  dbPath: string
  readState(): Promise<unknown>
  writeState(state: unknown): Promise<unknown>
  replaceState(state: unknown): Promise<unknown>
  listDocuments(): Promise<unknown>
  getDocument(id: string): Promise<unknown>
  createDocument(input?: unknown): Promise<unknown>
  updateDocument(id: string, patch?: unknown): Promise<unknown>
  deleteDocument(id: string): Promise<unknown>
  selectDocument(id: string): Promise<unknown>
  markCareerUpdated(id: string): Promise<unknown>
  listApplications(): Promise<unknown>
  createApplication(input?: unknown): Promise<unknown>
  updateApplication(id: string, patch?: unknown): Promise<unknown>
  deleteApplication(id: string): Promise<unknown>
  listActivity(): Promise<unknown>
  createAssistantSuggestion(input?: unknown): Promise<unknown>
}

export function createStore(options?: { dataDir?: string; dbPath?: string }): BackendStore
export function httpError(status: number, message: string): Error & { status: number }
