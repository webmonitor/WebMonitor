import React from 'react';
import { Box, Typography } from '@mui/material';

import { UI_COLORS } from '../theme/tokens';

const TONES = {
  neutral: UI_COLORS.muted,
  positive: UI_COLORS.success,
  warning: UI_COLORS.warning,
  danger: UI_COLORS.danger,
  accent: UI_COLORS.primary,
};

/**
 * 状态标记：一个 6px 圆点 + 文字。
 *
 * 取代彩色的胶囊标签。颜色只放在圆点上，文字保持正文色，
 * 所以一屏里不会出现一排互相竞争的标签。
 */
const StatusBadge = ({ tone = 'neutral', label, sx }) => (
  <Box
    component="span"
    sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75, fontSize: 12, lineHeight: '16px', ...sx }}
  >
    <Box
      component="span"
      sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: TONES[tone] || TONES.neutral, flexShrink: 0 }}
    />
    <Typography component="span" variant="caption" sx={{ color: tone === 'neutral' ? 'text.secondary' : 'text.primary' }}>
      {label}
    </Typography>
  </Box>
);

export default StatusBadge;
