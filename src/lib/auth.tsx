import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError, setAccessToken } from './api';
import { getStoredToken, setStoredToken } from './session';
import type { Capabilities, PublicSettings, SessionPayload, User } from '../types';

interface AuthContextValue {
  user: User | null;
  capabilities: Capabilities | null;
  settings: PublicSettings | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  signup: (data: {
    full_name: string;
    email?: string;
    password: string;
    phone?: string;
  }) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  applySession: (payload: SessionPayload) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function friendlyAuthError(message: string) {
  const text = message.toLowerCase();
  if (text.includes('invalid login credentials')) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  if (text.includes('email not confirmed')) return 'يرجى تأكيد البريد الإلكتروني أولاً ثم تسجيل الدخول';
  if (text.includes('user already registered')) return 'يوجد حساب مسجل بهذا البريد الإلكتروني';
  if (text.includes('password should be at least')) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
  if (text.includes('unable to validate email')) return 'البريد الإلكتروني غير صالح';
  if (text.includes('signups not allowed')) return 'التسجيل الذاتي مغلق حالياً. تواصل مع مدير النظام';
  return message || 'تعذر إتمام العملية';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const applySession = useCallback((payload: SessionPayload) => {
    setUser(payload.user);
    setCapabilities(payload.capabilities);
    setSettings(payload.settings);
  }, []);

  const clear = useCallback(() => {
    setUser(null);
    setCapabilities(null);
    setSettings(null);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const payload = await api.get<SessionPayload>('/auth/me', AbortSignal.timeout(15000));
      if (mounted.current) applySession(payload);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setAccessToken(null);
        setStoredToken(null);
      }
      if (mounted.current) clear();
    }
  }, [applySession, clear]);

  useEffect(() => {
    const token = getStoredToken();
    setAccessToken(token);
    (async () => {
      if (token) await refresh();
      else clear();
      if (mounted.current) setLoading(false);
    })();
  }, [refresh, clear]);

  useEffect(() => {
    const onUnauthorized = () => {
      setAccessToken(null);
      setStoredToken(null);
      clear();
    };
    window.addEventListener('banan:unauthorized', onUnauthorized);
    return () => window.removeEventListener('banan:unauthorized', onUnauthorized);
  }, [clear]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const value = identifier.trim();
      const isEmail = value.includes('@');
      const digits = value.replace(/\D/g, '');
      if (!isEmail && digits.length < 6) {
        throw new ApiError('أدخل بريداً إلكترونياً صالحاً أو رقم هاتف مسجلاً', 400);
      }
      let result: { session: { access_token: string } };
      try {
        result = await api.post<{ session: { access_token: string } }>('/auth/login', {
          email: isEmail ? value : null,
          phone: isEmail ? null : digits,
          password,
        });
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          throw new ApiError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
        }
        throw error;
      }
      const token = result.session?.access_token ?? null;
      if (!token) throw new ApiError(friendlyAuthError(''), 401);
      setAccessToken(token);
      setStoredToken(token);
      try {
        const payload = await api.get<SessionPayload>('/auth/me', AbortSignal.timeout(15000));
        if (mounted.current) applySession(payload);
      } catch (error) {
        setAccessToken(null);
        setStoredToken(null);
        if (mounted.current) clear();
        throw error;
      }
    },
    [applySession, clear]
  );

  const signup = useCallback(
    async (data: { full_name: string; email?: string; password: string; phone?: string }) => {
      const result = await api.post<{ message: string }>('/auth/signup', {
        full_name: data.full_name,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        password: data.password,
      });
      // Signup creates a pending account. Never leave the new user signed in
      // before an administrator approves the request.
      setAccessToken(null);
      setStoredToken(null);
      clear();
      return {
        message: result.message || 'تم إرسال طلب التسجيل بنجاح. سيبقى الحساب معطلاً حتى توافق الإدارة عليه.',
      };
    },
    [clear]
  );

  const logout = useCallback(async () => {
    setAccessToken(null);
    setStoredToken(null);
    clear();
  }, [clear]);

  const value = useMemo(
    () => ({
      user,
      capabilities,
      settings,
      loading,
      login,
      signup,
      logout,
      refresh,
      applySession,
    }),
    [user, capabilities, settings, loading, login, signup, logout, refresh, applySession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
