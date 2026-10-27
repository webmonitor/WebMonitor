import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import MonitorTasks from './pages/MonitorTasks';
import MonitorLogs from './pages/MonitorLogs';
import EmailConfig from './pages/EmailConfig';
import UserManagement from './pages/UserManagement';
import BlacklistManagement from './pages/BlacklistManagement';
import PublicTasks from './pages/PublicTasks';
import MySubscriptions from './pages/MySubscriptions';
import Documentation from './pages/Documentation';

// 创建React Query客户端
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// 创建MUI主题
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: [
      '"Source Serif Pro"',
      '"Noto Serif SC"',
      'Georgia',
      '"Times New Roman"',
      '"SimSun"', // 宋体
      'serif',
    ].join(','),
    h1: {
      fontFamily: [
        '"Source Serif Pro"',
        '"Noto Serif SC"',
        'Georgia',
        '"Times New Roman"',
        '"SimSun"',
        'serif',
      ].join(','),
      fontWeight: 700,
    },
    h2: {
      fontFamily: [
        '"Source Serif Pro"',
        '"Noto Serif SC"',
        'Georgia',
        '"Times New Roman"',
        '"SimSun"',
        'serif',
      ].join(','),
      fontWeight: 600,
    },
    h3: {
      fontFamily: [
        '"Source Serif Pro"',
        '"Noto Serif SC"',
        'Georgia',
        '"Times New Roman"',
        '"SimSun"',
        'serif',
      ].join(','),
      fontWeight: 600,
    },
    h4: {
      fontFamily: [
        '"Source Serif Pro"',
        '"Noto Serif SC"',
        'Georgia',
        '"Times New Roman"',
        '"SimSun"',
        'serif',
      ].join(','),
      fontWeight: 600,
    },
    h5: {
      fontFamily: [
        '"Source Serif Pro"',
        '"Noto Serif SC"',
        'Georgia',
        '"Times New Roman"',
        '"SimSun"',
        'serif',
      ].join(','),
      fontWeight: 600,
    },
    h6: {
      fontFamily: [
        '"Source Serif Pro"',
        '"Noto Serif SC"',
        'Georgia',
        '"Times New Roman"',
        '"SimSun"',
        'serif',
      ].join(','),
      fontWeight: 600,
    },
    body1: {
      fontFamily: [
        '"Source Serif Pro"',
        '"Noto Serif SC"',
        'Georgia',
        '"Times New Roman"',
        '"SimSun"',
        'serif',
      ].join(','),
    },
    body2: {
      fontFamily: [
        '"Source Serif Pro"',
        '"Noto Serif SC"',
        'Georgia',
        '"Times New Roman"',
        '"SimSun"',
        'serif',
      ].join(','),
    },
    subtitle1: {
      fontFamily: [
        '"Source Serif Pro"',
        '"Noto Serif SC"',
        'Georgia',
        '"Times New Roman"',
        '"SimSun"',
        'serif',
      ].join(','),
    },
    subtitle2: {
      fontFamily: [
        '"Source Serif Pro"',
        '"Noto Serif SC"',
        'Georgia',
        '"Times New Roman"',
        '"SimSun"',
        'serif',
      ].join(','),
    },
    caption: {
      fontFamily: [
        '"Source Serif Pro"',
        '"Noto Serif SC"',
        'Georgia',
        '"Times New Roman"',
        '"SimSun"',
        'serif',
      ].join(','),
    },
    overline: {
      fontFamily: [
        '"Source Serif Pro"',
        '"Noto Serif SC"',
        'Georgia',
        '"Times New Roman"',
        '"SimSun"',
        'serif',
      ].join(','),
    },
    button: {
      fontFamily: [
        '"Source Serif Pro"',
        '"Noto Serif SC"',
        'Georgia',
        '"Times New Roman"',
        '"SimSun"',
        'serif',
      ].join(','),
      fontWeight: 500,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <Routes>
              {/* 首页 - 不需要认证 */}
              <Route path="/" element={<HomePage />} />

              {/* 登录页面 - 不需要认证 */}
              <Route path="/login" element={<Login />} />

              {/* 注册页面 - 不需要认证 */}
              <Route path="/register" element={<Register />} />

              {/* 文档页面 - 不需要认证。
                  路径不能是 /docs：同源发布后 /docs 属于 FastAPI 的 Swagger UI。 */}
              <Route path="/documentation" element={<Documentation />} />

              {/* 仪表板 */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Layout><Dashboard /></Layout>
                </ProtectedRoute>
              } />

              {/* 监控任务 */}
              <Route path="/tasks" element={
                <ProtectedRoute>
                  <Layout><MonitorTasks /></Layout>
                </ProtectedRoute>
              } />

              {/* 监控日志 */}
              <Route path="/logs" element={
                <ProtectedRoute>
                  <Layout><MonitorLogs /></Layout>
                </ProtectedRoute>
              } />

              {/* 邮件通知配置 */}
              <Route path="/email-config" element={
                <ProtectedRoute>
                  <Layout><EmailConfig /></Layout>
                </ProtectedRoute>
              } />

              {/* 公开任务市场 */}
              <Route path="/public-tasks" element={
                <ProtectedRoute>
                  <Layout><PublicTasks /></Layout>
                </ProtectedRoute>
              } />

              {/* 我的订阅 */}
              <Route path="/my-subscriptions" element={
                <ProtectedRoute>
                  <Layout><MySubscriptions /></Layout>
                </ProtectedRoute>
              } />

              {/* 黑名单管理 - 仅管理员 */}
              <Route path="/blacklist-management" element={
                <ProtectedRoute adminOnly>
                  <Layout><BlacklistManagement /></Layout>
                </ProtectedRoute>
              } />

              {/* 用户管理 - 仅管理员 */}
              <Route path="/user-management" element={
                <ProtectedRoute adminOnly>
                  <Layout><UserManagement /></Layout>
                </ProtectedRoute>
              } />
            </Routes>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
