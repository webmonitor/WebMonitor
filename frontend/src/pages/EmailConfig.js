import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Switch,
  Avatar,
  Tooltip,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as TestIcon,
  Mail as MailIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Email as EmailIcon,
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
import { UI_COLORS } from '../theme/tokens';

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
            disableElevation
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ textTransform: 'none', borderRadius: 2 }}
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
            icon: <MailIcon />,
            color: UI_COLORS.primary,
          },
          {
            key: 'ssl',
            title: t('emailConfig.sslConfigs'),
            value:
              emailConfigsLoading || emailConfigsError
                ? null
                : emailConfigs.filter((config) => config.is_ssl).length,
            icon: <SecurityIcon />,
            color: UI_COLORS.info,
          },
          {
            key: 'receivers',
            title: t('emailConfig.receiverAddresses'),
            value:
              emailConfigsLoading || emailConfigsError
                ? null
                : new Set(emailConfigs.map((config) => config.receiver_email)).size,
            icon: <SettingsIcon />,
            color: UI_COLORS.accent,
          },
        ]}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        {t('emailConfig.sectionDescription')}
      </Alert>

      <SectionCard title={t('emailConfig.sectionTitle')} bareBody>

        {emailConfigsLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {showEmptyState && (
          <EmptyState
            icon={<MailIcon />}
            title={t('emailConfig.noConfigs')}
            subtitle={t('emailConfig.noConfigsSubtitle')}
            action={
              <Button
                variant="contained"
                disableElevation
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                {t('emailConfig.createFirstConfig')}
              </Button>
            }
          />
        )}

        {showTable && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(37, 99, 235, 0.05)' }}>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('emailConfig.configDetails')}</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('emailConfig.senderEmail')}</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2 }}>{t('emailConfig.receiverEmail')}</TableCell>
                  <TableCell sx={{ fontWeight: 600, py: 2, textAlign: 'center' }}>{t('emailConfig.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {emailConfigs.map((config) => (
                  <TableRow
                    key={config.id}
                    sx={{
                      '&:hover': { backgroundColor: 'rgba(37, 99, 235, 0.03)' },
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
                            fontSize: '1rem',
                          }}
                        >
                          {config.name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {config.name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {config.smtp_server}:{config.smtp_port} {config.is_ssl ? 'SSL' : ''}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <EmailIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {config.smtp_user}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {t('emailConfig.smtpSenderAccount')}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <EmailIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {config.receiver_email}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {t('emailConfig.notificationReceiver')}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title={t('emailConfig.testConnection')}>
                          <IconButton
                            size="small"
                            onClick={() => handleTestConfig(config.id)}
                            disabled={testConfigMutation.isPending}
                            sx={{
                              color: '#2563eb',
                              '&:hover': { backgroundColor: 'rgba(37, 99, 235, 0.1)' },
                            }}
                          >
                            <TestIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('emailConfig.editConfig')}>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(config)}
                            sx={{
                              color: '#10b981',
                              '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('emailConfig.deleteConfig')}>
                          <IconButton
                            size="small"
                            onClick={() => setConfirmTarget(config)}
                            disabled={deleteConfigMutation.isPending}
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

        {emailConfigsError && (
          <Alert severity="error" sx={{ m: 3, borderRadius: 2 }}>
            {getApiErrorMessage(emailConfigsError, t('emailConfig.loadFailed'))}
          </Alert>
        )}
      </SectionCard>

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {editingConfig ? <EditIcon color="primary" /> : <AddIcon color="primary" />}
          <Box>
            <Typography variant="h6" component="div">
              {editingConfig ? t('emailConfig.editDialogTitle') : t('emailConfig.createDialogTitle')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {t('emailConfig.dialogSubtitle')}
            </Typography>
          </Box>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ pt: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('emailConfig.configName')}
                  fullWidth
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'rgba(37, 99, 235, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2563eb',
                        borderWidth: 2,
                      },
                    },
                  }}
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
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <MailIcon sx={{ color: 'rgba(0, 0, 0, 0.6)' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'rgba(37, 99, 235, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2563eb',
                        borderWidth: 2,
                      },
                    },
                  }}
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
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'rgba(37, 99, 235, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2563eb',
                        borderWidth: 2,
                      },
                    },
                  }}
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
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon sx={{ color: 'rgba(0, 0, 0, 0.6)' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'rgba(37, 99, 235, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2563eb',
                        borderWidth: 2,
                      },
                    },
                  }}
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
                      startAdornment: (
                        <InputAdornment position="start">
                          <SecurityIcon sx={{ color: 'rgba(0, 0, 0, 0.6)' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={t('common.togglePasswordVisibility')}
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                            sx={{ color: 'rgba(0, 0, 0, 0.6)' }}
                          >
                            {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'rgba(37, 99, 235, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2563eb',
                        borderWidth: 2,
                      },
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
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon sx={{ color: 'rgba(0, 0, 0, 0.6)' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'rgba(37, 99, 235, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#2563eb',
                        borderWidth: 2,
                      },
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderRadius: 2, backgroundColor: 'rgba(37, 99, 235, 0.05)' }}>
                  <Switch
                    checked={formData.is_ssl}
                    onChange={(e) => setFormData({ ...formData, is_ssl: e.target.checked })}
                    sx={{
                      '& .MuiSwitch-thumb': {
                        backgroundColor: formData.is_ssl ? '#2563eb' : 'default',
                      },
                      '& .MuiSwitch-track': {
                        backgroundColor: formData.is_ssl ? 'rgba(37, 99, 235, 0.5)' : 'default',
                      },
                    }}
                  />
                  <Box sx={{ ml: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
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
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={handleCloseDialog}
              sx={{
                px: 3,
                borderRadius: 2,
                '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
              }}
            >
              {t('emailConfig.cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disableElevation
              disabled={createConfigMutation.isPending || updateConfigMutation.isPending}
              sx={{ textTransform: 'none', borderRadius: 2 }}
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
