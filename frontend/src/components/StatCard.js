import React from 'react';
import { Box, Typography } from '@mui/material';

import { UI_COLORS, UI_FONTS, UI_SURFACE } from '../theme/tokens';

/**
 * 统计卡：标签、读数、说明。
 *
 * 没有图标、迷你图和彩色装饰；数值用等宽字体并右对齐成一组读数。
 * 数值为空时显示 "—"，让"没有数据"和"数值为 0"在界面上可区分。
 */
const StatCard = ({ title, value, subtitle }) => {
  const hasValue = value !== null && value !== undefined && value !== '';

  return (
    <Box
      sx={{
        height: '100%',
        background: UI_SURFACE.card,
        border: UI_SURFACE.border,
        borderRadius: 3,
        px: 2.5,
        py: 2,
      }}
    >
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
        {title}
      </Typography>
      <Typography
        component="div"
        sx={{
          fontFamily: UI_FONTS.mono,
          fontVariantNumeric: 'tabular-nums',
          fontSize: 30,
          lineHeight: 1.15,
          fontWeight: 500,
          color: UI_COLORS.text,
          mt: 1,
        }}
      >
        {hasValue ? value : '—'}
      </Typography>
      {subtitle && (
        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
  );
};

export default StatCard;
