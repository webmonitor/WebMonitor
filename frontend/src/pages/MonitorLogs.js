import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
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
  Grid,
  Card,
  CardContent,
  Avatar,
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
import FooterLinks from '../components/FooterLinks';
import { useAuth } from '../contexts/AuthContext';
import api, { getApiErrorMessage } from '../api/client';
import { keys } from '../api/queryKeys';

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
            {t('logs.title')}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            {t('logs.subtitle')}
          </Typography>
        </Box>
        <FormControl sx={{ minWidth: 220 }} disabled={!hasTasks}>
          <InputLabel>{t('logs.selectTask')}</InputLabel>
          <Select
            value={selectedTaskId}
            label={t('logs.selectTask')}
            onChange={handleTaskChange}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: 'rgba(25, 118, 210, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#1976d2',
                  borderWidth: 2,
                },
              },
            }}
          >
            {tasks.map((task) => (
              <MenuItem key={task.id} value={task.id}>
                {task.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

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
                      <ListAltIcon />
                    </Avatar>
                  </Box>
                  <Box>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
                      {logsError ? t('common.emptyValue') : totalCount}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {t('logs.totalLogs')}
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
                    background: 'linear-gradient(90deg, #10b981 0%, rgba(16, 185, 129, 0.6) 100%)',
                  },
                  position: 'relative',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: 'rgba(16, 185, 129, 0.1)',
                        color: '#10b981',
                        width: 48,
                        height: 48,
                      }}
                    >
                      <CheckCircleIcon />
                    </Avatar>
                  </Box>
                  <Box>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
                      {logsError ? t('common.emptyValue') : logs.filter((log) => !log.error_message && !log.is_changed).length}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {t('logs.unchanged')}
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
                    background: 'linear-gradient(90deg, #f59e0b 0%, rgba(245, 158, 11, 0.6) 100%)',
                  },
                  position: 'relative',
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: 'rgba(245, 158, 11, 0.1)',
                        color: '#f59e0b',
                        width: 48,
                        height: 48,
                      }}
                    >
                      <WarningIcon />
                    </Avatar>
                  </Box>
                  <Box>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
                      {logsError ? t('common.emptyValue') : logs.filter((log) => log.is_changed && !log.error_message).length}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {t('logs.changed')}
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
                      <ErrorIcon />
                    </Avatar>
                  </Box>
                  <Box>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 0.5 }}>
                      {logsError ? t('common.emptyValue') : logs.filter((log) => log.error_message).length}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {t('logs.error')}
                    </Typography>
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
                {t('logs.tableTitle')}
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(25, 118, 210, 0.05)' }}>
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
                        <CircularProgress size={32} sx={{ color: '#1976d2' }} />
                        <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                          {t('common.loading')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow
                        key={log.id}
                        sx={{
                          '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.03)' },
                          transition: 'all 0.2s ease',
                        }}
                      >
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
                      <TableCell colSpan={4} sx={{ textAlign: 'center', py: 8 }}>
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
                          <ListAltIcon sx={{ fontSize: 40 }} />
                        </Avatar>
                        <Typography variant="h6" sx={{ mb: 1 }}>
                          {t('logs.noLogs')}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {t('logs.noLogsSubtitle')}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ p: 3, borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
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
          </Paper>
        </>
      ) : (
        <Paper
          sx={{
            borderRadius: 4,
            border: '1px solid rgba(0, 0, 0, 0.06)',
            p: 8,
            textAlign: 'center',
          }}
        >
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
            <ListAltIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t('logs.selectTaskEmpty')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('logs.selectTaskSubtitle')}
          </Typography>
        </Paper>
      )}

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
        <FooterLinks accent="#1976d2" />
      </Box>
    </Box>
  );
};

export default MonitorLogs;
