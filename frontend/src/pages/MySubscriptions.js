import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  Tooltip,
  alpha,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  Grid,
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
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import FormDialog from '../components/FormDialog';
import WebMonitorLogo from '../components/WebMonitorLogo';
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
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2,
        }}
      >
        <Box>
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              color: '#1a1a1a',
              mb: 1,
            }}
          >
            {t('subscriptions.title')}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            {t('subscriptions.subtitle')}
          </Typography>
        </Box>
      </Box>

      {subscriptionsQuery.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t('subscriptions.loadFailed')}:{' '}
          {getApiErrorMessage(subscriptionsQuery.error, t('common.unknownError'))}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              borderRadius: 3,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px) scale(1.02)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #1976d2 0%, rgba(25, 118, 210, 0.6) 100%)',
              },
              position: 'relative',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(25, 118, 210, 0.1)',
                    color: '#1976d2',
                    width: 48,
                    height: 48,
                  }}
                >
                  <SubscriptionsIcon />
                </Avatar>
              </Box>
              <Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
                  {subscriptionsQuery.isLoading ? emptyValue : subscriptions.length}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {t('subscriptions.totalSubscriptions')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              borderRadius: 3,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px) scale(1.02)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #10b981 0%, rgba(16, 185, 129, 0.6) 100%)',
              },
              position: 'relative',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    width: 48,
                    height: 48,
                  }}
                >
                  <NotificationsActiveIcon />
                </Avatar>
              </Box>
              <Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
                  {subscriptionsQuery.isLoading
                    ? emptyValue
                    : subscriptions.filter((subscription) => subscription.is_active).length}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {t('subscriptions.notificationsEnabled')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              borderRadius: 3,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px) scale(1.02)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #ef4444 0%, rgba(239, 68, 68, 0.6) 100%)',
              },
              position: 'relative',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    width: 48,
                    height: 48,
                  }}
                >
                  <NotificationsOffIcon />
                </Avatar>
              </Box>
              <Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
                  {subscriptionsQuery.isLoading
                    ? emptyValue
                    : subscriptions.filter((subscription) => !subscription.is_active).length}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {t('subscriptions.notificationsDisabled')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              borderRadius: 3,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px) scale(1.02)',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
              },
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #a78bfa 0%, rgba(167, 139, 250, 0.6) 100%)',
              },
              position: 'relative',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(167, 139, 250, 0.1)',
                    width: 48,
                    height: 48,
                  }}
                >
                  <WebMonitorLogo size={28} />
                </Avatar>
              </Box>
              <Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
                  {emailConfigsQuery.isLoading ? emptyValue : emailConfigs.length}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {t('subscriptions.emailConfigs')}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 4, backgroundColor: alpha('#1976d2', 0.04), border: `1px solid ${alpha('#1976d2', 0.12)}` }}>
        <CardContent sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <SettingsIcon sx={{ fontSize: 20, color: '#1976d2' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1976d2' }}>
              {t('subscriptions.guideTitle')}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ ml: 5, color: 'text.secondary' }}>
            • {t('subscriptions.guideLine1')}
          </Typography>
          <Typography variant="body2" sx={{ ml: 5, color: 'text.secondary' }}>
            • {t('subscriptions.guideLine2')}
          </Typography>
          <Typography variant="body2" sx={{ ml: 5, color: 'text.secondary' }}>
            • {t('subscriptions.guideLine3')}
          </Typography>
        </CardContent>
      </Card>

      <Paper
        sx={{
          borderRadius: 4,
          border: '1px solid rgba(0, 0, 0, 0.06)',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 3, borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {t('subscriptions.listTitle')}
          </Typography>
        </Box>
        {subscriptionsQuery.isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
            <CircularProgress />
          </Box>
        ) : subscriptions.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 8 }}>
            <Avatar
              sx={{
                bgcolor: 'rgba(25, 118, 210, 0.1)',
                color: '#1976d2',
                width: 80,
                height: 80,
                mx: 'auto',
                mb: 2,
              }}
            >
              <SubscriptionsIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {t('subscriptions.noSubscriptions')}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              {t('subscriptions.noSubscriptionsSubtitle')}
            </Typography>
            <Button
              variant="contained"
              color="primary"
              href="/public-tasks"
              sx={{
                background: 'linear-gradient(45deg, #1976d2 30%, #1565c0 90%)',
                textTransform: 'none',
                fontWeight: 'bold',
              }}
            >
              {t('subscriptions.browsePublicTasks')}
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(25, 118, 210, 0.05)' }}>
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
                      '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.03)' },
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
                            background: subscription.is_active
                              ? 'linear-gradient(45deg, #10b981 30%, #059669 90%)'
                              : 'linear-gradient(45deg, #ef4444 30%, #dc2626 90%)',
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
                              color: '#1976d2',
                              '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' },
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
                              color: '#ef4444',
                              '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
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
      </Paper>

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
