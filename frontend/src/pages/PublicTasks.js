import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Alert,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  CircularProgress,
} from '@mui/material';
import {
  Public as PublicIcon,
  People as PeopleIcon,
  Person as PersonIcon,
  BookmarkBorder as SubscribeIcon,
  BookmarkRemove as UnsubscribeIcon,
  Info as InfoIcon,
  Schedule as ScheduleIcon,
  Link as LinkIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import api, { getApiErrorMessage } from '../api/client';
import { keys, EMAIL_CONFIG_SIMPLE } from '../api/queryKeys';
import { useAuth } from '../contexts/AuthContext';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import StatGrid from '../components/StatGrid';
import WebMonitorLogo from '../components/WebMonitorLogo';
import { UI_COLORS } from '../theme/tokens';
import { formatDateTime } from '../utils/date';

const PublicTasks = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [selectedTask, setSelectedTask] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [subscribeTaskId, setSubscribeTaskId] = useState(null);
  const [emailConfigDialogOpen, setEmailConfigDialogOpen] = useState(false);
  const [selectedEmailConfig, setSelectedEmailConfig] = useState('');

  const tasksQuery = useQuery({
    queryKey: keys.publicTasks(user?.id),
    queryFn: ({ signal }) => api.get('/api/public-tasks', { signal }).then((response) => response.data),
    enabled: !!user,
  });

  const subscriptionInfoQuery = useQuery({
    queryKey: keys.subscriptionInfo(user?.id),
    queryFn: ({ signal }) => api.get('/api/subscription-info', { signal }).then((response) => response.data),
    enabled: !!user,
  });

  const emailConfigsQuery = useQuery({
    queryKey: keys.emailConfigs(user?.id, EMAIL_CONFIG_SIMPLE),
    queryFn: ({ signal }) =>
      api.get('/api/email-configs/simple-list', { signal }).then((response) => response.data),
    enabled: !!user,
  });

  const tasks = tasksQuery.data || [];
  const subscriptionInfo = subscriptionInfoQuery.data;
  const emailConfigs = emailConfigsQuery.data || [];
  const remainingSlots = subscriptionInfo?.remaining_slots;
  const slotsExhausted = typeof remainingSlots === 'number' && remainingSlots <= 0;

  const showError = (message) => {
    setSnackbar({ open: true, message, severity: 'error' });
  };

  const showSuccess = (message) => {
    setSnackbar({ open: true, message, severity: 'success' });
  };

  const invalidateSubscriptions = () => {
    queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    queryClient.invalidateQueries({ queryKey: ['publicTasks'] });
    queryClient.invalidateQueries({ queryKey: ['subscriptionInfo'] });
  };

  const toggleMutation = useMutation({
    mutationFn: (taskId) =>
      api.post(`/api/subscriptions/${taskId}/toggle`).then((response) => response.data),
    onSuccess: (data) => {
      invalidateSubscriptions();
      showSuccess(t(data?.subscribed ? 'publicTasks.subscribed' : 'publicTasks.unsubscribed'));
    },
    onError: (error) => {
      // 服务端 detail（例如"请先配置邮箱通知设置后再订阅任务"）原样展示，不做字符串判定。
      showError(getApiErrorMessage(error, t('publicTasks.toggleFailed')));
    },
  });

  const subscribeWithEmailMutation = useMutation({
    mutationFn: ({ taskId, emailConfigId }) =>
      api
        .post(`/api/subscriptions/${taskId}/subscribe-with-email`, {
          email_config_id: emailConfigId,
        })
        .then((response) => response.data),
    onSuccess: () => {
      invalidateSubscriptions();
      showSuccess(t('publicTasks.subscribed'));
      setEmailConfigDialogOpen(false);
      setSubscribeTaskId(null);
      setSelectedEmailConfig('');
    },
    onError: (error) => {
      // 服务端 detail 原样展示（例如未配置邮箱通知），保留弹窗与当前选择。
      showError(getApiErrorMessage(error, t('publicTasks.subscribeWithEmailFailed')));
    },
  });

  const handleSubscribe = (taskId) => {
    setSubscribeTaskId(taskId);
    setSelectedEmailConfig('');
    setEmailConfigDialogOpen(true);
  };

  const handleCloseEmailConfigDialog = () => {
    if (subscribeWithEmailMutation.isPending) {
      return;
    }
    setEmailConfigDialogOpen(false);
    setSubscribeTaskId(null);
    setSelectedEmailConfig('');
  };

  const handleConfirmSubscribe = () => {
    if (!subscribeTaskId || !selectedEmailConfig) {
      return;
    }
    subscribeWithEmailMutation.mutate({
      taskId: subscribeTaskId,
      emailConfigId: selectedEmailConfig,
    });
  };

  const handleToggleSubscription = (taskId) => {
    toggleMutation.mutate(taskId);
  };

  const handleViewDetails = (task) => {
    setSelectedTask(task);
    setDetailDialogOpen(true);
  };

  const handleCloseSnackbar = () => {
    setSnackbar((previous) => ({ ...previous, open: false }));
  };

  return (
    <Box>
      <PageHeader title={t('publicTasks.title')} subtitle={t('publicTasks.subtitle')} />

      {tasksQuery.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t('publicTasks.loadFailed')}:{' '}
          {getApiErrorMessage(tasksQuery.error, t('common.unknownError'))}
        </Alert>
      )}

      {subscriptionInfoQuery.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {getApiErrorMessage(subscriptionInfoQuery.error, t('common.unknownError'))}
        </Alert>
      )}

      <StatGrid
        items={[
          {
            key: 'publicTasks',
            title: t('publicTasks.publicTasks'),
            value: tasksQuery.isLoading || tasksQuery.isError ? null : tasks.length,
            icon: <PublicIcon />,
            color: UI_COLORS.primary,
          },
          {
            key: 'mySubscriptions',
            title: t('publicTasks.mySubscriptions'),
            value:
              subscriptionInfoQuery.isLoading || subscriptionInfoQuery.isError
                ? null
                : subscriptionInfo?.current_subscriptions,
            icon: <PeopleIcon />,
            color: UI_COLORS.info,
          },
          {
            key: 'remainingSlots',
            title: t('publicTasks.remainingSlots'),
            value:
              subscriptionInfoQuery.isLoading || subscriptionInfoQuery.isError ? null : remainingSlots,
            icon: slotsExhausted ? <PeopleIcon /> : <SuccessIcon />,
            color: slotsExhausted ? UI_COLORS.danger : UI_COLORS.info,
          },
          {
            key: 'totalSubscriptions',
            title: t('publicTasks.totalSubscriptions'),
            value:
              tasksQuery.isLoading || tasksQuery.isError
                ? null
                : tasks.reduce((sum, task) => sum + (task.subscription_count || 0), 0),
            icon: <WebMonitorLogo size={28} />,
            color: UI_COLORS.accent,
          },
        ]}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        {t('publicTasks.usageLine3')}
      </Alert>

      <SectionCard title={t('publicTasks.taskList')} bareBody>
        {tasksQuery.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
            <CircularProgress />
          </Box>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={<PublicIcon />}
            title={t('publicTasks.noTasks')}
            subtitle={t('publicTasks.noTasksSubtitle')}
          />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 600 }}>{t('publicTasks.taskInfo')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('publicTasks.creator')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('publicTasks.subscriptions')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('publicTasks.interval')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('publicTasks.createdAt')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('publicTasks.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow
                    key={task.id}
                    sx={{
                      '&:hover': { backgroundColor: 'action.hover' },
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          sx={{
                            width: 40,
                            height: 40,
                            mr: 2,
                            bgcolor: UI_COLORS.info,
                            color: 'white',
                            fontSize: '1rem',
                          }}
                        >
                          {task.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {task.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            <LinkIcon sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
                            <Typography
                              variant="caption"
                              sx={{maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: 'text.secondary',
                              }}
                            >
                              {task.url}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <PersonIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                        <Typography variant="body2">{task.owner_username}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={task.subscription_count}
                        color="primary"
                        icon={<PeopleIcon />}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ScheduleIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {task.interval}{t('publicTasks.seconds')}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {formatDateTime(task.created_at, i18n.language)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Tooltip title={task.user_subscribed ? t('publicTasks.unsubscribeTask') : t('publicTasks.subscribeTask')}>
                          <Button
                            size="small"
                            variant={task.user_subscribed ? 'outlined' : 'contained'}
                            color={task.user_subscribed ? 'secondary' : 'primary'}
                            disableElevation
                            startIcon={task.user_subscribed ? <UnsubscribeIcon /> : <SubscribeIcon />}
                            sx={{ textTransform: 'none', borderRadius: 2 }}
                            onClick={() => {
                              if (task.user_subscribed) {
                                handleToggleSubscription(task.id);
                              } else {
                                handleSubscribe(task.id);
                              }
                            }}
                            disabled={
                              toggleMutation.isPending ||
                              (!task.user_subscribed && slotsExhausted)
                            }
                          >
                            {task.user_subscribed ? t('publicTasks.unsubscribe') : t('publicTasks.subscribe')}
                          </Button>
                        </Tooltip>
                        <Tooltip title={t('publicTasks.viewDetails')}>
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(task)}
                            sx={{
                              color: UI_COLORS.info,
                              '&:hover': { backgroundColor: 'action.hover' },
                            }}
                          >
                            <InfoIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>

      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PublicIcon sx={{ fontSize: 24, color: 'primary.main' }} />
            <Typography variant="h5" component="div">
              {t('publicTasks.taskDetails')}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedTask && typeof selectedTask === 'object' && (
            <Box>
              <Typography variant="h6" sx={{ mb: 1 }}>
                {selectedTask.name}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                {t('publicTasks.createdByLabel')}: {selectedTask.owner_username} | {t('publicTasks.createdAtLabel')}: {formatDateTime(selectedTask.created_at, i18n.language)}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedTask.description || t('publicTasks.noDescription')}
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all', color: 'text.secondary' }}>
                {t('publicTasks.monitorUrl')}: {selectedTask.url}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                {t('publicTasks.subscriberCount')}: {selectedTask.subscription_count}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDetailDialogOpen(false)} color="inherit">
            {t('publicTasks.close')}
          </Button>
          {selectedTask && typeof selectedTask === 'object' && (
            <Button
              onClick={() => {
                if (selectedTask.user_subscribed) {
                  handleToggleSubscription(selectedTask.id);
                } else {
                  handleSubscribe(selectedTask.id);
                }
                setDetailDialogOpen(false);
              }}
              variant={selectedTask.user_subscribed ? 'outlined' : 'contained'}
              color={selectedTask.user_subscribed ? 'secondary' : 'primary'}
              disableElevation
              sx={{ textTransform: 'none', borderRadius: 2 }}
              disabled={
                toggleMutation.isPending ||
                (!selectedTask.user_subscribed && slotsExhausted)
              }
            >
              {selectedTask.user_subscribed ? t('publicTasks.unsubscribeTask') : t('publicTasks.subscribeTask')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={emailConfigDialogOpen}
        onClose={handleCloseEmailConfigDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {t('publicTasks.chooseEmailConfig')}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            {t('publicTasks.chooseEmailConfigSubtitle')}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {emailConfigsQuery.isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : emailConfigsQuery.error ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {getApiErrorMessage(emailConfigsQuery.error, t('common.unknownError'))}
            </Alert>
          ) : emailConfigs.length === 0 ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('publicTasks.noEmailConfig')}
            </Alert>
          ) : (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="email-config-select-label">{t('publicTasks.emailConfig')}</InputLabel>
              <Select
                labelId="email-config-select-label"
                value={selectedEmailConfig}
                label={t('publicTasks.emailConfig')}
                onChange={(event) => setSelectedEmailConfig(event.target.value)}
              >
                {emailConfigs.map((config) => (
                  <MenuItem key={config.id} value={config.id}>
                    {config.name} ({config.smtp_user} → {config.receiver_email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCloseEmailConfigDialog}
            color="inherit"
            disabled={subscribeWithEmailMutation.isPending}
          >
            {t('publicTasks.cancel')}
          </Button>
          {emailConfigs.length > 0 && (
            <Button
              onClick={handleConfirmSubscribe}
              variant="contained"
              disableElevation
              sx={{ textTransform: 'none', borderRadius: 2 }}
              disabled={!selectedEmailConfig || subscribeWithEmailMutation.isPending}
            >
              {t('publicTasks.confirmSubscribe')}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <FeedbackSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={handleCloseSnackbar}
      />
    </Box>
  );
};

export default PublicTasks;
