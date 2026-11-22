import React, { Suspense, useState } from 'react';
import { Link as RouterLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Menu,
  MenuItem,
  Avatar,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Close as CloseIcon,
  Dashboard as DashboardIcon,
  Assignment as TaskIcon,
  History as LogIcon,
  People as PeopleIcon,
  Logout as LogoutIcon,
  Mail as MailIcon,
  Security as SecurityIcon,
  Public as PublicIcon,
  BookmarkBorder as SubscriptionsIcon,
  KeyboardArrowDown as ChevronIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../contexts/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import PageLoading from './PageLoading';
import { BrandLockup } from './WebMonitorLogo';
import { PROJECT_AUTHOR_URL, PROJECT_REPO_URL } from '../utils/links';
import { UI_COLORS, UI_FONTS } from '../theme/tokens';
import { formatRelativeTime } from '../utils/date';
import api from '../api/client';
import { keys } from '../api/queryKeys';

const drawerWidth = 264;

// 菜单只有一份：图标在这里，文案来自 i18n
const BASE_MENU_ITEMS = [
  { key: 'dashboard', icon: DashboardIcon, path: '/dashboard' },
  { key: 'tasks', icon: TaskIcon, path: '/tasks' },
  { key: 'publicTasks', icon: PublicIcon, path: '/public-tasks' },
  { key: 'mySubscriptions', icon: SubscriptionsIcon, path: '/my-subscriptions' },
  { key: 'logs', icon: LogIcon, path: '/logs' },
  { key: 'emailConfig', icon: MailIcon, path: '/email-config' },
];

const ADMIN_MENU_ITEMS = [
  { key: 'blacklist', icon: SecurityIcon, path: '/blacklist-management' },
  { key: 'users', icon: PeopleIcon, path: '/user-management' },
];

const GROUP_KEYS = {
  dashboard: 'monitor',
  tasks: 'monitor',
  publicTasks: 'monitor',
  mySubscriptions: 'monitor',
  logs: 'monitor',
  emailConfig: 'settings',
  blacklist: 'admin',
  users: 'admin',
};

const NavRow = ({ item, active, onClick, t }) => {
  const Icon = item.icon;

  return (
    <ListItemButton
      component={RouterLink}
      to={item.path}
      selected={active}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      sx={{
        mx: 1,
        px: 1.5,
        minHeight: 36,
        height: 36,
        gap: 1,
        position: 'relative',
        color: active ? 'text.primary' : 'text.secondary',
        '&::before': active
          ? { content: '""', position: 'absolute', left: 0, width: 2, height: 16, backgroundColor: UI_COLORS.primary }
          : undefined,
        '& .MuiListItemIcon-root': { color: active ? UI_COLORS.primary : UI_COLORS.muted },
      }}
    >
      <ListItemIcon sx={{ minWidth: 18, '& svg': { fontSize: 18 } }}>
        <Icon />
      </ListItemIcon>
      <ListItemText primary={t(`navigation.${item.key}`)} slotProps={{ primary: { sx: { fontSize: 14 } } }} />
    </ListItemButton>
  );
};

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { t, i18n } = useTranslation();

  const all = isAdmin() ? [...BASE_MENU_ITEMS, ...ADMIN_MENU_ITEMS] : BASE_MENU_ITEMS;
  const groups = ['monitor', 'settings', 'admin']
    .map((group) => ({ group, items: all.filter((item) => GROUP_KEYS[item.key] === group) }))
    .filter((entry) => entry.items.length > 0);

  const latestLogQuery = useQuery({
    queryKey: keys.latestLogs(user?.id, 1),
    queryFn: ({ signal }) =>
      api.get('/api/monitor-logs/latest', { params: { limit: 1 }, signal }).then((response) => response.data),
    enabled: !!user,
    refetchInterval: 60000,
  });

  const latestLog = latestLogQuery.data?.[0];
  const statusTone = latestLogQuery.isError
    ? UI_COLORS.muted
    : latestLog?.error_message
      ? UI_COLORS.danger
      : latestLog?.is_changed
        ? UI_COLORS.warning
        : UI_COLORS.success;

  const checkStatus = latestLogQuery.isLoading
    ? t('shell.checking')
    : latestLogQuery.isError
      ? t('shell.checkUnavailable')
      : latestLog
        ? t('shell.lastCheck', { time: formatRelativeTime(latestLog.check_time, i18n.language) })
        : t('shell.noChecks');

  const handleLogout = async () => {
    setUserMenuAnchor(null);
    await logout();
    navigate('/login', { replace: true });
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <BrandLockup size={22} />
          <IconButton aria-label={t('common.close')} onClick={() => setMobileOpen(false)} sx={{ display: { lg: 'none' } }}>
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.5 }}>
          <Box
            component="span"
            sx={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: latestLogQuery.isLoading ? UI_COLORS.muted : statusTone,
              flexShrink: 0,
            }}
          />
          <Typography
            component="span"
            role="status"
            sx={{ fontFamily: UI_FONTS.mono, fontSize: 11, color: UI_COLORS.muted, letterSpacing: 0 }}
          >
            {checkStatus}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ flexGrow: 1, overflowY: 'auto', pb: 2 }}>
        {groups.map(({ group, items }) => (
          <Box key={group} sx={{ mt: group === 'monitor' ? 2 : 3 }}>
            <Typography
              component="div"
              sx={{ px: 2.5, mb: 0.5, fontSize: 11, fontWeight: 500, color: UI_COLORS.muted, letterSpacing: 0 }}
            >
              {t(`navigation.groups.${group}`)}
            </Typography>
            <List sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
              {items.map((item) => (
                <NavRow
                  key={item.key}
                  item={item}
                  t={t}
                  active={location.pathname === item.path}
                  onClick={() => setMobileOpen(false)}
                />
              ))}
            </List>
          </Box>
        ))}
      </Box>

      <Box sx={{ borderTop: `1px solid ${UI_COLORS.hairline}`, p: 1.5 }}>
        <LanguageSwitcher sx={{ mb: 1 }} />
        <ListItemButton
          aria-label={t('common.userMenu')}
          aria-controls={userMenuAnchor ? 'menu-appbar' : undefined}
          aria-expanded={Boolean(userMenuAnchor)}
          onClick={(event) => setUserMenuAnchor(event.currentTarget)}
          sx={{ px: 1, minHeight: 36, height: 36, gap: 1 }}
        >
          <Avatar sx={{ width: 26, height: 26 }}>{user?.username?.charAt(0).toUpperCase() || 'U'}</Avatar>
          <ListItemText
            primary={user?.username || t('common.user')}
            slotProps={{ primary: { sx: { fontSize: 13, fontWeight: 500 } } }}
          />
          <ChevronIcon sx={{ fontSize: 18, color: UI_COLORS.muted }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: UI_COLORS.background }}>
      <AppBar position="fixed" sx={{ display: { lg: 'none' } }}>
        <Toolbar sx={{ minHeight: 52, gap: 1 }}>
          <IconButton
            edge="start"
            aria-label={t('common.openDrawer')}
            onClick={() => setMobileOpen(true)}
            sx={{ ml: -1 }}
          >
            <MenuIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <BrandLockup size={20} sx={{ flexGrow: 1 }} />
          <LanguageSwitcher />
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { lg: drawerWidth }, flexShrink: { lg: 0 } }} aria-label={t('navigation.groups.monitor')}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{ display: { xs: 'block', lg: 'none' }, '& .MuiDrawer-paper': { width: drawerWidth } }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{ display: { xs: 'none', lg: 'block' }, '& .MuiDrawer-paper': { width: drawerWidth } }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          // minWidth: 0 让 flex 子项可以被压缩：否则宽表格会撑开整页并产生横向滚动
          minWidth: 0,
          minHeight: '100vh',
          width: { lg: `calc(100% - ${drawerWidth}px)` },
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar sx={{ display: { lg: 'none' }, minHeight: 52 }} />
        <Box sx={{ px: { xs: 2, md: 4 }, py: { xs: 3, md: 4 }, flexGrow: 1, width: '100%', maxWidth: 1500, mx: 'auto' }}>
          {/* 页面级 Suspense：切换私有页时只替换内容，侧栏不卸载 */}
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </Box>
        <Box sx={{ px: { xs: 2, md: 4 }, pb: 2.5, width: '100%', maxWidth: 1500, mx: 'auto' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            <Box
              component="a"
              href={PROJECT_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              {t('common.footerCta')}
            </Box>
            {' · '}
            {t('common.author')}{' '}
            <Box
              component="a"
              href={PROJECT_AUTHOR_URL}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              ox0pine
            </Box>
          </Typography>
        </Box>
      </Box>

      <Menu
        id="menu-appbar"
        anchorEl={userMenuAnchor}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        open={Boolean(userMenuAnchor)}
        onClose={() => setUserMenuAnchor(null)}
      >
        <Box sx={{ px: 2, py: 1.25, minWidth: 200 }}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {user?.username || t('common.user')}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {user?.email || ''}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            {isAdmin() ? t('common.admin') : t('common.user')}
          </Typography>
        </Box>
        {isAdmin() && (
          <>
            <Divider />
            <MenuItem
              onClick={() => {
                setUserMenuAnchor(null);
                navigate('/user-management');
              }}
            >
              <PeopleIcon sx={{ fontSize: 18 }} />
              {t('navigation.users')}
            </MenuItem>
          </>
        )}
        <Divider />
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ fontSize: 18 }} />
          {t('common.logout')}
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Layout;
