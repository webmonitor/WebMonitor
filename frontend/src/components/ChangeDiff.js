import React from 'react';
import { Box, Typography } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { UI_COLORS, UI_FONTS, UI_SURFACE } from '../theme/tokens';

const previewLines = (value, limit, maxLineLength) =>
  value
    ? value
        .split('\n')
        .slice(0, limit)
        .map((line) => (line.length > maxLineLength ? `${line.slice(0, maxLineLength)}…` : line))
    : [];

const DiffSide = ({ label, prefix, lines, muted = false }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: '56px minmax(0, 1fr)', gap: 1, py: 0.75 }}>
    <Typography variant="caption" sx={{ color: 'text.secondary', pt: '1px' }}>
      {label}
    </Typography>
    <Box sx={{ minWidth: 0 }}>
      {lines.map((line, index) => (
        <Typography
          key={`${prefix}-${index}-${line}`}
          sx={{
            fontFamily: UI_FONTS.mono,
            fontSize: 12,
            lineHeight: 1.5,
            color: muted ? 'text.secondary' : 'text.primary',
            overflowWrap: 'anywhere',
            whiteSpace: 'pre-wrap',
          }}
        >
          <Box component="span" sx={{ color: muted ? 'text.secondary' : UI_COLORS.primary, mr: 0.75 }}>
            {prefix}
          </Box>
          {line}
        </Typography>
      ))}
    </Box>
  </Box>
);

/** before → after 对照线：变化内容在日志、仪表盘与公开预览中使用同一语法。 */
const ChangeDiff = ({ oldContent, newContent, oldLines = 1, newLines = 2, maxLineLength = 160, sx }) => {
  const { t } = useTranslation();
  const before = previewLines(oldContent, oldLines, maxLineLength);
  const after = previewLines(newContent, newLines, maxLineLength);

  if (before.length === 0 && after.length === 0) {
    return null;
  }

  return (
    <Box
      role="group"
      aria-label={t('common.contentComparison')}
      sx={{
        borderLeft: `2px solid ${UI_COLORS.primary}`,
        backgroundColor: UI_COLORS.background,
        borderRadius: '0 8px 8px 0',
        borderTop: UI_SURFACE.divider,
        borderRight: UI_SURFACE.divider,
        borderBottom: UI_SURFACE.divider,
        px: 1.5,
        py: 0.5,
        ...sx,
      }}
    >
      {before.length > 0 && <DiffSide label={t('common.before')} prefix="−" lines={before} muted />}
      {after.length > 0 && <DiffSide label={t('common.after')} prefix="+" lines={after} />}
    </Box>
  );
};

export default ChangeDiff;
