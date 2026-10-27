import React, { useState } from 'react';
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
  Grid,
  Card,
  CardContent,
  Button,
  Avatar,
} from '@mui/material';
import {
  Code as CodeIcon,
  ListAlt as ListAltIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import axios from 'axios';

import { formatDateTime } from '../utils/date';
import { isChineseLanguage } from '../utils/i18n';

const MonitorLogs = () => {
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const { t, i18n } = useTranslation();
  const isChinese = isChineseLanguage(i18n.language);

  const content = isChinese ? {
    title: '监控日志',
    subtitle: '查看和分析监控任务的执行记录',
    selectTask: '选择监控任务',
    loadError: '加载监控日志失败',
    totalLogs: '总日志数',
    unchanged: '无变化',
    changed: '内容变化',
    error: '错误',
    tableTitle: '监控日志记录',
    checkTime: '检查时间',
    status: '状态',
    newContent: '新内容',
    errorInfo: '错误信息',
    noLogs: '暂无监控日志',
    noLogsSubtitle: '该任务还没有执行过监控',
    showing: '显示第',
    to: '-',
    of: '条，共',
    records: '条记录',
    rowsPerPage: '每页显示',
    selectTaskEmpty: '请选择监控任务',
    selectTaskSubtitle: '选择一个监控任务查看其执行日志',
  } : {
    title: 'Monitor logs',
    subtitle: 'View and analyze execution records for your monitoring tasks.',
    selectTask: 'Select monitor task',
    loadError: 'Failed to load monitor logs',
    totalLogs: 'Total logs',
    unchanged: 'Unchanged',
    changed: 'Changed',
    error: 'Error',
    tableTitle: 'Monitoring log records',
    checkTime: 'Checked at',
    status: 'Status',
    newContent: 'New content',
    errorInfo: 'Error message',
    noLogs: 'No monitor logs yet',
    noLogsSubtitle: 'This task has not run yet.',
    showing: 'Showing',
    to: '-',
    of: 'of',
    records: 'records',
    rowsPerPage: 'Rows per page',
    selectTaskEmpty: 'Please select a monitor task',
    selectTaskSubtitle: 'Choose a task to view its execution logs.',
  };

  const { data: tasks = [] } = useQuery({
    queryKey: ['monitor-tasks'],
    queryFn: async () => {
      const response = await axios.get('/api/monitor-tasks');
      return response.data;
    },
  });

  const { data: logsData = [], error } = useQuery({
    queryKey: ['monitor-logs', selectedTaskId, page, rowsPerPage],
    queryFn: async () => {
      if (!selectedTaskId) return [];
      const response = await axios.get(
        `/api/monitor-tasks/${selectedTaskId}/logs?page=${page}&limit=${rowsPerPage}`
      );
      return response.data;
    },
    enabled: !!selectedTaskId,
    placeholderData: keepPreviousData,
  });

  const logs = Array.isArray(logsData) ? logsData : logsData?.logs || [];
  const totalCount = logsData?.total || logs.length || 0;

  const truncateContent = (value, maxLength = 100) => {
    if (!value) return '-';
    return value.length > maxLength ? `${value.substring(0, maxLength)}...` : value;
  };

  const getPaginationSummary = () => {
    const start = (page - 1) * rowsPerPage + 1;
    const end = Math.min(page * rowsPerPage, totalCount);

    if (isChinese) {
      return `显示第 ${start} - ${end} 条，共 ${totalCount} 条记录`;
    }

    return `Showing ${start}-${end} of ${totalCount} records`;
  };

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
            {content.title}
          </Typography>
          <Typography variant="body1" sx={{ color: 'text.secondary' }}>
            {content.subtitle}
          </Typography>
        </Box>
        <FormControl sx={{ minWidth: 220 }}>
          <InputLabel>{content.selectTask}</InputLabel>
          <Select
            value={selectedTaskId}
            label={content.selectTask}
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

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {content.loadError}: {error.message}
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
                      {totalCount}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {content.totalLogs}
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
                      {logs.filter((log) => !log.error_message && !log.is_changed).length}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {content.unchanged}
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
                      {logs.filter((log) => log.is_changed && !log.error_message).length}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {content.changed}
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
                      {logs.filter((log) => log.error_message).length}
                    </Typography>
                    <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                      {content.error}
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
                {content.tableTitle}
              </Typography>
            </Box>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(25, 118, 210, 0.05)' }}>
                    <TableCell sx={{ fontWeight: 600 }}>{content.checkTime}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{content.status}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{content.newContent}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{content.errorInfo}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log) => (
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
                            label={content.error}
                            color="error"
                            size="small"
                            icon={<ErrorIcon />}
                            variant="outlined"
                          />
                        ) : log.is_changed ? (
                          <Chip
                            label={content.changed}
                            color="warning"
                            size="small"
                            icon={<WarningIcon />}
                            variant="outlined"
                          />
                        ) : (
                          <Chip
                            label={content.unchanged}
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
                  ))}
                  {logs.length === 0 && (
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
                          {content.noLogs}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          {content.noLogsSubtitle}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {totalCount > 0 && (
              <Box sx={{ p: 3, borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {getPaginationSummary()}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {content.rowsPerPage}:
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
                      count={Math.ceil(totalCount / rowsPerPage)}
                      page={page}
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
            )}
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
            {content.selectTaskEmpty}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {content.selectTaskSubtitle}
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
        <Button
          variant="outlined"
          size="small"
          startIcon={<CodeIcon />}
          href="https://github.com/qfpqhyl"
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            borderColor: 'rgba(25, 118, 210, 0.5)',
            color: '#1976d2',
            textTransform: 'none',
            borderRadius: 2,
            '&:hover': {
              borderColor: '#1976d2',
              backgroundColor: 'rgba(25, 118, 210, 0.1)',
            },
          }}
        >
          {t('common.visitGithub')}
        </Button>
      </Box>
    </Box>
  );
};

export default MonitorLogs;
