import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
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
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import api, { getApiErrorMessage } from '../api/client';
import { keys } from '../api/queryKeys';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import StatGrid from '../components/StatGrid';
import StatusBadge from '../components/StatusBadge';
import { UI_FONTS } from '../theme/tokens';

// 配额是读数：等宽 + 等宽数字，和仪表盘上的指标同一套排版。
const monoReading = {
  fontFamily: UI_FONTS.mono,
  fontVariantNumeric: 'tabular-nums',
  fontSize: 13,
  color: 'text.primary',
  letterSpacing: 0,
};

const UserManagement = () => {
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    full_name: '',
    password: '',
    is_active: true,
    is_admin: false,
    max_subscriptions: 10,
  });
  const { t } = useTranslation();
  const { user: currentUser, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState({ open: false, message: '', severity: 'success' });
  const [confirmTarget, setConfirmTarget] = useState(null);

  const showFeedback = (message, severity = 'success') => {
    setFeedback({ open: true, message, severity });
  };

  const closeFeedback = () => {
    setFeedback((previous) => ({ ...previous, open: false }));
  };

  const { data: users = [], error } = useQuery({
    queryKey: keys.users(currentUser?.id),
    queryFn: ({ signal }) => api.get('/api/auth/users', { signal }).then((response) => response.data),
    enabled: !!currentUser,
  });

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setEditingUser(null);
    }, 100);
  };

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/api/auth/users', payload).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleClose();
      showFeedback(t('users.createSuccess'));
    },
    onError: (mutationError) => {
      showFeedback(getApiErrorMessage(mutationError, t('common.unknownError')), 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      api.put(`/api/auth/users/${id}`, payload).then((response) => response.data),
    onSuccess: async (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleClose();
      showFeedback(t('users.updateSuccess'));

      // 改的是自己：导航里的角色/名字要立刻跟着变。
      if (variables.id === currentUser?.id) {
        await refreshUser();
      }
    },
    onError: (mutationError) => {
      showFeedback(getApiErrorMessage(mutationError, t('common.unknownError')), 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/auth/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      // 用户级联删除任务/日志/订阅，公开任务与订阅页面要重新取数。
      queryClient.invalidateQueries({ queryKey: ['publicTasks'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['subscriptionInfo'] });
      setConfirmTarget(null);
      showFeedback(t('users.deleteSuccess'));
    },
    onError: (mutationError) => {
      showFeedback(getApiErrorMessage(mutationError, t('common.unknownError')), 'error');
    },
  });

  const handleOpen = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        full_name: user.full_name || '',
        password: '',
        is_active: user.is_active,
        is_admin: user.is_admin,
        max_subscriptions: user.max_subscriptions || 10,
      });
    } else {
      setEditingUser(null);
      setFormData({
        username: '',
        email: '',
        full_name: '',
        password: '',
        is_active: true,
        is_admin: false,
        max_subscriptions: 10,
      });
    }
    setOpen(true);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (editingUser) {
      const payload = { ...formData };

      // 留空表示保留原密码：直接把字段省掉，后端就不会动密码。
      if (!payload.password) {
        delete payload.password;
      }

      Object.keys(payload).forEach((key) => {
        if (payload[key] === null || payload[key] === undefined || payload[key] === '') {
          if (key !== 'password') {
            delete payload[key];
          }
        }
      });

      updateMutation.mutate({ id: editingUser.id, payload });
      return;
    }

    createMutation.mutate(formData);
  };

  const handleDelete = (user) => {
    setConfirmTarget(user);
  };

  const handleCloseConfirm = () => {
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

  if (error) {
    return (
      <Alert severity="error">
        {t('users.loadFailed')}: {getApiErrorMessage(error, t('common.unknownError'))}
      </Alert>
    );
  }

  return (
    <Box>
      <PageHeader
        title={t('users.title')}
        subtitle={t('users.subtitle')}
        action={
          <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: 18 }} />} onClick={() => handleOpen()}>
            {t('users.createUser')}
          </Button>
        }
      />

      <StatGrid
        items={[
          {
            key: 'total',
            title: t('users.totalUsers'),
            value: users.length,
          },
          {
            key: 'active',
            title: t('users.activeUsers'),
            value: users.filter((user) => user.is_active).length,
          },
          {
            key: 'admins',
            title: t('users.admins'),
            value: users.filter((user) => user.is_admin).length,
          },
          {
            key: 'inactive',
            title: t('users.disabledUsers'),
            value: users.filter((user) => !user.is_active).length,
          },
        ]}
      />

      <Box sx={{ mb: 4 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('users.guideText')}
        </Typography>
      </Box>

      <SectionCard title={t('users.listTitle')} bareBody>
        {users.length === 0 ? (
          <EmptyState
            icon={<PeopleIcon />}
            title={t('users.noUsers')}
            subtitle={t('users.noUsersSubtitle')}
            action={<Button onClick={() => handleOpen()}>{t('users.createFirstUser')}</Button>}
          />
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 920 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('users.userInfo')}</TableCell>
                  <TableCell>{t('users.emailAddress')}</TableCell>
                  <TableCell>{t('users.rolePermission')}</TableCell>
                  <TableCell>{t('users.subscriptionLimit')}</TableCell>
                  <TableCell>{t('users.accountStatus')}</TableCell>
                  <TableCell align="right">{t('users.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {user.username}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}
                      >
                        {user.full_name || t('users.fullNameNotSet')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {user.email}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography
                        variant="body2"
                        sx={{
                          fontWeight: user.is_admin ? 500 : 400,
                          color: user.is_admin ? 'text.primary' : 'text.secondary',
                        }}
                      >
                        {user.is_admin ? t('users.admin') : t('users.regularUser')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                        <Typography sx={monoReading}>{user.max_subscriptions || 10}</Typography>
                        {t('users.subscriptionUnit') && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {t('users.subscriptionUnit')}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        tone={user.is_active ? 'positive' : 'neutral'}
                        label={user.is_active ? t('users.enabled') : t('users.disabled')}
                      />
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
                        <Tooltip title={t('users.editUser')}>
                          <IconButton
                            size="small"
                            aria-label={t('users.editUser')}
                            onClick={() => handleOpen(user)}
                          >
                            <EditIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip
                          title={
                            currentUser?.id === user.id
                              ? t('users.cannotDeleteSelf')
                              : t('users.deleteUser')
                          }
                        >
                          <span>
                            <IconButton
                              size="small"
                              aria-label={t('users.deleteUser')}
                              onClick={() => handleDelete(user)}
                              disabled={currentUser?.id === user.id}
                            >
                              <DeleteIcon sx={{ fontSize: 18 }} />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </SectionCard>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        disableEnforceFocus
      >
        <DialogTitle sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography component="span" variant="h6">
            {editingUser ? t('users.editDialogTitle') : t('users.createDialogTitle')}
          </Typography>
          <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
            {editingUser ? t('users.editDialogSubtitle') : t('users.createDialogSubtitle')}
          </Typography>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ pt: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('users.username')}
                  fullWidth
                  value={formData.username}
                  onChange={(event) => setFormData({ ...formData, username: event.target.value })}
                  required
                  disabled={!!editingUser}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('users.fullName')}
                  fullWidth
                  value={formData.full_name}
                  onChange={(event) => setFormData({ ...formData, full_name: event.target.value })}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('users.emailAddress')}
                  fullWidth
                  type="email"
                  value={formData.email}
                  onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('users.password')}
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  value={formData.password}
                  onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                  required={!editingUser}
                  helperText={editingUser ? t('users.passwordHelperEdit') : t('users.passwordHelperCreate')}
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
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
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  label={t('users.maxSubscriptions')}
                  type="number"
                  fullWidth
                  value={formData.max_subscriptions}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      max_subscriptions: parseInt(event.target.value, 10) || 10,
                    })
                  }
                  slotProps={{ htmlInput: { min: 1, max: 100 } }}
                  helperText={t('users.maxSubscriptionsHelper')}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControlLabel
                  sx={{ alignItems: 'flex-start', m: 0, minHeight: 36 }}
                  control={
                    <Switch
                      checked={formData.is_admin}
                      onChange={(event) =>
                        setFormData({ ...formData, is_admin: event.target.checked })
                      }
                      slotProps={{ input: { 'aria-label': t('users.adminPermission') } }}
                    />
                  }
                  label={
                    <Box sx={{ ml: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {t('users.adminPermission')}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {t('users.adminPermissionHelper')}
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControlLabel
                  sx={{ alignItems: 'flex-start', m: 0, minHeight: 36 }}
                  control={
                    <Switch
                      checked={formData.is_active}
                      onChange={(event) =>
                        setFormData({ ...formData, is_active: event.target.checked })
                      }
                      slotProps={{ input: { 'aria-label': t('users.activeAccount') } }}
                    />
                  }
                  label={
                    <Box sx={{ ml: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {t('users.activeAccount')}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {t('users.activeAccountHelper')}
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>{t('common.cancel')}</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingUser ? t('users.updateUser') : t('users.createUserAction')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      <ConfirmDialog
        open={!!confirmTarget}
        title={t('users.deleteConfirmTitle')}
        message={t('users.deleteConfirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        pending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onClose={handleCloseConfirm}
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

export default UserManagement;
