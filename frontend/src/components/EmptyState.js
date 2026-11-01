import React from 'react';
import { Box, Typography } from '@mui/material';

import { UI_COLORS } from '../theme/tokens';

/**
 * 空状态：列表、表格、选择器都用同一套图标 + 标题 + 说明（+ 可选操作）。
 */
const EmptyState = ({ icon, title, subtitle, action, compact = false }) => (
  <Box sx={{ textAlign: 'center', py: compact ? 4 : 6, px: 2 }}>
    {icon && (
      <Box sx={{ color: UI_COLORS.muted, display: 'flex', justifyContent: 'center', mb: 1.5, '& svg': { fontSize: 28 } }}>
        {icon}
      </Box>
    )}
    <Typography variant="subtitle1" component="p" sx={{ color: 'text.primary' }}>
      {title}
    </Typography>
    {subtitle && (
      <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 440, mx: 'auto', mt: 0.5 }}>
        {subtitle}
      </Typography>
    )}
    {action && <Box sx={{ mt: 2.5 }}>{action}</Box>}
  </Box>
);

export default EmptyState;
