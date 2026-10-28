import React from 'react';
import { Card, CardContent, Typography, Box, alpha } from '@mui/material';

import { UI_SURFACE } from '../theme/tokens';

/**
 * 统计卡：只展示调用方给的数值。
 *
 * 没有趋势、没有百分比进度条——那些数字以前是编的。数值为空时显示 "—"，
 * 让"没有数据"和"数值为 0"在界面上可区分。
 */
const StatCard = ({ title, value, icon, color, subtitle }) => {
  const hasValue = value !== null && value !== undefined && value !== '';

  return (
    <Card
      sx={{
        height: '100%',
        background: UI_SURFACE.card,
        border: UI_SURFACE.border,
        borderRadius: UI_SURFACE.radius,
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: UI_SURFACE.shadowSoft,
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.6)} 100%)`,
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              background: `linear-gradient(45deg, ${color} 30%, ${alpha(color, 0.7)} 90%)`,
              color: 'white',
              borderRadius: 3,
              p: 1.5,
              display: 'flex',
              boxShadow: `0 4px 15px ${alpha(color, 0.3)}`,
            }}
          >
            {icon}
          </Box>
        </Box>

        <Typography
          variant="h3"
          component="div"
          sx={{
            fontWeight: 700,
            color: '#1a1a1a',
            mb: 0.5,
            fontSize: { xs: '1.8rem', md: '2.2rem' },
          }}
        >
          {hasValue ? value : '—'}
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', fontWeight: 500, mb: subtitle ? 0.5 : 0 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
