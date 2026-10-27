import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Alert,
  Snackbar,
  Tooltip,
  alpha,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
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
import { useTranslation } from 'react-i18next';
import axios from 'axios';

import { WebMonitorLogo } from '../components/WebMonitorLogo';
import { formatDateTime } from '../utils/date';
import { isChineseLanguage } from '../utils/i18n';

const MySubscriptions = () => {
  const [subscriptions, setSubscriptions] = useState([]);
  const [emailConfigs, setEmailConfigs] = useState([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState(null);
  const [formData, setFormData] = useState({
    is_active: true,
    email_config_id: null,
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const { i18n } = useTranslation();
  const isChinese = isChineseLanguage(i18n.language);

  const content = isChinese ? {
    title: '我的订阅',
    subtitle: '管理您订阅的公开任务和通知设置',
    totalSubscriptions: '总订阅数',
    notificationsEnabled: '启用通知',
    notificationsDisabled: '停用通知',
    emailConfigs: '邮箱配置',
    guideTitle: '订阅管理说明',
    guideLine1: '启用通知后，当订阅的任务内容发生变化时将收到邮件通知',
    guideLine2: '可以为每个订阅单独配置邮箱通知设置',
    guideLine3: '停用通知后将不再收到邮件，但订阅记录会保留',
    listTitle: '我的订阅列表',
    noSubscriptions: '暂无订阅任务',
    noSubscriptionsSubtitle: '前往“公开任务市场”订阅感兴趣的任务',
    browsePublicTasks: '浏览公开任务',
    taskInfo: '任务信息',
    taskUrl: '任务 URL',
    notificationStatus: '通知状态',
    emailConfig: '邮箱配置',
    subscribedAt: '订阅时间',
    actions: '操作',
    createdBy: '创建者',
    enabled: '已启用',
    disabled: '已停用',
    unknownConfig: '未知配置',
    defaultConfig: '默认配置',
    editSubscription: '编辑订阅',
    deleteSubscription: '取消订阅',
    editDialogTitle: '编辑订阅设置',
    taskLabel: '任务',
    enableEmailNotifications: '启用邮件通知',
    emailConfigLabel: '邮箱配置',
    useDefaultConfig: '使用默认配置',
    cancel: '取消',
    saveSettings: '保存设置',
    fetchSubscriptionsFailed: '获取订阅列表失败',
    updateSuccess: '订阅更新成功',
    updateFailed: '更新订阅失败',
    deleteConfirm: '确定要取消这个订阅吗？',
    deleteSuccess: '订阅取消成功',
    deleteFailed: '取消订阅失败',
    unknownError: '未知错误',
  } : {
    title: 'My subscriptions',
    subtitle: 'Manage your subscribed public tasks and notification settings.',
    totalSubscriptions: 'Total subscriptions',
    notificationsEnabled: 'Notifications enabled',
    notificationsDisabled: 'Notifications disabled',
    emailConfigs: 'Email configs',
    guideTitle: 'Subscription guide',
    guideLine1: 'When notifications are enabled, you will receive an email when subscribed task content changes.',
    guideLine2: 'You can choose a separate email configuration for each subscription.',
    guideLine3: 'When notifications are disabled, emails stop but the subscription record remains.',
    listTitle: 'My subscriptions',
    noSubscriptions: 'No subscriptions yet',
    noSubscriptionsSubtitle: 'Visit the public task marketplace to subscribe to tasks you care about.',
    browsePublicTasks: 'Browse public tasks',
    taskInfo: 'Task info',
    taskUrl: 'Task URL',
    notificationStatus: 'Notification status',
    emailConfig: 'Email config',
    subscribedAt: 'Subscribed at',
    actions: 'Actions',
    createdBy: 'Created by',
    enabled: 'Enabled',
    disabled: 'Disabled',
    unknownConfig: 'Unknown config',
    defaultConfig: 'Default config',
    editSubscription: 'Edit subscription',
    deleteSubscription: 'Cancel subscription',
    editDialogTitle: 'Edit subscription settings',
    taskLabel: 'Task',
    enableEmailNotifications: 'Enable email notifications',
    emailConfigLabel: 'Email config',
    useDefaultConfig: 'Use default config',
    cancel: 'Cancel',
    saveSettings: 'Save settings',
    fetchSubscriptionsFailed: 'Failed to fetch subscriptions',
    updateSuccess: 'Subscription updated successfully',
    updateFailed: 'Failed to update subscription',
    deleteConfirm: 'Are you sure you want to cancel this subscription?',
    deleteSuccess: 'Subscription cancelled successfully',
    deleteFailed: 'Failed to cancel subscription',
    unknownError: 'Unknown error',
  };

  const getErrorMessage = useCallback((error) => {
    return error.response?.data?.detail || content.unknownError;
  }, [content.unknownError]);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const response = await axios.get('/api/subscriptions');
      setSubscriptions(response.data);
    } catch (error) {
      setSnackbar({
        open: true,
        message: `${content.fetchSubscriptionsFailed}: ${getErrorMessage(error)}`,
        severity: 'error',
      });
    }
  }, [content.fetchSubscriptionsFailed, getErrorMessage]);

  const fetchEmailConfigs = useCallback(async () => {
    try {
      const response = await axios.get('/api/email-configs');
      setEmailConfigs(response.data);
    } catch (error) {
      console.error('Failed to fetch email configs:', error);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
    fetchEmailConfigs();
  }, [fetchSubscriptions, fetchEmailConfigs]);

  const handleOpenEditDialog = (subscription) => {
    setEditingSubscription(subscription);
    setFormData({
      is_active: subscription.is_active,
      email_config_id: subscription.email_config_id,
    });
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setEditingSubscription(null);
    setFormData({
      is_active: true,
      email_config_id: null,
    });
  };

  const handleUpdateSubscription = async () => {
    try {
      await axios.put(`/api/subscriptions/${editingSubscription.id}`, formData);

      setSnackbar({
        open: true,
        message: content.updateSuccess,
        severity: 'success',
      });

      handleCloseEditDialog();
      fetchSubscriptions();
    } catch (error) {
      setSnackbar({
        open: true,
        message: `${content.updateFailed}: ${getErrorMessage(error)}`,
        severity: 'error',
      });
    }
  };

  const handleDeleteSubscription = async (subscriptionId) => {
    if (!window.confirm(content.deleteConfirm)) {
      return;
    }

    try {
      await axios.delete(`/api/subscriptions/${subscriptionId}`);

      setSnackbar({
        open: true,
        message: content.deleteSuccess,
        severity: 'success',
      });

      fetchSubscriptions();
    } catch (error) {
      setSnackbar({
        open: true,
        message: `${content.deleteFailed}: ${getErrorMessage(error)}`,
        severity: 'error',
      });
    }
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
            {content.title}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            {content.subtitle}
          </Typography>
        </Box>
      </Box>

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
                  {subscriptions.length}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {content.totalSubscriptions}
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
                  {subscriptions.filter((subscription) => subscription.is_active).length}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {content.notificationsEnabled}
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
                  {subscriptions.filter((subscription) => !subscription.is_active).length}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {content.notificationsDisabled}
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
                  {emailConfigs.length}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {content.emailConfigs}
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
              {content.guideTitle}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ ml: 5, color: 'text.secondary' }}>
            • {content.guideLine1}
          </Typography>
          <Typography variant="body2" sx={{ ml: 5, color: 'text.secondary' }}>
            • {content.guideLine2}
          </Typography>
          <Typography variant="body2" sx={{ ml: 5, color: 'text.secondary' }}>
            • {content.guideLine3}
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
            {content.listTitle}
          </Typography>
        </Box>
        {subscriptions.length === 0 ? (
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
              {content.noSubscriptions}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              {content.noSubscriptionsSubtitle}
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
              {content.browsePublicTasks}
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(25, 118, 210, 0.05)' }}>
                  <TableCell sx={{ fontWeight: 600 }}>{content.taskInfo}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.taskUrl}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.notificationStatus}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.emailConfig}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.subscribedAt}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.actions}</TableCell>
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
                          {subscription.task_name.charAt(0).toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {subscription.task_name}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {content.createdBy}: {subscription.task_owner}
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
                        label={subscription.is_active ? content.enabled : content.disabled}
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
                            ? emailConfigs.find((config) => config.id === subscription.email_config_id)?.name || content.unknownConfig
                            : content.defaultConfig}
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
                        <Tooltip title={content.editSubscription}>
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
                        <Tooltip title={content.deleteSubscription}>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteSubscription(subscription.id)}
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

      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SettingsIcon sx={{ fontSize: 24, color: 'primary.main' }} />
            <Typography variant="h5" component="div">
              {content.editDialogTitle}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {editingSubscription && (
            <Box>
              <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                {content.taskLabel}: {editingSubscription.task_name}
              </Typography>

              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(event) => setFormData({ ...formData, is_active: event.target.checked })}
                    color="primary"
                  />
                }
                label={content.enableEmailNotifications}
                sx={{ mb: 2 }}
              />

              {formData.is_active && (
                <TextField
                  select
                  fullWidth
                  label={content.emailConfigLabel}
                  value={formData.email_config_id || ''}
                  onChange={(event) => setFormData({ ...formData, email_config_id: event.target.value || null })}
                  sx={{ mb: 2 }}
                  slotProps={{ select: { native: true } }}
                >
                  <option value="">{content.useDefaultConfig}</option>
                  {emailConfigs.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.name} ({config.smtp_user})
                    </option>
                  ))}
                </TextField>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseEditDialog} color="inherit">
            {content.cancel}
          </Button>
          <Button onClick={handleUpdateSubscription} variant="contained">
            {content.saveSettings}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MySubscriptions;
