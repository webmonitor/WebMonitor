/**
 * 界面设计令牌：颜色、字体、圆角、动效只在这里定义一次。
 *
 * 方向是"夜班仪表台"：中性色带一点墨蓝，铬件保持安静；强调色是深松绿，
 * 只用于主操作与选中态；琥珀色只表示"内容变了"；数字和时间用等宽字体。
 */

/** 墨蓝色中性阶 + 语义色。 */
export const UI_COLORS = {
  // 表面阶：页面、卡片、抬高面
  background: '#f5f7fa',
  surface: '#ffffff',
  raised: '#eceff4',
  hairline: 'rgba(17, 24, 39, 0.08)',

  // 三档文字
  text: '#111827',
  secondary: '#4b5565',
  muted: '#6b7487',

  // 唯一强调色：深松绿，白字对比度 6.8:1
  primary: '#12684b',
  primaryDark: '#0c5239',
  primarySoft: 'rgba(18, 104, 75, 0.08)',

  // 代码块：深色石墨，和页面中性阶同一族
  codeBackground: '#11141c',
  codeText: '#eef0f5',
  codeBorder: 'rgba(255, 255, 255, 0.08)',
  codeMuted: 'rgba(238, 240, 245, 0.6)',

  // 语义色只用来表示含义
  success: '#16865f',
  warning: '#b45309',
  danger: '#b42318',
  info: '#475569',
};

/** 字体：衬线只做标题，界面用无衬线，读数与时间用等宽。 */
export const UI_FONTS = {
  display: ['"Source Serif Pro"', '"Noto Serif SC"', 'Georgia', '"Times New Roman"', 'SimSun', 'serif'].join(','),
  ui: [
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    '"Noto Sans SC"',
    '"PingFang SC"',
    '"Microsoft YaHei"',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(','),
  mono: ['"SF Mono"', '"IBM Plex Mono"', 'Menlo', 'Consolas', '"Liberation Mono"', 'monospace'].join(','),
};

/** 卡片表面：统一的纯色背景、发丝描边与圆角。 */
export const UI_SURFACE = {
  card: UI_COLORS.surface,
  border: `1px solid ${UI_COLORS.hairline}`,
  divider: `1px solid ${UI_COLORS.hairline}`,
  pageBackground: UI_COLORS.background,
  radius: 12,
  radiusPanel: 16,
  shadowFloating: '0 24px 60px rgba(17, 24, 39, 0.08)',
};

/** 页面标题排版：所有私有页面共用同一组尺寸。 */
export const UI_TYPE = {
  pageTitleVariant: 'h3',
  sectionTitleVariant: 'h6',
  statValueVariant: 'h4',
};

/** 动效：一条缓动曲线，两种时长。 */
export const UI_MOTION = {
  ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
  fast: 140,
  base: 220,
};
