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
import { UI_COLORS, UI_FONTS } from './theme/tokens';

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
//
// 调色板与组件默认值只在这里定义一次：
// - 铬件只用墨蓝中性阶，深松绿只出现在主操作与选中态；
// - 衬线只做标题，界面文字用系统无衬线，数字/时间由使用处切换为等宽；
// - 卡片、输入框、菜单共用发丝描边，没有阴影层级。
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: UI_COLORS.primary, dark: UI_COLORS.primaryDark, contrastText: '#ffffff' },
    secondary: { main: UI_COLORS.secondary, contrastText: '#ffffff' },
    success: { main: UI_COLORS.success },
    info: { main: UI_COLORS.info },
    warning: { main: UI_COLORS.warning },
    error: { main: UI_COLORS.danger },
    background: { default: UI_COLORS.background, paper: UI_COLORS.surface },
    text: { primary: UI_COLORS.text, secondary: UI_COLORS.secondary, disabled: UI_COLORS.muted },
    divider: UI_COLORS.hairline,
    action: {
      hover: 'rgba(17, 24, 39, 0.04)',
      selected: 'rgba(17, 24, 39, 0.06)',
      focus: 'rgba(18, 104, 75, 0.12)',
    },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
          fontSize: 14,
          minHeight: 36,
          paddingInline: 16,
          '&:focus-visible': { outline: `2px solid ${UI_COLORS.primary}`, outlineOffset: 2 },
        },
        sizeLarge: { minHeight: 44, paddingInline: 20, fontSize: 15 },
        sizeSmall: { minHeight: 30, paddingInline: 10, fontSize: 13 },
        containedPrimary: {
          backgroundColor: UI_COLORS.primary,
          '&:hover': { backgroundColor: UI_COLORS.primaryDark },
        },
        outlined: {
          borderColor: UI_COLORS.hairline,
          color: UI_COLORS.text,
          '&:hover': { borderColor: UI_COLORS.hairline, backgroundColor: UI_COLORS.raised },
        },
        text: {
          color: UI_COLORS.secondary,
          '&:hover': { backgroundColor: UI_COLORS.raised, color: UI_COLORS.text },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          color: UI_COLORS.secondary,
          '&:hover': { backgroundColor: UI_COLORS.raised, color: UI_COLORS.text },
          '&:focus-visible': { outline: `2px solid ${UI_COLORS.primary}`, outlineOffset: 2 },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
        rounded: { borderRadius: 12 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${UI_COLORS.hairline}`,
          boxShadow: 'none',
          backgroundImage: 'none',
        },
      },
    },
    MuiCardContent: {
      styleOverrides: { root: { padding: 20, '&:last-child': { paddingBottom: 20 } } },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: `1px solid ${UI_COLORS.hairline}`,
          boxShadow: '0 24px 48px rgba(17, 24, 39, 0.12)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: { root: { fontSize: 16, fontWeight: 500, padding: '20px 24px 8px' } },
    },
    MuiDialogContent: {
      styleOverrides: { root: { padding: '12px 24px' } },
    },
    MuiDialogActions: {
      styleOverrides: { root: { padding: '12px 24px 20px', gap: 8 } },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          borderRadius: 10,
          border: `1px solid ${UI_COLORS.hairline}`,
          boxShadow: '0 8px 24px rgba(17, 24, 39, 0.08)',
          minWidth: 200,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: { fontSize: 14, minHeight: 36, gap: 10, '& .MuiSvgIcon-root': { fontSize: 18 } },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontFamily: UI_FONTS.ui,
          fontWeight: 500,
          fontSize: 12,
          height: 24,
          letterSpacing: 0,
        },
        label: { paddingInline: 8 },
        outlined: { borderColor: UI_COLORS.hairline, color: UI_COLORS.secondary },
        filled: { backgroundColor: UI_COLORS.raised, color: UI_COLORS.secondary },
        colorPrimary: { backgroundColor: UI_COLORS.primarySoft, color: UI_COLORS.primary },
        colorSuccess: { backgroundColor: 'rgba(22, 134, 95, 0.08)', color: UI_COLORS.success },
        colorWarning: { backgroundColor: 'rgba(180, 83, 9, 0.08)', color: UI_COLORS.warning },
        colorError: { backgroundColor: 'rgba(180, 35, 24, 0.08)', color: UI_COLORS.danger },
        colorInfo: { backgroundColor: UI_COLORS.raised, color: UI_COLORS.secondary },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-root': {
            backgroundColor: UI_COLORS.background,
            color: UI_COLORS.secondary,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: 0,
            borderBottom: `1px solid ${UI_COLORS.hairline}`,
            padding: '10px 16px',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${UI_COLORS.hairline}`,
          color: UI_COLORS.text,
          fontSize: 13,
          padding: '14px 16px',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: { root: { '&:hover': { backgroundColor: 'rgba(17, 24, 39, 0.03)' } } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: UI_COLORS.surface,
          fontSize: 14,
          transition: 'box-shadow 140ms cubic-bezier(0.22, 1, 0.36, 1)',
          '& .MuiOutlinedInput-notchedOutline': { borderColor: UI_COLORS.hairline },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(17, 24, 39, 0.24)' },
          '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(18, 104, 75, 0.12)' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: UI_COLORS.primary,
            borderWidth: 1,
          },
        },
        input: { padding: '10px 12px' },
        inputSizeSmall: { padding: '8px 10px' },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: 14, color: UI_COLORS.secondary },
        shrink: { fontSize: 13 },
      },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { fontSize: 12, marginLeft: 2 } },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8, fontSize: 13, alignItems: 'center' },
        standardError: { backgroundColor: 'rgba(180, 35, 24, 0.06)', color: UI_COLORS.text },
        standardWarning: { backgroundColor: 'rgba(180, 83, 9, 0.06)', color: UI_COLORS.text },
        standardSuccess: { backgroundColor: 'rgba(22, 134, 95, 0.06)', color: UI_COLORS.text },
        standardInfo: { backgroundColor: UI_COLORS.raised, color: UI_COLORS.text },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: UI_COLORS.text,
          color: '#ffffff',
          fontSize: 12,
          borderRadius: 6,
          padding: '6px 10px',
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: {
          backgroundColor: UI_COLORS.raised,
          color: UI_COLORS.text,
          fontSize: 13,
          fontWeight: 500,
          width: 28,
          height: 28,
        },
      },
    },
    MuiDivider: {
      styleOverrides: { root: { borderColor: UI_COLORS.hairline } },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '&.Mui-selected': {
            backgroundColor: UI_COLORS.raised,
            '&:hover': { backgroundColor: '#e2e7ec' },
          },
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: { fontSize: 14, fontWeight: 400 },
        secondary: { fontSize: 12 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: UI_COLORS.surface,
          color: UI_COLORS.text,
          boxShadow: 'none',
          borderBottom: `1px solid ${UI_COLORS.hairline}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { borderRight: `1px solid ${UI_COLORS.hairline}`, backgroundImage: 'none' },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { textTransform: 'none', fontSize: 13, fontWeight: 500, minHeight: 40, paddingInline: 12 },
      },
    },
    MuiTabs: {
      styleOverrides: { indicator: { height: 2, backgroundColor: UI_COLORS.primary } },
    },
    MuiCircularProgress: {
      defaultProps: { size: 20, thickness: 4 },
      styleOverrides: { root: { color: UI_COLORS.primary } },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { backgroundColor: UI_COLORS.raised, borderRadius: 2, height: 4 },
        bar: { backgroundColor: UI_COLORS.primary },
      },
    },
    MuiSkeleton: {
      styleOverrides: { root: { backgroundColor: UI_COLORS.raised } },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: UI_COLORS.primary,
          textDecoration: 'none',
          '&:hover': { textDecoration: 'underline' },
        },
      },
    },
  },
  typography: {
    fontFamily: UI_FONTS.ui,
    h1: { fontFamily: UI_FONTS.display, fontSize: 40, lineHeight: 1.12, fontWeight: 500, letterSpacing: '-0.02em' },
    h2: { fontFamily: UI_FONTS.display, fontSize: 32, lineHeight: 1.18, fontWeight: 500, letterSpacing: '-0.015em' },
    h3: { fontFamily: UI_FONTS.display, fontSize: 26, lineHeight: 1.25, fontWeight: 500, letterSpacing: '-0.01em' },
    h4: { fontFamily: UI_FONTS.display, fontSize: 22, lineHeight: 1.3, fontWeight: 500, letterSpacing: '-0.005em' },
    h5: { fontSize: 18, lineHeight: 1.4, fontWeight: 500 },
    h6: { fontSize: 15, lineHeight: 1.45, fontWeight: 500 },
    body1: { fontSize: 14, lineHeight: 1.55 },
    body2: { fontSize: 13, lineHeight: 1.55 },
    subtitle1: { fontSize: 14, lineHeight: 1.45, fontWeight: 500 },
    subtitle2: { fontSize: 13, lineHeight: 1.4, fontWeight: 500 },
    caption: { fontSize: 12, lineHeight: 1.4 },
    overline: { fontSize: 12, lineHeight: 1.4, fontWeight: 500, letterSpacing: 0, textTransform: 'none' },
    button: { fontSize: 14, lineHeight: 1.2, fontWeight: 500, letterSpacing: 0 },
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
