import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  PlayArrow as TestIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import api, { getApiErrorMessage } from '../api/client';
import { keys, EMAIL_CONFIG_SIMPLE } from '../api/queryKeys';
import { useAuth } from '../contexts/AuthContext';
import WebMonitorLogo from '../components/WebMonitorLogo';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import ConfirmDialog from '../components/ConfirmDialog';
import PageHeader from '../components/PageHeader';
import StatGrid from '../components/StatGrid';
import SectionCard from '../components/SectionCard';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import RecordTable from '../components/RecordTable';
import { formatInterval } from '../utils/duration';
import { UI_COLORS, UI_FONTS, UI_SURFACE } from '../theme/tokens';

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

// 次要信息：URL / XPath 用小号等宽字，安静地待在任务名下面。
const monoQuiet = {
  fontFamily: UI_FONTS.mono,
  fontSize: 11,
  color: UI_COLORS.muted,
  letterSpacing: 0,
  display: 'block',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

// 读数：间隔秒数用等宽字并让数位对齐。
const monoReading = {
  fontFamily: UI_FONTS.mono,
  fontVariantNumeric: 'tabular-nums',
  fontSize: 13,
  letterSpacing: 0,
  color: UI_COLORS.text,
};

const SwitchRow = ({ checked, onChange, title, helper }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
    <Switch checked={checked} onChange={onChange} />
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {title}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
        {helper}
      </Typography>
    </Box>
  </Box>
);

const MonitorTasks = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [dialogAlert, setDialogAlert] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });
  // 用户是否已亲手改过"邮件配置"下拉框
  const emailConfigTouched = useRef(false);

  const showFeedback = (message, severity = 'success') =>
    setFeedback({ open: true, message, severity });

  const closeFeedback = () => setFeedback((prev) => ({ ...prev, open: false }));

  const queryClient = useQueryClient();

  const { data: tasks = [], error, isLoading, refetch } = useQuery({
    queryKey: keys.tasks(user?.id),
    queryFn: ({ signal }) => api.get('/api/monitor-tasks', { signal }).then((response) => response.data),
    enabled: !!user,
  });

  const { data: emailConfigs = [], error: emailConfigsError } = useQuery({
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
  // 只在用户还没动过这个字段时预选——否则选“不发送通知”后会被立刻改回去。
  useEffect(() => {
    if (emailConfigTouched.current || emailConfigs.length !== 1 || editingTask) {
      return;
    }
    if (formData.email_config_id) {
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
    if (errorValue?.response?.status !== 403) {
      return null;
    }

    const detail = getApiErrorMessage(errorValue, '');
    return detail.trim() ? detail : null;
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

  const saving = createMutation.isPending || updateMutation.isPending;

  const handleOpen = (task = null) => {
    setDialogAlert(null);
    emailConfigTouched.current = false;
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
    emailConfigTouched.current = false;
  };

  // 选择器的空字符串必须变成 null：后端只接受 int | null，"" 会 422。
  const toPayload = () => ({
    ...formData,
    email_config_id: formData.email_config_id === '' ? null : formData.email_config_id,
  });

  const handleSubmit = (event) => {
    event.preventDefault();

    // 邮件配置是可选项：留空表示只采集、不发通知。
    setDialogAlert(null);

    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, payload: toPayload() });
    } else {
      createMutation.mutate(toPayload());
    }
  };

  const handleDelete = (id) => {
    setConfirmTarget(id);
  };

  const handleTest = (id) => {
    testMutation.mutate(id);
  };

  return (
    <Box>
      <PageHeader
        title={t('tasks.title')}
        subtitle={t('tasks.subtitle')}
        action={
          <Button
            variant="contained"
            startIcon={<AddIcon sx={{ fontSize: 18 }} />}
            onClick={() => handleOpen()}
          >
            {t('tasks.createTask')}
          </Button>
        }
      />

      {!user?.is_admin && (
        <Box
          sx={{
            border: UI_SURFACE.border,
            borderRadius: 2,
            backgroundColor: UI_SURFACE.card,
            px: 2.5,
            py: 2,
            mb: 3,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {t('tasks.blacklistTitle')}
          </Typography>
          <Stack spacing={0.5} sx={{ mt: 1 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              {t('tasks.blacklistItem1')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              {t('tasks.blacklistItem2')}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              {t('tasks.blacklistItem3')}
            </Typography>
          </Stack>
        </Box>
      )}

      <StatGrid
        items={[
          {
            key: 'total',
            title: t('tasks.totalTasks'),
            value: isLoading || error ? null : tasks.length,
          },
          {
            key: 'active',
            title: t('tasks.activeTasks'),
            value: isLoading || error ? null : tasks.filter((task) => task.is_active).length,
          },
          {
            key: 'paused',
            title: t('tasks.pausedTasks'),
            value: isLoading || error ? null : tasks.filter((task) => !task.is_active).length,
          },
          {
            key: 'email',
            title: t('tasks.emailNotifications'),
            value: isLoading || error ? null : tasks.filter((task) => task.email_config_id).length,
          },
        ]}
      />

      <SectionCard title={t('tasks.taskList')} bareBody>
        <RecordTable
          rows={tasks}
          rowKey={(task) => task.id}
          minWidth={840}
          loading={isLoading}
          error={error}
          errorMessage={`${t('tasks.loadTasksError')}: ${getApiErrorMessage(error, t('common.unknownError'))}`}
          onRetry={refetch}
          ariaLabel={t('tasks.taskList')}
          emptyState={
            <EmptyState
              icon={<WebMonitorLogo size={40} />}
              title={t('tasks.noTasks')}
              subtitle={t('tasks.noTasksSubtitle')}
              action={
                <Button startIcon={<AddIcon sx={{ fontSize: 18 }} />} onClick={() => handleOpen()}>
                  {t('tasks.createFirstTask')}
                </Button>
              }
            />
          }
          columns={[
            {
              id: 'task',
              label: t('tasks.taskInfo'),
              primary: true,
              cellSx: { width: '40%', maxWidth: 360 },
              render: (task) => (
                <>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{task.name}</Typography>
                  <Typography sx={{ ...monoQuiet, mt: 0.5 }}>{task.url}</Typography>
                  <Typography sx={{ ...monoQuiet, mt: 0.5 }}>{task.xpath || t('tasks.notSet')}</Typography>
                </>
              ),
            },
            {
              id: 'interval',
              label: t('tasks.interval'),
              render: (task) => <Typography sx={monoReading}>{formatInterval(task.interval, t)}</Typography>,
            },
            {
              id: 'email',
              label: t('tasks.emailConfig'),
              render: (task) => (
                <Typography variant="body2" sx={{ color: 'text.secondary', wordBreak: 'break-word' }}>
                  {getEmailConfigName(task)}
                </Typography>
              ),
            },
            {
              id: 'status',
              label: t('tasks.status'),
              render: (task) => (
                <StatusBadge
                  tone={task.is_active ? 'positive' : 'neutral'}
                  label={task.is_active ? t('tasks.running') : t('tasks.paused')}
                />
              ),
            },
            {
              id: 'actions',
              label: t('tasks.actions'),
              align: 'right',
              actions: true,
              cellSx: { whiteSpace: 'nowrap' },
              render: (task) => (
                <>
                  <Tooltip title={t('tasks.testMonitor')}>
                    <IconButton
                      size="small"
                      aria-label={t('tasks.testMonitor')}
                      onClick={() => handleTest(task.id)}
                      disabled={testMutation.isPending}
                    >
                      <TestIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('tasks.editTask')}>
                    <IconButton size="small" aria-label={t('tasks.editTask')} onClick={() => handleOpen(task)}>
                      <EditIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={t('tasks.deleteTask')}>
                    <IconButton size="small" aria-label={t('tasks.deleteTask')} onClick={() => handleDelete(task.id)}>
                      <DeleteIcon sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                </>
              ),
            },
          ]}
        />
      </SectionCard>

      <Dialog open={open} onClose={saving ? undefined : handleClose} disableEscapeKeyDown={saving} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTask ? t('tasks.editDialogTitle') : t('tasks.createDialogTitle')}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            {dialogAlert && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setDialogAlert(null)}>
                {dialogAlert.title && (
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {dialogAlert.title}
                  </Typography>
                )}
                {dialogAlert.message}
              </Alert>
            )}
            <Stack spacing={2}>
              <TextField
                label={t('tasks.taskName')}
                fullWidth
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <TextField
                label={t('tasks.monitorUrl')}
                fullWidth
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                required
              />
              <TextField
                label={t('tasks.xpathSelector')}
                fullWidth
                value={formData.xpath}
                onChange={(e) => setFormData({ ...formData, xpath: e.target.value })}
                helperText={t('tasks.xpathHelper')}
                required
              />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
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
                />
                <FormControl fullWidth>
                  <InputLabel id="email-config-label" shrink>
                    {t('tasks.emailConfig')}
                  </InputLabel>
                  <Select
                    labelId="email-config-label"
                    value={formData.email_config_id}
                    label={t('tasks.emailConfig')}
                    displayEmpty
                    onChange={(e) => {
                      emailConfigTouched.current = true;
                      setFormData({ ...formData, email_config_id: e.target.value });
                    }}
                  >
                    <MenuItem value="">{t('tasks.emailConfigNone')}</MenuItem>
                    {emailConfigs.map((config) => (
                      <MenuItem key={config.id} value={config.id}>
                        {config.name} ({config.smtp_user} → {config.receiver_email})
                      </MenuItem>
                    ))}
                  </Select>
                  <Typography
                    variant="caption"
                    sx={{ mt: 0.5, display: 'block', color: 'text.secondary' }}
                  >
                    {emailConfigsError
                      ? getApiErrorMessage(emailConfigsError, t('tasks.emailConfigLoadFailed'))
                      : emailConfigs.length === 0
                        ? t('tasks.addEmailConfigHint')
                        : t('tasks.emailConfigHelper')}
                  </Typography>
                </FormControl>
              </Stack>
              <TextField
                label={t('tasks.taskDescription')}
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                helperText={t('tasks.taskDescriptionHelper')}
              />
              <Box sx={{ borderTop: UI_SURFACE.divider, pt: 2 }}>
                <Stack spacing={1.5}>
                  <SwitchRow
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    title={t('tasks.publicTask')}
                    helper={t('tasks.publicTaskHelper')}
                  />
                  <SwitchRow
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    title={t('tasks.enableMonitoring')}
                    helper={t('tasks.enableMonitoringHelper')}
                  />
                </Stack>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose} disabled={saving}>{t('common.cancel')}</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={saving}
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
    </Box>
  );
};

export default MonitorTasks;
