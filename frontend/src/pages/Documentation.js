import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Avatar,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  IconButton,
  Drawer,
  alpha,
  Chip,
  Stack,
} from '@mui/material';
import {
  Menu as MenuIcon,
  ArrowBack as ArrowBackIcon,
  RocketLaunch as RocketIcon,
  Assignment as TaskIcon,
  Email as EmailIcon,
  Public as PublicIcon,
  Dashboard as DashboardIcon,
  Help as HelpIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import { WebMonitorLogo } from '../components/WebMonitorLogo';
import LanguageSwitcher from '../components/LanguageSwitcher';
import docsEn from '../locales/docs/en';
import docsZhCN from '../locales/docs/zh-CN';
import { isChineseLanguage } from '../utils/i18n';

const iconMap = {
  'quick-start': <RocketIcon />,
  'monitor-tasks': <TaskIcon />,
  'email-config': <EmailIcon />,
  'public-tasks': <PublicIcon />,
  dashboard: <DashboardIcon />,
  faq: <HelpIcon />,
};

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
        backgroundColor: '#1e293b',
        borderRadius: 2,
        p: 2,
        my: 2,
        overflow: 'auto',
      }}
    >
      <IconButton
        onClick={handleCopy}
        size="small"
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          color: '#94a3b8',
          '&:hover': { color: '#ffffff' },
        }}
      >
        {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
      </IconButton>
      <Typography
        component="pre"
        sx={{
          fontFamily: 'Monaco, Consolas, "Courier New", monospace',
          fontSize: '0.875rem',
          color: '#e2e8f0',
          margin: 0,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {children}
      </Typography>
    </Box>
  );
};

const DocSection = ({ id, title, icon, children }) => (
  <Box
    id={id}
    component={motion.section}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-100px' }}
    transition={{ duration: 0.5 }}
    sx={{ mb: 8, scrollMarginTop: '100px' }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
      <Avatar
        sx={{
          width: 40,
          height: 40,
          mr: 2,
          backgroundColor: alpha('#10b981', 0.1),
          color: '#10b981',
        }}
      >
        {icon}
      </Avatar>
      <Typography
        variant="h4"
        component="h2"
        sx={{
          fontWeight: 700,
          color: '#334155',
          fontSize: { xs: '1.5rem', md: '1.75rem' },
        }}
      >
        {title}
      </Typography>
    </Box>
    {children}
  </Box>
);

const SubSection = ({ title, children }) => (
  <Box sx={{ mb: 4 }}>
    <Typography
      variant="h6"
      component="h3"
      sx={{
        fontWeight: 600,
        color: '#334155',
        mb: 2,
        pb: 1,
        borderBottom: '2px solid',
        borderColor: alpha('#10b981', 0.3),
        display: 'inline-block',
      }}
    >
      {title}
    </Typography>
    <Box sx={{ color: '#64748b', lineHeight: 1.8 }}>{children}</Box>
  </Box>
);

const TipBox = ({ type = 'info', children }) => {
  const colors = {
    info: { bg: '#2563eb', light: alpha('#2563eb', 0.08) },
    warning: { bg: '#f59e0b', light: alpha('#f59e0b', 0.08) },
    success: { bg: '#10b981', light: alpha('#10b981', 0.08) },
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        my: 2,
        borderRadius: 2,
        backgroundColor: colors[type].light,
        borderLeft: `4px solid ${colors[type].bg}`,
      }}
    >
      <Typography variant="body2" sx={{ color: '#334155' }}>
        {children}
      </Typography>
    </Paper>
  );
};

