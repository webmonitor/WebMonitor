/**
 * 界面设计令牌：颜色、圆角、描边只在这里定义一次。
 *
 * 页面里不要再写 ad-hoc 的十六进制值或各不相同的圆角/阴影——这类差异
 * 正是之前每个页面"看起来像不同产品"的原因。
 */

/** 统计卡、按钮与强调色的唯一来源。 */
export const UI_COLORS = {
  primary: '#10b981',
  primaryDark: '#059669',
  info: '#2563eb',
  warning: '#f59e0b',
  danger: '#ef4444',
  accent: '#8b5cf6',
};

/** 卡片表面：统一的纯色背景与描边。 */
export const UI_SURFACE = {
  card: '#ffffff',
  border: '1px solid rgba(0, 0, 0, 0.06)',
  divider: '1px solid rgba(0, 0, 0, 0.06)',
  pageBackground: '#f8fafc',
  radius: 3,
};

/** 页面标题排版：所有私有页面共用同一组尺寸。 */
export const UI_TYPE = {
  pageTitleVariant: 'h3',
  sectionTitleVariant: 'h6',
  statValueVariant: 'h4',
};
