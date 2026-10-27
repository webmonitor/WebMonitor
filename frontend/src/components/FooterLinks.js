/**
 * 页脚对外链接：项目仓库 + 维护者主页。
 *
 * 六个页面原本各自复制了一份 href 与样式；地址集中在 `utils/links.js`，
 * 这里只保留一处渲染，避免再次出现「改了五处漏了一处」。
 */
import { Box, Button, Typography } from '@mui/material';
import { Code as CodeIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

import { PROJECT_AUTHOR_URL, PROJECT_REPO_URL } from '../utils/links';

const withAlpha = (hex, alpha) => {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const FooterLinks = ({ accent = '#10b981' }) => {
  const { t } = useTranslation();

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<CodeIcon />}
        href={PROJECT_REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          borderColor: withAlpha(accent, 0.5),
          color: accent,
          textTransform: 'none',
          borderRadius: 2,
          '&:hover': {
            borderColor: accent,
            backgroundColor: withAlpha(accent, 0.1),
          },
        }}
      >
        {t('common.visitGithub')}
      </Button>
      <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
        {t('common.author')}{' '}
        <Box
          component="a"
          href={PROJECT_AUTHOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ color: accent, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          ox0pine
        </Box>
      </Typography>
    </>
  );
};

export default FooterLinks;
