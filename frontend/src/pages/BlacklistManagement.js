import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  IconButton,
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
  Security as SecurityIcon,
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
import StatusBadge from '../components/StatusBadge';
import { UI_FONTS } from '../theme/tokens';

// 域名是机器值：等宽显示，通配符和子域名的差别一眼能看出来。
const monoDomain = {
  fontFamily: UI_FONTS.mono,
  fontSize: 13,
  color: 'text.primary',
  letterSpacing: 0,
  wordBreak: 'break-all',
};

const monoReading = {
  fontFamily: UI_FONTS.mono,
  fontVariantNumeric: 'tabular-nums',
  fontSize: 12,
  color: 'text.secondary',
  letterSpacing: 0,
};

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
          <Button variant="contained" startIcon={<AddIcon sx={{ fontSize: 18 }} />} onClick={() => handleOpenDialog()}>
            {t('blacklist.addDomain')}
          </Button>
        }
      />

      <StatGrid
        items={[
          {
            key: 'total',
            title: t('blacklist.totalDomains'),
            value: loadError ? null : domains.length,
          },
          {
            key: 'exact',
            title: t('blacklist.exactDomains'),
            value: loadError
              ? null
              : domains.filter(
                  (domain) => !domain.domain.startsWith('*') && domain.domain.includes('.'),
                ).length,
          },
          {
            key: 'partial',
            title: t('blacklist.partialDomains'),
            value: loadError
              ? null
              : domains.filter(
                  (domain) => !domain.domain.startsWith('*') && !domain.domain.includes('.'),
                ).length,
          },
          {
            key: 'wildcard',
            title: t('blacklist.wildcardDomains'),
            value: loadError ? null : domains.filter((domain) => domain.domain.startsWith('*')).length,
          },
        ]}
      />

      <Box sx={{ mb: 4 }}>
        <Typography variant="body2" sx={{ fontWeight: 500, mb: 0.5 }}>
          {t('blacklist.guideTitle')}
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {[
            t('blacklist.guideLine1'),
            t('blacklist.guideLine2'),
            t('blacklist.guideLine3'),
            t('blacklist.guideLine4'),
          ].map((line) => (
            <Typography key={line} variant="caption" sx={{ color: 'text.secondary' }}>
              · {line}
            </Typography>
          ))}
        </Box>
      </Box>

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
              <Button onClick={() => handleOpenDialog()}>{t('blacklist.addFirstDomain')}</Button>
            }
          />
        ) : (
          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell>{t('blacklist.domain')}</TableCell>
                  <TableCell>{t('blacklist.description')}</TableCell>
                  <TableCell>{t('blacklist.status')}</TableCell>
                  <TableCell>{t('blacklist.createdAt')}</TableCell>
                  <TableCell align="right">{t('blacklist.actions')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell>
                      <Typography sx={monoDomain}>{domain.domain}</Typography>
                      {domain.domain.startsWith('*') && (
                        <Typography
                          variant="caption"
                          sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}
                        >
                          {t('blacklist.wildcard')}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        {domain.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        tone={domain.is_active ? 'danger' : 'neutral'}
                        label={domain.is_active ? t('blacklist.enabled') : t('blacklist.disabledLabel')}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography sx={monoReading}>
                        {formatDateTime(domain.created_at, i18n.language)}
                      </Typography>
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
                        <Tooltip title={t('blacklist.edit')}>
                          <IconButton
                            size="small"
                            aria-label={t('blacklist.edit')}
                            onClick={() => handleOpenDialog(domain)}
                          >
                            <EditIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={t('blacklist.delete')}>
                          <IconButton
                            size="small"
                            aria-label={t('blacklist.delete')}
                            onClick={() => handleDelete(domain)}
                          >
                            <DeleteIcon sx={{ fontSize: 18 }} />
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
        submitLabel={editingDomain ? t('blacklist.update') : t('blacklist.create')}
        cancelLabel={t('common.cancel')}
        onSubmit={handleSubmit}
        onClose={handleCloseDialog}
        pending={saving}
        submitDisabled={!formData.domain.trim()}
      >
        <TextField
          autoFocus
          label={t('blacklist.domain')}
          fullWidth
          variant="outlined"
          value={formData.domain}
          onChange={(event) => setFormData({ ...formData, domain: event.target.value })}
          placeholder={t('blacklist.domainPlaceholder')}
          sx={{ mb: 2 }}
        />
        <TextField
          label={t('blacklist.description')}
          fullWidth
          variant="outlined"
          multiline
          rows={3}
          value={formData.description}
          onChange={(event) => setFormData({ ...formData, description: event.target.value })}
          placeholder={t('blacklist.descriptionPlaceholder')}
          sx={{ mb: 2 }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={formData.is_active}
              onChange={(event) => setFormData({ ...formData, is_active: event.target.checked })}
              slotProps={{ input: { 'aria-label': t('blacklist.enabledStatus') } }}
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
