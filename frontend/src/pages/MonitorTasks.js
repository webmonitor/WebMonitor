import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Switch,
  Chip,
  IconButton,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Tooltip,
  Card,
  CardContent,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as TestIcon,
  NotificationsActive as NotificationsIcon,
  Schedule as ScheduleIcon,
  CheckCircle as SuccessIcon,
  Pause as PauseIcon,
  Link as LinkIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

import { useAuth } from '../contexts/AuthContext';
import { WebMonitorLogo } from '../components/WebMonitorLogo';
import FooterLinks from '../components/FooterLinks';
import { isChineseLanguage } from '../utils/i18n';

const MonitorTasks = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const isChinese = isChineseLanguage(i18n.language);
  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    xpath: '',
    interval: 300,
    is_active: true,
    is_public: false,
    description: '',
    email_config_id: '',
  });

  const content = isChinese ? {
    title: '监控任务管理',
    subtitle: '管理和配置您的网页监控任务',
    createTask: '创建新任务',
    blacklistTitle: '黑名单限制说明',
    blacklistItem1: '普通用户无法监控黑名单中禁止的网站域名',
    blacklistItem2: '如需监控被限制的网站，请联系管理员将域名从黑名单中移除',
    blacklistItem3: '管理员可访问“黑名单管理”功能进行域名管理',
    totalTasks: '总任务数',
    activeTasks: '活跃任务',
    pausedTasks: '暂停任务',
    emailNotifications: '邮件通知',
    taskList: '监控任务列表',
    noTasks: '暂无监控任务',
    noTasksSubtitle: '创建您的第一个监控任务开始监控网页内容变化',
    createFirstTask: '创建第一个任务',
    taskInfo: '任务信息',
    monitorConfig: '监控配置',
    interval: '检查间隔',
    emailConfig: '邮件配置',
    status: '状态',
    actions: '操作',
    notSet: '未设置',
    unknownConfig: '未知配置',
    seconds: '秒',
    running: '运行中',
    paused: '已暂停',
    testMonitor: '测试监控',
    editTask: '编辑任务',
    deleteTask: '删除任务',
    editDialogTitle: '编辑监控任务',
    createDialogTitle: '创建新监控任务',
    taskName: '任务名称',
    monitorUrl: '监控 URL',
    xpathSelector: 'XPath 选择器',
    xpathHelper: '用于定位监控内容的 XPath 表达式',
    intervalSeconds: '检查间隔（秒）',
    emailConfigRequired: '邮箱配置 *',
    noEmailConfigOption: '暂无邮箱配置，请先添加邮件配置',
    addEmailConfigHint: '请先在“邮件通知配置”页面添加邮箱配置',
    taskDescription: '任务描述',
    taskDescriptionHelper: '可选的任务描述，公开任务时其他用户可以看到此描述',
    publicTask: '公开任务',
    publicTaskHelper: '公开后其他用户可以订阅此任务并收到变更通知',
    enableMonitoring: '启用监控',
    enableMonitoringHelper: '立即开始监控指定网页',
    cancel: '取消',
    updateTask: '更新任务',
    submitCreateTask: '创建任务',
    loadTasksError: '加载监控任务失败',
    selectEmailBeforeCreate: '请选择邮件配置后再创建任务。如果您还没有配置邮箱，请先在“邮件通知配置”页面添加邮箱配置。',
    deleteConfirm: '确定要删除这个监控任务吗？',
    testSuccess: '测试成功！',
    contentLabel: '内容',
    testFailed: '测试失败',
    blacklistAlertTitle: '⚠️ 黑名单限制',
    blacklistAlertBody: '该域名在管理员设置的黑名单中，普通用户无法监控此网站。\n\n如需监控此网站，请联系管理员将其从黑名单中移除。',
    createFailed: '创建监控任务失败',
    updateFailed: '更新监控任务失败',
  } : {
    title: 'Monitor tasks',
    subtitle: 'Manage and configure your web monitoring tasks.',
    createTask: 'Create task',
    blacklistTitle: 'Blacklist restrictions',
    blacklistItem1: 'Regular users cannot monitor domains blocked by the blacklist.',
    blacklistItem2: 'If you need to monitor a blocked site, ask an admin to remove the domain from the blacklist.',
    blacklistItem3: 'Admins can manage domains in the blacklist management page.',
    totalTasks: 'Total tasks',
    activeTasks: 'Active tasks',
    pausedTasks: 'Paused tasks',
    emailNotifications: 'Email notifications',
    taskList: 'Monitor task list',
    noTasks: 'No monitor tasks yet',
    noTasksSubtitle: 'Create your first task to start monitoring web content changes.',
    createFirstTask: 'Create first task',
    taskInfo: 'Task info',
    monitorConfig: 'Monitor config',
    interval: 'Interval',
    emailConfig: 'Email config',
    status: 'Status',
    actions: 'Actions',
    notSet: 'Not set',
    unknownConfig: 'Unknown config',
    seconds: 's',
    running: 'Running',
    paused: 'Paused',
    testMonitor: 'Test monitor',
    editTask: 'Edit task',
    deleteTask: 'Delete task',
    editDialogTitle: 'Edit monitor task',
    createDialogTitle: 'Create new monitor task',
    taskName: 'Task name',
    monitorUrl: 'Monitor URL',
    xpathSelector: 'XPath selector',
    xpathHelper: 'XPath expression used to locate the monitored content',
    intervalSeconds: 'Check interval (seconds)',
    emailConfigRequired: 'Email config *',
    noEmailConfigOption: 'No email config yet. Add one first.',
    addEmailConfigHint: 'Please add an email config in the email configuration page first.',
    taskDescription: 'Task description',
    taskDescriptionHelper: 'Optional description visible to other users when the task is public',
    publicTask: 'Public task',
    publicTaskHelper: 'Other users can subscribe to this task and receive change notifications',
    enableMonitoring: 'Enable monitoring',
    enableMonitoringHelper: 'Start monitoring this page immediately',
    cancel: 'Cancel',
    updateTask: 'Update task',
    submitCreateTask: 'Create task',
    loadTasksError: 'Failed to load monitor tasks',
    selectEmailBeforeCreate: 'Please select an email configuration before creating the task. If you do not have one yet, add it in the email configuration page first.',
    deleteConfirm: 'Are you sure you want to delete this monitor task?',
    testSuccess: 'Test succeeded!',
    contentLabel: 'Content',
    testFailed: 'Test failed',
    blacklistAlertTitle: '⚠️ Blacklist restriction',
    blacklistAlertBody: 'This domain is blocked by the admin blacklist, so regular users cannot monitor it.\n\nIf you need to monitor it, ask an admin to remove the domain from the blacklist.',
    createFailed: 'Failed to create monitor task',
    updateFailed: 'Failed to update monitor task',
  };

  const queryClient = useQueryClient();

  const getReadableError = (error) => {
    const errorDetail = error.response?.data?.detail;

    if (typeof errorDetail === 'string') {
      return errorDetail;
    }

    if (typeof errorDetail === 'object' && errorDetail !== null) {
      return JSON.stringify(errorDetail);
    }

    if (error.message) {
      return error.message;
    }

    return t('common.unknownError');
  };

  const getEmailConfigName = (task) => {
    if (!task || !task.email_config_id) {
      return content.notSet;
    }
    const config = emailConfigs.find((item) => item.id === task.email_config_id);
    return config ? config.name : content.unknownConfig;
  };

  const { data: tasks = [], error } = useQuery({
    queryKey: ['monitor-tasks'],
    queryFn: async () => {
      const response = await axios.get('/api/monitor-tasks');
      return response.data;
    },
  });

  const { data: emailConfigs = [] } = useQuery({
    queryKey: ['emailConfigs'],
    queryFn: async () => {
      const response = await axios.get('/api/email-configs/simple-list');
      return response.data;
    },
  });

  // v5 dropped `onSuccess` on queries: preselect the only config the same way, from data.
  useEffect(() => {
    if (emailConfigs.length !== 1 || editingTask || formData.email_config_id) {
      return;
    }
    setFormData((prev) => ({ ...prev, email_config_id: emailConfigs[0].id }));
  }, [emailConfigs, editingTask, formData.email_config_id]);

  const showBlacklistAlert = () => {
    window.alert(`${content.blacklistAlertTitle}\n\n${content.blacklistAlertBody}`);
  };

  const createMutation = useMutation({
    mutationFn: async (taskData) => {
      const response = await axios.post('/api/monitor-tasks', taskData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitor-tasks'] });
      handleClose();
    },
    onError: (errorValue) => {
      if (errorValue.response?.status === 403 && errorValue.response?.data?.detail?.includes('黑名单')) {
        showBlacklistAlert();
        return;
      }

      window.alert(`${content.createFailed}: ${getReadableError(errorValue)}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, taskData }) => {
      const response = await axios.put(`/api/monitor-tasks/${id}`, taskData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitor-tasks'] });
      handleClose();
    },
    onError: (errorValue) => {
      if (errorValue.response?.status === 403 && errorValue.response?.data?.detail?.includes('黑名单')) {
        showBlacklistAlert();
        return;
      }

      window.alert(`${content.updateFailed}: ${getReadableError(errorValue)}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await axios.delete(`/api/monitor-tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitor-tasks'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (id) => {
      const response = await axios.post(`/api/monitor-tasks/${id}/test`);
      return response.data;
    },
  });

  const handleOpen = (task = null) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        name: task.name,
        url: task.url,
        xpath: task.xpath,
        interval: task.interval,
        is_active: task.is_active,
        is_public: task.is_public || false,
        description: task.description || '',
        email_config_id: task.email_config_id || '',
      });
    } else {
      setEditingTask(null);
      setFormData({
        name: '',
        url: '',
        xpath: '',
        interval: 300,
        is_active: true,
        is_public: false,
        description: '',
        email_config_id: emailConfigs.length === 1 ? emailConfigs[0].id : '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingTask(null);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formData.email_config_id) {
      window.alert(content.selectEmailBeforeCreate);
      return;
    }

    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, taskData: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm(content.deleteConfirm)) {
      deleteMutation.mutate(id);
    }
  };

  const handleTest = (id) => {
    testMutation.mutate(id, {
      onSuccess: (data) => {
        window.alert(`${content.testSuccess}\n${content.contentLabel}: ${data.content?.substring(0, 100) || ''}...`);
      },
      onError: (errorValue) => {
        window.alert(`${content.testFailed}: ${getReadableError(errorValue)}`);
      },
    });
  };

  if (error) {
    return <Alert severity="error">{content.loadTasksError}: {error.message}</Alert>;
  }

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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
          sx={{
            background: 'linear-gradient(45deg, #10b981 30%, #059669 90%)',
            py: 1.5,
            px: 3,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #059669 30%, #047857 90%)',
              boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
              transform: 'translateY(-2px)',
            },
          }}
        >
          {content.createTask}
        </Button>
      </Box>

      {!user?.is_admin && (
        <Card sx={{ mb: 4, backgroundColor: alpha('#ef4444', 0.04), border: `1px solid ${alpha('#ef4444', 0.12)}` }}>
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <WebMonitorLogo size={20} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#ef4444' }}>
                {content.blacklistTitle}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ ml: 5, color: 'text.secondary' }}>
              • {content.blacklistItem1}
            </Typography>
            <Typography variant="body2" sx={{ ml: 5, color: 'text.secondary' }}>
              • {content.blacklistItem2}
            </Typography>
            <Typography variant="body2" sx={{ ml: 5, color: 'text.secondary' }}>
              • {content.blacklistItem3}
            </Typography>
          </CardContent>
        </Card>
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
                background: 'linear-gradient(90deg, #10b981 0%, rgba(16, 185, 129, 0.6) 100%)',
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(16, 185, 129, 0.1)',
                    width: 48,
                    height: 48,
                  }}
                >
                  <WebMonitorLogo size={28} />
                </Avatar>
              </Box>
              <Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
                  {tasks.length}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {content.totalTasks}
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
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(34, 211, 238, 0.1)',
                    color: '#22d3ee',
                    width: 48,
                    height: 48,
                  }}
                >
                  <SuccessIcon />
                </Avatar>
              </Box>
              <Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
                  {tasks.filter((task) => task.is_active).length}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {content.activeTasks}
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
                  <PauseIcon />
                </Avatar>
              </Box>
              <Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
                  {tasks.filter((task) => !task.is_active).length}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {content.pausedTasks}
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
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(167, 139, 250, 0.1)',
                    color: '#a78bfa',
                    width: 48,
                    height: 48,
                  }}
                >
                  <NotificationsIcon />
                </Avatar>
              </Box>
              <Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
                  {tasks.filter((task) => task.email_config_id).length}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {content.emailNotifications}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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
                bgcolor: 'rgba(16, 185, 129, 0.1)',
                width: 80,
                height: 80,
                mx: 'auto',
                mb: 2,
              }}
            >
              <WebMonitorLogo size={48} />
            </Avatar>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {content.noTasks}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              {content.noTasksSubtitle}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpen()}
              sx={{
                background: 'linear-gradient(45deg, #10b981 30%, #059669 90%)',
                textTransform: 'none',
                fontWeight: 'bold',
              }}
            >
              {content.createFirstTask}
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
                  <TableCell sx={{ fontWeight: 600 }}>{content.taskInfo}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.monitorConfig}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.interval}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.emailConfig}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.status}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.actions}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {tasks.map((task) => (
                  <TableRow
                    key={task.id}
                    sx={{
                      '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.03)' },
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
                            background: task.is_active
                              ? 'linear-gradient(45deg, #10b981 30%, #059669 90%)'
                              : 'linear-gradient(45deg, #ef4444 30%, #dc2626 90%)',
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
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {task.xpath ? `${task.xpath.substring(0, 50)}...` : content.notSet}
                      </Typography>
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
                      <Chip
                        size="small"
                        label={getEmailConfigName(task)}
                        color={task.email_config_id ? 'primary' : 'default'}
                        variant={task.email_config_id ? 'filled' : 'outlined'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={task.is_active ? <SuccessIcon /> : <PauseIcon />}
                        label={task.is_active ? content.running : content.paused}
                        color={task.is_active ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title={content.testMonitor}>
                          <IconButton
                            size="small"
                            onClick={() => handleTest(task.id)}
                            sx={{
                              color: '#10b981',
                              '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
                            }}
                          >
                            <TestIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={content.editTask}>
                          <IconButton
                            size="small"
                            onClick={() => handleOpen(task)}
                            sx={{
                              color: '#2563eb',
                              '&:hover': { backgroundColor: 'rgba(37, 99, 235, 0.1)' },
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={content.deleteTask}>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(task.id)}
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

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 4,
              border: '1px solid rgba(0, 0, 0, 0.06)',
            },
          },
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(45deg, #10b981 30%, #059669 90%)',
            color: 'white',
            py: 3,
            '& .MuiTypography-root': {
              fontWeight: 700,
            },
          }}
        >
          {editingTask ? content.editDialogTitle : content.createDialogTitle}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ pt: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={content.taskName}
                  fullWidth
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'rgba(16, 185, 129, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#10b981',
                        borderWidth: 2,
                      },
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={content.monitorUrl}
                  fullWidth
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  required
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'rgba(16, 185, 129, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#10b981',
                        borderWidth: 2,
                      },
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={content.xpathSelector}
                  fullWidth
                  value={formData.xpath}
                  onChange={(e) => setFormData({ ...formData, xpath: e.target.value })}
                  helperText={content.xpathHelper}
                  required
                  rows={1}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'rgba(16, 185, 129, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#10b981',
                        borderWidth: 2,
                      },
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label={content.intervalSeconds}
                  type="number"
                  fullWidth
                  value={formData.interval}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      interval: parseInt(e.target.value, 10) || 300,
                    })
                  }
                  slotProps={{ htmlInput: { min: 10 } }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'rgba(16, 185, 129, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#10b981',
                        borderWidth: 2,
                      },
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth required>
                  <InputLabel id="email-config-label">{content.emailConfigRequired}</InputLabel>
                  <Select
                    labelId="email-config-label"
                    value={formData.email_config_id}
                    label={content.emailConfigRequired}
                    onChange={(e) => setFormData({ ...formData, email_config_id: e.target.value })}
                    required
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&:hover fieldset': {
                          borderColor: 'rgba(16, 185, 129, 0.5)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#10b981',
                          borderWidth: 2,
                        },
                      },
                    }}
                  >
                    {emailConfigs.length === 0 ? (
                      <MenuItem disabled value="">
                        <em>{content.noEmailConfigOption}</em>
                      </MenuItem>
                    ) : (
                      emailConfigs.map((config) => (
                        <MenuItem key={config.id} value={config.id}>
                          {config.name} ({config.smtp_user} → {config.receiver_email})
                        </MenuItem>
                      ))
                    )}
                  </Select>
                  {emailConfigs.length === 0 && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                      {content.addEmailConfigHint}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={content.taskDescription}
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  helperText={content.taskDescriptionHelper}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'rgba(16, 185, 129, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#10b981',
                        borderWidth: 2,
                      },
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderRadius: 2, backgroundColor: 'rgba(59, 130, 246, 0.05)' }}>
                  <Switch
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    sx={{
                      '& .MuiSwitch-thumb': {
                        backgroundColor: formData.is_public ? '#3b82f6' : 'default',
                      },
                      '& .MuiSwitch-track': {
                        backgroundColor: formData.is_public ? 'rgba(59, 130, 246, 0.5)' : 'default',
                      },
                    }}
                  />
                  <Box sx={{ ml: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {content.publicTask}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {content.publicTaskHelper}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderRadius: 2, backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    sx={{
                      '& .MuiSwitch-thumb': {
                        backgroundColor: formData.is_active ? '#10b981' : 'default',
                      },
                      '& .MuiSwitch-track': {
                        backgroundColor: formData.is_active ? 'rgba(16, 185, 129, 0.5)' : 'default',
                      },
                    }}
                  />
                  <Box sx={{ ml: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {content.enableMonitoring}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {content.enableMonitoringHelper}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button
              onClick={handleClose}
              sx={{
                px: 3,
                borderRadius: 2,
                '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.04)' },
              }}
            >
              {content.cancel}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
              sx={{
                background: 'linear-gradient(45deg, #10b981 30%, #059669 90%)',
                px: 4,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 'bold',
                boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #059669 30%, #047857 90%)',
                  boxShadow: '0 6px 20px rgba(16, 185, 129, 0.4)',
                },
              }}
            >
              {editingTask ? content.updateTask : content.submitCreateTask}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <Box
        sx={{
          mt: 4,
          p: 3,
          textAlign: 'center',
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
          {t('common.footerCta')}
        </Typography>
        <FooterLinks accent="#10b981" />
      </Box>
    </Box>
  );
};

export default MonitorTasks;
