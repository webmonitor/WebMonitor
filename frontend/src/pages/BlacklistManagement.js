import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  IconButton,
  Chip,
  Alert,
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { formatDateTime } from '../utils/date';
import api, { getApiErrorMessage } from '../api/client';
import { keys } from '../api/queryKeys';
import { useAuth } from '../contexts/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import FormDialog from '../components/FormDialog';

const BlacklistManagement = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDomain, setEditingDomain] = useState(null);
  const [formData, setFormData] = useState({
    domain: '',
    description: '',
    is_active: true,
  });
  const [feedback, setFeedback] = useState({
    open: false,
    message: '',
    severity: 'success',
  });
  const [confirmTarget, setConfirmTarget] = useState(null);

  const showFeedback = (message, severity = 'success') => {
    setFeedback({ open: true, message, severity });
  };

  const closeFeedback = () => {
    setFeedback((previous) => ({ ...previous, open: false }));
  };

  const { data: domains = [], error: loadError } = useQuery({
    queryKey: keys.blacklist(user?.id),
    queryFn: ({ signal }) =>
      api.get('/api/blacklist-domains', { signal }).then((response) => response.data),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (payload) =>
      api.post('/api/blacklist-domains', payload).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklist'] });
      handleCloseDialog();
      showFeedback(t('blacklist.createSuccess'));
    },
    onError: (mutationError) => {
      // 403 只提示：表单保持打开、输入保留，会话不动。
      showFeedback(getApiErrorMessage(mutationError, t('common.unknownError')), 'error');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) =>
      api.put(`/api/blacklist-domains/${id}`, payload).then((response) => response.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklist'] });
      handleCloseDialog();
      showFeedback(t('blacklist.updateSuccess'));
    },
    onError: (mutationError) => {
      showFeedback(getApiErrorMessage(mutationError, t('common.unknownError')), 'error');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/blacklist-domains/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blacklist'] });
      setConfirmTarget(null);
      showFeedback(t('blacklist.deleteSuccess'));
    },
    onError: (mutationError) => {
      showFeedback(getApiErrorMessage(mutationError, t('common.unknownError')), 'error');
    },
  });

  const saving = createMutation.isPending || updateMutation.isPending;

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

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formData.domain.trim()) {
      return;
    }

    if (editingDomain) {
      updateMutation.mutate({ id: editingDomain.id, payload: formData });
      return;
    }

    createMutation.mutate(formData);
  };

  const handleDelete = (domain) => {
    setConfirmTarget(domain);
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
            {t('blacklist.title')}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            {t('blacklist.subtitle')}
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
          {t('blacklist.addDomain')}
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
                  {t('blacklist.totalDomains')}
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
                  {t('blacklist.active')}
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
                  {t('blacklist.disabled')}
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
                  {t('blacklist.wildcardDomains')}
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
              {t('blacklist.guideTitle')}
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ ml: 5, color: 'text.secondary' }}>
            • {t('blacklist.guideLine1')}
          </Typography>
          <Typography variant="body2" sx={{ ml: 5, color: 'text.secondary' }}>
            • {t('blacklist.guideLine2')}
          </Typography>
          <Typography variant="body2" sx={{ ml: 5, color: 'text.secondary' }}>
            • {t('blacklist.guideLine3')}
          </Typography>
          <Typography variant="body2" sx={{ ml: 5, color: 'text.secondary' }}>
            • {t('blacklist.guideLine4')}
          </Typography>
        </CardContent>
      </Card>

      {loadError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t('blacklist.fetchFailed')}: {getApiErrorMessage(loadError, t('common.unknownError'))}
        </Alert>
      )}

      <Paper
        sx={{
          borderRadius: 4,
          border: '1px solid rgba(0, 0, 0, 0.06)',
          overflow: 'hidden',
        }}
      >
        <Box sx={{ p: 3, borderBottom: '1px solid rgba(0, 0, 0, 0.06)' }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            {t('blacklist.listTitle')}
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
              {t('blacklist.noDomains')}
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
              {t('blacklist.noDomainsSubtitle')}
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
              {t('blacklist.addFirstDomain')}
            </Button>
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'rgba(25, 118, 210, 0.05)' }}>
                  <TableCell sx={{ fontWeight: 600 }}>{t('blacklist.domain')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('blacklist.description')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('blacklist.status')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('blacklist.createdAt')}</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{t('blacklist.actions')}</TableCell>
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
                              {t('blacklist.wildcard')}
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
                        label={domain.is_active ? t('blacklist.enabled') : t('blacklist.disabledLabel')}
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
                        <Tooltip title={t('blacklist.edit')}>
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
                        <Tooltip title={t('blacklist.delete')}>
                          <IconButton
                            size="small"
                            onClick={() => handleDelete(domain)}
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

      <FormDialog
        open={dialogOpen}
        title={editingDomain ? t('blacklist.editDialogTitle') : t('blacklist.createDialogTitle')}
        icon={<SecurityIcon sx={{ fontSize: 24, color: 'primary.main' }} />}
        submitLabel={editingDomain ? t('blacklist.update') : t('blacklist.create')}
        cancelLabel={t('common.cancel')}
        onSubmit={handleSubmit}
        onClose={handleCloseDialog}
        pending={saving}
        submitDisabled={!formData.domain.trim()}
      >
        <TextField
          autoFocus
          margin="dense"
          label={t('blacklist.domain')}
          fullWidth
          variant="outlined"
          value={formData.domain}
          onChange={(event) => setFormData({ ...formData, domain: event.target.value })}
          sx={{ mb: 2 }}
          placeholder={t('blacklist.domainPlaceholder')}
        />
        <TextField
          margin="dense"
          label={t('blacklist.description')}
          fullWidth
          variant="outlined"
          multiline
          rows={3}
          value={formData.description}
          onChange={(event) => setFormData({ ...formData, description: event.target.value })}
          sx={{ mb: 2 }}
          placeholder={t('blacklist.descriptionPlaceholder')}
        />
        <FormControlLabel
          control={
            <Switch
              checked={formData.is_active}
              onChange={(event) => setFormData({ ...formData, is_active: event.target.checked })}
              color="primary"
            />
          }
          label={t('blacklist.enabledStatus')}
        />
      </FormDialog>

      <ConfirmDialog
        open={!!confirmTarget}
        title={t('blacklist.deleteConfirmTitle')}
        message={t('blacklist.deleteConfirm')}
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

export default BlacklistManagement;
