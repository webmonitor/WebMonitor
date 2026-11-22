/**
 * 界面设计令牌：颜色、字体、圆角、动效只在这里定义一次。
 *
 * 方向是"运行值班日志"：温暖纸色中性阶与清晰发丝线，强调色只用于主操作、
 * 当前位置和变化对照；琥珀色只表示"内容变了"，数字和时间用等宽字体。
 */

/** 暖石墨中性阶 + 语义色。 */
export const UI_COLORS = {
  background: '#f5f4f1',
  surface: '#fffefa',
  raised: '#eceae5',
  hairline: 'rgba(37, 40, 35, 0.1)',

  text: '#252823',
  secondary: '#555950',
  muted: '#72766d',

  primary: '#1f6549',
  primaryDark: '#174d38',
  primarySoft: 'rgba(31, 101, 73, 0.08)',

  codeBackground: '#252823',
  codeText: '#f4f3ee',
  codeBorder: 'rgba(244, 243, 238, 0.12)',
  codeMuted: 'rgba(244, 243, 238, 0.64)',

  success: '#267155',
  warning: '#a85416',
  danger: '#ad3028',
  info: '#596158',
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
  shadowFloating: '0 24px 48px rgba(37, 40, 35, 0.08)',
};

