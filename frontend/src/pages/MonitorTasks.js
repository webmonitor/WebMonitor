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

import api, { getApiErrorMessage } from '../api/client';
import { keys, EMAIL_CONFIG_SIMPLE } from '../api/queryKeys';
import { useAuth } from '../contexts/AuthContext';
import WebMonitorLogo from '../components/WebMonitorLogo';
import FooterLinks from '../components/FooterLinks';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import ConfirmDialog from '../components/ConfirmDialog';

const emptyForm = {
  name: '',
  url: '',
  xpath: '',
  interval: 300,
  is_active: true,
  is_public: false,
  description: '',
  email_config_id: '',
};

const MonitorTasks = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [dialogAlert, setDialogAlert] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });

  const showFeedback = (message, severity = 'success') =>
    setFeedback({ open: true, message, severity });

  const closeFeedback = () => setFeedback((prev) => ({ ...prev, open: false }));

  const queryClient = useQueryClient();

  const { data: tasks = [], error } = useQuery({
    queryKey: keys.tasks(user?.id),
    queryFn: ({ signal }) => api.get('/api/monitor-tasks', { signal }).then((response) => response.data),
    enabled: !!user,
  });

  const { data: emailConfigs = [] } = useQuery({
    queryKey: keys.emailConfigs(user?.id, EMAIL_CONFIG_SIMPLE),
    queryFn: ({ signal }) =>
      api.get('/api/email-configs/simple-list', { signal }).then((response) => response.data),
    enabled: !!user,
  });

  const getEmailConfigName = (task) => {
    if (!task || !task.email_config_id) {
      return t('tasks.notSet');
    }
    const config = emailConfigs.find((item) => item.id === task.email_config_id);
    return config ? config.name : t('tasks.unknownConfig');
  };

  // v5 dropped `onSuccess` on queries: preselect the only config from data.
  useEffect(() => {
    if (emailConfigs.length !== 1 || editingTask || formData.email_config_id) {
      return;
    }
    setFormData((prev) => ({ ...prev, email_config_id: emailConfigs[0].id }));
  }, [emailConfigs, editingTask, formData.email_config_id]);

  const invalidateTaskData = () => {
    ['tasks', 'logs', 'publicTasks', 'subscriptions', 'subscriptionInfo'].forEach((key) => {
      queryClient.invalidateQueries({ queryKey: [key] });
    });
  };

  const blacklistDetail = (errorValue) => {
    const detail = errorValue?.response?.data?.detail;

    if (errorValue?.response?.status !== 403 || typeof detail !== 'string' || !detail.trim()) {
      return null;
    }

    return detail;
  };

  const handleMutationError = (errorValue, failureKey) => {
    const detail = blacklistDetail(errorValue);

    if (detail) {
      setDialogAlert({ title: t('tasks.blacklistAlertTitle'), message: detail });
      return;
    }

    showFeedback(
      `${t(failureKey)}: ${getApiErrorMessage(errorValue, t('common.unknownError'))}`,
      'error',
    );
  };

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/api/monitor-tasks', payload).then((response) => response.data),
    onSuccess: () => {
      invalidateTaskData();
      handleClose();
      showFeedback(t('tasks.created'));
    },
    onError: (errorValue) => handleMutationError(errorValue, 'tasks.createFailed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      api.put(`/api/monitor-tasks/${id}`, payload).then((response) => response.data),
    onSuccess: () => {
      invalidateTaskData();
      handleClose();
      showFeedback(t('tasks.updated'));
    },
    onError: (errorValue) => handleMutationError(errorValue, 'tasks.updateFailed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/monitor-tasks/${id}`).then((response) => response.data),
    onSuccess: () => {
      invalidateTaskData();
      setConfirmTarget(null);
      showFeedback(t('tasks.deleteSuccess'));
    },
    onError: (errorValue) => {
      showFeedback(
        `${t('tasks.deleteFailed')}: ${getApiErrorMessage(errorValue, t('common.unknownError'))}`,
        'error',
      );
    },
  });

  const testMutation = useMutation({
    mutationFn: (id) =>
      api.post(`/api/monitor-tasks/${id}/test`).then((response) => response.data),
    onSuccess: (data) => {
      const preview = data?.content ? data.content.substring(0, 100) : '';
      showFeedback(`${t('tasks.testSuccess')} ${t('tasks.contentLabel')}: ${preview}...`);
    },
    onError: (errorValue) => {
      showFeedback(getApiErrorMessage(errorValue, t('tasks.testFailed')), 'error');
    },
  });

  const handleOpen = (task = null) => {
    setDialogAlert(null);
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
        ...emptyForm,
        email_config_id: emailConfigs.length === 1 ? emailConfigs[0].id : '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingTask(null);
    setDialogAlert(null);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formData.email_config_id) {
      setDialogAlert({ title: null, message: t('tasks.selectEmailBeforeCreate') });
      return;
    }

    setDialogAlert(null);

    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, payload: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    setConfirmTarget(id);
  };

  const handleTest = (id) => {
    testMutation.mutate(id);
  };

  if (error) {
    return (
      <Alert severity="error">
        {t('tasks.loadTasksError')}: {getApiErrorMessage(error, t('common.unknownError'))}
      </Alert>
    );
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
            {t('tasks.title')}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            {t('tasks.subtitle')}
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
          {t('tasks.createTask')}
        </Button>
      </Box>

      {!user?.is_admin && (
        <Card sx={{ mb: 4, backgroundColor: alpha('#ef4444', 0.04), border: `1px solid ${alpha('#ef4444', 0.12)}` }}>
          <CardContent sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <WebMonitorLogo size={20} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#ef4444' }}>
                {t('tasks.blacklistTitle')}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ ml: 5, color: 'text.secondary' }}>
              • {t('tasks.blacklistItem1')}
            </Typography>
            <Typography variant="body2" sx={{ ml: 5, color: 'text.secondary' }}>
              • {t('tasks.blacklistItem2')}
            </Typography>
            <Typography variant="body2" sx={{ ml: 5, color: 'text.secondary' }}>
              • {t('tasks.blacklistItem3')}
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
                  {t('tasks.totalTasks')}
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
                  {t('tasks.activeTasks')}
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
                  {t('tasks.pausedTasks')}
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
                  {t('tasks.emailNotifications')}
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
            {t('tasks.taskList')}
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
              {t('tasks.noTasks')}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              {t('tasks.noTasksSubtitle')}
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
              {t('tasks.createFirstTask')}
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
                  <TableCell sx={{ fontWeight: 600 }}>{t('tasks.taskInfo')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('tasks.monitorConfig')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('tasks.interval')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('tasks.emailConfig')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('tasks.status')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('tasks.actions')}</TableCell>
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
                        {task.xpath ? `${task.xpath.substring(0, 50)}...` : t('tasks.notSet')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ScheduleIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {task.interval}{t('tasks.seconds')}
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
                        label={task.is_active ? t('tasks.running') : t('tasks.paused')}
                        color={task.is_active ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title={t('tasks.testMonitor')}>
                          <IconButton
                            size="small"
                            onClick={() => handleTest(task.id)}
                            disabled={testMutation.isPending}
                            sx={{
                              color: '#10b981',
                              '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
                            }}
                          >
                            <TestIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('tasks.editTask')}>
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
                        <Tooltip title={t('tasks.deleteTask')}>
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
          {editingTask ? t('tasks.editDialogTitle') : t('tasks.createDialogTitle')}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ pt: 3 }}>
            {dialogAlert && (
              <Alert
                severity="error"
                sx={{ mb: 3 }}
                onClose={() => setDialogAlert(null)}
              >
                {dialogAlert.title && (
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    {dialogAlert.title}
                  </Typography>
                )}
                {dialogAlert.message}
              </Alert>
            )}
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('tasks.taskName')}
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
                  label={t('tasks.monitorUrl')}
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
                  label={t('tasks.xpathSelector')}
                  fullWidth
                  value={formData.xpath}
                  onChange={(e) => setFormData({ ...formData, xpath: e.target.value })}
                  helperText={t('tasks.xpathHelper')}
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
                  label={t('tasks.intervalSeconds')}
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
                  <InputLabel id="email-config-label">{t('tasks.emailConfigRequired')}</InputLabel>
                  <Select
                    labelId="email-config-label"
                    value={formData.email_config_id}
                    label={t('tasks.emailConfigRequired')}
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
                        <em>{t('tasks.noEmailConfigOption')}</em>
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
                      {t('tasks.addEmailConfigHint')}
                    </Typography>
                  )}
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('tasks.taskDescription')}
                  fullWidth
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  helperText={t('tasks.taskDescriptionHelper')}
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
                      {t('tasks.publicTask')}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {t('tasks.publicTaskHelper')}
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
                      {t('tasks.enableMonitoring')}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {t('tasks.enableMonitoringHelper')}
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
              {t('common.cancel')}
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
              {editingTask ? t('tasks.updateTask') : t('tasks.submitCreateTask')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={confirmTarget !== null}
        title={t('tasks.deleteConfirmTitle')}
        message={t('tasks.deleteConfirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        pending={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(confirmTarget)}
        onClose={() => {
          if (!deleteMutation.isPending) {
            setConfirmTarget(null);
          }
        }}
      />

      <FeedbackSnackbar
        open={feedback.open}
        message={feedback.message}
        severity={feedback.severity}
        onClose={closeFeedback}
      />

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
