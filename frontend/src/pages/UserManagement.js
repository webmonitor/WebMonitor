import React, { useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  IconButton,
  Alert,
  Chip,
  Switch,
  Avatar,
  Tooltip,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Security as SecurityIcon,
  People as PeopleIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Email as EmailIcon,
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
import { UI_COLORS } from '../theme/tokens';

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
          <Button
            variant="contained"
            disableElevation
            startIcon={<AddIcon />}
            onClick={() => handleOpen()}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
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
            icon: <PeopleIcon />,
            color: UI_COLORS.primary,
          },
          {
            key: 'active',
            title: t('users.activeUsers'),
            value: users.filter((user) => user.is_active).length,
            icon: <SuccessIcon />,
            color: UI_COLORS.info,
          },
          {
            key: 'admins',
            title: t('users.admins'),
            value: users.filter((user) => user.is_admin).length,
            icon: <AdminIcon />,
            color: UI_COLORS.warning,
          },
          {
            key: 'inactive',
            title: t('users.disabledUsers'),
            value: users.filter((user) => !user.is_active).length,
            icon: <SecurityIcon />,
            color: UI_COLORS.accent,
          },
        ]}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        {t('users.guideText')}
      </Alert>

      <SectionCard title={t('users.listTitle')} bareBody>
        {users.length === 0 ? (
          <EmptyState
            icon={<PeopleIcon />}
            title={t('users.noUsers')}
            subtitle={t('users.noUsersSubtitle')}
            action={
              <Button
                variant="contained"
                disableElevation
                startIcon={<AddIcon />}
                onClick={() => handleOpen()}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                {t('users.createFirstUser')}
              </Button>
            }
          />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(167, 139, 250, 0.05)' }}>
                  <TableCell sx={{ fontWeight: 600 }}>{t('users.userInfo')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('users.emailAddress')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('users.rolePermission')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('users.subscriptionLimit')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('users.accountStatus')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('users.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow
                    key={user.id}
                    sx={{
                      '&:hover': { backgroundColor: 'rgba(167, 139, 250, 0.03)' },
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
                            bgcolor: user.is_admin ? UI_COLORS.warning : UI_COLORS.accent,
                            fontSize: '1rem',
                          }}
                        >
                          {user.is_admin ? <AdminIcon /> : <PersonIcon />}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {user.username}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {user.full_name || t('users.fullNameNotSet')}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <EmailIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                        <Typography variant="body2">
                          {user.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={user.is_admin ? <AdminIcon /> : <PersonIcon />}
                        label={user.is_admin ? t('users.admin') : t('users.regularUser')}
                        color={user.is_admin ? 'warning' : 'primary'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={`${user.max_subscriptions || 10} ${t('users.subscriptionUnit')}`.trim()}
                        color="info"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={user.is_active ? <SuccessIcon /> : <ErrorIcon />}
                        label={user.is_active ? t('users.enabled') : t('users.disabled')}
                        color={user.is_active ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title={t('users.editUser')}>
                          <IconButton
                            size="small"
                            onClick={() => handleOpen(user)}
                            sx={{
                              color: '#a78bfa',
                              '&:hover': { backgroundColor: 'rgba(167, 139, 250, 0.1)' },
                            }}
                          >
                            <EditIcon />
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
                              onClick={() => handleDelete(user)}
                              disabled={currentUser?.id === user.id}
                              sx={{
                                color: '#ef4444',
                                '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                                '&:disabled': { color: 'rgba(0, 0, 0, 0.3)' },
                              }}
                            >
                              <DeleteIcon />
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
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {editingUser ? <EditIcon color="primary" /> : <AddIcon color="primary" />}
          <Box>
            <Typography variant="h6" component="div">
              {editingUser ? t('users.editDialogTitle') : t('users.createDialogTitle')}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {editingUser ? t('users.editDialogSubtitle') : t('users.createDialogSubtitle')}
            </Typography>
          </Box>
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
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PersonIcon sx={{ color: 'rgba(0, 0, 0, 0.6)' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'rgba(167, 139, 250, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#a78bfa',
                        borderWidth: 2,
                      },
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={t('users.fullName')}
                  fullWidth
                  value={formData.full_name}
                  onChange={(event) => setFormData({ ...formData, full_name: event.target.value })}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <PeopleIcon sx={{ color: 'rgba(0, 0, 0, 0.6)' }} />
                        </InputAdornment>
                      ),
                    },
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'rgba(167, 139, 250, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#a78bfa',
                        borderWidth: 2,
                      },
                    },
                  }}
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
                        borderColor: 'rgba(167, 139, 250, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#a78bfa',
                        borderWidth: 2,
                      },
                    },
                  }}
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
                        borderColor: 'rgba(167, 139, 250, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#a78bfa',
                        borderWidth: 2,
                      },
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
                  onChange={(event) => setFormData({ ...formData, max_subscriptions: parseInt(event.target.value, 10) || 10 })}
                  slotProps={{ htmlInput: { min: 1, max: 100 } }}
                  helperText={t('users.maxSubscriptionsHelper')}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      '&:hover fieldset': {
                        borderColor: 'rgba(167, 139, 250, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#a78bfa',
                        borderWidth: 2,
                      },
                    },
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderRadius: 2, backgroundColor: 'rgba(245, 158, 11, 0.05)' }}>
                  <Switch
                    checked={formData.is_admin}
                    onChange={(event) => setFormData({ ...formData, is_admin: event.target.checked })}
                    sx={{
                      '& .MuiSwitch-thumb': {
                        backgroundColor: formData.is_admin ? '#f59e0b' : 'default',
                      },
                      '& .MuiSwitch-track': {
                        backgroundColor: formData.is_admin ? 'rgba(245, 158, 11, 0.5)' : 'default',
                      },
                    }}
                  />
                  <Box sx={{ ml: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {t('users.adminPermission')}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {t('users.adminPermissionHelper')}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderRadius: 2, backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
                  <Switch
                    checked={formData.is_active}
                    onChange={(event) => setFormData({ ...formData, is_active: event.target.checked })}
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
                      {t('users.activeAccount')}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {t('users.activeAccountHelper')}
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
              disableElevation
              disabled={createMutation.isPending || updateMutation.isPending}
              sx={{ textTransform: 'none', borderRadius: 2 }}
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