const renderList = (list) => {
  if (!list) {
    return null;
  }

  const Component = list.type === 'ol' ? 'ol' : 'ul';

  return (
    <Box component={Component} sx={{ pl: 3, color: '#64748b' }}>
      {list.items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </Box>
  );
};

const renderBlock = (block) => {
  if (block.type === 'text') {
    return block.paragraphs.map((paragraph) => (
      <Typography key={paragraph} sx={{ color: '#64748b', lineHeight: 1.8, mb: 2 }}>
        {paragraph}
      </Typography>
    ));
  }

  if (block.type === 'subsection') {
    return (
      <SubSection key={block.title} title={block.title}>
        {block.paragraphs?.map((paragraph) => (
          <Typography key={paragraph} sx={{ mb: 2 }}>
            {paragraph}
          </Typography>
        ))}
        {renderList(block.list)}
        {block.codeExamples?.map((example) => (
          <Box key={`${example.label}-${example.code}`}>
            <Typography variant="subtitle2" sx={{ color: '#334155', mt: 2, mb: 1 }}>
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

const Documentation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('quick-start');

  const content = isChineseLanguage(i18n.language) ? docsZhCN : docsEn;
  const sections = useMemo(
    () => content.sections.map((section) => ({
      ...section,
      icon: iconMap[section.id] || <HelpIcon />,
    })),
    [content.sections]
  );

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 150;

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

  const sidebarWidth = 260;

  const SidebarContent = () => (
    <Box sx={{ p: 2 }}>
      <Typography
        variant="overline"
        sx={{
          color: '#94a3b8',
          fontWeight: 600,
          letterSpacing: 1,
          px: 2,
          mb: 1,
          display: 'block',
        }}
      >
        {content.sidebarTitle}
      </Typography>
      <List sx={{ pt: 0 }}>
        {sections.map((section) => (
          <ListItemButton
            key={section.id}
            onClick={() => scrollToSection(section.id)}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              backgroundColor: activeSection === section.id ? alpha('#10b981', 0.1) : 'transparent',
              color: activeSection === section.id ? '#10b981' : '#64748b',
              '&:hover': {
                backgroundColor: alpha('#10b981', 0.08),
                color: '#10b981',
              },
            }}
          >
            <Box sx={{ mr: 1.5, display: 'flex', alignItems: 'center' }}>
              {React.cloneElement(section.icon, {
                sx: { fontSize: 20, color: activeSection === section.id ? '#10b981' : '#94a3b8' },
              })}
            </Box>
            <ListItemText
              primary={section.title}
              slotProps={{
                primary: {
                  sx: {
                    fontSize: '0.9rem',
                    fontWeight: activeSection === section.id ? 600 : 500,
                  },
                },
              }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        position: 'relative',
      }}
    >
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(${alpha('#e2e8f0', 0.3)} 1px, transparent 1px),
            linear-gradient(90deg, ${alpha('#e2e8f0', 0.3)} 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <Box
        component={motion.nav}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1100,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <Container maxWidth="xl" sx={{ px: { xs: 2, md: 4 } }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                onClick={() => setMobileOpen(true)}
                sx={{ display: { md: 'none' }, color: '#64748b' }}
              >
                <MenuIcon />
              </IconButton>

              <Box
                onClick={() => navigate('/')}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.8 },
                }}
              >
                <WebMonitorLogo size={36} showPulse />
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: '#334155',
                    display: { xs: 'none', sm: 'block' },
                  }}
                >
                  WebMonitor
                </Typography>
              </Box>

              <Chip
                label={content.badge}
                size="small"
                sx={{
                  backgroundColor: alpha('#10b981', 0.1),
                  color: '#10b981',
                  fontWeight: 600,
                }}
              />

              <Box sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
                <LanguageSwitcher />
              </Box>
            </Box>

            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Button
                variant="text"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/')}
                sx={{
                  color: '#64748b',
                  display: { xs: 'none', sm: 'flex' },
                  '&:hover': { color: '#10b981' },
                }}
              >
                {content.backHome}
              </Button>
              <Button
                variant="text"
                onClick={() => navigate('/login')}
                sx={{ color: '#64748b', '&:hover': { color: '#10b981' } }}
              >
                {content.login}
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate('/register')}
                sx={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  px: 2,
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                  },
                }}
              >
                {content.register}
              </Button>
            </Stack>
          </Box>
        </Container>
      </Box>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: sidebarWidth,
            backgroundColor: '#ffffff',
            borderRight: '1px solid rgba(0, 0, 0, 0.06)',
          },
        }}
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
          top: 72,
          left: 0,
          width: sidebarWidth,
          height: 'calc(100vh - 72px)',
          borderRight: '1px solid rgba(0, 0, 0, 0.06)',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          overflowY: 'auto',
          zIndex: 1000,
        }}
      >
        <SidebarContent />
      </Box>

      <Box
        sx={{
          pt: '72px',
          pl: { xs: 0, md: `${sidebarWidth}px` },
          minHeight: '100vh',
        }}
      >
        <Container maxWidth="md" sx={{ py: 6, px: { xs: 3, md: 4 } }}>
          <Box
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            sx={{ mb: 8, textAlign: 'center' }}
          >
            <Typography
              variant="h2"
              component="h1"
              sx={{
                fontWeight: 800,
                color: '#334155',
                mb: 2,
                fontSize: { xs: '2rem', md: '2.75rem' },
                letterSpacing: '-0.02em',
              }}
            >
              {content.title}
            </Typography>
            <Typography
              variant="h6"
              sx={{
                color: '#64748b',
                fontWeight: 400,
                maxWidth: 500,
                mx: 'auto',
              }}
            >
              {content.subtitle}
            </Typography>
          </Box>

          {sections.map((section) => (
            <DocSection key={section.id} id={section.id} title={section.title} icon={section.icon}>
              {section.blocks.map((block) => renderBlock(block))}
            </DocSection>
          ))}

          <Paper
            component={motion.div}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            elevation={0}
            sx={{
              p: { xs: 4, md: 6 },
              mt: 8,
              borderRadius: 4,
              backgroundColor: '#f8fafc',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              textAlign: 'center',
            }}
          >
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#334155', mb: 2 }}>
              {content.footerCta.title}
            </Typography>
            <Typography sx={{ color: '#64748b', mb: 4 }}>
              {content.footerCta.subtitle}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/register')}
                sx={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#ffffff',
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
                }}
              >
                {content.footerCta.primary}
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/login')}
                sx={{
                  borderColor: '#e2e8f0',
                  color: '#475569',
                  px: 4,
                  py: 1.5,
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#10b981',
                    color: '#10b981',
                  },
                }}
              >
                {content.footerCta.secondary}
              </Button>
            </Stack>
          </Paper>

          <Box sx={{ mt: 8, pt: 4, borderTop: '1px solid rgba(0, 0, 0, 0.06)', textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              © 2024 WebMonitor. All rights reserved.
            </Typography>
            <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
              {t('common.footerCta')}
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default Documentation;
