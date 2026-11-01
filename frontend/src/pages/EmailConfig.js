import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  InputAdornment,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Mail as MailIcon,
  Send as TestIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import api, { getApiErrorMessage } from '../api/client';
import { keys, EMAIL_CONFIG_FULL } from '../api/queryKeys';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import StatGrid from '../components/StatGrid';
import { UI_FONTS } from '../theme/tokens';

const EmailConfig = () => {
  const [openDialog, setOpenDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    smtp_server: '',
    smtp_port: '465',
    smtp_user: '',
    smtp_password: '',
    receiver_email: '',
    is_ssl: true,
  });
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const showFeedback = (message, severity = 'success') => {
    setFeedback({ open: true, message, severity });
  };

  const closeFeedback = () => {
    setFeedback((prev) => ({ ...prev, open: false }));
  };

  const {
    data: emailConfigs = [],
    error: emailConfigsError,
    isLoading: emailConfigsLoading,
  } = useQuery({
    queryKey: keys.emailConfigs(user?.id, EMAIL_CONFIG_FULL),
    queryFn: ({ signal }) =>
      api.get('/api/email-configs', { signal }).then((response) => response.data),
    enabled: !!user,
  });

  const showEmptyState = !emailConfigsLoading && !emailConfigsError && emailConfigs.length === 0;
  const showTable = !emailConfigsLoading && !emailConfigsError && emailConfigs.length > 0;

  const createConfigMutation = useMutation({
    mutationFn: (configData) =>
      api.post('/api/email-configs', configData).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailConfigs'] });
      setOpenDialog(false);
      resetForm();
      showFeedback(t('emailConfig.createSuccess'));
    },
    onError: (error) => {
      showFeedback(getApiErrorMessage(error, t('emailConfig.operationFailed')), 'error');
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: ({ id, ...configData }) =>
      api.put(`/api/email-configs/${id}`, configData).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailConfigs'] });
      setOpenDialog(false);
      resetForm();
      showFeedback(t('emailConfig.updateSuccess'));
    },
    onError: (error) => {
      showFeedback(getApiErrorMessage(error, t('emailConfig.operationFailed')), 'error');
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/email-configs/${id}`).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailConfigs'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      setConfirmTarget(null);
      showFeedback(t('emailConfig.deleteSuccess'));
    },
    onError: (error) => {
      showFeedback(getApiErrorMessage(error, t('emailConfig.deleteFailed')), 'error');
    },
  });

  const testConfigMutation = useMutation({
    mutationFn: (configId) =>
      api.post(`/api/email-configs/${configId}/test`).then((response) => response.data),
    onSuccess: (data) => {
      if (data?.success) {
        showFeedback(t('emailConfig.testSuccess'));
      } else {
        const detail = data?.error || data?.message;
        showFeedback(
          detail ? `${t('emailConfig.testFailed')}: ${detail}` : t('emailConfig.testFailed'),
          'error',
        );
      }
    },
    onError: (error) => {
      showFeedback(getApiErrorMessage(error, t('emailConfig.testFailed')), 'error');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      smtp_server: '',
      smtp_port: '465',
      smtp_user: '',
      smtp_password: '',
      receiver_email: '',
      is_ssl: true,
    });
    setEditingConfig(null);
    setShowPassword(false);
  };

  const handleOpenDialog = (config = null) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        name: config.name,
        smtp_server: config.smtp_server,
        smtp_port: config.smtp_port,
        smtp_user: config.smtp_user,
        // 服务端不再返回密码，编辑时留空表示保持原密码。
        smtp_password: '',
        receiver_email: config.receiver_email,
        is_ssl: config.is_ssl,
      });
    } else {
      resetForm();
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    resetForm();
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const { smtp_password: smtpPassword, ...rest } = formData;
    const trimmedPassword = typeof smtpPassword === 'string' ? smtpPassword.trim() : '';

    if (editingConfig) {
      const payload = { id: editingConfig.id, ...rest };
      if (trimmedPassword) {
        payload.smtp_password = smtpPassword;
      }
      updateConfigMutation.mutate(payload);
    } else {
      createConfigMutation.mutate(formData);
    }
  };

  const handleTestConfig = (configId) => {
    testConfigMutation.mutate(configId);
  };

  const handleConfirmDelete = () => {
    if (confirmTarget) {
      deleteConfigMutation.mutate(confirmTarget.id);
    }
  };

  return (
    <Box>
      <PageHeader
        title={t('emailConfig.title')}
        subtitle={t('emailConfig.subtitle')}
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            onClick={() => handleOpenDialog()}
          >
            {t('emailConfig.addConfig')}
          </Button>
        }
      />

      <StatGrid
        items={[
          {
            key: 'total',
            title: t('emailConfig.emailConfigs'),
            value: emailConfigsLoading || emailConfigsError ? null : emailConfigs.length,
            subtitle: t('emailConfig.sectionTitle'),
          },
          {
            key: 'ssl',
            title: t('emailConfig.sslConfigs'),
            value:
              emailConfigsLoading || emailConfigsError
                ? null
                : emailConfigs.filter((config) => config.is_ssl).length,
            subtitle: t('emailConfig.useSsl'),
          },
          {
            key: 'receivers',
            title: t('emailConfig.receiverAddresses'),
            value:
              emailConfigsLoading || emailConfigsError
                ? null
                : new Set(emailConfigs.map((config) => config.receiver_email)).size,
            subtitle: t('emailConfig.notificationReceiver'),
          },
        ]}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        {t('emailConfig.sectionDescription')}
      </Alert>

      <SectionCard title={t('emailConfig.sectionTitle')} bareBody>
        {emailConfigsLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {showEmptyState && (
          <EmptyState
            icon={<MailIcon />}
            title={t('emailConfig.noConfigs')}
            subtitle={t('emailConfig.noConfigsSubtitle')}
            action={
              <Button
                variant="outlined"
                startIcon={<AddIcon sx={{ fontSize: 18 }} />}
                onClick={() => handleOpenDialog()}
              >
                {t('emailConfig.createFirstConfig')}
              </Button>
            }
          />
        )}

        {showTable && (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('emailConfig.configDetails')}</TableCell>
                  <TableCell>{t('emailConfig.senderEmail')}</TableCell>
                  <TableCell>{t('emailConfig.receiverEmail')}</TableCell>
                  <TableCell align="right">{t('emailConfig.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {emailConfigs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {config.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        <Typography
                          sx={{
                            fontFamily: UI_FONTS.mono,
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: 12,
                            color: 'text.secondary',
                          }}
                        >
                          {config.smtp_server}:{config.smtp_port}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {config.is_ssl ? 'SSL' : '—'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{config.smtp_user}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {t('emailConfig.smtpSenderAccount')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{config.receiver_email}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {t('emailConfig.notificationReceiver')}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                        <Tooltip title={t('emailConfig.testConnection')}>
                          <IconButton
                            size="small"
                            aria-label={t('emailConfig.testConnection')}
                            onClick={() => handleTestConfig(config.id)}
                            disabled={testConfigMutation.isPending}
                          >
                            <TestIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('emailConfig.editConfig')}>
                          <IconButton
                            size="small"
                            aria-label={t('emailConfig.editConfig')}
                            onClick={() => handleOpenDialog(config)}
                          >
                            <EditIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('emailConfig.deleteConfig')}>
                          <IconButton
                            size="small"
                            aria-label={t('emailConfig.deleteConfig')}
                            onClick={() => setConfirmTarget(config)}
                            disabled={deleteConfigMutation.isPending}
                          >
                            <DeleteIcon sx={{ fontSize: 18 }} />
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

        {emailConfigsError && (
          <Box sx={{ p: 2.5 }}>
            <Alert severity="error">
              {getApiErrorMessage(emailConfigsError, t('emailConfig.loadFailed'))}
            </Alert>
          </Box>
        )}
      </SectionCard>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Typography variant="h6" component="div" sx={{ fontWeight: 500 }}>
            {editingConfig ? t('emailConfig.editDialogTitle') : t('emailConfig.createDialogTitle')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {t('emailConfig.dialogSubtitle')}
          </Typography>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Grid container spacing={2} sx={{ pt: 1 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('emailConfig.configName')}
                  fullWidth
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label={t('emailConfig.smtpServer')}
                  fullWidth
                  value={formData.smtp_server}
                  onChange={(e) => setFormData({ ...formData, smtp_server: e.target.value })}
                  required
                  placeholder="smtp.example.com"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label={t('emailConfig.smtpPort')}
                  fullWidth
                  type="number"
                  value={formData.smtp_port}
                  onChange={(e) => setFormData({ ...formData, smtp_port: parseInt(e.target.value, 10) || '' })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('emailConfig.senderAddress')}
                  fullWidth
                  type="email"
                  value={formData.smtp_user}
                  onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('emailConfig.smtpPassword')}
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  value={formData.smtp_password}
                  onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
                  required={!editingConfig}
                  helperText={
                    editingConfig
                      ? t('emailConfig.passwordHelperEdit')
                      : t('emailConfig.passwordHelper')
                  }
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            aria-label={t('common.togglePasswordVisibility')}
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? (
                              <VisibilityOffIcon sx={{ fontSize: 18 }} />
                            ) : (
                              <VisibilityIcon sx={{ fontSize: 18 }} />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('emailConfig.receiverAddress')}
                  fullWidth
                  type="email"
                  value={formData.receiver_email}
                  onChange={(e) => setFormData({ ...formData, receiver_email: e.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Switch
                    checked={formData.is_ssl}
                    onChange={(e) => setFormData({ ...formData, is_ssl: e.target.checked })}
                  />
                  <Box sx={{ pt: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {t('emailConfig.useSsl')}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {t('emailConfig.useSslHelper')}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>{t('emailConfig.cancel')}</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createConfigMutation.isPending || updateConfigMutation.isPending}
            >
              {editingConfig ? t('emailConfig.updateConfig') : t('emailConfig.createConfig')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!confirmTarget}
        title={t('emailConfig.deleteConfirmTitle')}
        message={t('emailConfig.deleteConfirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        pending={deleteConfigMutation.isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setConfirmTarget(null)}
      />

      <FeedbackSnackbar
        open={feedback.open}
        message={feedback.message}
        severity={feedback.severity}
        onClose={closeFeedback}
      />
    </Box>
  );
};

export default EmailConfig;
