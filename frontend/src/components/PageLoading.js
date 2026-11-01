import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

/** 路由级加载占位：懒加载 chunk 下载期间显示。 */
const PageLoading = () => {
  const { t } = useTranslation();

  return (
    <Box
      role="status"
      aria-live="polite"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        minHeight: '60vh',
        width: '100%',
      }}
    >
      <CircularProgress />
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {t('common.loading')}
      </Typography>
    </Box>
  );
};

export default PageLoading;
