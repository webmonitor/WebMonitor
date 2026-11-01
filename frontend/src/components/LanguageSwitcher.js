import React from 'react';
import { Box, Button, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { UI_COLORS } from '../theme/tokens';

const LANGUAGE_OPTIONS = [
  { value: 'en', labelKey: 'language.en' },
  { value: 'zh-CN', labelKey: 'language.zhCN' },
];

/**
 * 语言切换：两段文字，选中项用抬高层，不抢主操作的强调色。
 */
const LanguageSwitcher = ({ sx = {} }) => {
  const { t, i18n } = useTranslation();

  return (
    <Tooltip title={t('language.label')}>
      <Box
        role="group"
        aria-label={t('language.label')}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          p: '2px',
          borderRadius: 2,
          backgroundColor: UI_COLORS.raised,
          ...sx,
        }}
      >
        {LANGUAGE_OPTIONS.map((option) => {
          const isActive = i18n.language === option.value;

          return (
            <Button
              key={option.value}
              onClick={() => i18n.changeLanguage(option.value)}
              disableElevation
              aria-pressed={isActive}
              sx={{
                minWidth: 40,
                minHeight: 24,
                px: 1,
                py: 0,
                borderRadius: 1,
                fontSize: 12,
                fontWeight: 500,
                lineHeight: 1.4,
                color: isActive ? 'text.primary' : 'text.secondary',
                backgroundColor: isActive ? UI_COLORS.surface : 'transparent',
                '&:hover': {
                  backgroundColor: isActive ? UI_COLORS.surface : 'transparent',
                  color: 'text.primary',
                },
              }}
            >
              {t(option.labelKey)}
            </Button>
          );
        })}
      </Box>
    </Tooltip>
  );
};

export default LanguageSwitcher;
