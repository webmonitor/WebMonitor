import React from 'react';
import { Box, Paper, Typography } from '@mui/material';

import { UI_SURFACE } from '../theme/tokens';

/**
 * 内容分区卡片：标题栏 + 内容，全站统一的圆角、描边与内边距。
 *
 * `bareBody` 用于表格：内容区不加内边距，交给 TableContainer 自己滚。
 */
const SectionCard = ({ title, action, children, sx, contentSx, bareBody = false, id }) => (
  <Paper
    id={id}
    sx={{
      borderRadius: UI_SURFACE.radius,
      border: UI_SURFACE.border,
      backgroundColor: '#ffffff',
      overflow: 'hidden',
      ...sx,
    }}
  >
    {(title || action) && (
      <Box
        sx={{
          px: 3,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          borderBottom: UI_SURFACE.divider,
        }}
      >
        <Typography variant="h6" component="h2" sx={{ fontWeight: 600, minWidth: 0 }}>
          {title}
        </Typography>
        {action}
      </Box>
    )}
    <Box sx={{ ...(bareBody ? {} : { p: 3 }), ...contentSx }}>{children}</Box>
  </Paper>
);

export default SectionCard;
