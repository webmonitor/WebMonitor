import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Alert,
  Tooltip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
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
  Subscriptions as SubscriptionsIcon,
  Email as EmailIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Notifications as NotificationsActiveIcon,
  NotificationsOff as NotificationsOffIcon,
  Settings as SettingsIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import api, { getApiErrorMessage } from '../api/client';
import { keys, EMAIL_CONFIG_FULL } from '../api/queryKeys';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import FormDialog from '../components/FormDialog';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import StatGrid from '../components/StatGrid';
import WebMonitorLogo from '../components/WebMonitorLogo';
import { UI_COLORS } from '../theme/tokens';
import { formatDateTime } from '../utils/date';

const MySubscriptions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t, i18n } = useTranslation();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [formData, setFormData] = useState({
    is_active: true,
    email_config_id: '',
  });
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const emptyValue = t('common.emptyValue');

  const subscriptionsQuery = useQuery({
    queryKey: keys.subscriptions(user?.id),
    queryFn: ({ signal }) => api.get('/api/subscriptions', { signal }).then((response) => response.data),
    enabled: !!user,
  });

  const emailConfigsQuery = useQuery({
    queryKey: keys.emailConfigs(user?.id, EMAIL_CONFIG_FULL),
    queryFn: ({ signal }) => api.get('/api/email-configs', { signal }).then((response) => response.data),
    enabled: !!user,
  });

  const subscriptions = subscriptionsQuery.data || [];
  const emailConfigs = emailConfigsQuery.data || [];

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

  const handleOpenEditDialog = (subscription) => {
    setEditingSubscription(subscription);
    setFormData({
      is_active: subscription.is_active,
      email_config_id: subscription.email_config_id || '',
    });
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingSubscription(null);
    setFormData({
      is_active: true,
      email_config_id: '',
    });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) =>
      api.put(`/api/subscriptions/${id}`, body).then((response) => response.data),
    onSuccess: () => {
      invalidateSubscriptions();
      showSuccess(t('subscriptions.updateSuccess'));
      handleCloseEditDialog();
    },
    onError: (error) => {
      showError(
        `${t('subscriptions.updateFailed')}: ${getApiErrorMessage(error, t('common.unknownError'))}`,
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/subscriptions/${id}`),
    onSuccess: () => {
      invalidateSubscriptions();
      showSuccess(t('subscriptions.deleteSuccess'));
      setConfirmTarget(null);
    },
    onError: (error) => {
      showError(
        `${t('subscriptions.deleteFailed')}: ${getApiErrorMessage(error, t('common.unknownError'))}`,
      );
    },
  });

  const handleUpdateSubscription = (event) => {
    event.preventDefault();

    if (!editingSubscription) {
      return;
    }

    updateMutation.mutate({
      id: editingSubscription.id,
      body: {
        is_active: formData.is_active,
        email_config_id: formData.email_config_id === '' ? null : formData.email_config_id,
      },
    });
  };

  const handleRequestDelete = (subscription) => {
    setConfirmTarget(subscription);
  };

  const handleCancelDelete = () => {
    if (deleteMutation.isPending) {
      return;
    }
    setConfirmTarget(null);
  };

  const handleConfirmDelete = () => {
    if (!confirmTarget) {
      return;
    }
    deleteMutation.mutate(confirmTarget.id);
  };

  const handleCloseSnackbar = () => {
    setSnackbar((previous) => ({ ...previous, open: false }));
  };

  return (
    <Box>
      <PageHeader title={t('subscriptions.title')} subtitle={t('subscriptions.subtitle')} />

      {subscriptionsQuery.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t('subscriptions.loadFailed')}:{' '}
          {getApiErrorMessage(subscriptionsQuery.error, t('common.unknownError'))}
        </Alert>
      )}

      <StatGrid
        items={[
          {
            key: 'totalSubscriptions',
            title: t('subscriptions.totalSubscriptions'),
            value: subscriptionsQuery.isLoading || subscriptionsQuery.isError ? null : subscriptions.length,
            icon: <SubscriptionsIcon />,
            color: UI_COLORS.primary,
          },
          {
            key: 'notificationsEnabled',
            title: t('subscriptions.notificationsEnabled'),
            value:
              subscriptionsQuery.isLoading || subscriptionsQuery.isError
                ? null
                : subscriptions.filter((subscription) => subscription.is_active).length,
            icon: <NotificationsActiveIcon />,
            color: UI_COLORS.info,
          },
          {
            key: 'notificationsDisabled',
            title: t('subscriptions.notificationsDisabled'),
            value:
              subscriptionsQuery.isLoading || subscriptionsQuery.isError
                ? null
                : subscriptions.filter((subscription) => !subscription.is_active).length,
            icon: <NotificationsOffIcon />,
            color: UI_COLORS.danger,
          },
          {
            key: 'emailConfigs',
            title: t('subscriptions.emailConfigs'),
            value: emailConfigsQuery.isLoading || emailConfigsQuery.isError ? null : emailConfigs.length,
            icon: <WebMonitorLogo size={28} />,
            color: UI_COLORS.accent,
          },
        ]}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">• {t('subscriptions.guideLine1')}</Typography>
        <Typography variant="body2">• {t('subscriptions.guideLine2')}</Typography>
        <Typography variant="body2">• {t('subscriptions.guideLine3')}</Typography>
      </Alert>

      <SectionCard title={t('subscriptions.listTitle')} bareBody>
        {subscriptionsQuery.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
            <CircularProgress />
          </Box>
        ) : subscriptions.length === 0 ? (
          <EmptyState
            icon={<SubscriptionsIcon />}
            title={t('subscriptions.noSubscriptions')}
            subtitle={t('subscriptions.noSubscriptionsSubtitle')}
            action={
              <Button
                variant="contained"
                disableElevation
                href="/public-tasks"
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                {t('subscriptions.browsePublicTasks')}
              </Button>
            }
          />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'action.hover' }}>
                  <TableCell sx={{ fontWeight: 600 }}>{t('subscriptions.taskInfo')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('subscriptions.taskUrl')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('subscriptions.notificationStatus')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('subscriptions.emailConfig')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('subscriptions.subscribedAt')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('subscriptions.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subscriptions.map((subscription) => (
                  <TableRow
                    key={subscription.id}
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
                            bgcolor: subscription.is_active ? UI_COLORS.primary : UI_COLORS.danger,
                            color: 'white',
                            fontSize: '1rem',
                          }}
                        >
                          {(subscription.task_name || '?').charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {subscription.task_name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {t('subscriptions.owner')}: {subscription.task_owner || emptyValue}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <LinkIcon sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
                        <Tooltip title={subscription.task_url} arrow>
                          <Typography
                            variant="body2"
                            sx={{maxWidth: 200,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: 'text.secondary',
                            }}
                          >
                            {subscription.task_url}
                          </Typography>
                        </Tooltip>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={subscription.is_active ? t('subscriptions.enabled') : t('subscriptions.disabled')}
                        color={subscription.is_active ? 'success' : 'default'}
                        icon={subscription.is_active ? <NotificationsActiveIcon /> : <NotificationsOffIcon />}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <EmailIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {subscription.email_config_id
                            ? emailConfigs.find((config) => config.id === subscription.email_config_id)?.name || t('subscriptions.unknownConfig')
                            : t('subscriptions.defaultConfig')}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {formatDateTime(subscription.created_at, i18n.language)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title={t('subscriptions.editSubscription')}>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenEditDialog(subscription)}
                            sx={{
                              color: UI_COLORS.info,
                              '&:hover': { backgroundColor: 'action.hover' },
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('subscriptions.deleteSubscription')}>
                          <IconButton
                            size="small"
                            onClick={() => handleRequestDelete(subscription)}
                            sx={{
                              color: UI_COLORS.danger,
                              '&:hover': { backgroundColor: 'action.hover' },
                            }}
                          >
                            <DeleteIcon />
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

      <FormDialog
        open={editDialogOpen}
        title={t('subscriptions.editDialogTitle')}
        icon={<SettingsIcon sx={{ fontSize: 24, color: 'primary.main' }} />}
        submitLabel={t('subscriptions.saveSettings')}
        cancelLabel={t('subscriptions.cancel')}
        onSubmit={handleUpdateSubscription}
        onClose={handleCloseEditDialog}
        pending={updateMutation.isPending}
      >
        {editingSubscription && (
          <Box>
            <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
              {t('subscriptions.taskLabel')}: {editingSubscription.task_name}
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(event) => setFormData({ ...formData, is_active: event.target.checked })}
                  color="primary"
                />
              }
              label={t('subscriptions.enableEmailNotifications')}
              sx={{ mb: 2 }}
            />

            {formData.is_active && (
              <Box>
                {emailConfigsQuery.error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {getApiErrorMessage(emailConfigsQuery.error, t('common.unknownError'))}
                  </Alert>
                )}
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="subscription-email-config-label">
                    {t('subscriptions.emailConfigLabel')}
                  </InputLabel>
                  <Select
                    labelId="subscription-email-config-label"
                    value={formData.email_config_id}
                    label={t('subscriptions.emailConfigLabel')}
                    displayEmpty
                    onChange={(event) =>
                      setFormData({ ...formData, email_config_id: event.target.value })
                    }
                  >
                    <MenuItem value="">{t('subscriptions.useDefaultConfig')}</MenuItem>
                    {emailConfigs.map((config) => (
                      <MenuItem key={config.id} value={config.id}>
                        {config.name} ({config.smtp_user})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}
          </Box>
        )}
      </FormDialog>

      <ConfirmDialog
        open={!!confirmTarget}
        title={t('subscriptions.deleteConfirmTitle')}
        message={t('subscriptions.deleteConfirm')}
        confirmLabel={t('subscriptions.deleteSubscription')}
        cancelLabel={t('subscriptions.cancel')}
        pending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onClose={handleCancelDelete}
      />

      <FeedbackSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={handleCloseSnackbar}
      />
    </Box>
  );
};

export default MySubscriptions;
