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
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
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
import { useTranslation } from 'react-i18next';
import axios from 'axios';

import { WebMonitorLogo } from '../components/WebMonitorLogo';
import { formatDateTime } from '../utils/date';
import { isChineseLanguage } from '../utils/i18n';

const PublicTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [subscriptionInfo, setSubscriptionInfo] = useState({
    current_subscriptions: 0,
    max_subscriptions: 10,
    remaining_slots: 10,
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [selectedTask, setSelectedTask] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [emailConfigs, setEmailConfigs] = useState([]);
  const [emailConfigDialogOpen, setEmailConfigDialogOpen] = useState(false);
  const [selectedEmailConfig, setSelectedEmailConfig] = useState('');
  const { i18n } = useTranslation();
  const isChinese = isChineseLanguage(i18n.language);

  const content = isChinese ? {
    title: '公开任务市场',
    subtitle: '发现和订阅其他用户分享的监控任务',
    publicTasks: '公开任务',
    mySubscriptions: '我的订阅',
    remainingSlots: '剩余额度',
    totalSubscriptions: '总订阅数',
    usageTitle: '订阅使用情况',
    usageLine1: `当前已订阅 ${subscriptionInfo.current_subscriptions} 个任务，最多可订阅 ${subscriptionInfo.max_subscriptions} 个`,
    usageLine2: `剩余订阅额度：${subscriptionInfo.remaining_slots} 个`,
    usageLine3: '订阅任务后，当任务监控到内容变化时，您会收到邮件通知',
    taskList: '公开任务列表',
    noTasks: '暂无公开任务',
    noTasksSubtitle: '当前没有用户分享公开的监控任务',
    taskInfo: '任务信息',
    creator: '创建者',
    subscriptions: '订阅数',
    interval: '检查间隔',
    createdAt: '创建时间',
    actions: '操作',
    subscribe: '订阅',
    unsubscribe: '取消订阅',
    subscribeTask: '订阅任务',
    unsubscribeTask: '取消订阅',
    viewDetails: '查看详情',
    taskDetails: '任务详情',
    noDescription: '暂无描述',
    monitorUrl: '监控 URL',
    subscriberCount: '订阅人数',
    close: '关闭',
    chooseEmailConfig: '选择邮箱配置',
    chooseEmailConfigSubtitle: '订阅任务需要配置邮件通知，请选择要使用的邮箱配置',
    noEmailConfig: '您还没有配置邮箱通知设置。请先在“邮件通知配置”页面添加邮箱配置后再订阅任务。',
    emailConfig: '邮箱配置',
    cancel: '取消',
    confirmSubscribe: '确认订阅',
    fetchPublicTasksFailed: '获取公开任务失败',
    toggleFailed: '操作失败',
    subscribeWithEmailFailed: '操作失败',
    unknownError: '未知错误',
    seconds: '秒',
    createdByLabel: '创建者',
    createdAtLabel: '创建时间',
  } : {
    title: 'Public task marketplace',
    subtitle: 'Discover and subscribe to monitoring tasks shared by other users.',
    publicTasks: 'Public tasks',
    mySubscriptions: 'My subscriptions',
    remainingSlots: 'Remaining slots',
    totalSubscriptions: 'Total subscriptions',
    usageTitle: 'Subscription usage',
    usageLine1: `You are currently subscribed to ${subscriptionInfo.current_subscriptions} tasks and can subscribe to up to ${subscriptionInfo.max_subscriptions}.`,
    usageLine2: `Remaining subscription slots: ${subscriptionInfo.remaining_slots}`,
    usageLine3: 'You will receive email notifications when subscribed tasks detect content changes.',
    taskList: 'Public task list',
    noTasks: 'No public tasks yet',
    noTasksSubtitle: 'No users have shared public monitoring tasks yet.',
    taskInfo: 'Task info',
    creator: 'Creator',
    subscriptions: 'Subscriptions',
    interval: 'Interval',
    createdAt: 'Created at',
    actions: 'Actions',
    subscribe: 'Subscribe',
    unsubscribe: 'Unsubscribe',
    subscribeTask: 'Subscribe to task',
    unsubscribeTask: 'Unsubscribe',
    viewDetails: 'View details',
    taskDetails: 'Task details',
    noDescription: 'No description',
    monitorUrl: 'Monitor URL',
    subscriberCount: 'Subscribers',
    close: 'Close',
    chooseEmailConfig: 'Choose email configuration',
    chooseEmailConfigSubtitle: 'Task subscriptions require email notifications. Choose the email configuration to use.',
    noEmailConfig: 'You have not configured email notifications yet. Add an email configuration on the email configuration page before subscribing.',
    emailConfig: 'Email configuration',
    cancel: 'Cancel',
    confirmSubscribe: 'Confirm subscription',
    fetchPublicTasksFailed: 'Failed to fetch public tasks',
    toggleFailed: 'Operation failed',
    subscribeWithEmailFailed: 'Operation failed',
    unknownError: 'Unknown error',
    seconds: 's',
    createdByLabel: 'Created by',
    createdAtLabel: 'Created at',
  };

  const getErrorMessage = useCallback((error) => {
    return error.response?.data?.detail || content.unknownError;
  }, [content.unknownError]);

  const requiresEmailConfig = (message) => {
    const normalized = String(message || '').toLowerCase();
    return normalized.includes('邮箱配置')
      || normalized.includes('邮件通知设置')
      || normalized.includes('email config')
      || normalized.includes('email notification');
  };

  const fetchPublicTasks = useCallback(async () => {
    try {
      const response = await axios.get('/api/public-tasks');
      setTasks(response.data);
    } catch (error) {
      setSnackbar({
        open: true,
        message: `${content.fetchPublicTasksFailed}: ${getErrorMessage(error)}`,
        severity: 'error',
      });
    }
  }, [content.fetchPublicTasksFailed, getErrorMessage]);

  const fetchSubscriptionInfo = useCallback(async () => {
    try {
      const response = await axios.get('/api/subscription-info');
      setSubscriptionInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch subscription info:', error);
    }
  }, []);

  const fetchEmailConfigs = useCallback(async () => {
    try {
      const response = await axios.get('/api/email-configs/simple-list');
      setEmailConfigs(response.data);
    } catch (error) {
      console.error('Failed to fetch email configs:', error);
    }
  }, []);

  useEffect(() => {
    fetchPublicTasks();
    fetchSubscriptionInfo();
    fetchEmailConfigs();
  }, [fetchPublicTasks, fetchSubscriptionInfo, fetchEmailConfigs]);

  const handleToggleSubscription = async (taskId) => {
    try {
      const response = await axios.post(`/api/subscriptions/${taskId}/toggle`);

      setSnackbar({
        open: true,
        message: response.data.message,
        severity: 'success',
      });

      fetchPublicTasks();
      fetchSubscriptionInfo();
    } catch (error) {
      const errorMessage = getErrorMessage(error);

      if (requiresEmailConfig(errorMessage)) {
        setSelectedTask(taskId);
        setSelectedEmailConfig('');
        setEmailConfigDialogOpen(true);
        return;
      }

      setSnackbar({
        open: true,
        message: `${content.toggleFailed}: ${errorMessage}`,
        severity: 'error',
      });
    }
  };

  const handleSubscribeWithEmail = async () => {
    try {
      const response = await axios.post(
        `/api/subscriptions/${selectedTask}/subscribe-with-email`,
        { email_config_id: selectedEmailConfig }
      );

      setSnackbar({
        open: true,
        message: response.data.message,
        severity: 'success',
      });

      setEmailConfigDialogOpen(false);
      setSelectedTask(null);
      setSelectedEmailConfig('');
      fetchPublicTasks();
      fetchSubscriptionInfo();
    } catch (error) {
      setSnackbar({
        open: true,
        message: `${content.subscribeWithEmailFailed}: ${getErrorMessage(error)}`,
        severity: 'error',
      });
    }
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
                  <PublicIcon />
                </Avatar>
              </Box>
              <Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
                  {tasks.length}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {content.publicTasks}
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
                  <PeopleIcon />
                </Avatar>
              </Box>
              <Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
                  {subscriptionInfo.current_subscriptions}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {content.mySubscriptions}
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
                background: 'linear-gradient(90deg, #22d3ee 0%, rgba(34, 211, 238, 0.6) 100%)',
              },
              position: 'relative',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: subscriptionInfo.remaining_slots > 0 ? 'rgba(34, 211, 238, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: subscriptionInfo.remaining_slots > 0 ? '#22d3ee' : '#ef4444',
                    width: 48,
                    height: 48,
                  }}
                >
                  {subscriptionInfo.remaining_slots > 0 ? <SuccessIcon /> : <PeopleIcon />}
                </Avatar>
              </Box>
              <Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
                  {subscriptionInfo.remaining_slots}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {content.remainingSlots}
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
                  {tasks.reduce((sum, task) => sum + task.subscription_count, 0)}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {content.totalSubscriptions}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 4, backgroundColor: alpha('#1976d2', 0.04), border: `1px solid ${alpha('#1976d2', 0.12)}` }}>
        <CardContent sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <PeopleIcon sx={{ fontSize: 20, color: '#1976d2' }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1976d2' }}>
              {content.usageTitle}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ ml: 5, color: 'text.secondary' }}>
            • {content.usageLine1}
          </Typography>
          <Typography variant="body2" sx={{ ml: 5, color: 'text.secondary' }}>
            • {content.usageLine2}
          </Typography>
          <Typography variant="body2" sx={{ ml: 5, color: 'text.secondary' }}>
            • {content.usageLine3}
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
            {content.taskList}
          </Typography>
        </Box>
        {tasks.length === 0 ? (
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
              <PublicIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {content.noTasks}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {content.noTasksSubtitle}
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(25, 118, 210, 0.05)' }}>
                  <TableCell sx={{ fontWeight: 600 }}>{content.taskInfo}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.creator}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.subscriptions}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.interval}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.createdAt}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.actions}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow
                    key={task.id}
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
                            background: 'linear-gradient(45deg, #1976d2 30%, #1565c0 90%)',
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
                          {task.interval}{content.seconds}
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
                        <Tooltip title={task.user_subscribed ? content.unsubscribeTask : content.subscribeTask}>
                          <Button
                            size="small"
                            variant={task.user_subscribed ? 'outlined' : 'contained'}
                            color={task.user_subscribed ? 'secondary' : 'primary'}
                            startIcon={task.user_subscribed ? <UnsubscribeIcon /> : <SubscribeIcon />}
                            onClick={() => handleToggleSubscription(task.id)}
                            disabled={!task.user_subscribed && subscriptionInfo.remaining_slots <= 0}
                          >
                            {task.user_subscribed ? content.unsubscribe : content.subscribe}
                          </Button>
                        </Tooltip>
                        <Tooltip title={content.viewDetails}>
                          <IconButton
                            size="small"
                            onClick={() => handleViewDetails(task)}
                            sx={{
                              color: 'info.main',
                              '&:hover': { backgroundColor: 'rgba(0, 188, 212, 0.1)' },
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
      </Paper>

      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <PublicIcon sx={{ fontSize: 24, color: 'primary.main' }} />
            <Typography variant="h5" component="div">
              {content.taskDetails}
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
                {content.createdByLabel}: {selectedTask.owner_username} | {content.createdAtLabel}: {formatDateTime(selectedTask.created_at, i18n.language)}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {selectedTask.description || content.noDescription}
              </Typography>
              <Typography variant="body2" sx={{ wordBreak: 'break-all', color: 'text.secondary' }}>
                {content.monitorUrl}: {selectedTask.url}
              </Typography>
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                {content.subscriberCount}: {selectedTask.subscription_count}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setDetailDialogOpen(false)} color="inherit">
            {content.close}
          </Button>
          {selectedTask && typeof selectedTask === 'object' && (
            <Button
              onClick={() => {
                handleToggleSubscription(selectedTask.id);
                setDetailDialogOpen(false);
              }}
              variant={selectedTask.user_subscribed ? 'outlined' : 'contained'}
              color={selectedTask.user_subscribed ? 'secondary' : 'primary'}
              disabled={!selectedTask.user_subscribed && subscriptionInfo.remaining_slots <= 0}
            >
              {selectedTask.user_subscribed ? content.unsubscribeTask : content.subscribeTask}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog
        open={emailConfigDialogOpen}
        onClose={() => setEmailConfigDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {content.chooseEmailConfig}
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
            {content.chooseEmailConfigSubtitle}
          </Typography>
        </DialogTitle>
        <DialogContent>
          {emailConfigs.length === 0 ? (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {content.noEmailConfig}
            </Alert>
          ) : (
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel id="email-config-select-label">{content.emailConfig}</InputLabel>
              <Select
                labelId="email-config-select-label"
                value={selectedEmailConfig}
                label={content.emailConfig}
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
          <Button onClick={() => setEmailConfigDialogOpen(false)} color="inherit">
            {content.cancel}
          </Button>
          {emailConfigs.length > 0 && (
            <Button
              onClick={handleSubscribeWithEmail}
              variant="contained"
              disabled={!selectedEmailConfig}
            >
              {content.confirmSubscribe}
            </Button>
          )}
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

export default PublicTasks;
