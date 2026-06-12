import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { api, AuthUser, setAuthToken, setOnUnauthorized } from "../services/api";

// expo-secure-store is not available on web — fall back to localStorage.
const store = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === "web") return localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (Platform.OS === "web") { localStorage.setItem(key, value); return; }
    await SecureStore.setItemAsync(key, value);
  },
  async remove(key: string): Promise<void> {
    if (Platform.OS === "web") { localStorage.removeItem(key); return; }
    await SecureStore.deleteItemAsync(key);
  },
};

// Active session — cleared on logout so the app returns to the login screen
// and api.ts stops sending the token.
const TOKEN_KEY    = "ecabin_auth_token";
const USER_KEY     = "ecabin_auth_user";

// Offline credential vault — survives logout so the inspector can re-authenticate
// with no internet. Only ever overwritten by the next successful ONLINE login
// (a different user logging in online replaces the vault with their own).
const OFFLINE_UNAME = "ecabin_offline_username";
const OFFLINE_PASS  = "ecabin_offline_password";
const OFFLINE_TOKEN = "ecabin_offline_token";
const OFFLINE_USER  = "ecabin_offline_user";

interface AuthContextValue {
  user:     AuthUser | null;
  token:    string | null;
  loading:  boolean;
  login:    (username: string, password: string) => Promise<void>;
  logout:   () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user:    null,
  token:   null,
  loading: true,
  login:   async () => {},
  logout:  async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [token,   setToken]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      try {
        const stored = await store.get(TOKEN_KEY);
        const storedUser = await store.get(USER_KEY);
        if (stored && storedUser) {
          setToken(stored);
          setUser(JSON.parse(storedUser));
          setAuthToken(stored);
        }
      } catch {
        // Corrupted store — clear it
        await store.remove(TOKEN_KEY).catch(() => {});
        await store.remove(USER_KEY).catch(() => {});
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const res = await api.login(username, password);
      const userJson = JSON.stringify(res.user);
      // Persist the active session...
      await store.set(TOKEN_KEY, res.token);
      await store.set(USER_KEY, userJson);
      // ...and refresh the offline vault so a later offline login can restore it.
      await store.set(OFFLINE_UNAME, username);
      await store.set(OFFLINE_PASS, password);
      await store.set(OFFLINE_TOKEN, res.token);
      await store.set(OFFLINE_USER, userJson);
      setAuthToken(res.token);
      setToken(res.token);
      setUser(res.user);
    } catch (e: any) {
      const msg: string = e?.message ?? "";
      const isNetworkError =
        e instanceof TypeError ||
        /Network request failed|Failed to fetch|NetworkError/i.test(msg);

      if (isNetworkError) {
        // Try offline authentication against the offline vault. These keys
        // persist across logout, so offline login works even after signing out.
        const [storedUser, storedPass, cachedToken, cachedUserJson] =
          await Promise.all([
            store.get(OFFLINE_UNAME),
            store.get(OFFLINE_PASS),
            store.get(OFFLINE_TOKEN),
            store.get(OFFLINE_USER),
          ]);

        if (
          storedUser === username &&
          storedPass === password &&
          cachedToken &&
          cachedUserJson
        ) {
          // Re-establish the active session from the vault.
          await store.set(TOKEN_KEY, cachedToken);
          await store.set(USER_KEY, cachedUserJson);
          setAuthToken(cachedToken);
          setToken(cachedToken);
          setUser(JSON.parse(cachedUserJson));
          return;
        }
      }

      throw e;
    }
  };

  const logout = async () => {
    // Clear only the active session. The offline vault (OFFLINE_*) is left
    // intact so the inspector can log back in with no internet. It gets
    // overwritten by the next successful online login.
    await Promise.all([
      store.remove(TOKEN_KEY).catch(() => {}),
      store.remove(USER_KEY).catch(() => {}),
    ]);
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  // Register auto-logout so any 401 from api.ts clears the session.
  useEffect(() => {
    setOnUnauthorized(logout);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
