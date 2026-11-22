import React, { useState } from 'react';
import { Box, Button, Container, IconButton, Menu, MenuItem } from '@mui/material';
import { GitHub as GitHubIcon, Menu as MenuIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import LanguageSwitcher from './LanguageSwitcher';
import { BrandLockup } from './WebMonitorLogo';
import { PROJECT_REPO_URL } from '../utils/links';
import { UI_COLORS, UI_SURFACE } from '../theme/tokens';

/** 公开页面共用导航；窄屏把全部入口收进同一个可键盘操作的菜单。 */
const PublicHeader = ({ position = 'sticky', fluid = false, leading = null, brandAccessory = null }) => {
  const { t } = useTranslation();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const closeMenu = () => setMenuAnchor(null);

  return (
    <Box
      component="header"
      sx={{
        position,
        top: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        height: 64,
        backgroundColor: UI_COLORS.surface,
        borderBottom: UI_SURFACE.divider,
      }}
    >
      <Container maxWidth={fluid ? false : 'lg'} sx={{ px: fluid ? { xs: 2, md: 3 } : undefined }}>
        <Box sx={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
            {leading}
            <Box
              component={RouterLink}
              to="/"
              aria-label={t('common.backHome')}
              sx={{
                color: 'inherit',
                textDecoration: 'none',
                borderRadius: 1,
                '&:focus-visible': { outline: `2px solid ${UI_COLORS.primary}`, outlineOffset: 4 },
              }}
            >
              <BrandLockup size={22} />
            </Box>
            {brandAccessory}
          </Box>

          <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 1 }}>
            <Button component={RouterLink} to="/documentation" sx={{ color: 'text.secondary' }}>
              {t('home.navDocs')}
            </Button>
            <LanguageSwitcher />
            <Button component={RouterLink} to="/login" sx={{ color: 'text.secondary' }}>
              {t('home.navLogin')}
            </Button>
            <Button component={RouterLink} to="/register" variant="contained" sx={{ px: 2 }}>
              {t('home.navRegister')}
            </Button>
            <IconButton
              aria-label="GitHub"
              href={PROJECT_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <GitHubIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Box>

          <Box sx={{ display: { xs: 'flex', sm: 'none' }, alignItems: 'center' }}>
            <IconButton
              aria-label={t('common.openPageMenu')}
              aria-controls={menuAnchor ? 'public-navigation' : undefined}
              aria-expanded={Boolean(menuAnchor)}
              onClick={(event) => setMenuAnchor(event.currentTarget)}
            >
              <MenuIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
        </Box>
      </Container>

      <Menu
        id="public-navigation"
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem component={RouterLink} to="/documentation" onClick={closeMenu}>
          {t('home.navDocs')}
        </MenuItem>
        <MenuItem component={RouterLink} to="/login" onClick={closeMenu}>
          {t('home.navLogin')}
        </MenuItem>
        <MenuItem component={RouterLink} to="/register" onClick={closeMenu}>
          {t('home.navRegister')}
        </MenuItem>
        <MenuItem component="a" href={PROJECT_REPO_URL} target="_blank" rel="noopener noreferrer" onClick={closeMenu}>
          <GitHubIcon sx={{ fontSize: 18 }} />
          {t('common.repoLink')}
        </MenuItem>
        <Box sx={{ px: 2, pt: 1, pb: 0.5 }}>
          <LanguageSwitcher />
        </Box>
      </Menu>
    </Box>
  );
};

export default PublicHeader;
