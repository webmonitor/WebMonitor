import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * 页面标题区：唯一的标题排版。
 *
 * 左侧标题 + 副标题，右侧可选操作按钮；窄屏自动堆叠。
 */
const PageHeader = ({ title, subtitle, action }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: { xs: 'flex-start', sm: 'center' },
      flexDirection: { xs: 'column', sm: 'row' },
      gap: 2,
      mb: 4,
    }}
  >
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="h3" component="h1" sx={{ fontWeight: 700, color: '#1a1a1a', mb: 1 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {action}
  </Box>
);

export default PageHeader;
