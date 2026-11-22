import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import api, { getAccessToken, setAccessToken, setUnauthorizedHandler } from '../api/client';

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
  // epoch、令牌和请求控制器必须同时匹配，旧会话的任何迟到响应都不能写入新会话。
  const sessionEpoch = useRef(0);
  const sessionRequest = useRef(null);

  const abortSessionRequest = useCallback(() => {
    sessionRequest.current?.abort();
    sessionRequest.current = null;
  }, []);

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
    sessionEpoch.current += 1;
    abortSessionRequest();
    clearLocalSession();
    setLoading(false);

    // 缓存清理不能排在 await 后面，否则旧登出流程可能清掉新账户刚启动的查询。
    const cancellation = queryClient.cancelQueries();
    queryClient.clear();
    await cancellation;
  }, [abortSessionRequest, clearLocalSession, queryClient]);

  const login = useCallback(
    async (userData, token) => {
      sessionEpoch.current += 1;
      abortSessionRequest();
      clearLocalSession();

      const cancellation = queryClient.cancelQueries();
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

      await cancellation;
    },
    [abortSessionRequest, clearLocalSession, queryClient],
  );

  const logout = useCallback(async () => {
    await endSession();
  }, [endSession]);

  /** 重新拉取当前用户；只有发起请求时的同一会话可以提交结果或注销。 */
  const refreshUser = useCallback(async () => {
    const epoch = sessionEpoch.current;
    const token = getAccessToken();
    if (!token) {
      return null;
    }

    abortSessionRequest();
    const controller = new AbortController();
    sessionRequest.current = controller;

    const isCurrentRequest = () =>
      sessionEpoch.current === epoch &&
      getAccessToken() === token &&
      sessionRequest.current === controller &&
      !controller.signal.aborted;

    try {
      const response = await api.get('/api/auth/me', { signal: controller.signal });
      if (!isCurrentRequest()) {
        return null;
      }

      setUser(response.data);
      try {
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.data));
      } catch {
        // 忽略存储失败
      }
      return response.data;
    } catch (error) {
      if (!isCurrentRequest()) {
        return null;
      }

      if (error?.response?.status === 401 || error?.response?.status === 403) {
        await endSession();
      }
      throw error;
    } finally {
      if (sessionRequest.current === controller) {
        sessionRequest.current = null;
        if (sessionEpoch.current === epoch && getAccessToken() === token) {
          setLoading(false);
        }
      }
    }
  }, [abortSessionRequest, endSession]);

  // 启动时：先用本地令牌恢复会话，再用 /auth/me 校验；本地缓存的 user 不授予任何权限。
  useEffect(() => {
    const epoch = sessionEpoch.current;
    const token = readStoredToken();

    if (!token) {
      setLoading(false);
      return undefined;
    }

    const controller = new AbortController();
    sessionRequest.current = controller;
    setAccessToken(token);

    const isCurrentRequest = () =>
      sessionEpoch.current === epoch &&
      getAccessToken() === token &&
      sessionRequest.current === controller &&
      !controller.signal.aborted;

    api
      .get('/api/auth/me', { signal: controller.signal })
      .then((response) => {
        if (!isCurrentRequest()) {
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
        if (!isCurrentRequest() || error?.code === 'ERR_CANCELED') {
          return;
        }
        clearLocalSession();
      })
      .finally(() => {
        if (sessionRequest.current === controller) {
          sessionRequest.current = null;
          setLoading(false);
        }
      });

    return () => {
      if (sessionRequest.current === controller) {
        controller.abort();
        sessionRequest.current = null;
      }
    };
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
