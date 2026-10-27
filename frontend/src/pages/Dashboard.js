import React from 'react';
import {
  Grid,
  Typography,
  Box,
  Paper,
  List,
  ListItem,
  Chip,
  CircularProgress,
  Divider,
  Avatar,
  alpha,
  IconButton,
  Tooltip,
  Button,
  Container,
} from '@mui/material';
import {
  Assignment as TaskIcon,
  CheckCircle as SuccessIcon,
  AccessTime as TimeIcon,
  TrendingUp as TrendingUpIcon,
  Visibility as VisibilityIcon,
  Refresh as RefreshIcon,
  Schedule as ScheduleIcon,
  NotificationsActive as NotificationsIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

import StatCard from '../components/StatCard';
import FooterLinks from '../components/FooterLinks';
import { formatRelativeTime } from '../utils/date';
import { isChineseLanguage } from '../utils/i18n';

const Dashboard = () => {
  const { t, i18n } = useTranslation();
  const isChinese = isChineseLanguage(i18n.language);

  const content = isChinese ? {
    overview: '监控概览',
    title: '仪表板',
    subtitle: '实时监控您的网页内容变化',
    refresh: '刷新数据',
    totalTasks: '总任务数',
    activeTasks: '活跃任务',
    recentChanges: '最近变化',
    successRate: '成功率',
    allTasks: '所有监控任务',
    runningTasks: '正在运行的任务',
    detectedChanges: '检测到的内容变化',
    executionSuccessRate: '监控执行成功率',
    recentActivity: '最近监控活动',
    viewAll: '查看全部',
    noActivity: '暂无监控活动',
    noActivitySubtitle: '开始创建监控任务后，这里将显示活动记录',
    taskLabel: '任务',
    changed: '内容变化',
    unchanged: '无变化',
    errorPrefix: '错误',
    changeDetected: '检测到内容变化',
    newContentPreview: '新内容预览',
    contentUnchanged: '内容未发生变化',
    quickActions: '快速操作',
    manageTasks: '管理监控任务',
    configureEmail: '配置邮件通知',
    viewLogs: '查看详细日志',
    systemStatus: '系统状态',
    monitorEngine: '监控引擎',
    poweredBy: '基于 Selenium',
    healthy: '正常',
    notificationService: '通知服务',
    emailNotifications: '邮件通知',
    active: '活跃',
    responseTime: '响应时间',
    average: '平均',
    excellent: '优秀',
  } : {
    overview: 'Monitoring overview',
    title: 'Dashboard',
    subtitle: 'Monitor your web content changes in real time.',
    refresh: 'Refresh data',
    totalTasks: 'Total tasks',
    activeTasks: 'Active tasks',
    recentChanges: 'Recent changes',
    successRate: 'Success rate',
    allTasks: 'All monitor tasks',
    runningTasks: 'Running tasks',
    detectedChanges: 'Detected content changes',
    executionSuccessRate: 'Monitoring execution success rate',
    recentActivity: 'Recent monitoring activity',
    viewAll: 'View all',
    noActivity: 'No monitoring activity yet',
    noActivitySubtitle: 'Activity will appear here after you create monitor tasks.',
    taskLabel: 'Task',
    changed: 'Changed',
    unchanged: 'Unchanged',
    errorPrefix: 'Error',
    changeDetected: 'Content change detected',
    newContentPreview: 'New content preview',
    contentUnchanged: 'Content unchanged',
    quickActions: 'Quick actions',
    manageTasks: 'Manage monitor tasks',
    configureEmail: 'Configure email notifications',
    viewLogs: 'View detailed logs',
    systemStatus: 'System status',
    monitorEngine: 'Monitoring engine',
    poweredBy: 'Powered by Selenium',
    healthy: 'Healthy',
    notificationService: 'Notification service',
    emailNotifications: 'Email notifications',
    active: 'Active',
    responseTime: 'Response time',
    average: 'Average',
    excellent: 'Excellent',
  };

  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['monitor-tasks'],
    queryFn: async () => {
      const response = await axios.get('/api/monitor-tasks');
      return response.data;
    },
    refetchInterval: 60000,
  });

  const { data: logs = [], isLoading: logsLoading, refetch: refetchLogs } = useQuery({
    queryKey: ['latest-monitor-logs'],
    queryFn: async () => {
      const response = await axios.get('/api/monitor-logs/latest?limit=10');
      return response.data;
    },
    refetchInterval: 30000,
  });

  const totalTasks = tasks.length;
  const activeTasks = tasks.filter((task) => task.is_active).length;
  const successRate = logs.length > 0
    ? Math.round((logs.filter((log) => !log.error_message).length / logs.length) * 100)
    : 100;
  const recentChanges = logs.filter((log) => log.is_changed).length;
  const averageResponseTime = 1.2;

  const handleRefresh = () => {
    refetchTasks();
    refetchLogs();
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Container maxWidth="xl">
        <Box
          sx={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: 4,
            mb: 4,
            p: { xs: 3, md: 4 },
            position: 'relative',
            overflow: 'hidden',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: `radial-gradient(circle at 25% 25%, ${alpha('#10b981', 0.1)} 0%, transparent 50%),
                        radial-gradient(circle at 75% 75%, ${alpha('#2563eb', 0.1)} 0%, transparent 50%)`,
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography
                  variant="overline"
                  component="div"
                  sx={{
                    color: '#10b981',
                    fontWeight: 'bold',
                    mb: 1,
                    letterSpacing: 2,
                    textTransform: 'uppercase',
                  }}
                >
                  {content.overview}
                </Typography>
                <Typography
                  variant="h3"
                  component="h1"
                  sx={{
                    color: 'white',
                    fontWeight: 800,
                    fontSize: { xs: '2rem', md: '2.5rem' },
                  }}
                >
                  {content.title}
                </Typography>
                <Typography variant="body1" sx={{ color: 'rgba(255, 255, 255, 0.8)', mt: 1 }}>
                  {content.subtitle}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Tooltip title={content.refresh}>
                  <IconButton
                    onClick={handleRefresh}
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      },
                    }}
                  >
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>

            <Grid container spacing={3}>
              <Grid size={{ xs: 6, md: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: '#10b981', fontWeight: 'bold' }}>
                    {totalTasks}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    {content.totalTasks}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: '#22d3ee', fontWeight: 'bold' }}>
                    {activeTasks}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    {content.activeTasks}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: '#a78bfa', fontWeight: 'bold' }}>
                    {recentChanges}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    {content.recentChanges}
                  </Typography>
                </Box>
              </Grid>
              <Grid size={{ xs: 6, md: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ color: '#34d399', fontWeight: 'bold' }}>
                    {successRate}%
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                    {content.successRate}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Box>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title={content.totalTasks}
              value={totalTasks}
              icon={<TaskIcon />}
              color="#10b981"
              subtitle={content.allTasks}
              trend={totalTasks > 0 ? 12 : 0}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title={content.activeTasks}
              value={activeTasks}
              icon={<SuccessIcon />}
              color="#22d3ee"
              subtitle={content.runningTasks}
              trend={activeTasks > 0 ? 8 : 0}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title={content.recentChanges}
              value={recentChanges}
              icon={<TrendingUpIcon />}
              color="#a78bfa"
              subtitle={content.detectedChanges}
              trend={recentChanges > 0 ? 15 : 0}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <StatCard
              title={content.successRate}
              value={`${successRate}%`}
              icon={<SpeedIcon />}
              color="#34d399"
              subtitle={content.executionSuccessRate}
              trend={successRate > 90 ? 5 : 0}
            />
          </Grid>
        </Grid>

        <Grid container spacing={4}>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper
              sx={{
                p: 3,
                height: '100%',
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                borderRadius: 4,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                  {content.recentActivity}
                </Typography>
                <Button
                  size="small"
                  startIcon={<VisibilityIcon />}
                  sx={{
                    color: '#10b981',
                    textTransform: 'none',
                    '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
                  }}
                >
                  {content.viewAll}
                </Button>
              </Box>

              {logsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
                  <CircularProgress sx={{ color: '#10b981' }} />
                </Box>
              ) : logs.length === 0 ? (
                <Box sx={{ textAlign: 'center', p: 6 }}>
                  <Avatar
                    sx={{
                      bgcolor: 'rgba(16, 185, 129, 0.1)',
                      color: '#10b981',
                      width: 64,
                      height: 64,
                      mx: 'auto',
                      mb: 2,
                    }}
                  >
                    <ScheduleIcon sx={{ fontSize: 32 }} />
                  </Avatar>
                  <Typography variant="h6" sx={{ color: '#1a1a1a', mb: 1 }}>
                    {content.noActivity}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {content.noActivitySubtitle}
                  </Typography>
                </Box>
              ) : (
                <List sx={{ p: 0 }}>
                  {logs.map((log, index) => (
                    <React.Fragment key={log.id}>
                      <ListItem
                        sx={{
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          py: 2,
                          px: 0,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            backgroundColor: 'rgba(16, 185, 129, 0.05)',
                            borderRadius: 2,
                          },
                        }}
                      >
                        <Box sx={{ width: '100%', display: 'flex', alignItems: 'center', mb: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 40,
                              height: 40,
                              mr: 2,
                              background: log.is_changed
                                ? 'linear-gradient(45deg, #f59e0b 30%, #d97706 90%)'
                                : 'linear-gradient(45deg, #10b981 30%, #059669 90%)',
                            }}
                          >
                            {log.is_changed ? <TrendingUpIcon /> : <SuccessIcon />}
                          </Avatar>
                          <Box sx={{ flexGrow: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <Chip
                                size="small"
                                label={`${content.taskLabel} #${log.task_id}`}
                                sx={{
                                  backgroundColor: 'rgba(37, 99, 235, 0.1)',
                                  color: '#2563eb',
                                  fontWeight: 'bold',
                                  mr: 1,
                                }}
                              />
                              <Chip
                                size="small"
                                icon={log.is_changed ? <TrendingUpIcon /> : <SuccessIcon />}
                                label={log.is_changed ? content.changed : content.unchanged}
                                color={log.is_changed ? 'warning' : 'success'}
                                sx={{ fontSize: '0.75rem' }}
                              />
                            </Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              <TimeIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                              {formatRelativeTime(log.check_time, i18n.language)}
                            </Typography>
                          </Box>
                        </Box>

                        {log.error_message ? (
                          <Box
                            sx={{
                              p: 2,
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              borderRadius: 2,
                              width: '100%',
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 500, color: 'error.main' }}>
                              {content.errorPrefix}: {log.error_message}
                            </Typography>
                          </Box>
                        ) : log.is_changed && log.new_content ? (
                          <Box
                            sx={{
                              p: 2,
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              borderRadius: 2,
                              width: '100%',
                            }}
                          >
                            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1, color: 'success.main' }}>
                              {content.changeDetected}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {content.newContentPreview}: {log.new_content.substring(0, 150)}
                              {log.new_content.length > 150 ? '...' : ''}
                            </Typography>
                          </Box>
                        ) : (
                          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                            {content.contentUnchanged}
                          </Typography>
                        )}
                      </ListItem>
                      {index < logs.length - 1 && (
                        <Divider sx={{ my: 1, borderColor: 'rgba(0, 0, 0, 0.06)' }} />
                      )}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <Paper
                  sx={{
                    p: 3,
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    borderRadius: 4,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 3 }}>
                    {content.quickActions}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<TaskIcon />}
                      href="/tasks"
                      sx={{
                        background: 'linear-gradient(45deg, #10b981 30%, #059669 90%)',
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 'bold',
                        '&:hover': {
                          background: 'linear-gradient(45deg, #059669 30%, #047857 90%)',
                        },
                      }}
                    >
                      {content.manageTasks}
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<NotificationsIcon />}
                      href="/email-config"
                      sx={{
                        borderColor: '#2563eb',
                        color: '#2563eb',
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 'bold',
                        '&:hover': {
                          borderColor: '#1d4ed8',
                          backgroundColor: 'rgba(37, 99, 235, 0.1)',
                        },
                      }}
                    >
                      {content.configureEmail}
                    </Button>
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<VisibilityIcon />}
                      href="/logs"
                      sx={{
                        borderColor: '#8b5cf6',
                        color: '#8b5cf6',
                        py: 1.5,
                        borderRadius: 2,
                        textTransform: 'none',
                        fontWeight: 'bold',
                        '&:hover': {
                          borderColor: '#7c3aed',
                          backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        },
                      }}
                    >
                      {content.viewLogs}
                    </Button>
                  </Box>
                </Paper>
              </Grid>

              <Grid size={{ xs: 12 }}>
                <Paper
                  sx={{
                    p: 3,
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                    borderRadius: 4,
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a1a', mb: 3 }}>
                    {content.systemStatus}
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            mr: 2,
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            color: '#10b981',
                          }}
                        >
                          <SecurityIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {content.monitorEngine}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {content.poweredBy}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        size="small"
                        label={content.healthy}
                        color="success"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            mr: 2,
                            backgroundColor: 'rgba(34, 211, 238, 0.1)',
                            color: '#22d3ee',
                          }}
                        >
                          <NotificationsIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {content.notificationService}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {content.emailNotifications}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        size="small"
                        label={content.active}
                        color="primary"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            mr: 2,
                            backgroundColor: 'rgba(167, 139, 250, 0.1)',
                            color: '#a78bfa',
                          }}
                        >
                          <SpeedIcon sx={{ fontSize: 18 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {content.responseTime}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {content.average} {averageResponseTime}s
                          </Typography>
                        </Box>
                      </Box>
                      <Chip
                        size="small"
                        label={content.excellent}
                        color="success"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>

      <Box
        sx={{
          py: 3,
          px: 3,
          textAlign: 'center',
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
          backgroundColor: '#ffffff',
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

export default Dashboard;
