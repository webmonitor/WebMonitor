import React from 'react';
import { Box, Button, Container, Divider, IconButton, Stack, Typography } from '@mui/material';
import { GitHub as GitHubIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { BrandLockup } from '../components/WebMonitorLogo';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { PROJECT_AUTHOR_URL, PROJECT_REPO_URL } from '../utils/links';
import { UI_COLORS, UI_FONTS, UI_SURFACE } from '../theme/tokens';

const mono = { fontFamily: UI_FONTS.mono, fontVariantNumeric: 'tabular-nums' };

const Field = ({ label, value }) => (
  <Box>
    <Typography variant="caption" sx={{ color: UI_COLORS.muted, display: 'block' }}>
      {label}
    </Typography>
    <Typography sx={{ ...mono, fontSize: 13, color: UI_COLORS.text, mt: 0.25 }}>{value}</Typography>
  </Box>
);

const HomePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const features = t('home.features', { returnObjects: true });
  const advantages = t('home.advantages', { returnObjects: true });

  return (
    <Box sx={{ backgroundColor: UI_COLORS.surface }}>
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backgroundColor: UI_COLORS.surface,
          borderBottom: UI_SURFACE.divider,
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <BrandLockup size={22} />
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Button
                onClick={() => navigate('/documentation')}
                sx={{ display: { xs: 'none', sm: 'inline-flex' }, color: 'text.secondary' }}
              >
                {t('home.navDocs')}
              </Button>
              <LanguageSwitcher />
              <Button
                onClick={() => navigate('/login')}
                sx={{ display: { xs: 'none', sm: 'inline-flex' }, color: 'text.secondary' }}
              >
                {t('home.navLogin')}
              </Button>
              <Button variant="contained" onClick={() => navigate('/register')} sx={{ px: 2 }}>
                {t('home.navRegister')}
              </Button>
              <IconButton
                aria-label="GitHub"
                href={PROJECT_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
              >
                <GitHubIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Stack>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg">
        <Box
          className="enter"
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) minmax(0, 1.05fr)' },
            gap: { xs: 6, lg: 8 },
            alignItems: 'center',
            minHeight: { lg: 'calc(100vh - 64px)' },
            py: { xs: 8, md: 10 },
          }}
        >
          <Box sx={{ maxWidth: 560 }}>
            <Typography
              component="h1"
              variant="h1"
              sx={{ fontSize: { xs: 40, sm: 52, lg: 60 }, lineHeight: 1.04, letterSpacing: '-0.03em' }}
            >
              {t('home.heroTitleLine1')}
              <br />
              {t('home.heroTitleLine2')}
            </Typography>
            <Typography
              sx={{
                mt: 3,
                mb: 4,
                fontSize: { xs: 16, md: 18 },
                lineHeight: 1.6,
                color: UI_COLORS.secondary,
                maxWidth: '46ch',
              }}
            >
              {t('home.heroSubtitle')}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
              <Button size="large" variant="contained" onClick={() => navigate('/register')}>
                {t('home.heroPrimary')}
              </Button>
              <Button size="large" variant="outlined" onClick={() => navigate('/login')}>
                {t('home.heroSecondary')}
              </Button>
            </Stack>
            <Typography sx={{ ...mono, mt: 4, fontSize: 11, color: UI_COLORS.muted, letterSpacing: 0 }}>
              {t('home.heroFacts')}
            </Typography>
          </Box>

          <Box
            sx={{
              borderRadius: 4,
              border: UI_SURFACE.border,
              backgroundColor: UI_COLORS.surface,
              boxShadow: UI_SURFACE.shadowFloating,
              overflow: 'hidden',
            }}
          >
            <Box sx={{ px: 2.5, py: 1.75, borderBottom: UI_SURFACE.divider }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: UI_COLORS.success }} />
                  <Typography variant="subtitle2">{t('home.preview.taskName')}</Typography>
                </Box>
                <Typography sx={{ ...mono, fontSize: 11, color: UI_COLORS.muted }}>
                  {t('home.preview.interval')}
                </Typography>
              </Box>
              <Typography sx={{ ...mono, fontSize: 11, color: UI_COLORS.muted, mt: 0.5 }}>
                {t('home.preview.url')}
              </Typography>
            </Box>

            <Box sx={{ px: 2.5, py: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              <Field label={t('home.preview.checkedLabel')} value={t('home.preview.checkedValue')} />
              <Field label={t('home.preview.recipientLabel')} value={t('home.preview.recipientValue')} />
            </Box>

            <Box sx={{ px: 2.5, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: UI_COLORS.warning, fontWeight: 500 }}>
                  {t('home.preview.changeLabel')}
                </Typography>
                <Typography sx={{ ...mono, fontSize: 11, color: UI_COLORS.muted }}>
                  {t('home.preview.changeTime')}
                </Typography>
              </Box>
              <Box
                sx={{
                  borderLeft: `2px solid ${UI_COLORS.warning}`,
                  backgroundColor: UI_COLORS.background,
                  borderRadius: '0 8px 8px 0',
                  px: 1.5,
                  py: 1.25,
                }}
              >
                <Typography sx={{ ...mono, fontSize: 12, color: UI_COLORS.muted }}>
                  {'- '}
                  {t('home.preview.lineOld')}
                </Typography>
                <Typography sx={{ ...mono, fontSize: 12, color: UI_COLORS.text, mt: 0.5 }}>
                  {'+ '}
                  {t('home.preview.lineNew')}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                px: 2.5,
                py: 1.5,
                borderTop: UI_SURFACE.divider,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Typography variant="caption" sx={{ color: UI_COLORS.secondary }}>
                {t('home.preview.emailLabel')}
              </Typography>
              <Typography sx={{ ...mono, fontSize: 11, color: UI_COLORS.text }}>
                {t('home.preview.emailValue')}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Container>

      <Box component="section" sx={{ py: { xs: 8, md: 12 }, borderTop: UI_SURFACE.divider }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 2fr' }, gap: { xs: 4, md: 8 } }}>
            <Box>
              <Typography component="h2" variant="h2">
                {t('home.featuresTitle')}
              </Typography>
              <Typography sx={{ mt: 2, color: UI_COLORS.secondary, maxWidth: '34ch' }}>
                {t('home.featuresSubtitle')}
              </Typography>
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, columnGap: 6 }}>
              {features.map((feature, index) => (
                <Box key={feature.key} sx={{ py: 3, borderTop: UI_SURFACE.divider }}>
                  <Typography sx={{ ...mono, fontSize: 11, color: UI_COLORS.muted }}>
                    {String(index + 1).padStart(2, '0')}
                  </Typography>
                  <Typography variant="h6" component="h3" sx={{ mt: 1 }}>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.75, color: UI_COLORS.secondary, lineHeight: 1.6 }}>
                    {feature.description}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      <Box component="section" sx={{ py: { xs: 8, md: 12 }, backgroundColor: UI_COLORS.background, borderTop: UI_SURFACE.divider }}>
        <Container maxWidth="lg">
          <Typography component="h2" variant="h2" sx={{ maxWidth: '20ch' }}>
            {t('home.advantagesTitle')}
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: { xs: 3, md: 6 },
              mt: { xs: 4, md: 6 },
            }}
          >
            {advantages.map((advantage) => (
              <Box key={advantage.key} sx={{ pt: 2.5, borderTop: UI_SURFACE.divider }}>
                <Typography variant="h6" component="h3">
                  {advantage.title}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, color: UI_COLORS.secondary, lineHeight: 1.6 }}>
                  {advantage.description}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      <Box component="section" sx={{ py: { xs: 8, md: 12 }, borderTop: UI_SURFACE.divider }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              border: UI_SURFACE.border,
              borderRadius: 4,
              px: { xs: 3, md: 6 },
              py: { xs: 4, md: 6 },
              display: 'flex',
              alignItems: { xs: 'flex-start', md: 'center' },
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', md: 'row' },
              gap: 4,
            }}
          >
            <Box>
              <Typography component="h2" variant="h2" sx={{ maxWidth: '22ch' }}>
                {t('home.ctaTitle')}
              </Typography>
              <Typography sx={{ mt: 1.5, color: UI_COLORS.secondary, maxWidth: '48ch' }}>
                {t('home.ctaSubtitle')}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexShrink: 0 }}>
              <Button size="large" variant="contained" onClick={() => navigate('/register')}>
                {t('home.heroPrimary')}
              </Button>
              <Button size="large" onClick={() => navigate('/login')} sx={{ color: 'text.secondary' }}>
                {t('home.heroSecondary')}
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      <Box component="footer" sx={{ borderTop: UI_SURFACE.divider }}>
        <Container maxWidth="lg">
          <Box
            sx={{
              py: 4,
              display: 'flex',
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
            }}
          >
            <Box>
              <BrandLockup size={20} />
              <Typography variant="caption" sx={{ color: UI_COLORS.muted, display: 'block', mt: 1 }}>
                {t('home.footerTagline')}
              </Typography>
            </Box>
            <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Box
                component="a"
                href={PROJECT_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ fontSize: 13, color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'text.primary' } }}
              >
                {t('common.repoLink')}
              </Box>
              <Box
                component="a"
                href={PROJECT_AUTHOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ fontSize: 13, color: 'text.secondary', textDecoration: 'none', '&:hover': { color: 'text.primary' } }}
              >
                {t('common.author')} · ox0pine
              </Box>
              <Typography variant="caption" sx={{ color: UI_COLORS.muted }}>
                {t('home.license')}
              </Typography>
            </Stack>
          </Box>
          <Divider />
          <Typography variant="caption" sx={{ color: UI_COLORS.muted, display: 'block', py: 2 }}>
            {t('common.footerCta')}
          </Typography>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
