import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Chip,
  Alert,
  Snackbar,
  FormControlLabel,
  Switch,
  Tooltip,
  alpha,
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
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
  Block as BlockIcon,
  NotInterested as BlockOffIcon,
  Language as LanguageIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

import { formatDateTime } from '../utils/date';
import { isChineseLanguage } from '../utils/i18n';

const BlacklistManagement = () => {
  const [domains, setDomains] = useState([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState(null);
  const [formData, setFormData] = useState({
    domain: '',
    description: '',
    is_active: true,
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const { i18n } = useTranslation();
  const isChinese = isChineseLanguage(i18n.language);

  const content = isChinese ? {
    title: '黑名单管理',
    subtitle: '管理禁止普通用户监控的网站域名',
    addDomain: '添加域名',
    totalDomains: '总域名数',
    active: '启用中',
    disabled: '已禁用',
    wildcardDomains: '通配符域名',
    guideTitle: '功能说明',
    guideLine1: '普通用户无法监控黑名单中的域名',
    guideLine2: '管理员可以监控任何网站，包括黑名单中的域名',
    guideLine3: '黑名单支持通配符匹配（如 *.example.com 会阻止所有子域名）',
    guideLine4: '支持部分匹配（如 example 会阻止包含 example 的所有域名）',
    listTitle: '黑名单域名列表',
    noDomains: '暂无黑名单域名',
    noDomainsSubtitle: '添加需要禁止普通用户监控的域名',
    addFirstDomain: '添加第一个域名',
    domain: '域名',
    description: '描述',
    status: '状态',
    createdAt: '创建时间',
    actions: '操作',
    wildcard: '通配符域名',
    enabled: '启用',
    disabledLabel: '禁用',
    edit: '编辑',
    delete: '删除',
    editDialogTitle: '编辑黑名单域名',
    createDialogTitle: '添加黑名单域名',
    domainPlaceholder: '例如: example.com, *.example.com, example',
    descriptionPlaceholder: '可选的域名描述信息',
    enabledStatus: '启用状态',
    cancel: '取消',
    update: '更新',
    create: '添加',
    fetchFailed: '获取黑名单失败',
    updateSuccess: '黑名单更新成功',
    createSuccess: '黑名单添加成功',
    saveFailed: '保存失败',
    deleteConfirm: '确定要删除这个黑名单域名吗？',
    deleteSuccess: '黑名单删除成功',
    deleteFailed: '删除失败',
    unknownError: '未知错误',
  } : {
    title: 'Blacklist management',
    subtitle: 'Manage domains that regular users are not allowed to monitor.',
    addDomain: 'Add domain',
    totalDomains: 'Total domains',
    active: 'Active',
    disabled: 'Disabled',
    wildcardDomains: 'Wildcard domains',
    guideTitle: 'How it works',
    guideLine1: 'Regular users cannot monitor domains on the blacklist.',
    guideLine2: 'Admins can monitor any site, including blacklisted domains.',
    guideLine3: 'The blacklist supports wildcard matching, for example *.example.com blocks all subdomains.',
    guideLine4: 'Partial matching is supported, for example example blocks any domain containing example.',
    listTitle: 'Blacklisted domains',
    noDomains: 'No blacklisted domains yet',
    noDomainsSubtitle: 'Add domains that regular users should not be allowed to monitor.',
    addFirstDomain: 'Add first domain',
    domain: 'Domain',
    description: 'Description',
    status: 'Status',
    createdAt: 'Created at',
    actions: 'Actions',
    wildcard: 'Wildcard domain',
    enabled: 'Enabled',
    disabledLabel: 'Disabled',
    edit: 'Edit',
    delete: 'Delete',
    editDialogTitle: 'Edit blacklisted domain',
    createDialogTitle: 'Add blacklisted domain',
    domainPlaceholder: 'For example: example.com, *.example.com, example',
    descriptionPlaceholder: 'Optional description for this domain',
    enabledStatus: 'Enabled status',
    cancel: 'Cancel',
    update: 'Update',
    create: 'Add',
    fetchFailed: 'Failed to fetch blacklist',
    updateSuccess: 'Blacklist updated successfully',
    createSuccess: 'Domain added to blacklist successfully',
    saveFailed: 'Failed to save',
    deleteConfirm: 'Are you sure you want to delete this blacklisted domain?',
    deleteSuccess: 'Blacklisted domain deleted successfully',
    deleteFailed: 'Failed to delete',
    unknownError: 'Unknown error',
  };

  const getErrorMessage = useCallback((error) => {
    return error.response?.data?.detail || content.unknownError;
  }, [content.unknownError]);

  const fetchDomains = useCallback(async () => {
    try {
      const response = await axios.get('/api/blacklist-domains');
      setDomains(response.data);
    } catch (error) {
      setSnackbar({
        open: true,
        message: `${content.fetchFailed}: ${getErrorMessage(error)}`,
        severity: 'error',
      });
    }
  }, [content.fetchFailed, getErrorMessage]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const handleOpenDialog = (domain = null) => {
    setEditingDomain(domain);
    setFormData({
      domain: domain?.domain || '',
      description: domain?.description || '',
      is_active: domain?.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDomain(null);
    setFormData({
      domain: '',
      description: '',
      is_active: true,
    });
  };

  const handleSubmit = async () => {
    try {
      if (editingDomain) {
        await axios.put(`/api/blacklist-domains/${editingDomain.id}`, formData);
        setSnackbar({
          open: true,
          message: content.updateSuccess,
          severity: 'success',
        });
      } else {
        await axios.post('/api/blacklist-domains', formData);
        setSnackbar({
          open: true,
          message: content.createSuccess,
          severity: 'success',
        });
      }
      handleCloseDialog();
      fetchDomains();
    } catch (error) {
      setSnackbar({
        open: true,
        message: `${content.saveFailed}: ${getErrorMessage(error)}`,
        severity: 'error',
      });
    }
  };

  const handleDelete = async (domainId) => {
    if (!window.confirm(content.deleteConfirm)) {
      return;
    }

    try {
      await axios.delete(`/api/blacklist-domains/${domainId}`);
      setSnackbar({
        open: true,
        message: content.deleteSuccess,
        severity: 'success',
      });
      fetchDomains();
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
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            background: 'linear-gradient(45deg, #1976d2 30%, #1565c0 90%)',
            py: 1.5,
            px: 3,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 'bold',
            boxShadow: '0 4px 15px rgba(25, 118, 210, 0.3)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1565c0 30%, #0d47a1 90%)',
              boxShadow: '0 6px 20px rgba(25, 118, 210, 0.4)',
              transform: 'translateY(-2px)',
            },
          }}
        >
          {content.addDomain}
        </Button>
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
                  <SecurityIcon />
                </Avatar>
              </Box>
              <Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
                  {domains.length}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {content.totalDomains}
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
                  <BlockIcon />
                </Avatar>
              </Box>
              <Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
                  {domains.filter((domain) => domain.is_active).length}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {content.active}
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
                background: 'linear-gradient(90deg, #6b7280 0%, rgba(107, 114, 128, 0.6) 100%)',
              },
              position: 'relative',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: 'rgba(107, 114, 128, 0.1)',
                    color: '#6b7280',
                    width: 48,
                    height: 48,
                  }}
                >
                  <BlockOffIcon />
                </Avatar>
              </Box>
              <Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
                  {domains.filter((domain) => !domain.is_active).length}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {content.disabled}
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
                    color: '#a78bfa',
                    width: 48,
                    height: 48,
                  }}
                >
                  <LanguageIcon />
                </Avatar>
              </Box>
              <Box>
                <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
                  {domains.filter((domain) => domain.domain.startsWith('*')).length}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                  {content.wildcardDomains}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 4, backgroundColor: alpha('#1976d2', 0.04), border: `1px solid ${alpha('#1976d2', 0.12)}` }}>
        <CardContent sx={{ py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <SecurityIcon sx={{ fontSize: 20, color: '#1976d2' }} />
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
          <Typography variant="body2" sx={{ ml: 5, color: 'text.secondary' }}>
            • {content.guideLine4}
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
        {domains.length === 0 ? (
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
              <SecurityIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Typography variant="h6" sx={{ mb: 1 }}>
              {content.noDomains}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              {content.noDomainsSubtitle}
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{
                background: 'linear-gradient(45deg, #1976d2 30%, #1565c0 90%)',
                textTransform: 'none',
                fontWeight: 'bold',
              }}
            >
              {content.addFirstDomain}
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(25, 118, 210, 0.05)' }}>
                  <TableCell sx={{ fontWeight: 600 }}>{content.domain}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.description}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.status}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.createdAt}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{content.actions}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow
                    key={domain.id}
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
                            background: domain.is_active
                              ? 'linear-gradient(45deg, #ef4444 30%, #dc2626 90%)'
                              : 'linear-gradient(45deg, #6b7280 30%, #4b5563 90%)',
                            fontSize: '1rem',
                          }}
                        >
                          <LanguageIcon fontSize="small" />
                        </Avatar>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            {domain.domain}
                          </Typography>
                          {domain.domain.startsWith('*') && (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {content.wildcard}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {domain.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={domain.is_active ? content.enabled : content.disabledLabel}
                        color={domain.is_active ? 'error' : 'default'}
                        icon={domain.is_active ? <BlockIcon /> : null}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {formatDateTime(domain.created_at, i18n.language)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title={content.edit}>
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDialog(domain)}
                            sx={{
                              color: '#1976d2',
                              '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.1)' },
                            }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={content.delete}>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(domain.id)}
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

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SecurityIcon sx={{ fontSize: 24, color: 'primary.main' }} />
            <Typography variant="h5" component="div">
              {editingDomain ? content.editDialogTitle : content.createDialogTitle}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={content.domain}
            fullWidth
            variant="outlined"
            value={formData.domain}
            onChange={(event) => setFormData({ ...formData, domain: event.target.value })}
            sx={{ mb: 2 }}
            placeholder={content.domainPlaceholder}
          />
          <TextField
            margin="dense"
            label={content.description}
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={formData.description}
            onChange={(event) => setFormData({ ...formData, description: event.target.value })}
            sx={{ mb: 2 }}
            placeholder={content.descriptionPlaceholder}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_active}
                onChange={(event) => setFormData({ ...formData, is_active: event.target.checked })}
                color="primary"
              />
            }
            label={content.enabledStatus}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleCloseDialog} color="inherit">
            {content.cancel}
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.domain.trim()}>
            {editingDomain ? content.update : content.create}
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

export default BlacklistManagement;
