import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import PageLoading from './components/PageLoading';
import PageErrorBoundary from './components/PageErrorBoundary';

// 十二个页面全部按路由懒加载：只有进入页面时才下载对应 chunk。
const HomePage = lazy(() => import('./pages/HomePage'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Documentation = lazy(() => import('./pages/Documentation'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const MonitorTasks = lazy(() => import('./pages/MonitorTasks'));
const MonitorLogs = lazy(() => import('./pages/MonitorLogs'));
const EmailConfig = lazy(() => import('./pages/EmailConfig'));
const PublicTasks = lazy(() => import('./pages/PublicTasks'));
const MySubscriptions = lazy(() => import('./pages/MySubscriptions'));
const BlacklistManagement = lazy(() => import('./pages/BlacklistManagement'));
const UserManagement = lazy(() => import('./pages/UserManagement'));

const FONT_STACK = [
  '"Source Serif Pro"',
  '"Noto Serif SC"',
  'Georgia',
  '"Times New Roman"',
  '"SimSun"',
  'serif',
].join(',');

const typographyVariant = (fontWeight) => ({
  fontFamily: FONT_STACK,
  fontWeight,
});

// 创建React Query客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

// 创建MUI主题
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' },
  },
  typography: {
    fontFamily: FONT_STACK,
    h1: typographyVariant(700),
    h2: typographyVariant(600),
    h3: typographyVariant(600),
    h4: typographyVariant(600),
    h5: typographyVariant(600),
    h6: typographyVariant(600),
    body1: typographyVariant(undefined),
    body2: typographyVariant(undefined),
    subtitle1: typographyVariant(undefined),
    subtitle2: typographyVariant(undefined),
    caption: typographyVariant(undefined),
    overline: typographyVariant(undefined),
    button: typographyVariant(500),
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <PageErrorBoundary>
              <Suspense fallback={<PageLoading />}>
                <Routes>
                  {/* 公开路由 */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  {/* 路径不能是 /docs：同源发布后 /docs 属于 FastAPI 的 Swagger UI */}
                  <Route path="/documentation" element={<Documentation />} />

                  {/* 普通用户路由：Layout 只挂载一次，页面在 Outlet 内切换 */}
                  <Route element={<ProtectedRoute />}>
                    <Route element={<Layout />}>
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/tasks" element={<MonitorTasks />} />
                      <Route path="/logs" element={<MonitorLogs />} />
                      <Route path="/email-config" element={<EmailConfig />} />
                      <Route path="/public-tasks" element={<PublicTasks />} />
                      <Route path="/my-subscriptions" element={<MySubscriptions />} />

                      {/* 管理员路由：同一个 Layout 内 */}
                      <Route element={<ProtectedRoute adminOnly />}>
                        <Route path="/blacklist-management" element={<BlacklistManagement />} />
                        <Route path="/user-management" element={<UserManagement />} />
                      </Route>
                    </Route>
                  </Route>

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </PageErrorBoundary>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
