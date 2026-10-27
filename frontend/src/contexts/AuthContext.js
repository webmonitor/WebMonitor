import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import api, { setAccessToken, setUnauthorizedHandler } from '../api/client';

const AuthContext = createContext();

const TOKEN_STORAGE_KEY = 'token';
const USER_STORAGE_KEY = 'user';

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const readStoredToken = () => {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // 每次会话切换递增，用来丢弃已经过期的恢复请求结果
  const sessionEpoch = useRef(0);

  const clearLocalSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    try {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      // localStorage 不可用时内存状态已经清空，忽略
    }
  }, []);

  /** 清空本地会话与所有查询缓存；登出与 401 共用。 */
  const endSession = useCallback(async () => {
    // 递增 epoch 会作废进行中的恢复请求；这里同时结束 loading，
    // 否则 401 之后守卫会一直停在加载态，而不是回到登录页。
    sessionEpoch.current += 1;
    setLoading(false);
    await queryClient.cancelQueries();
    queryClient.clear();
    clearLocalSession();
  }, [clearLocalSession, queryClient]);

  const login = useCallback(
    async (userData, token) => {
      sessionEpoch.current += 1;
      await queryClient.cancelQueries();
      queryClient.clear();

      setAccessToken(token);
      setUser(userData);
      setLoading(false);

      try {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
      } catch {
        // 存储不可用时仍然保持本次会话可用
      }
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await endSession();
  }, [endSession]);

  /** 重新拉取当前用户；账户被停用时清空会话。 */
  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get('/api/auth/me');
      setUser(response.data);
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data));
      } catch {
        // 忽略存储失败
      }
      return;
    } catch (error) {
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        await endSession();
      }
      throw error;
    }
  }, [endSession]);

  // 启动时：先用本地令牌恢复会话，再用 /auth/me 校验；本地缓存的 user 不授予任何权限。
  useEffect(() => {
    const epoch = sessionEpoch.current;
    const token = readStoredToken();

    if (!token) {
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    setAccessToken(token);

    api
      .get('/api/auth/me', { signal: controller.signal })
      .then((response) => {
        if (sessionEpoch.current !== epoch) {
          return;
        }
        setUser(response.data);
        try {
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data));
        } catch {
          // 忽略存储失败
        }
      })
      .catch((error) => {
        if (controller.signal.aborted || sessionEpoch.current !== epoch) {
          return;
        }
        if (error?.code === 'ERR_CANCELED') {
          return;
        }
        clearLocalSession();
      })
      .finally(() => {
        if (sessionEpoch.current === epoch) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [clearLocalSession]);

  // 401 只清当前会话：旧令牌的迟到响应不能把新会话踢下线（client.js 里已比对令牌）。
  useEffect(() => {
    const unregister = setUnauthorizedHandler(() => {
      endSession();
    });
    return unregister;
  }, [endSession]);

  const value = {
    user,
    loading,
    login,
    logout,
    refreshUser,
    isAuthenticated: () => !!user,
    isAdmin: () => !!user?.is_admin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
