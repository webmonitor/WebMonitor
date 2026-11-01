import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * 页面标题区：唯一的标题排版。
 *
 * 标题下面一行说明，右侧可选操作；窄屏自动堆叠。
 */
const PageHeader = ({ title, subtitle, action }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: { xs: 'flex-start', sm: 'flex-end' },
      flexDirection: { xs: 'column', sm: 'row' },
      gap: 2,
      mb: 4,
    }}
  >
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="h3" component="h1" sx={{ color: 'text.primary' }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75, maxWidth: '64ch' }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {action}
  </Box>
);

export default PageHeader;
