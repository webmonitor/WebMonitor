import React from 'react';
import {
  Grid,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  Chip,
  CircularProgress,
  Divider,
  Avatar,
  Alert,
  alpha,
  IconButton,
  Tooltip,
  Button,
  Container,
} from '@mui/material';
import {
  Assignment as TaskIcon,
  CheckCircle as SuccessIcon,
  AccessTime as TimeIcon,
  TrendingUp as TrendingUpIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  NotificationsActive as NotificationsIcon,
  Speed as SpeedIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import StatCard from '../components/StatCard';
import FooterLinks from '../components/FooterLinks';
import { useAuth } from '../contexts/AuthContext';
import api, { getApiErrorMessage } from '../api/client';
import { keys } from '../api/queryKeys';
import { formatRelativeTime } from '../utils/date';

const LATEST_LOGS_LIMIT = 10;

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const tasksQuery = useQuery({
    queryKey: keys.tasks(user?.id),
    queryFn: ({ signal }) => api.get('/api/monitor-tasks', { signal }).then((response) => response.data),
    enabled: !!user,
    refetchInterval: 60000,
  });

  const logsQuery = useQuery({
    queryKey: keys.latestLogs(user?.id, LATEST_LOGS_LIMIT),
    queryFn: ({ signal }) =>
      api
        .get('/api/monitor-logs/latest', { params: { limit: LATEST_LOGS_LIMIT }, signal })
        .then((response) => response.data),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const tasks = tasksQuery.data ?? [];
  const logs = logsQuery.data ?? [];
  const tasksError = tasksQuery.error;
  const logsError = logsQuery.error;
  const emptyValue = t('common.emptyValue');

  const totalTasks = tasks.length;
  const activeTasks = tasks.filter((task) => task.is_active).length;
  // 没有任何日志样本时不能报 100%：没有数据就是没有数据。
  const successRate = logs.length > 0
    ? `${Math.round((logs.filter((log) => !log.error_message).length / logs.length) * 100)}%`
    : null;
  const recentChanges = logs.filter((log) => log.is_changed).length;

  const handleRefresh = () => {
    tasksQuery.refetch();
    logsQuery.refetch();
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Container maxWidth="xl">
        <Box
          sx={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: 4,
            mb: 4,
            p: { xs: 3, md: 4 },
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `radial-gradient(circle at 25% 25%, ${alpha('#10b981', 0.1)} 0%, transparent 50%),
                        radial-gradient(circle at 75% 75%, ${alpha('#2563eb', 0.1)} 0%, transparent 50%)`,
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography
                  variant="overline"
                  component="div"
                  sx={{
                    color: '#10b981',
                    fontWeight: 'bold',
                    mb: 1,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                  }}
                >
                  {t('dashboard.overview')}
                </Typography>
                <Typography
                  variant="h3"
                  component="h1"
                  sx={{
                    color: 'white',
                    fontWeight: 800,
                    fontSize: { xs: '2rem', md: '2.5rem' },
                  }}
                >
                  {t('dashboard.title')}
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mt: 1 }}>
                  {t('dashboard.subtitle')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Tooltip title={t('dashboard.refresh')}>
                  <IconButton
                    onClick={handleRefresh}
                    aria-label={t('dashboard.refresh')}
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      },
                    }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Grid container spacing={3}>
              <Grid size={{ xs: 6, md: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                    {tasksError ? emptyValue : totalTasks}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    {t('dashboard.totalTasks')}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: '#22d3ee', fontWeight: 'bold' }}>
                    {tasksError ? emptyValue : activeTasks}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    {t('dashboard.activeTasks')}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: '#a78bfa', fontWeight: 'bold' }}>
                    {logsError ? emptyValue : recentChanges}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    {t('dashboard.recentChanges')}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: '#34d399', fontWeight: 'bold' }}>
                    {logsError ? emptyValue : successRate ?? emptyValue}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    {t('dashboard.successRate')}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Box>

        {tasksError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {t('tasks.loadTasksError')}: {getApiErrorMessage(tasksError, t('common.unknownError'))}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title={t('dashboard.totalTasks')}
              value={tasksError ? null : totalTasks}
              icon={<TaskIcon />}
              color="#10b981"
              subtitle={t('dashboard.allTasks')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title={t('dashboard.activeTasks')}
              value={tasksError ? null : activeTasks}
              icon={<SuccessIcon />}
              color="#22d3ee"
              subtitle={t('dashboard.runningTasks')}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title={t('dashboard.recentChanges')}
              value={logsError ? null : recentChanges}
              icon={<TrendingUpIcon />}
              color="#a78bfa"
              subtitle={t('dashboard.detectedChanges', { sample: logs.length })}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title={t('dashboard.successRate')}
              value={logsError ? null : successRate}
              icon={<SpeedIcon />}
              color="#34d399"
              subtitle={t('dashboard.executionSuccessRate', { sample: logs.length })}
            />
          </Grid>
        </Grid>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper
              sx={{
                p: 3,
                height: '100%',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                borderRadius: 4,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                  {t('dashboard.recentActivity')}
                </Typography>
                <Button
                  size="small"
                  startIcon={<VisibilityIcon />}
                  sx={{
                    color: '#10b981',
                    textTransform: 'none',
                    '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
                  }}
                >
                  {t('dashboard.viewAll')}
                </Button>
              </Box>

              {logsError ? (
                <Alert severity="error" sx={{ mb: 1 }}>
                  {t('logs.loadError')}: {getApiErrorMessage(logsError, t('common.unknownError'))}
                </Alert>
              ) : logsQuery.isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                  <CircularProgress sx={{ color: '#10b981' }} />
                </Box>
              ) : logs.length === 0 ? (
                <Box sx={{ textAlign: 'center', p: 6 }}>
                  <Avatar
                    sx={{
                      bgcolor: 'rgba(16, 185, 129, 0.1)',
                      color: '#10b981',
                      width: 64,
                      height: 64,
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    <ScheduleIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Typography variant="h6" sx={{ color: '#1a1a1a', mb: 1 }}>
                    {t('dashboard.noActivity')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {t('dashboard.noActivitySubtitle')}
                  </Typography>
                </Box>
              ) : (
                <List sx={{ p: 0 }}>
                  {logs.map((log, index) => (
                    <React.Fragment key={log.id}>
                      <ListItem
                        sx={{
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          py: 2,
                          px: 0,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: 'rgba(16, 185, 129, 0.05)',
                            borderRadius: 2,
                          },
                        }}
                      >
                        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', mb: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              mr: 2,
                              background: log.is_changed
                                ? 'linear-gradient(45deg, #f59e0b 30%, #d97706 90%)'
                                : 'linear-gradient(45deg, #10b981 30%, #059669 90%)',
                            }}
                          >
                            {log.is_changed ? <TrendingUpIcon /> : <SuccessIcon />}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <Chip
                                size="small"
                                label={`${t('dashboard.taskLabel')} #${log.task_id}`}
                                sx={{
                                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                  color: '#2563eb',
                                  fontWeight: 'bold',
                                  mr: 1,
                                }}
                              />
                              <Chip
                                size="small"
                                icon={log.is_changed ? <TrendingUpIcon /> : <SuccessIcon />}
                                label={log.is_changed ? t('dashboard.changed') : t('dashboard.unchanged')}
                                color={log.is_changed ? 'warning' : 'success'}
                                sx={{ fontSize: '0.75rem' }}
                              />
                            </Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              <TimeIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                              {formatRelativeTime(log.check_time, i18n.language)}
                            </Typography>
                          </Box>
                        </Box>

                        {log.error_message ? (
                          <Box
                            sx={{
                              p: 2,
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              borderRadius: 2,
                              width: '100%',
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 500, color: 'error.main' }}>
                              {t('dashboard.errorPrefix')}: {log.error_message}
                            </Typography>
                          </Box>
                        ) : log.is_changed && log.new_content ? (
                          <Box
                            sx={{
                              p: 2,
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              borderRadius: 2,
                              width: '100%',
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: 'success.main' }}>
                              {t('dashboard.changeDetected')}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {t('dashboard.newContentPreview')}: {log.new_content.substring(0, 150)}
                              {log.new_content.length > 150 ? '...' : ''}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                            {t('dashboard.contentUnchanged')}
                          </Typography>
                        )}
                      </ListItem>
                      {index < logs.length - 1 && (
                        <Divider sx={{ my: 1, borderColor: 'rgba(0, 0, 0, 0.06)' }} />
                      )}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <Paper
                  sx={{
                    p: 3,
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    borderRadius: 4,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 3 }}>
                    {t('dashboard.quickActions')}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<TaskIcon />}
                      href="/tasks"
                      sx={{
                        background: 'linear-gradient(45deg, #10b981 30%, #059669 90%)',
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 'bold',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #059669 30%, #047857 90%)',
                        },
                      }}
                    >
                      {t('dashboard.manageTasks')}
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<NotificationsIcon />}
                      href="/email-config"
                      sx={{
                        borderColor: '#2563eb',
                        color: '#2563eb',
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 'bold',
                        '&:hover': {
                          borderColor: '#1d4ed8',
                          backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        },
                      }}
                    >
                      {t('dashboard.configureEmail')}
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<VisibilityIcon />}
                      href="/logs"
                      sx={{
                        borderColor: '#8b5cf6',
                        color: '#8b5cf6',
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 'bold',
                        '&:hover': {
                          borderColor: '#7c3aed',
                          backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        },
                      }}
                    >
                      {t('dashboard.viewLogs')}
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>

      <Box
        sx={{
          py: 3,
          px: 3,
          textAlign: 'center',
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
          backgroundColor: '#ffffff',
        }}
      >
        <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
          {t('common.footerCta')}
        </Typography>
        <FooterLinks accent="#10b981" />
      </Box>
    </Box>
  );
};

export default Dashboard;
