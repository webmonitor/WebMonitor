import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Menu as MenuIcon, ContentCopy as CopyIcon, Check as CheckIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { BrandLockup } from '../components/WebMonitorLogo';
import LanguageSwitcher from '../components/LanguageSwitcher';
import docsEn from '../locales/docs/en';
import docsZhCN from '../locales/docs/zh-CN';
import { normalizeLanguage } from '../utils/i18n';
import { PROJECT_AUTHOR_URL, PROJECT_REPO_URL } from '../utils/links';
import { UI_COLORS, UI_FONTS, UI_SURFACE } from '../theme/tokens';

const mono = { fontFamily: UI_FONTS.mono, letterSpacing: 0 };

const CodeBlock = ({ children }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box
      sx={{
        position: 'relative',
        backgroundColor: UI_COLORS.codeBackground,
        border: `1px solid ${UI_COLORS.codeBorder}`,
        borderRadius: 2,
        p: 2,
        my: 2,
        overflow: 'auto',
      }}
    >
      <IconButton
        onClick={handleCopy}
        size="small"
        aria-label="Copy"
        sx={{
          position: 'absolute',
          top: 6,
          right: 6,
          color: UI_COLORS.codeMuted,
          '&:hover': { color: UI_COLORS.codeText, backgroundColor: UI_COLORS.codeBorder },
        }}
      >
        {copied ? <CheckIcon sx={{ fontSize: 16 }} /> : <CopyIcon sx={{ fontSize: 16 }} />}
      </IconButton>
      <Typography
        component="pre"
        sx={{
          ...mono,
          fontSize: 13,
          lineHeight: 1.65,
          color: UI_COLORS.codeText,
          margin: 0,
          pr: 4,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {children}
      </Typography>
    </Box>
  );
};

const DocSection = ({ id, title, children }) => (
  <Box id={id} component="section" sx={{ mb: 7, scrollMarginTop: '88px' }}>
    <Typography component="h2" variant="h3" sx={{ pb: 1.5, mb: 3, borderBottom: UI_SURFACE.divider }}>
      {title}
    </Typography>
    {children}
  </Box>
);

const SubSection = ({ title, children }) => (
  <Box sx={{ mb: 4 }}>
    <Typography component="h3" variant="h5" sx={{ mb: 1.5 }}>
      {title}
    </Typography>
    <Box sx={{ color: UI_COLORS.secondary, fontSize: 14, lineHeight: 1.75 }}>{children}</Box>
  </Box>
);

const TIP_COLORS = {
  info: UI_COLORS.info,
  warning: UI_COLORS.warning,
  success: UI_COLORS.success,
};

const TipBox = ({ type = 'info', children }) => (
  <Box
    sx={{
      my: 2,
      px: 2,
      py: 1.5,
      backgroundColor: UI_COLORS.background,
      borderLeft: `2px solid ${TIP_COLORS[type] || UI_COLORS.info}`,
      borderRadius: '0 8px 8px 0',
    }}
  >
    <Typography variant="body2" sx={{ color: UI_COLORS.text }}>
      {children}
    </Typography>
  </Box>
);

const renderList = (list) => {
  if (!list) {
    return null;
  }

  const Component = list.type === 'ol' ? 'ol' : 'ul';

  return (
    <Box component={Component} sx={{ pl: 3, my: 2, color: UI_COLORS.secondary, fontSize: 14, lineHeight: 1.75 }}>
      {list.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </Box>
  );
};

const renderBlock = (block) => {
  if (block.type === 'text') {
    return block.paragraphs.map((paragraph) => (
      <Typography key={paragraph} sx={{ color: UI_COLORS.secondary, fontSize: 14, lineHeight: 1.75, mb: 2 }}>
        {paragraph}
      </Typography>
    ));
  }

  if (block.type === 'subsection') {
    return (
      <SubSection key={block.title} title={block.title}>
        {block.paragraphs?.map((paragraph) => (
          <Typography key={paragraph} sx={{ mb: 2, fontSize: 14, lineHeight: 1.75 }}>
            {paragraph}
          </Typography>
        ))}
        {renderList(block.list)}
        {block.codeExamples?.map((example) => (
          <Box key={`${example.label}-${example.code}`}>
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 0.5 }}>
              {example.label}
            </Typography>
            <CodeBlock>{example.code}</CodeBlock>
          </Box>
        ))}
        {block.tip ? <TipBox type={block.tip.type}>{block.tip.text}</TipBox> : null}
      </SubSection>
    );
  }

  return null;
};

const sidebarWidth = 248;

