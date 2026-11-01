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
      borderRadius: 3,
      border: UI_SURFACE.border,
      backgroundColor: UI_SURFACE.card,
      overflow: 'hidden',
      ...sx,
    }}
  >
    {(title || action) && (
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          minHeight: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
          borderBottom: UI_SURFACE.divider,
        }}
      >
        <Typography variant="h6" component="h2" sx={{ fontWeight: 500, minWidth: 0 }}>
          {title}
        </Typography>
        {action}
      </Box>
    )}
    <Box sx={{ ...(bareBody ? {} : { p: 2.5 }), ...contentSx }}>{children}</Box>
  </Paper>
);

export default SectionCard;
