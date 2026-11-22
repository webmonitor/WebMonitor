import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { Menu as MenuIcon, Close as CloseIcon, ContentCopy as CopyIcon, Check as CheckIcon } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import PublicHeader from '../components/PublicHeader';
import LanguageSwitcher from '../components/LanguageSwitcher';
import docsEn from '../locales/docs/en';
import docsZhCN from '../locales/docs/zh-CN';
import { normalizeLanguage } from '../utils/i18n';
import { PROJECT_AUTHOR_URL, PROJECT_REPO_URL } from '../utils/links';
import { UI_COLORS, UI_FONTS, UI_SURFACE } from '../theme/tokens';

const mono = { fontFamily: UI_FONTS.mono, letterSpacing: 0 };

const scrollToElement = (id) => {
  const element = document.getElementById(id);
  if (element) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }
};

const CodeBlock = ({ children }) => {
  const { t } = useTranslation();
  const [copyStatus, setCopyStatus] = useState('idle');
  const resetTimer = React.useRef(null);

  useEffect(
    () => () => {
      clearTimeout(resetTimer.current);
    },
    [],
  );

  const handleCopy = async () => {
    clearTimeout(resetTimer.current);
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard unavailable');
      }
      await navigator.clipboard.writeText(children);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('error');
    }
    resetTimer.current = setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const copyLabel = t(
    copyStatus === 'copied'
      ? 'documentation.copied'
      : copyStatus === 'error'
        ? 'documentation.copyFailed'
        : 'documentation.copyCode',
  );

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
        aria-label={copyLabel}
        title={copyLabel}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          color: UI_COLORS.codeMuted,
          '&:hover': { color: UI_COLORS.codeText, backgroundColor: UI_COLORS.codeBorder },
        }}
      >
        {copyStatus === 'copied' ? <CheckIcon sx={{ fontSize: 16 }} /> : <CopyIcon sx={{ fontSize: 16 }} />}
      </IconButton>
      <Typography
        component="span"
        role="status"
        sx={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}
      >
        {copyStatus === 'idle' ? '' : copyLabel}
      </Typography>
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

const SidebarContent = ({ sections, activeSection, onSelect }) => {
  const { t } = useTranslation();

  return (
    <Box sx={{ p: 1.5 }}>
      <Typography sx={{ ...mono, fontSize: 11, color: UI_COLORS.muted, px: 1.5, mb: 0.5 }}>
        {t('documentation.contents')}
      </Typography>
      <List sx={{ pt: 0, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {sections.map((section) => (
          <ListItemButton
            key={section.id}
            selected={activeSection === section.id}
            aria-current={activeSection === section.id ? 'location' : undefined}
            onClick={() => onSelect(section.id)}
            sx={{ minHeight: 32, height: 32, px: 1.5 }}
          >
            <ListItemText primary={section.title} slotProps={{ primary: { sx: { fontSize: 13 } } }} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};

const Documentation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('quick-start');

  const content = normalizeLanguage(i18n.language) === 'zh-CN' ? docsZhCN : docsEn;
  const sections = content.sections;

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

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [sections]);

  useEffect(() => {
    if (!location.hash) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      scrollToElement(location.hash.slice(1));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, sections]);

  const scrollToSection = (id) => {
    if (location.hash === `#${id}`) {
      scrollToElement(id);
    } else {
      navigate({ pathname: location.pathname, hash: id }, { replace: true });
    }
    setMobileOpen(false);
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: UI_COLORS.surface }}>
      <PublicHeader
        position="fixed"
        fluid
        leading={
          <IconButton
            aria-label={t('documentation.openNavigation')}
            onClick={() => setMobileOpen(true)}
            sx={{ display: { md: 'none' }, width: 32, height: 32 }}
          >
            <MenuIcon sx={{ fontSize: 20 }} />
          </IconButton>
        }
        brandAccessory={
          <Typography variant="caption" sx={{ color: UI_COLORS.muted, ml: 0.5, display: { xs: 'none', sm: 'block' } }}>
            {t('documentation.badge')}
          </Typography>
        }
      />

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{ display: { xs: 'block', md: 'none' }, '& .MuiDrawer-paper': { width: sidebarWidth } }}
      >
        <Box sx={{ pt: 2 }}>
          <Box sx={{ px: 2, pb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <LanguageSwitcher />
            <IconButton aria-label={t('common.close')} onClick={() => setMobileOpen(false)}>
              <CloseIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
          <SidebarContent sections={sections} activeSection={activeSection} onSelect={scrollToSection} />
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
        <SidebarContent sections={sections} activeSection={activeSection} onSelect={scrollToSection} />
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
