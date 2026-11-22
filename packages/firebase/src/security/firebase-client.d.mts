export interface FirebasePasskeyClient {
  available(): Promise<boolean>;
  authenticate(): Promise<void>;
  register(input: { password?: string; label?: string }): Promise<unknown>;
  remove(id: string, password?: string): Promise<unknown>;
  list(): Promise<{ credentials: Array<{ id: string; label: string }> }>;
}

export function firebasePasskeyClient(options: {
  endpoint: string;
  currentUser: () => { getIdToken(forceRefresh?: boolean): Promise<string> } | null;
  reauthenticate: (password?: string) => Promise<void>;
  completeLogin: (token: string) => Promise<unknown>;
}): FirebasePasskeyClient;

export function mountPasskeys(
  element: HTMLElement,
  client: FirebasePasskeyClient,
  options?: { signedIn?: boolean },
): () => void;
