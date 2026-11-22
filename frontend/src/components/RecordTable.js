import React from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

import { UI_SURFACE } from '../theme/tokens';

/**
 * 同一份列定义渲染桌面表格和窄屏记录列表，避免为移动端复制业务字段。
 * primary 列作为记录标题，actions 列固定在记录末尾，其余字段保留标签。
 */
const RecordTable = ({
  columns,
  rows,
  rowKey,
  minWidth = 760,
  loading = false,
  error = null,
  errorMessage = '',
  onRetry,
  emptyState,
  ariaLabel,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <Box role="status" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, py: 8 }}>
        <CircularProgress />
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('common.loading')}
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="error"
          action={
            onRetry ? (
              <Button color="inherit" size="small" onClick={() => onRetry()}>
                {t('common.retry')}
              </Button>
            ) : null
          }
        >
          {errorMessage || t('common.unknownError')}
        </Alert>
      </Box>
    );
  }

  if (rows.length === 0) {
    return emptyState || null;
  }

  const primaryColumn = columns.find((column) => column.primary) || columns[0];
  const detailColumns = columns.filter(
    (column) => column.id !== primaryColumn.id && !column.actions && column.mobile !== false,
  );
  const actionColumn = columns.find((column) => column.actions);

  return (
    <>
      <Box sx={{ display: { xs: 'block', lg: 'none' } }}>
        {rows.map((row) => (
          <Box
            component="article"
            key={rowKey(row)}
            sx={{ px: 2.5, py: 2.5, borderBottom: UI_SURFACE.divider, '&:last-child': { borderBottom: 0 } }}
          >
            <Box sx={{ minWidth: 0 }}>{primaryColumn.render(row)}</Box>
            {detailColumns.length > 0 && (
              <Box sx={{ mt: 2, display: 'grid', gap: 1.5 }}>
                {detailColumns.map((column) => (
                  <Box
                    key={column.id}
                    sx={{ display: 'grid', gridTemplateColumns: 'minmax(88px, 0.35fr) minmax(0, 1fr)', gap: 2 }}
                  >
                    <Typography variant="caption" sx={{ color: 'text.secondary', pt: 0.25 }}>
                      {column.label}
                    </Typography>
                    <Box sx={{ minWidth: 0, textAlign: column.align === 'right' ? 'right' : 'left' }}>
                      {column.render(row)}
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
            {actionColumn && (
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 0.5 }}>
                {actionColumn.render(row)}
              </Box>
            )}
          </Box>
        ))}
      </Box>

      <TableContainer sx={{ display: { xs: 'none', lg: 'block' }, overflowX: 'auto' }}>
        <Table sx={{ minWidth }} aria-label={ariaLabel}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.id} align={column.align || 'left'} sx={column.headerSx}>
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={rowKey(row)}>
                {columns.map((column) => (
                  <TableCell key={column.id} align={column.align || 'left'} sx={column.cellSx}>
                    {column.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};

export default RecordTable;
