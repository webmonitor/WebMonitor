import React from 'react';
import { Alert, Box, Button, CircularProgress, Grid, Stack, Typography } from '@mui/material';
import {
  Refresh as RefreshIcon,
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
  Schedule as ScheduleIcon,
  Mail as MailIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import StatGrid from '../components/StatGrid';
import StatusBadge from '../components/StatusBadge';
import { UI_COLORS, UI_FONTS, UI_SURFACE } from '../theme/tokens';
import { useAuth } from '../contexts/AuthContext';
import api, { getApiErrorMessage } from '../api/client';
import { keys } from '../api/queryKeys';
import { formatRelativeTime } from '../utils/date';

const LATEST_LOGS_LIMIT = 10;

const mono = { fontFamily: UI_FONTS.mono, fontSize: 11, color: UI_COLORS.muted, letterSpacing: 0 };

const QuickLink = ({ icon, label, onClick }) => (
  <Button
    onClick={onClick}
    fullWidth
    startIcon={icon}
    endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
    sx={{
      justifyContent: 'flex-start',
      minHeight: 40,
      px: 1.5,
      color: 'text.secondary',
      '& .MuiButton-endIcon': { marginLeft: 'auto' },
      '& .MuiSvgIcon-root': { fontSize: 18 },
    }}
  >
    {label}
  </Button>
);

const LogRow = ({ log, taskName, language, t }) => {
  const tone = log.error_message ? 'danger' : log.is_changed ? 'warning' : 'positive';
  const stateLabel = log.error_message
    ? t('dashboard.errorPrefix')
    : log.is_changed
      ? t('dashboard.changed')
      : t('dashboard.unchanged');

  return (
    <Box
      sx={{
        px: 2.5,
        py: 1.75,
        borderBottom: UI_SURFACE.divider,
        transition: 'background-color 140ms cubic-bezier(0.22, 1, 0.36, 1)',
        '&:hover': { backgroundColor: 'action.hover' },
        '&:last-of-type': { borderBottom: 0 },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
        <StatusBadge tone={tone} label={stateLabel} sx={{ flexShrink: 0 }} />
        <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 0 }}>
          {taskName || `${t('dashboard.taskLabel')} #${log.task_id}`}
        </Typography>
        <Typography sx={{ ...mono, ml: 'auto', flexShrink: 0 }}>
          {formatRelativeTime(log.check_time, language)}
        </Typography>
      </Box>

      {log.error_message ? (
        <Typography variant="body2" sx={{ mt: 0.75, color: 'error.main' }}>
          {log.error_message}
        </Typography>
      ) : log.is_changed && log.new_content ? (
        <Box sx={{ mt: 1, pl: 1.5, borderLeft: `2px solid ${UI_COLORS.warning}` }}>
          {log.old_content && (
            <Typography sx={{ ...mono, fontSize: 12, color: UI_COLORS.muted, display: 'block' }}>
              {'- '}
              {log.old_content.split('\n')[0].substring(0, 118)}
            </Typography>
          )}
          {log.new_content.split('\n').slice(0, 2).map((line, index) => (
            <Typography
              key={`${line}-${index}`}
              sx={{ ...mono, fontSize: 12, color: UI_COLORS.text, display: 'block', mt: index === 0 ? 0.5 : 0 }}
            >
              {'+ '}
              {line.substring(0, 118)}
            </Typography>
          ))}
        </Box>
      ) : null}
    </Box>
  );
};

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

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

  const taskNames = Object.fromEntries(tasks.map((task) => [task.id, task.name]));
  const errors = logs.filter((log) => log.error_message).slice(0, 4);
  const taskChecks = Object.values(
    logs.reduce((acc, log) => {
      const entry = acc[log.task_id] || { id: log.task_id, checks: 0, changes: 0 };
      entry.checks += 1;
      if (log.is_changed) entry.changes += 1;
      acc[log.task_id] = entry;
      return acc;
    }, {}),
  ).sort((a, b) => b.checks - a.checks);
  const totalTasks = tasks.length;
  const activeTasks = tasks.filter((task) => task.is_active).length;
  // 没有任何日志样本时不能报 100%：没有数据就是没有数据。
  const successRate =
    logs.length > 0
      ? `${Math.round((logs.filter((log) => !log.error_message).length / logs.length) * 100)}%`
      : null;
  const recentChanges = logs.filter((log) => log.is_changed).length;

  return (
    <Box>
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.subtitle')}
        action={
          <Button
            size="small"
            startIcon={<RefreshIcon sx={{ fontSize: 18 }} />}
            onClick={() => {
              tasksQuery.refetch();
              logsQuery.refetch();
            }}
          >
            {t('dashboard.refresh')}
          </Button>
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
            subtitle: t('dashboard.allTasks'),
          },
          {
            key: 'activeTasks',
            title: t('dashboard.activeTasks'),
            value: tasksError ? null : activeTasks,
            subtitle: t('dashboard.runningTasks'),
          },
          {
            key: 'recentChanges',
            title: t('dashboard.recentChanges'),
            value: logsError ? null : recentChanges,
            subtitle: logs.length === 0 ? t('dashboard.noSamples') : t('dashboard.detectedChanges', { sample: logs.length }),
          },
          {
            key: 'successRate',
            title: t('dashboard.successRate'),
            value: logsError ? null : successRate,
            subtitle:
              logs.length === 0
                ? t('dashboard.noSamples')
                : t('dashboard.executionSuccessRate', { sample: logs.length }),
          },
        ]}
      />

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard
            title={t('dashboard.recentActivity')}
            bareBody
            action={
              <Button size="small" endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />} onClick={() => navigate('/logs')}>
                {t('dashboard.viewAll')}
              </Button>
            }
          >
            {logsError ? (
              <Box sx={{ p: 2.5 }}>
                <Alert severity="error">
                  {t('logs.loadError')}: {getApiErrorMessage(logsError, t('common.unknownError'))}
                </Alert>
              </Box>
            ) : logsQuery.isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
              </Box>
            ) : logs.length === 0 ? (
              <EmptyState
                icon={<ScheduleIcon />}
                title={t('dashboard.noActivity')}
                subtitle={t('dashboard.noActivitySubtitle')}
              />
            ) : (
              <Box>
                {logs.slice(0, 6).map((log) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    taskName={taskNames[log.task_id]}
                    language={i18n.language}
                    t={t}
                  />
                ))}
              </Box>
            )}
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={3}>
            <SectionCard title={t('dashboard.quickActions')}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                onClick={() => navigate('/tasks')}
              >
                {t('dashboard.manageTasks')}
              </Button>
              <Stack sx={{ mt: 2 }}>
                <QuickLink
                  icon={<MailIcon />}
                  label={t('dashboard.configureEmail')}
                  onClick={() => navigate('/email-config')}
                />
                <QuickLink icon={<HistoryIcon />} label={t('dashboard.viewLogs')} onClick={() => navigate('/logs')} />
              </Stack>
            </SectionCard>

            <SectionCard title={t('dashboard.checksByTask')} bareBody>
              <Box
                sx={{
                  px: 2.5,
                  py: 1,
                  display: 'flex',
                  gap: 2,
                  borderBottom: UI_SURFACE.divider,
                }}
              >
                <Typography variant="caption" sx={{ flexGrow: 1, color: 'text.secondary' }}>
                  {t('dashboard.taskLabel')}
                </Typography>
                <Typography variant="caption" sx={{ width: 40, textAlign: 'right', color: 'text.secondary' }}>
                  {t('dashboard.checkCount')}
                </Typography>
                <Typography variant="caption" sx={{ width: 40, textAlign: 'right', color: 'text.secondary' }}>
                  {t('dashboard.changeCount')}
                </Typography>
              </Box>
              {taskChecks.map((entry) => (
                <Box
                  key={entry.id}
                  sx={{
                    px: 2.5,
                    py: 1.25,
                    display: 'flex',
                    gap: 2,
                    alignItems: 'baseline',
                    borderBottom: UI_SURFACE.divider,
                    '&:last-of-type': { borderBottom: 0 },
                  }}
                >
                  <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }}>
                    {taskNames[entry.id] || `${t('dashboard.taskLabel')} #${entry.id}`}
                  </Typography>
                  <Typography sx={{ ...mono, width: 40, textAlign: 'right', color: UI_COLORS.text }}>
                    {entry.checks}
                  </Typography>
                  <Typography
                    sx={{
                      ...mono,
                      width: 40,
                      textAlign: 'right',
                      color: entry.changes > 0 ? UI_COLORS.warning : UI_COLORS.muted,
                    }}
                  >
                    {entry.changes}
                  </Typography>
                </Box>
              ))}
            </SectionCard>

            {errors.length > 0 && (
              <SectionCard title={t('dashboard.recentErrors')} bareBody>
                {errors.map((log) => (
                  <Box
                    key={log.id}
                    sx={{
                      px: 2.5,
                      py: 1.5,
                      borderBottom: UI_SURFACE.divider,
                      '&:last-of-type': { borderBottom: 0 },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
                      <StatusBadge tone="danger" label={t('dashboard.errorPrefix')} sx={{ flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ fontWeight: 500, minWidth: 0 }}>
                        {taskNames[log.task_id] || `${t('dashboard.taskLabel')} #${log.task_id}`}
                      </Typography>
                      <Typography sx={{ ...mono, ml: 'auto', flexShrink: 0 }}>
                        {formatRelativeTime(log.check_time, i18n.language)}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                      {log.error_message}
                    </Typography>
                  </Box>
                ))}
              </SectionCard>
            )}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
