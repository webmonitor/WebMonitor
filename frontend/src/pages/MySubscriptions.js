import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Subscriptions as SubscriptionsIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
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
import { UI_FONTS } from '../theme/tokens';
import { formatDateTime } from '../utils/date';

// 读数与时间统一等宽、等宽数字：切换时有节奏的数字不会左右跳。
const monoReading = {
  fontFamily: UI_FONTS.mono,
  fontVariantNumeric: 'tabular-nums',
  fontSize: 12,
  color: 'text.secondary',
  letterSpacing: 0,
};

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

  const handleToggleActive = (subscription) => {
    updateMutation.mutate({
      id: subscription.id,
      body: {
        is_active: !subscription.is_active,
        email_config_id: subscription.email_config_id || null,
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
          },
          {
            key: 'notificationsEnabled',
            title: t('subscriptions.notificationsEnabled'),
            value:
              subscriptionsQuery.isLoading || subscriptionsQuery.isError
                ? null
                : subscriptions.filter((subscription) => subscription.is_active).length,
          },
          {
            key: 'notificationsDisabled',
            title: t('subscriptions.notificationsDisabled'),
            value:
              subscriptionsQuery.isLoading || subscriptionsQuery.isError
                ? null
                : subscriptions.filter((subscription) => !subscription.is_active).length,
          },
          {
            key: 'emailConfigs',
            title: t('subscriptions.emailConfigs'),
            value: emailConfigsQuery.isLoading || emailConfigsQuery.isError ? null : emailConfigs.length,
          },
        ]}
      />

      <Box sx={{ mb: 4, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {[
          t('subscriptions.guideLine1'),
          t('subscriptions.guideLine2'),
          t('subscriptions.guideLine3'),
        ].map((line) => (
          <Typography key={line} variant="caption" sx={{ color: 'text.secondary' }}>
            · {line}
          </Typography>
        ))}
      </Box>

      <SectionCard title={t('subscriptions.listTitle')} bareBody>
        {subscriptionsQuery.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : subscriptions.length === 0 ? (
          <EmptyState
            icon={<SubscriptionsIcon />}
            title={t('subscriptions.noSubscriptions')}
            subtitle={t('subscriptions.noSubscriptionsSubtitle')}
            action={
              <Button variant="contained" href="/public-tasks">
                {t('subscriptions.browsePublicTasks')}
              </Button>
            }
          />
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 840 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('subscriptions.taskInfo')}</TableCell>
                  <TableCell>{t('subscriptions.taskUrl')}</TableCell>
                  <TableCell>{t('subscriptions.emailConfig')}</TableCell>
                  <TableCell>{t('subscriptions.subscribedAt')}</TableCell>
                  <TableCell align="right">{t('subscriptions.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subscriptions.map((subscription) => {
                  const emailConfig = emailConfigs.find(
                    (config) => config.id === subscription.email_config_id,
                  );
                  const emailConfigName = subscription.email_config_id
                    ? emailConfig?.name || t('subscriptions.unknownConfig')
                    : t('subscriptions.defaultConfig');

                  return (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {subscription.task_available ? subscription.task_name : emptyValue}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}
                        >
                          {subscription.task_available
                            ? `${t('subscriptions.owner')}: ${subscription.task_owner || emptyValue}`
                            : t('subscriptions.taskUnavailable')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {subscription.task_url ? (
                          <Tooltip title={subscription.task_url}>
                            <Typography
                              variant="body2"
                              sx={{
                                ...monoReading,
                                maxWidth: 220,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {subscription.task_url}
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {emptyValue}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {emailConfigName}
                        </Typography>
                        {emailConfig?.smtp_user && (
                          <Typography
                            variant="caption"
                            sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}
                          >
                            {emailConfig.smtp_user}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography sx={monoReading}>
                          {formatDateTime(subscription.created_at, i18n.language)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 0.5,
                          }}
                        >
                          <Switch
                            size="small"
                            checked={subscription.is_active}
                            onChange={() => handleToggleActive(subscription)}
                            disabled={updateMutation.isPending}
                            slotProps={{
                              input: { 'aria-label': t('subscriptions.enableEmailNotifications') },
                            }}
                          />
                          <Tooltip title={t('subscriptions.editSubscription')}>
                            <IconButton
                              size="small"
                              aria-label={t('subscriptions.editSubscription')}
                              onClick={() => handleOpenEditDialog(subscription)}
                            >
                              <EditIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={t('subscriptions.deleteSubscription')}>
                            <IconButton
                              size="small"
                              aria-label={t('subscriptions.deleteSubscription')}
                              onClick={() => handleRequestDelete(subscription)}
                            >
                              <DeleteIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>

      <FormDialog
        open={editDialogOpen}
        title={t('subscriptions.editDialogTitle')}
        submitLabel={t('subscriptions.saveSettings')}
        cancelLabel={t('subscriptions.cancel')}
        onSubmit={handleUpdateSubscription}
        onClose={handleCloseEditDialog}
        pending={updateMutation.isPending}
      >
        {editingSubscription && (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 2 }}>
              {t('subscriptions.taskLabel')}: {editingSubscription.task_name}
            </Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active}
                  onChange={(event) => setFormData({ ...formData, is_active: event.target.checked })}
                  slotProps={{
                    input: {
                      'aria-label': t('subscriptions.enableEmailNotifications'),
                    },
                  }}
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
                  <InputLabel id="subscription-email-config-label" shrink>
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
