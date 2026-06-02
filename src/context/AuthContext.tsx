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

const TOKEN_KEY = "ecabin_auth_token";
const USER_KEY  = "ecabin_auth_user";

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
    const res = await api.login(username, password);
    await store.set(TOKEN_KEY, res.token);
    await store.set(USER_KEY, JSON.stringify(res.user));
    setAuthToken(res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = async () => {
    await store.remove(TOKEN_KEY).catch(() => {});
    await store.remove(USER_KEY).catch(() => {});
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
