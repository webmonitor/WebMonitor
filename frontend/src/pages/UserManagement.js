import React, { useState } from 'react';
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
  IconButton,
  Alert,
  Chip,
  Switch,
  Avatar,
  Tooltip,
  Card,
  CardContent,
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
import axios from 'axios';

import { isChineseLanguage } from '../utils/i18n';
import FooterLinks from '../components/FooterLinks';

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
  const { t, i18n } = useTranslation();
  const isChinese = isChineseLanguage(i18n.language);

  const content = isChinese ? {
    title: '用户管理',
    subtitle: '管理系统用户账户和权限',
    createUser: '创建新用户',
    totalUsers: '总用户数',
    activeUsers: '活跃用户',
    admins: '管理员',
    securityLevel: '安全级别',
    high: '高',
    listTitle: '用户列表',
    guideText: '管理员可以创建、编辑和删除用户账户。注意：不能删除自己的账户。',
    noUsers: '暂无用户',
    noUsersSubtitle: '创建第一个用户开始使用系统',
    createFirstUser: '创建第一个用户',
    userInfo: '用户信息',
    emailAddress: '邮箱地址',
    rolePermission: '角色权限',
    subscriptionLimit: '订阅限制',
    accountStatus: '账户状态',
    actions: '操作',
    fullNameNotSet: '未设置全名',
    admin: '管理员',
    regularUser: '普通用户',
    subscriptionUnit: '个',
    enabled: '启用',
    disabled: '禁用',
    editUser: '编辑用户',
    deleteUser: '删除用户',
    deleteConfirm: '确定要删除这个用户吗？',
    loadFailed: '加载用户列表失败',
    editDialogTitle: '编辑用户',
    createDialogTitle: '创建新用户',
    editDialogSubtitle: '修改用户信息和权限',
    createDialogSubtitle: '添加新的系统用户',
    username: '用户名',
    fullName: '全名',
    password: '密码',
    passwordHelperEdit: '留空则不修改密码',
    passwordHelperCreate: '请设置安全密码',
    maxSubscriptions: '最大订阅数量',
    maxSubscriptionsHelper: '该用户最多可以订阅的公开任务数量',
    adminPermission: '管理员权限',
    adminPermissionHelper: '拥有系统管理权限',
    activeAccount: '启用账户',
    activeAccountHelper: '允许用户登录系统',
    cancel: '取消',
    updateUser: '更新用户',
    createUserAction: '创建用户',
    togglePasswordVisibility: '切换密码可见性',
  } : {
    title: 'User management',
    subtitle: 'Manage user accounts and permissions for the system.',
    createUser: 'Create user',
    totalUsers: 'Total users',
    activeUsers: 'Active users',
    admins: 'Admins',
    securityLevel: 'Security level',
    high: 'High',
    listTitle: 'User list',
    guideText: 'Admins can create, edit, and delete user accounts. Note: you cannot delete your own account.',
    noUsers: 'No users yet',
    noUsersSubtitle: 'Create the first user to get started.',
    createFirstUser: 'Create first user',
    userInfo: 'User info',
    emailAddress: 'Email address',
    rolePermission: 'Role',
    subscriptionLimit: 'Subscription limit',
    accountStatus: 'Account status',
    actions: 'Actions',
    fullNameNotSet: 'Full name not set',
    admin: 'Admin',
    regularUser: 'Regular user',
    subscriptionUnit: '',
    enabled: 'Enabled',
    disabled: 'Disabled',
    editUser: 'Edit user',
    deleteUser: 'Delete user',
    deleteConfirm: 'Are you sure you want to delete this user?',
    loadFailed: 'Failed to load users',
    editDialogTitle: 'Edit user',
    createDialogTitle: 'Create user',
    editDialogSubtitle: 'Update user details and permissions',
    createDialogSubtitle: 'Add a new system user',
    username: 'Username',
    fullName: 'Full name',
    password: 'Password',
    passwordHelperEdit: 'Leave blank to keep the current password',
    passwordHelperCreate: 'Set a secure password',
    maxSubscriptions: 'Max subscriptions',
    maxSubscriptionsHelper: 'Maximum number of public tasks this user can subscribe to',
    adminPermission: 'Admin permission',
    adminPermissionHelper: 'Gives access to system management features',
    activeAccount: 'Active account',
    activeAccountHelper: 'Allows the user to sign in',
    cancel: 'Cancel',
    updateUser: 'Update user',
    createUserAction: 'Create user',
    togglePasswordVisibility: 'Toggle password visibility',
  };

  const queryClient = useQueryClient();

  const { data: users = [], error } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await axios.get('/api/auth/users');
      return response.data;
    },
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await axios.get('/api/auth/me');
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (userData) => {
      const response = await axios.post('/api/auth/register', userData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, userData }) => {
      const response = await axios.put(`/api/auth/users/${id}`, userData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      handleClose();
    },
    onError: (mutationError) => {
      console.error('Update user error:', mutationError.response?.data || mutationError.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await axios.delete(`/api/auth/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
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

  const handleClose = () => {
    setOpen(false);
    setTimeout(() => {
      setEditingUser(null);
    }, 100);
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const cleanFormData = { ...formData };

    if (editingUser && (!cleanFormData.password || cleanFormData.password === '')) {
      delete cleanFormData.password;
    }

    Object.keys(cleanFormData).forEach((key) => {
      if (cleanFormData[key] === null || cleanFormData[key] === undefined || cleanFormData[key] === '') {
        if (key !== 'password') {
          delete cleanFormData[key];
        }
      }
    });

    console.log('Submitting user update:', cleanFormData);

    if (editingUser) {
      updateMutation.mutate({ id: editingUser.id, userData: cleanFormData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm(content.deleteConfirm)) {
      deleteMutation.mutate(id);
    }
  };

  if (error) {
    return <Alert severity="error">{content.loadFailed}: {error.message}</Alert>;
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
            background: 'linear-gradient(45deg, #a78bfa 30%, #8b5cf6 90%)',
            py: 1.5,
            px: 3,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(167, 139, 250, 0.3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #8b5cf6 30%, #7c3aed 90%)',
              boxShadow: '0 6px 20px rgba(167, 139, 250, 0.4)',
              transform: 'translateY(-2px)',
            },
          }}
        >
          {content.createUser}
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              p: 2,
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              borderRadius: 3,
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(167, 139, 250, 0.1)',
                    color: '#a78bfa',
                    mr: 2,
                    width: 48,
                    height: 48,
                  }}
                >
                  <PeopleIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {users.length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {content.totalUsers}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              p: 2,
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              borderRadius: 3,
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(34, 211, 238, 0.1)',
                    color: '#22d3ee',
                    mr: 2,
                    width: 48,
                    height: 48,
                  }}
                >
                  <SuccessIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {users.filter((user) => user.is_active).length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {content.activeUsers}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              p: 2,
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              borderRadius: 3,
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(245, 158, 11, 0.1)',
                    color: '#f59e0b',
                    mr: 2,
                    width: 48,
                    height: 48,
                  }}
                >
                  <AdminIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {users.filter((user) => user.is_admin).length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {content.admins}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card
            sx={{
              p: 2,
              background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              borderRadius: 3,
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(16, 185, 129, 0.1)',
                    color: '#10b981',
                    mr: 2,
                    width: 48,
                    height: 48,
                  }}
                >
                  <SecurityIcon />
                </Avatar>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {content.securityLevel}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {content.high}
                  </Typography>
                </Box>
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
            {content.listTitle}
          </Typography>
        </Box>

        <Box sx={{ p: 3, backgroundColor: 'rgba(167, 139, 250, 0.05)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <SecurityIcon sx={{ mr: 2, color: '#a78bfa' }} />
            <Typography variant="body2">
              {content.guideText}
            </Typography>
          </Box>
        </Box>

        {users.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 8 }}>
            <Avatar
              sx={{
                bgcolor: 'rgba(167, 139, 250, 0.1)',
                color: '#a78bfa',
                width: 80,
                height: 80,
                mx: 'auto',
                mb: 2,
              }}
            >
              <PeopleIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {content.noUsers}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              {content.noUsersSubtitle}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpen()}
              sx={{
                background: 'linear-gradient(45deg, #a78bfa 30%, #8b5cf6 90%)',
                textTransform: 'none',
                fontWeight: 'bold',
              }}
            >
              {content.createFirstUser}
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(167, 139, 250, 0.05)' }}>
                  <TableCell sx={{ fontWeight: 600 }}>{content.userInfo}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.emailAddress}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.rolePermission}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.subscriptionLimit}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.accountStatus}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.actions}</TableCell>
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
                            background: user.is_admin
                              ? 'linear-gradient(45deg, #f59e0b 30%, #d97706 90%)'
                              : 'linear-gradient(45deg, #a78bfa 30%, #8b5cf6 90%)',
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
                            {user.full_name || content.fullNameNotSet}
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
                        label={user.is_admin ? content.admin : content.regularUser}
                        color={user.is_admin ? 'warning' : 'primary'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={isChinese ? `${user.max_subscriptions || 10} ${content.subscriptionUnit}` : `${user.max_subscriptions || 10}`}
                        color="info"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        icon={user.is_active ? <SuccessIcon /> : <ErrorIcon />}
                        label={user.is_active ? content.enabled : content.disabled}
                        color={user.is_active ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title={content.editUser}>
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
                        <Tooltip title={content.deleteUser}>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(user.id)}
                            disabled={currentUser?.username === user.username}
                            sx={{
                              color: '#ef4444',
                              '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
                              '&:disabled': { color: 'rgba(0, 0, 0, 0.3)' },
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
        disableEnforceFocus
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
            background: 'linear-gradient(45deg, #a78bfa 30%, #8b5cf6 90%)',
            color: 'white',
            py: 3,
            '& .MuiTypography-root': {
              fontWeight: 700,
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                mr: 2,
                background: 'rgba(255, 255, 255, 0.2)',
                color: 'white',
              }}
            >
              {editingUser ? <EditIcon /> : <AddIcon />}
            </Avatar>
            <Box>
              <Typography variant="h6" component="span">
                {editingUser ? content.editDialogTitle : content.createDialogTitle}
              </Typography>
              <Typography variant="body2" component="div" sx={{ opacity: 0.9 }}>
                {editingUser ? content.editDialogSubtitle : content.createDialogSubtitle}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ pt: 3 }}>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label={content.username}
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
                  label={content.fullName}
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
                  label={content.emailAddress}
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
                  label={content.password}
                  type={showPassword ? 'text' : 'password'}
                  fullWidth
                  value={formData.password}
                  onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                  required={!editingUser}
                  helperText={editingUser ? content.passwordHelperEdit : content.passwordHelperCreate}
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
                            aria-label={content.togglePasswordVisibility}
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
                  label={content.maxSubscriptions}
                  type="number"
                  fullWidth
                  value={formData.max_subscriptions}
                  onChange={(event) => setFormData({ ...formData, max_subscriptions: parseInt(event.target.value, 10) || 10 })}
                  slotProps={{ htmlInput: { min: 1, max: 100 } }}
                  helperText={content.maxSubscriptionsHelper}
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
                      {content.adminPermission}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {content.adminPermissionHelper}
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
                      {content.activeAccount}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {content.activeAccountHelper}
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
                background: 'linear-gradient(45deg, #a78bfa 30%, #8b5cf6 90%)',
                px: 4,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 'bold',
                boxShadow: '0 4px 15px rgba(167, 139, 250, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #8b5cf6 30%, #7c3aed 90%)',
                  boxShadow: '0 6px 20px rgba(167, 139, 250, 0.4)',
                },
              }}
            >
              {editingUser ? content.updateUser : content.createUserAction}
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
        <FooterLinks accent="#a78bfa" />
      </Box>
    </Box>
  );
};

export default UserManagement;
