/**
 * 唯一的 HTTP 客户端。
 *
 * 前后端同源发布：页面与 API 走同一个 origin，所有请求都是相对路径 /api/...。
 * 开发期由 CRA dev server 的 `proxy`（见 package.json）转发到后端。
 *
 * 令牌只存在模块内存里（AuthContext 通过 setAccessToken 设置），不读
 * localStorage：刷新页面后由 AuthContext 从 localStorage 取回再交给我们。
 */
import axios from 'axios';

const api = axios.create({ baseURL: '' });

const AUTH_FREE_PATHS = ['/api/auth/login', '/api/auth/register'];

let accessToken = null;
let unauthorizedHandler = null;

export const setAccessToken = (token) => {
  accessToken = token || null;
};

/**
 * 注册 401 回调，返回注销函数。
 *
 * 只有"用当前令牌发出、且令牌仍然是当前令牌"的请求才触发回调：旧会话的
 * 迟到响应不能把新会话踢下线。
 */
export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;

  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null;
    }
  };
};

api.interceptors.request.use((config) => {
  const requestToken = accessToken;
  config.__requestToken = requestToken;

  if (requestToken && !AUTH_FREE_PATHS.some((path) => (config.url || '').startsWith(path))) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${requestToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestToken = error?.config?.__requestToken;

    if (status === 401 && requestToken && requestToken === accessToken && unauthorizedHandler) {
      unauthorizedHandler();
    }

    return Promise.reject(error);
  },
);

/**
 * 从后端错误里取出可展示的文案。
 *
 * 顺序：非空 detail 字符串 → detail 数组里的 msg（分号连接）→ 字符串 message
 * → 网络失败用调用方给的本地化兜底 → Error.message → 兜底。
 * 不会返回 [object Object] 或整个响应体。
 */
export const getApiErrorMessage = (error, fallback) => {
  const data = error?.response?.data;

  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  const detail = data?.detail;
  if (typeof detail === 'string' && detail.trim()) {
    return detail;
  }

  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => (typeof item === 'string' ? item : item?.msg))
      .filter((item) => typeof item === 'string' && item.trim());

    if (messages.length > 0) {
      return messages.join('; ');
    }
  }

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }

  if (!error?.response) {
    return fallback;
  }

  if (typeof error?.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallback;
};

export default api;
