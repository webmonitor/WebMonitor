import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  Pagination,
  CircularProgress,
} from '@mui/material';
import {
  ListAlt as ListAltIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
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
import { UI_COLORS, UI_SURFACE } from '../theme/tokens';

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
    if (!value) return '-';
    return value.length > maxLength ? `${value.substring(0, maxLength)}...` : value;
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
          <FormControl sx={{ minWidth: 220 }} disabled={!hasTasks}>
            <InputLabel>{t('logs.selectTask')}</InputLabel>
            <Select
              value={selectedTaskId}
              label={t('logs.selectTask')}
              onChange={handleTaskChange}
            >
              {tasks.map((task) => (
                <MenuItem key={task.id} value={task.id}>
                  {task.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        }
      />

      {!hasTasks && !tasksQuery.isLoading && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {t('logs.noTasks')}
        </Alert>
      )}

      {logsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {t('logs.loadError')}: {getApiErrorMessage(logsError, t('common.unknownError'))}
        </Alert>
      )}

      {selectedTaskId ? (
        <>
          <StatGrid
            items={[
              {
                key: 'total',
                title: t('logs.totalLogs'),
                value: logsError ? null : totalCount,
                icon: <ListAltIcon />,
                color: UI_COLORS.primary,
              },
              {
                key: 'unchanged',
                title: t('logs.unchanged'),
                value: logsError
                  ? null
                  : logs.filter((log) => !log.error_message && !log.is_changed).length,
                icon: <CheckCircleIcon />,
                color: UI_COLORS.info,
              },
              {
                key: 'changed',
                title: t('logs.changed'),
                value: logsError
                  ? null
                  : logs.filter((log) => log.is_changed && !log.error_message).length,
                icon: <WarningIcon />,
                color: UI_COLORS.warning,
              },
              {
                key: 'error',
                title: t('logs.error'),
                value: logsError ? null : logs.filter((log) => log.error_message).length,
                icon: <ErrorIcon />,
                color: UI_COLORS.danger,
              },
            ]}
          />

          <SectionCard title={t('logs.tableTitle')} bareBody>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>{t('logs.checkTime')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('logs.status')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('logs.newContent')}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{t('logs.errorInfo')}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logsLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ textAlign: 'center', py: 8 }}>
                        <CircularProgress size={32} sx={{ color: UI_COLORS.primary }} />
                        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                          {t('common.loading')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <ScheduleIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {formatDateTime(log.check_time, i18n.language)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {log.error_message ? (
                            <Chip
                              label={t('logs.error')}
                              color="error"
                              size="small"
                              icon={<ErrorIcon />}
                              variant="outlined"
                            />
                          ) : log.is_changed ? (
                            <Chip
                              label={t('logs.changed')}
                              color="warning"
                              size="small"
                              icon={<WarningIcon />}
                              variant="outlined"
                            />
                          ) : (
                            <Chip
                              label={t('logs.unchanged')}
                              color="success"
                              size="small"
                              icon={<CheckCircleIcon />}
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            sx={{maxWidth: 300,
                              wordBreak: 'break-word',
                              color: 'text.secondary',
                            }}
                          >
                            {truncateContent(log.new_content)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography
                            variant="body2"
                            color="error"
                            sx={{
                              maxWidth: 300,
                              wordBreak: 'break-word',
                            }}
                          >
                            {truncateContent(log.error_message)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {!logsLoading && !logsError && logs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4}>
                        <EmptyState
                          icon={<ListAltIcon />}
                          title={t('logs.noLogs')}
                          subtitle={t('logs.noLogsSubtitle')}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ p: 3, borderTop: UI_SURFACE.divider }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  {paginationSummary}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {t('logs.rowsPerPage')}:
                  </Typography>
                  <Select
                    size="small"
                    value={rowsPerPage}
                    onChange={handleChangeRowsPerPage}
                    sx={{ minWidth: 80 }}
                  >
                    <MenuItem value={10}>10</MenuItem>
                    <MenuItem value={20}>20</MenuItem>
                    <MenuItem value={50}>50</MenuItem>
                    <MenuItem value={100}>100</MenuItem>
                  </Select>
                  <Pagination
                    count={totalPages}
                    page={Math.min(page, totalPages)}
                    onChange={handleChangePage}
                    color="primary"
                    showFirstButton
                    showLastButton
                    shape="rounded"
                    size="medium"
                    siblingCount={2}
                    boundaryCount={1}
                  />
                </Box>
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
