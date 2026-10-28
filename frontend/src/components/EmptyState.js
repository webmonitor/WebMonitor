import React from 'react';
import { Avatar, Box, Typography } from '@mui/material';

import { UI_COLORS } from '../theme/tokens';

/**
 * 空状态：列表、表格、选择器都用同一套图标 + 标题 + 说明（+ 可选操作）。
 *
 * 不再每页各写一个大头像和不同间距。
 */
const EmptyState = ({ icon, title, subtitle, action, compact = false }) => (
  <Box sx={{ textAlign: 'center', py: compact ? 4 : 6, px: 2 }}>
    {icon && (
      <Avatar
        sx={{
          bgcolor: 'rgba(16, 185, 129, 0.1)',
          color: UI_COLORS.primary,
          width: 64,
          height: 64,
          mx: 'auto',
          mb: 2,
          '& svg': { fontSize: 30 },
        }}
      >
        {icon}
      </Avatar>
    )}
    <Typography variant="h6" component="p" sx={{ fontWeight: 600, mb: subtitle ? 1 : 0 }}>
      {title}
    </Typography>
    {subtitle && (
      <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 460, mx: 'auto' }}>
        {subtitle}
      </Typography>
    )}
    {action && <Box sx={{ mt: 3 }}>{action}</Box>}
  </Box>
);

export default EmptyState;
