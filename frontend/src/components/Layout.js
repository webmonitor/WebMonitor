import React, { Suspense, useMemo, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  CssBaseline,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
  Divider,
  Chip,
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Assignment as TaskIcon,
  History as LogIcon,
  People as PeopleIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountIcon,
  NotificationsActive as NotificationsIcon,
  Mail as MailIcon,
  Security as SecurityIcon,
  Public as PublicIcon,
  BookmarkBorder as SubscriptionsIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../contexts/AuthContext';
import LanguageSwitcher from './LanguageSwitcher';
import PageLoading from './PageLoading';

const drawerWidth = 280;

// 菜单只有一份：图标在这里，文案来自 i18n
const BASE_MENU_ITEMS = [
  { key: 'dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { key: 'tasks', icon: <TaskIcon />, path: '/tasks' },
  { key: 'publicTasks', icon: <PublicIcon />, path: '/public-tasks' },
  { key: 'mySubscriptions', icon: <SubscriptionsIcon />, path: '/my-subscriptions' },
  { key: 'logs', icon: <LogIcon />, path: '/logs' },
  { key: 'emailConfig', icon: <MailIcon />, path: '/email-config' },
];

const ADMIN_MENU_ITEMS = [
  { key: 'blacklist', icon: <SecurityIcon />, path: '/blacklist-management' },
  { key: 'users', icon: <PeopleIcon />, path: '/user-management' },
];

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { t } = useTranslation();
  const faviconSrc = `${process.env.PUBLIC_URL || ''}/favicon.svg`;

  const menuItems = useMemo(() => {
    const items = BASE_MENU_ITEMS.map((item) => ({
      ...item,
      text: t(`navigation.${item.key}`),
      description: t(`navigation.${item.key}Hint`),
    }));

    if (!isAdmin()) {
      return items;
    }

    return [
      ...items,
      ...ADMIN_MENU_ITEMS.map((item) => ({
        ...item,
        text: t(`navigation.${item.key}`),
        description: t(`navigation.${item.key}Hint`),
      })),
    ];
  }, [isAdmin, t]);

  const currentMenuItem = menuItems.find((item) => item.path === location.pathname);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuItemClick = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    setUserMenuAnchor(null);
    await logout();
    navigate('/login', { replace: true });
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 3, borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box
            component="img"
            src={faviconSrc}
            alt="WebMonitor"
            sx={{ width: 40, height: 40, mr: 2, display: 'block', objectFit: 'contain' }}
          />
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                background: 'linear-gradient(45deg, #1a1a1a, #10b981)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              WebMonitor
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {t('navigation.platformTagline')}
            </Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{ px: 2, pt: 2, display: 'flex', justifyContent: 'center' }}>
        <LanguageSwitcher sx={{ width: 'fit-content' }} />
      </Box>

      <Box sx={{ flexGrow: 1, py: 2 }}>
        <List sx={{ p: 0 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.key} disablePadding sx={{ px: 2, mb: 1 }}>
                <ListItemButton
                  selected={isActive}
                  onClick={() => handleMenuItemClick(item.path)}
                  sx={{
                    borderRadius: 2,
                    px: 3,
                    py: 2.5,
                    minHeight: 'auto',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      transform: 'translateX(4px)',
                    },
                    '&.Mui-selected': {
                      background:
                        'linear-gradient(45deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0.05) 100%)',
                      borderLeft: '3px solid #10b981',
                      '&:hover': {
                        backgroundColor: 'rgba(16, 185, 129, 0.2)',
                        transform: 'translateX(0)',
                      },
                      '& .MuiListItemIcon-root': { color: '#10b981' },
                      '& .MuiListItemText-primary': { color: '#1a1a1a', fontWeight: 600 },
                      '& .MuiListItemText-secondary': { color: 'rgba(16, 185, 129, 0.8)' },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color: isActive ? '#10b981' : 'rgba(0, 0, 0, 0.6)',
                      '& svg': { fontSize: 20 },
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    secondary={item.description}
                    slotProps={{
                      primary: {
                        sx: { fontSize: '0.9rem', fontWeight: isActive ? 600 : 500 },
                      },
                      secondary: { sx: { fontSize: '0.75rem' } },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      <Box sx={{ p: 2, borderTop: '1px solid rgba(0,0,0,0.06)', mb: 2 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 1.5,
            borderRadius: 2,
            backgroundColor: 'rgba(16, 185, 129, 0.05)',
          }}
        >
          <Avatar
            sx={{
              width: 36,
              height: 36,
              mr: 2,
              background: 'linear-gradient(45deg, #2563eb 30%, #1d4ed8 90%)',
              fontSize: '0.9rem',
            }}
          >
            {user?.username?.charAt(0).toUpperCase() || 'U'}
          </Avatar>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="body2" noWrap sx={{ fontWeight: 600 }}>
              {user?.username || t('common.user')}
            </Typography>
            <Typography variant="caption" noWrap sx={{ color: 'text.secondary', display: 'block' }}>
              {user?.email || ''}
            </Typography>
          </Box>
          {isAdmin() && (
            <Chip
              size="small"
              label={t('common.admin')}
              sx={{
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                color: '#10b981',
                fontWeight: 'bold',
                fontSize: '0.7rem',
                height: 20,
                alignSelf: 'flex-start',
              }}
            />
          )}
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          color: '#1a1a1a',
        }}
      >
        <Toolbar sx={{ minHeight: 72 }}>
          <IconButton
            color="inherit"
            aria-label={t('common.openDrawer')}
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' }, color: '#10b981' }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 3 }}>
              <Box
                component="img"
                src={faviconSrc}
                alt="WebMonitor"
                sx={{ width: 32, height: 32, mr: 1.5, display: 'block', objectFit: 'contain' }}
              />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>
                  {currentMenuItem?.text || 'WebMonitor'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {currentMenuItem?.description || ''}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <LanguageSwitcher sx={{ mr: 0.5 }} />
            </Box>

            <Tooltip title={t('common.notifications')}>
              <IconButton
                sx={{
                  color: 'rgba(0, 0, 0, 0.6)',
                  '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' },
                }}
              >
                <Badge badgeContent={0} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title={t('common.userMenu')}>
              <IconButton
                size="small"
                aria-label={t('common.userMenu')}
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={(event) => setUserMenuAnchor(event.currentTarget)}
                sx={{ p: 0.5, '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.1)' } }}
              >
                <Avatar
                  sx={{
                    width: 36,
                    height: 36,
                    background: 'linear-gradient(45deg, #2563eb 30%, #1d4ed8 90%)',
                    boxShadow: '0 2px 10px rgba(37, 99, 235, 0.3)',
                  }}
                >
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              id="menu-appbar"
              anchorEl={userMenuAnchor}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              keepMounted
              transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              open={Boolean(userMenuAnchor)}
              onClose={() => setUserMenuAnchor(null)}
              slotProps={{
                paper: {
                  sx: {
                    mt: 1,
                    minWidth: 200,
                    borderRadius: 2,
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
                  },
                },
              }}
            >
              <MenuItem disabled sx={{ py: 2, opacity: '1 !important' }}>
                <AccountIcon sx={{ mr: 2, color: '#2563eb' }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {user?.username || t('common.user')}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {user?.email || ''}
                  </Typography>
                </Box>
              </MenuItem>
              <Divider />
              {isAdmin() && (
                <MenuItem
                  onClick={() => {
                    setUserMenuAnchor(null);
                    navigate('/user-management');
                  }}
                  sx={{ py: 1.5, '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.1)' } }}
                >
                  <PeopleIcon sx={{ mr: 2, color: '#10b981' }} />
                  {t('navigation.users')}
                </MenuItem>
              )}
              <MenuItem
                onClick={handleLogout}
                sx={{ py: 1.5, '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'error.main' } }}
              >
                <LogoutIcon sx={{ mr: 2 }} />
                {t('common.logout')}
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }} aria-label={t('navigation.dashboard')}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid rgba(0, 0, 0, 0.06)',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid rgba(0, 0, 0, 0.06)',
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
            },
          }}
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
          backgroundColor: '#f8fafc',
          width: { sm: `calc(100% - ${drawerWidth}px)` },
        }}
      >
        <Toolbar />
        <Box sx={{ p: 3 }}>
          {/* 页面级 Suspense：切换私有页时只替换内容，侧栏不卸载 */}
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
