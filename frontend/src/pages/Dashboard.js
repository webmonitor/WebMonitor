import React from 'react';
import {
  Grid,
  Typography,
  Box,
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

import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import StatGrid from '../components/StatGrid';
import { UI_COLORS } from '../theme/tokens';
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
        <PageHeader
          title={t('dashboard.title')}
          subtitle={t('dashboard.subtitle')}
          action={
            <Tooltip title={t('dashboard.refresh')}>
              <IconButton onClick={handleRefresh} aria-label={t('dashboard.refresh')}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          }
        />

        {tasksError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {t('tasks.loadTasksError')}: {getApiErrorMessage(tasksError, t('common.unknownError'))}
          </Alert>
        )}

        <StatGrid
          items={[
            {
              key: 'totalTasks',
              title: t('dashboard.totalTasks'),
              value: tasksError ? null : totalTasks,
              icon: <TaskIcon />,
              color: UI_COLORS.primary,
              subtitle: t('dashboard.allTasks'),
            },
            {
              key: 'activeTasks',
              title: t('dashboard.activeTasks'),
              value: tasksError ? null : activeTasks,
              icon: <SuccessIcon />,
              color: UI_COLORS.info,
              subtitle: t('dashboard.runningTasks'),
            },
            {
              key: 'recentChanges',
              title: t('dashboard.recentChanges'),
              value: logsError ? null : recentChanges,
              icon: <TrendingUpIcon />,
              color: UI_COLORS.warning,
              subtitle:
              logs.length === 0
                ? t('dashboard.noSamples')
                : t('dashboard.detectedChanges', { sample: logs.length }),
            },
            {
              key: 'successRate',
              title: t('dashboard.successRate'),
              value: logsError ? null : successRate,
              icon: <SpeedIcon />,
              color: UI_COLORS.accent,
              subtitle:
              logs.length === 0
                ? t('dashboard.noSamples')
                : t('dashboard.executionSuccessRate', { sample: logs.length }),
            },
          ]}
        />

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <SectionCard
              title={t('dashboard.recentActivity')}
              bareBody
              sx={{ height: '100%' }}
              action={
                <Button
                  size="small"
                  startIcon={<VisibilityIcon />}
                  sx={{ color: UI_COLORS.primary, textTransform: 'none' }}
                >
                  {t('dashboard.viewAll')}
                </Button>
              }
            >
              {logsError ? (
                <Box sx={{ p: 3 }}>
                  <Alert severity="error">
                    {t('logs.loadError')}: {getApiErrorMessage(logsError, t('common.unknownError'))}
                  </Alert>
                </Box>
              ) : logsQuery.isLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                  <CircularProgress />
                </Box>
              ) : logs.length === 0 ? (
                <Box sx={{ p: 3 }}>
                  <EmptyState
                    icon={<ScheduleIcon />}
                    title={t('dashboard.noActivity')}
                    subtitle={t('dashboard.noActivitySubtitle')}
                  />
                </Box>
              ) : (
                <List sx={{ px: 3, py: 0 }}>
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
                            backgroundColor: 'action.hover',
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
                              color: 'white',
                              bgcolor: log.is_changed ? UI_COLORS.warning : UI_COLORS.primary,
                            }}
                          >
                            {log.is_changed ? <TrendingUpIcon /> : <SuccessIcon />}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <Chip
                                size="small"
                                variant="outlined"
                                label={`${t('dashboard.taskLabel')} #${log.task_id}`}
                                sx={{
                                  color: UI_COLORS.info,
                                  borderColor: UI_COLORS.info,
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
                              backgroundColor: alpha(UI_COLORS.danger, 0.1),
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
                              backgroundColor: alpha(UI_COLORS.primary, 0.1),
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
                        <Divider sx={{ my: 1 }} />
                      )}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </SectionCard>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <SectionCard title={t('dashboard.quickActions')} sx={{ height: '100%' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="contained"
                  disableElevation
                  fullWidth
                  startIcon={<TaskIcon />}
                  href="/tasks"
                  sx={{ py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  {t('dashboard.manageTasks')}
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<NotificationsIcon />}
                  href="/email-config"
                  sx={{ py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  {t('dashboard.configureEmail')}
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<VisibilityIcon />}
                  href="/logs"
                  sx={{ py: 1.5, borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  {t('dashboard.viewLogs')}
                </Button>
              </Box>
            </SectionCard>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Dashboard;
