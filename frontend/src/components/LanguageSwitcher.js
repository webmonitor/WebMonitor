import React from 'react';
import { Box, Button, Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';

import { UI_COLORS } from '../theme/tokens';

const LANGUAGE_OPTIONS = [
  { value: 'en', labelKey: 'language.en' },
  { value: 'zh-CN', labelKey: 'language.zhCN' },
];

const LanguageSwitcher = ({ sx = {} }) => {
  const { t, i18n } = useTranslation();

  return (
    <Tooltip title={t('language.label')}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          p: 0.5,
          borderRadius: 999,
          backgroundColor: 'rgba(148, 163, 184, 0.12)',
          border: '1px solid rgba(148, 163, 184, 0.18)',
          backdropFilter: 'blur(8px)',
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
              sx={{
                minWidth: 56,
                px: 1.75,
                py: 0.75,
                borderRadius: 999,
                textTransform: 'none',
                fontSize: '0.8125rem',
                fontWeight: 700,
                lineHeight: 1,
                color: isActive ? '#ffffff' : '#64748b',
                background: isActive
                  ? `linear-gradient(135deg, ${UI_COLORS.primary} 0%, ${UI_COLORS.primaryDark} 100%)`
                  : 'transparent',
                boxShadow: isActive ? '0 6px 18px rgba(16, 185, 129, 0.28)' : 'none',
                '&:hover': {
                  background: isActive
                    ? `linear-gradient(135deg, ${UI_COLORS.primary} 0%, ${UI_COLORS.primaryDark} 100%)`
                    : 'rgba(15, 23, 42, 0.04)',
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
