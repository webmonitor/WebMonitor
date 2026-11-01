import React from 'react';
import { Box, Typography } from '@mui/material';

import { UI_COLORS, UI_FONTS } from '../theme/tokens';

/**
 * WebMonitor 标志：一页纸 + 一个状态灯。
 *
 * 纯色描边，没有渐变、光晕或位图。`size` 是图形边长，
 * `BrandLockup` 把它和字标排在一起。
 */
const Mark = ({ size = 24, color = 'currentColor', sx }) => (
  <Box
    component="svg"
    viewBox="0 0 24 24"
    role="img"
    aria-label="WebMonitor"
    sx={{ display: 'block', width: size, height: size, color, flexShrink: 0, ...sx }}
  >
    <rect x="3" y="3.5" width="14" height="17" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <path d="M6.5 8h7M6.5 12h7M6.5 16h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    <circle cx="18.5" cy="18" r="2.2" fill="currentColor" />
  </Box>
);

export const BrandLockup = ({ size = 22, sx, titleSx }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, ...sx }}>
    <Mark size={size} color={UI_COLORS.primary} />
    <Typography
      component="span"
      sx={{ fontFamily: UI_FONTS.ui, fontSize: 15, fontWeight: 500, letterSpacing: 0, color: 'text.primary', ...titleSx }}
    >
      WebMonitor
    </Typography>
  </Box>
);

export default Mark;
