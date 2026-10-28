import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Chip,
  Alert,
  FormControlLabel,
  Switch,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
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
import EmptyState from '../components/EmptyState';
import FeedbackSnackbar from '../components/FeedbackSnackbar';
import FormDialog from '../components/FormDialog';
import PageHeader from '../components/PageHeader';
import SectionCard from '../components/SectionCard';
import StatGrid from '../components/StatGrid';
import { UI_COLORS } from '../theme/tokens';

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
      <PageHeader
        title={t('blacklist.title')}
        subtitle={t('blacklist.subtitle')}
        action={
          <Button
            variant="contained"
            disableElevation
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
            sx={{ textTransform: 'none', borderRadius: 2 }}
          >
            {t('blacklist.addDomain')}
          </Button>
        }
      />

      <StatGrid
        items={[
          {
            key: 'total',
            title: t('blacklist.totalDomains'),
            value: domains.length,
            icon: <SecurityIcon />,
            color: UI_COLORS.primary,
          },
          {
            key: 'exact',
            title: t('blacklist.exactDomains'),
            value: domains.filter((domain) => !domain.domain.startsWith('*') && domain.domain.includes('.')).length,
            icon: <BlockIcon />,
            color: UI_COLORS.info,
          },
          {
            key: 'partial',
            title: t('blacklist.partialDomains'),
            value: domains.filter((domain) => !domain.domain.startsWith('*') && !domain.domain.includes('.')).length,
            icon: <BlockOffIcon />,
            color: UI_COLORS.warning,
          },
          {
            key: 'wildcard',
            title: t('blacklist.wildcardDomains'),
            value: domains.filter((domain) => domain.domain.startsWith('*')).length,
            icon: <LanguageIcon />,
            color: UI_COLORS.accent,
          },
        ]}
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
          {t('blacklist.guideTitle')}
        </Typography>
        <Typography variant="body2">• {t('blacklist.guideLine1')}</Typography>
        <Typography variant="body2">• {t('blacklist.guideLine2')}</Typography>
        <Typography variant="body2">• {t('blacklist.guideLine3')}</Typography>
        <Typography variant="body2">• {t('blacklist.guideLine4')}</Typography>
      </Alert>

      {loadError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t('blacklist.fetchFailed')}: {getApiErrorMessage(loadError, t('common.unknownError'))}
        </Alert>
      )}

      <SectionCard title={t('blacklist.listTitle')} bareBody>
        {domains.length === 0 ? (
          <EmptyState
            icon={<SecurityIcon />}
            title={t('blacklist.noDomains')}
            subtitle={t('blacklist.noDomainsSubtitle')}
            action={
              <Button
                variant="contained"
                disableElevation
                startIcon={<AddIcon />}
                onClick={() => handleOpenDialog()}
                sx={{ textTransform: 'none', borderRadius: 2 }}
              >
                {t('blacklist.addFirstDomain')}
              </Button>
            }
          />
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
                            bgcolor: domain.is_active ? UI_COLORS.danger : 'grey.500',
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
      </SectionCard>

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
