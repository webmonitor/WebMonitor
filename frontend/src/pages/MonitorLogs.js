import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  MenuItem,
  Pagination,
  TextField,
  Typography,
} from '@mui/material';
import { ListAlt as ListAltIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { formatDateTime } from '../utils/date';
import { useAuth } from '../contexts/AuthContext';
import api, { getApiErrorMessage } from '../api/client';
import { keys } from '../api/queryKeys';
import PageHeader from '../components/PageHeader';
import StatGrid from '../components/StatGrid';
import SectionCard from '../components/SectionCard';
import EmptyState from '../components/EmptyState';
import StatusBadge from '../components/StatusBadge';
import RecordTable from '../components/RecordTable';
import ChangeDiff from '../components/ChangeDiff';
import { UI_COLORS, UI_FONTS, UI_SURFACE } from '../theme/tokens';

// 时间戳与内容块：等宽、数位对齐，和正文区分开。
const mono = {
  fontFamily: UI_FONTS.mono,
  fontVariantNumeric: 'tabular-nums',
  letterSpacing: 0,
};

const truncateCell = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  wordBreak: 'break-word',
};

const MonitorLogs = () => {
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const tasksQuery = useQuery({
    queryKey: keys.tasks(user?.id),
    queryFn: ({ signal }) => api.get('/api/monitor-tasks', { signal }).then((response) => response.data),
    enabled: !!user,
  });

  const tasks = tasksQuery.data ?? [];
  const hasTasks = tasks.length > 0;

  const logsQuery = useQuery({
    queryKey: keys.taskLogs(user?.id, selectedTaskId, page, rowsPerPage),
    queryFn: ({ signal }) =>
      api
        .get(`/api/monitor-tasks/${selectedTaskId}/logs`, {
          params: { page, limit: rowsPerPage },
          signal,
        })
        .then((response) => ({ ...response.data, taskId: selectedTaskId })),
    enabled: !!user && !!selectedTaskId,
    // 只有同一个任务翻页时才复用上一页数据；换任务绝不能闪出上一个任务的日志。
    placeholderData: (prev) => (prev && prev.taskId === selectedTaskId ? prev : undefined),
  });

  const logsResult =
    logsQuery.data && logsQuery.data.taskId === selectedTaskId ? logsQuery.data : null;
  const logs = logsResult?.logs ?? [];
  const totalCount = logsResult?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / rowsPerPage));

  // 只有真实（非 placeholder）结果能触发页码校正：总数变小后停在越界页会一直空着。
  useEffect(() => {
    if (!logsResult || logsQuery.isPlaceholderData) return;
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [logsResult, logsQuery.isPlaceholderData, page, totalPages]);

  const logsError = logsQuery.error;
  const logsLoading = !!selectedTaskId && (logsQuery.isLoading || (!logsResult && logsQuery.isFetching));

  const truncateContent = (value, maxLength = 100) => {
    if (!value) return t('common.emptyValue');
    return value.length > maxLength ? `${value.substring(0, maxLength)}…` : value;
  };

  const paginationSummary = logsError || !logsResult
    ? t('common.emptyValue')
    : totalCount === 0
      ? t('logs.emptySummary', { total: totalCount })
      : t('logs.paginationSummary', {
          start: (page - 1) * rowsPerPage + 1,
          end: Math.min(page * rowsPerPage, totalCount),
          total: totalCount,
        });

  const handleChangePage = (_, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(1);
  };

  const handleTaskChange = (event) => {
    setSelectedTaskId(event.target.value);
    setPage(1);
  };

  return (
    <Box>
      <PageHeader
        title={t('logs.title')}
        subtitle={t('logs.subtitle')}
        action={
          <TextField
            select
            size="small"
            value={selectedTaskId}
            onChange={handleTaskChange}
            disabled={!hasTasks}
            slotProps={{
              htmlInput: { 'aria-label': t('logs.selectTask') },
              select: {
                displayEmpty: true,
                renderValue: (value) => {
                  if (!value) {
                    return (
                      <Typography component="span" variant="body2" sx={{ color: 'text.secondary' }}>
                        {t('logs.selectTask')}
                      </Typography>
                    );
                  }
                  const task = tasks.find((item) => item.id === value);
                  return task ? task.name : t('logs.selectTask');
                },
              },
            }}
            sx={{ minWidth: { xs: '100%', sm: 240 } }}
          >
            {tasks.map((task) => (
              <MenuItem key={task.id} value={task.id}>
                {task.name}
              </MenuItem>
            ))}
          </TextField>
        }
      />

      {tasksQuery.error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t('tasks.loadTasksError')}: {getApiErrorMessage(tasksQuery.error, t('common.unknownError'))}
        </Alert>
      )}

      {!hasTasks && !tasksQuery.isLoading && !tasksQuery.error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('logs.noTasks')}
        </Alert>
      )}

      {selectedTaskId ? (
        <>
          <StatGrid
            items={[
              {
                key: 'total',
                title: t('logs.totalLogs'),
                value: logsLoading || logsError ? null : totalCount,
              },
              {
                key: 'unchanged',
                title: t('logs.unchanged'),
                value: logsLoading || logsError
                  ? null
                  : logs.filter((log) => !log.error_message && !log.is_changed).length,
              },
              {
                key: 'changed',
                title: t('logs.changed'),
                value: logsLoading || logsError
                  ? null
                  : logs.filter((log) => log.is_changed && !log.error_message).length,
              },
              {
                key: 'error',
                title: t('logs.error'),
                value: logsLoading || logsError ? null : logs.filter((log) => log.error_message).length,
              },
            ]}
          />

          <SectionCard title={t('logs.tableTitle')} bareBody>
            <RecordTable
              rows={logs}
              rowKey={(log) => log.id}
              minWidth={900}
              loading={logsLoading}
              error={logsError}
              errorMessage={`${t('logs.loadError')}: ${getApiErrorMessage(logsError, t('common.unknownError'))}`}
              onRetry={logsQuery.refetch}
              ariaLabel={t('logs.tableTitle')}
              emptyState={
                <EmptyState icon={<ListAltIcon />} title={t('logs.noLogs')} subtitle={t('logs.noLogsSubtitle')} />
              }
              columns={[
                {
                  id: 'time',
                  label: t('logs.checkTime'),
                  primary: true,
                  cellSx: { whiteSpace: 'nowrap' },
                  render: (log) => (
                    <Typography sx={{ ...mono, fontSize: 12, color: 'text.secondary' }}>
                      {formatDateTime(log.check_time, i18n.language)}
                    </Typography>
                  ),
                },
                {
                  id: 'status',
                  label: t('logs.status'),
                  render: (log) => (
                    <StatusBadge
                      tone={log.error_message ? 'danger' : log.is_changed ? 'warning' : 'positive'}
                      label={log.error_message ? t('logs.error') : log.is_changed ? t('logs.changed') : t('logs.unchanged')}
                    />
                  ),
                },
                {
                  id: 'content',
                  label: t('logs.contentComparison'),
                  render: (log) =>
                    log.is_changed && !log.error_message ? (
                      <ChangeDiff oldContent={log.old_content} newContent={log.new_content} oldLines={2} newLines={3} />
                    ) : (
                      <Typography
                        sx={{
                          ...mono,
                          ...truncateCell,
                          fontSize: 12,
                          maxWidth: 360,
                          whiteSpace: 'pre-line',
                          color: log.new_content ? 'text.primary' : 'text.secondary',
                        }}
                      >
                        {truncateContent(log.new_content)}
                      </Typography>
                    ),
                },
                {
                  id: 'error',
                  label: t('logs.errorInfo'),
                  render: (log) => (
                    <Typography
                      variant="body2"
                      sx={{ ...truncateCell, maxWidth: 280, color: log.error_message ? 'error.main' : 'text.secondary' }}
                    >
                      {truncateContent(log.error_message)}
                    </Typography>
                  ),
                },
              ]}
            />

            <Box
              sx={{
                px: 2.5,
                py: 2,
                borderTop: UI_SURFACE.divider,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Typography sx={{ ...mono, fontSize: 12, color: UI_COLORS.muted }}>
                {paginationSummary}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('logs.rowsPerPage')}
                </Typography>
                <TextField
                  select
                  size="small"
                  value={rowsPerPage}
                  onChange={handleChangeRowsPerPage}
                  disabled={logsLoading || !!logsError || totalCount === 0}
                  slotProps={{ htmlInput: { 'aria-label': t('logs.rowsPerPage') } }}
                  sx={{ minWidth: 80 }}
                >
                  <MenuItem value={10}>10</MenuItem>
                  <MenuItem value={20}>20</MenuItem>
                  <MenuItem value={50}>50</MenuItem>
                  <MenuItem value={100}>100</MenuItem>
                </TextField>
                <Pagination
                  count={totalPages}
                  page={Math.min(page, totalPages)}
                  disabled={logsLoading || !!logsError || totalCount === 0}
                  onChange={handleChangePage}
                  showFirstButton
                  showLastButton
                  shape="rounded"
                  size="small"
                  siblingCount={1}
                  boundaryCount={1}
                />
              </Box>
            </Box>
          </SectionCard>
        </>
      ) : (
        <SectionCard bareBody>
          <EmptyState
            icon={<ListAltIcon />}
            title={t('logs.selectTaskEmpty')}
            subtitle={t('logs.selectTaskSubtitle')}
          />
        </SectionCard>
      )}
    </Box>
  );
};

export default MonitorLogs;
