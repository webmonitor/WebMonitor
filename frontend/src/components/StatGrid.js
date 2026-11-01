import React from 'react';
import { Grid } from '@mui/material';

import StatCard from './StatCard';

/**
 * 统计卡条：每页顶部的指标只通过这里渲染。
 *
 * items: [{ key, title, value, subtitle }]
 * — `value` 为 null/undefined 时 StatCard 会显示 "—"，不伪造 0。
 */
const mdSize = (count) => (count >= 4 ? 3 : Math.floor(12 / Math.max(count, 1)));

const StatGrid = ({ items, sx }) => (
  <Grid container spacing={2} sx={{ mb: 4, ...sx }}>
    {items.map((item) => (
      <Grid key={item.key} size={{ xs: items.length === 3 ? 12 : 6, md: mdSize(items.length) }}>
        <StatCard title={item.title} value={item.value} subtitle={item.subtitle} />
      </Grid>
    ))}
  </Grid>
);

export default StatGrid;
