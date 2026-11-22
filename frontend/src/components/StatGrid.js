import React from 'react';
import { Box } from '@mui/material';

import StatCard from './StatCard';
import { UI_COLORS } from '../theme/tokens';

/** 一页一条值班读数带；细分隔线代替彼此竞争的独立卡片。 */
const StatGrid = ({ items, sx }) => (
  <Box
    sx={{
      mb: 4,
      p: '1px',
      display: 'grid',
      gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: `repeat(${items.length}, minmax(0, 1fr))` },
      gap: '1px',
      borderRadius: 3,
      backgroundColor: UI_COLORS.hairline,
      overflow: 'hidden',
      ...sx,
    }}
  >
    {items.map((item, index) => (
      <Box
        key={item.key}
        sx={{ gridColumn: items.length === 3 && index === 2 ? { xs: '1 / -1', md: 'auto' } : 'auto' }}
      >
        <StatCard title={item.title} value={item.value} subtitle={item.subtitle} />
      </Box>
    ))}
  </Box>
);

export default StatGrid;
