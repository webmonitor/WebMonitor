import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import api, { setAccessToken } from '../api/client';
import { AuthProvider, useAuth } from './AuthContext';

global.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock('../api/client', () => {
  let currentToken = null;

  return {
    __esModule: true,
    default: { get: jest.fn() },
    setAccessToken: (token) => {
      currentToken = token || null;
    },
    getAccessToken: () => currentToken,
    setUnauthorizedHandler: jest.fn(() => jest.fn()),
  };
});

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

const account = (id, name) => ({ id, username: name, email: `${name}@example.test`, is_admin: false });

describe('AuthProvider session races', () => {
  let container;
  let root;
  let queryClient;
  let auth;

  const Harness = () => {
    auth = useAuth();
    return null;
  };

  const login = async (user, token) => {
    await act(async () => {
      await auth.login(user, token);
    });
  };

  beforeEach(async () => {
    localStorage.clear();
    setAccessToken(null);
    api.get.mockReset();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Harness />
          </AuthProvider>
        </QueryClientProvider>,
      );
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    queryClient.clear();
    container.remove();
  });

  test('a stale 200 cannot replace a newly authenticated account', async () => {
    const first = account(1, 'first');
    const second = account(2, 'second');
    const response = deferred();
    api.get.mockReturnValue(response.promise);
    await login(first, 'token-first');

    let refresh;
    act(() => {
      refresh = auth.refreshUser();
    });
    const signal = api.get.mock.calls[0][1].signal;
    await login(second, 'token-second');

    expect(signal.aborted).toBe(true);
    await act(async () => {
      response.resolve({ data: account(1, 'stale-first') });
      await refresh;
    });

    expect(auth.user).toEqual(second);
    expect(JSON.parse(localStorage.getItem('user'))).toEqual(second);
    expect(localStorage.getItem('token')).toBe('token-second');
  });

  test.each([401, 403])('a stale %s cannot end the new session', async (status) => {
    const response = deferred();
    api.get.mockReturnValue(response.promise);
    await login(account(1, 'first'), 'token-first');

    let refresh;
    act(() => {
      refresh = auth.refreshUser();
    });
    await login(account(2, 'second'), 'token-second');

    await act(async () => {
      response.reject({ response: { status } });
      await refresh;
    });

    expect(auth.user).toEqual(account(2, 'second'));
    expect(localStorage.getItem('token')).toBe('token-second');
  });

  test.each([401, 403])('an active %s ends only the current session', async (status) => {
    const response = deferred();
    api.get.mockReturnValue(response.promise);
    await login(account(1, 'current'), 'token-current');

    let refresh;
    act(() => {
      refresh = auth.refreshUser();
    });

    const failure = { response: { status } };
    await act(async () => {
      response.reject(failure);
      await expect(refresh).rejects.toBe(failure);
    });

    expect(auth.user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
  });

  test('only the newest same-session refresh can commit', async () => {
    const firstResponse = deferred();
    const secondResponse = deferred();
    api.get.mockReturnValueOnce(firstResponse.promise).mockReturnValueOnce(secondResponse.promise);
    await login(account(1, 'original'), 'token');

    act(() => {
      auth.refreshUser();
    });
    const firstSignal = api.get.mock.calls[0][1].signal;
    let newestRefresh;
    act(() => {
      newestRefresh = auth.refreshUser();
    });

    expect(firstSignal.aborted).toBe(true);
    await act(async () => {
      secondResponse.resolve({ data: account(1, 'current') });
      await newestRefresh;
      firstResponse.resolve({ data: account(1, 'stale') });
    });

    expect(auth.user).toEqual(account(1, 'current'));
  });
});