const Documentation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('quick-start');

  const content = normalizeLanguage(i18n.language) === 'zh-CN' ? docsZhCN : docsEn;
  const sections = useMemo(() => content.sections, [content.sections]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 120;

      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = document.getElementById(sections[i].id);
        if (section && section.offsetTop <= scrollPosition) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [location]);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <Box sx={{ p: 1.5 }}>
      <Typography sx={{ ...mono, fontSize: 11, color: UI_COLORS.muted, px: 1.5, mb: 0.5 }}>
        {t('documentation.contents')}
      </Typography>
      <List sx={{ pt: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {sections.map((section) => (
          <ListItemButton
            key={section.id}
            selected={activeSection === section.id}
            onClick={() => scrollToSection(section.id)}
            sx={{ minHeight: 32, height: 32, px: 1.5 }}
          >
            <ListItemText primary={section.title} slotProps={{ primary: { sx: { fontSize: 13 } } }} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: UI_COLORS.surface }}>
      <Box
        component="header"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          height: 64,
          backgroundColor: UI_COLORS.surface,
          borderBottom: UI_SURFACE.divider,
        }}
      >
        <Container maxWidth={false} sx={{ px: { xs: 2, md: 3 } }}>
          <Box sx={{ height: 64, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton
                aria-label={t('documentation.openNavigation')}
                onClick={() => setMobileOpen(true)}
                sx={{ display: { md: 'none' }, width: 32, height: 32 }}
              >
                <MenuIcon sx={{ fontSize: 20 }} />
              </IconButton>
              <Box
                onClick={() => navigate('/')}
                sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1.5 }}
              >
                <BrandLockup size={20} />
              </Box>
              <Typography variant="caption" sx={{ color: UI_COLORS.muted, ml: 0.5, display: { xs: 'none', sm: 'block' } }}>
                {t('documentation.badge')}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LanguageSwitcher sx={{ display: { xs: 'none', sm: 'inline-flex' } }} />
              <Button
                onClick={() => navigate('/login')}
                sx={{ display: { xs: 'none', sm: 'inline-flex' }, color: 'text.secondary' }}
              >
                {t('common.login')}
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate('/register')}
                sx={{ px: { xs: 1.5, sm: 2 }, whiteSpace: 'nowrap' }}
              >
                {t('common.register')}
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: sidebarWidth } }}
      >
        <Box sx={{ pt: 8 }}>
          <Box sx={{ px: 2, display: 'flex', justifyContent: 'center' }}>
            <LanguageSwitcher sx={{ width: 'fit-content' }} />
          </Box>
          <SidebarContent />
        </Box>
      </Drawer>

      <Box
        sx={{
          display: { xs: 'none', md: 'block' },
          position: 'fixed',
          top: 64,
          left: 0,
          width: sidebarWidth,
          height: 'calc(100vh - 64px)',
          borderRight: UI_SURFACE.divider,
          backgroundColor: UI_COLORS.surface,
          overflowY: 'auto',
          zIndex: 1000,
        }}
      >
        <SidebarContent />
      </Box>

      <Box sx={{ pt: '64px', pl: { xs: 0, md: `${sidebarWidth}px` }, minHeight: '100vh' }}>
        <Box sx={{ maxWidth: 824, mx: { xs: 'auto', md: 0 }, py: { xs: 5, md: 7 }, px: { xs: 2.5, md: 4 } }}>
          <Box className="enter" sx={{ mb: 7 }}>
            <Typography component="h1" variant="h1" sx={{ fontSize: { xs: 34, md: 40 } }}>
              {content.title}
            </Typography>
            <Typography sx={{ mt: 2, fontSize: 16, lineHeight: 1.6, color: UI_COLORS.secondary, maxWidth: '56ch' }}>
              {content.subtitle}
            </Typography>
          </Box>

          {sections.map((section) => (
            <DocSection key={section.id} id={section.id} title={section.title}>
              {section.blocks.map((block) => renderBlock(block))}
            </DocSection>
          ))}

          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, md: 5 },
              mt: 8,
              borderRadius: 3,
              border: UI_SURFACE.border,
              display: 'flex',
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 3,
            }}
          >
            <Box>
              <Typography variant="h5" component="h2">
                {content.footerCta.title}
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.75, color: UI_COLORS.secondary }}>
                {content.footerCta.subtitle}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5} sx={{ flexShrink: 0 }}>
              <Button variant="contained" onClick={() => navigate('/register')}>
                {content.footerCta.primary}
              </Button>
              <Button onClick={() => navigate('/login')} sx={{ color: 'text.secondary' }}>
                {content.footerCta.secondary}
              </Button>
            </Stack>
          </Paper>

          <Box sx={{ mt: 7, pt: 3, borderTop: UI_SURFACE.divider }}>
            <Typography variant="caption" sx={{ color: UI_COLORS.muted }}>
              {t('home.license')}
              {' · '}
              <Box
                component="a"
                href={PROJECT_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                {t('common.repoLink')}
              </Box>
              {' · '}
              {t('common.author')}{' '}
              <Box
                component="a"
                href={PROJECT_AUTHOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                ox0pine
              </Box>
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Documentation;
