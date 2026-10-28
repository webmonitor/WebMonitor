import React from 'react';
import { Grid } from '@mui/material';

import StatCard from './StatCard';

/**
 * 统计卡条：每页顶部的指标只通过这里渲染。
 *
 * items: [{ key, title, value, icon, color, subtitle }]
 * — `value` 为 null/undefined 时 StatCard 会显示 "—"，不伪造 0。
 */
// 列宽按卡片数量推导：3 张卡铺满一行，而不是留下一个空位
const mdSize = (count) => (count >= 4 ? 3 : Math.floor(12 / Math.max(count, 1)));

const StatGrid = ({ items, sx }) => (
  <Grid container spacing={3} sx={{ mb: 4, ...sx }}>
    {items.map((item) => (
      <Grid key={item.key} size={{ xs: 12, sm: 6, md: mdSize(items.length) }}>
        <StatCard
          title={item.title}
          value={item.value}
          icon={item.icon}
          color={item.color}
          subtitle={item.subtitle}
        />
      </Grid>
    ))}
  </Grid>
);

export default StatGrid;
