import { useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Avatar,
  Card,
  CardContent,
  Stack,
  alpha,
  IconButton,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Assessment as AssessmentIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  TrendingUp as TrendingUpIcon,
  IntegrationInstructions as IntegrationIcon,
  AutoAwesome as SparkleIcon,
  RocketLaunch as RocketIcon,
  ArrowForward as ArrowForwardIcon,
  PlayArrow as PlayArrowIcon,
  Monitor as MonitorIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { useTranslation } from 'react-i18next';

import { WebMonitorLogo } from '../components/WebMonitorLogo';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { isChineseLanguage } from '../utils/i18n';

const GitHubIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="currentColor"
    {...props}
  >
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const HomePage = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isChinese = isChineseLanguage(i18n.language);

  const refHero = useRef(null);
  const refFeatures = useRef(null);
  const refAdvantages = useRef(null);
  const refCTA = useRef(null);
  const heroInView = useInView(refHero, { once: true, margin: '-100px' });
  const featuresInView = useInView(refFeatures, { once: true, margin: '-100px' });
  const advantagesInView = useInView(refAdvantages, { once: true, margin: '-100px' });
  const ctaInView = useInView(refCTA, { once: true, margin: '-100px' });

  const content = isChinese ? {
    navDocs: '文档',
    navLogin: '登录',
    navRegister: '免费注册',
    badge: '新一代智能监控平台',
    heroTitleLine1: '实时监控',
    heroTitleLine2: '每一次变化',
    heroSubtitle: '基于 Selenium 的强大引擎，精准捕捉动态内容变化，为您提供可靠的网页监控解决方案。',
    heroPrimary: '免费开始使用',
    heroSecondary: '立即登录',
    trustStats: [
      { value: '24/7', label: '全天候监控' },
      { value: '99.9%', label: '服务可用性' },
      { value: '<1s', label: '响应延迟' },
    ],
    previewStats: [
      { label: '活跃任务', value: '12', color: '#10b981' },
      { label: '今日变化', value: '5', color: '#2563eb' },
      { label: '成功率', value: '99%', color: '#f59e0b' },
    ],
    activityTitle: '最近监控活动',
    previewActivities: [
      { url: 'example.com/products', status: '检测到变化', statusColor: '#f59e0b' },
      { url: 'shop.example.com', status: '正常', statusColor: '#10b981' },
      { url: 'news.example.com', status: '正常', statusColor: '#10b981' },
    ],
    floatingTitle: '内容变化检测',
    floatingStatus: '已通知',
    featuresOverline: '核心功能',
    featuresTitle: '专业级监控能力',
    featuresSubtitle: '基于 Selenium WebDriver 的强大引擎，为您提供精准可靠的网页内容监控服务。',
    features: [
      { icon: <MonitorIcon sx={{ fontSize: 28 }} />, title: '实时监控', description: '7x24 持续监控网页内容变化，支持 JavaScript 渲染和动态抓取。', color: '#10b981' },
      { icon: <NotificationsIcon sx={{ fontSize: 28 }} />, title: '即时通知', description: '通过邮件及时通知您关键变化，避免错过重要更新。', color: '#2563eb' },
      { icon: <SecurityIcon sx={{ fontSize: 28 }} />, title: '安全可靠', description: '提供账户权限控制与稳定的任务执行体验。', color: '#f59e0b' },
      { icon: <SpeedIcon sx={{ fontSize: 28 }} />, title: '高性能', description: '优化的监控引擎支持更快的抓取与执行反馈。', color: '#ec4899' },
      { icon: <AssessmentIcon sx={{ fontSize: 28 }} />, title: '智能分析', description: '基于 XPath 精准定位内容，减少误报。', color: '#8b5cf6' },
      { icon: <ScheduleIcon sx={{ fontSize: 28 }} />, title: '灵活调度', description: '自定义监控间隔，适应不同网站与业务场景。', color: '#06b6d4' },
    ],
    advantagesOverline: '为什么选择我们',
    advantagesTitle: '技术优势明显',
    advantages: [
      { icon: <CheckCircleIcon />, title: '零配置启动', description: '无需安装额外软件，注册后即可开始使用。', color: '#10b981' },
      { icon: <TrendingUpIcon />, title: '可扩展架构', description: '适配从个人到团队的多种监控需求。', color: '#2563eb' },
      { icon: <IntegrationIcon />, title: 'API 集成', description: '提供完整 RESTful API，方便集成到现有系统。', color: '#f59e0b' },
    ],
    ctaTitle: '立即开始监控您关心的网页内容',
    ctaSubtitle: '注册账号，立即体验专业的网页监控服务，享受实时内容变化通知。',
    footerTagline: '基于 Selenium 的专业网页内容监控解决方案',
  } : {
    navDocs: 'Documentation',
    navLogin: 'Log in',
    navRegister: 'Sign up free',
    badge: 'Next-generation monitoring platform',
    heroTitleLine1: 'Monitor',
    heroTitleLine2: 'every change',
    heroSubtitle: 'Powered by Selenium, WebMonitor captures dynamic content changes accurately and delivers a reliable web monitoring workflow.',
    heroPrimary: 'Start for free',
    heroSecondary: 'Log in now',
    trustStats: [
      { value: '24/7', label: 'Always-on monitoring' },
      { value: '99.9%', label: 'Service availability' },
      { value: '<1s', label: 'Response latency' },
    ],
    previewStats: [
      { label: 'Active tasks', value: '12', color: '#10b981' },
      { label: 'Changes today', value: '5', color: '#2563eb' },
      { label: 'Success rate', value: '99%', color: '#f59e0b' },
    ],
    activityTitle: 'Recent monitoring activity',
    previewActivities: [
      { url: 'example.com/products', status: 'Changed', statusColor: '#f59e0b' },
      { url: 'shop.example.com', status: 'Normal', statusColor: '#10b981' },
      { url: 'news.example.com', status: 'Normal', statusColor: '#10b981' },
    ],
    floatingTitle: 'Content change detected',
    floatingStatus: 'Notified',
    featuresOverline: 'Core features',
    featuresTitle: 'Professional monitoring capabilities',
    featuresSubtitle: 'A Selenium WebDriver-powered engine gives you accurate and dependable monitoring for modern web pages.',
    features: [
      { icon: <MonitorIcon sx={{ fontSize: 28 }} />, title: 'Real-time monitoring', description: 'Track page content continuously, including JavaScript-rendered pages and dynamic elements.', color: '#10b981' },
      { icon: <NotificationsIcon sx={{ fontSize: 28 }} />, title: 'Instant notifications', description: 'Get email alerts as soon as important page content changes.', color: '#2563eb' },
      { icon: <SecurityIcon sx={{ fontSize: 28 }} />, title: 'Secure and reliable', description: 'Role controls and stable task execution help keep monitoring predictable.', color: '#f59e0b' },
      { icon: <SpeedIcon sx={{ fontSize: 28 }} />, title: 'High performance', description: 'An optimized engine improves execution speed and feedback loops.', color: '#ec4899' },
      { icon: <AssessmentIcon sx={{ fontSize: 28 }} />, title: 'Precise analysis', description: 'XPath-based targeting reduces noise and focuses on the content that matters.', color: '#8b5cf6' },
      { icon: <ScheduleIcon sx={{ fontSize: 28 }} />, title: 'Flexible scheduling', description: 'Set custom intervals for different websites and monitoring needs.', color: '#06b6d4' },
    ],
    advantagesOverline: 'Why choose us',
    advantagesTitle: 'Built for practical use',
    advantages: [
      { icon: <CheckCircleIcon />, title: 'Start with zero setup', description: 'No extra installation required — create an account and begin monitoring.', color: '#10b981' },
      { icon: <TrendingUpIcon />, title: 'Scalable architecture', description: 'Designed to support individual users and growing teams alike.', color: '#2563eb' },
      { icon: <IntegrationIcon />, title: 'API integration', description: 'A full RESTful API makes it easy to integrate with existing systems.', color: '#f59e0b' },
    ],
    ctaTitle: 'Start monitoring the pages you care about',
    ctaSubtitle: 'Create an account and get timely notifications when important web content changes.',
    footerTagline: 'A Selenium-powered solution for professional web content monitoring',
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleRegister = () => {
    navigate('/register');
  };

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', backgroundColor: '#ffffff', minHeight: '100vh' }}>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 20%, ${alpha('#10b981', 0.03)} 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, ${alpha('#2563eb', 0.03)} 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, ${alpha('#f8fafc', 0.8)} 0%, transparent 100%)
          `,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

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

      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <Container maxWidth="xl" sx={{ px: { xs: 3, md: 6 } }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 2,
            }}
          >
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <WebMonitorLogo size={40} showPulse />
                <Typography
                  variant="h6"
                  component="div"
                  sx={{
                    fontWeight: 700,
                    color: '#334155',
                    letterSpacing: '-0.5px',
                  }}
                >
                  WebMonitor
                </Typography>
              </Box>
              <Box sx={{ display: { xs: 'none', md: 'inline-flex' } }}>
                <LanguageSwitcher />
              </Box>
            </Stack>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
              <Button
                variant="text"
                onClick={() => navigate('/documentation')}
                sx={{
                  color: '#64748b',
                  fontWeight: 500,
                  '&:hover': {
                    color: '#10b981',
                    backgroundColor: 'transparent',
                  },
                  transition: 'color 0.2s ease',
                }}
              >
                {content.navDocs}
              </Button>
              <Button
                variant="text"
                onClick={handleLogin}
                sx={{
                  color: '#64748b',
                  fontWeight: 500,
                  '&:hover': {
                    color: '#10b981',
                    backgroundColor: 'transparent',
                  },
                  transition: 'color 0.2s ease',
                }}
              >
                {content.navLogin}
              </Button>
              <Button
                variant="contained"
                onClick={handleRegister}
                sx={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                {content.navRegister}
              </Button>
              <Tooltip title="GitHub" arrow>
                <IconButton
                  href="https://github.com/qfpqhyl"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: '#64748b',
                    '&:hover': {
                      color: '#10b981',
                      backgroundColor: alpha('#10b981', 0.04),
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <GitHubIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
        </Container>
      </motion.div>

      <Box
        ref={refHero}
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          position: 'relative',
          pt: { xs: 12, md: 0 },
          pb: { xs: 8, md: 0 },
        }}
      >
        <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1, px: { xs: 3, md: 6 } }}>
          <Grid container spacing={{ xs: 6, md: 10 }} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, lg: 6 }}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                <Box sx={{ maxWidth: 580 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        px: 2,
                        py: 0.75,
                        borderRadius: 10,
                        backgroundColor: alpha('#10b981', 0.08),
                        border: `1px solid ${alpha('#10b981', 0.15)}`,
                      }}
                    >
                      <SparkleIcon sx={{ color: '#10b981', mr: 1, fontSize: 18 }} />
                      <Typography
                        variant="caption"
                        sx={{
                          color: '#10b981',
                          fontWeight: 600,
                          letterSpacing: 0.5,
                          textTransform: 'uppercase',
                        }}
                      >
                        {content.badge}
                      </Typography>
                    </Box>
                  </Box>

                  <Typography
                    variant="h1"
                    component="h1"
                    sx={{
                      fontWeight: 800,
                      mb: 3,
                      fontSize: { xs: '2.75rem', md: '4rem', lg: '4.5rem' },
                      lineHeight: 1.1,
                      color: '#334155',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {content.heroTitleLine1}
                    <br />
                    <Box
                      component="span"
                      sx={{
                        background: 'linear-gradient(135deg, #10b981 0%, #2563eb 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      {content.heroTitleLine2}
                    </Box>
                  </Typography>

                  <Typography
                    variant="h6"
                    sx={{
                      color: '#64748b',
                      mb: 5,
                      fontSize: { xs: '1.1rem', md: '1.25rem' },
                      lineHeight: 1.7,
                      fontWeight: 400,
                    }}
                  >
                    {content.heroSubtitle}
                  </Typography>

                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="contained"
                        size="large"
                        onClick={handleRegister}
                        sx={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#FFFFFF',
                          py: 2,
                          px: 4,
                          fontSize: '1rem',
                          fontWeight: 600,
                          borderRadius: 2,
                          boxShadow: '0 8px 30px rgba(16, 185, 129, 0.25)',
                          '&:hover': {
                            boxShadow: '0 12px 40px rgba(16, 185, 129, 0.35)',
                          },
                        }}
                        endIcon={<RocketIcon />}
                      >
                        {content.heroPrimary}
                      </Button>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                      <Button
                        variant="outlined"
                        size="large"
                        onClick={handleLogin}
                        sx={{
                          borderColor: '#e2e8f0',
                          color: '#475569',
                          py: 2,
                          px: 4,
                          fontSize: '1rem',
                          fontWeight: 600,
                          borderRadius: 2,
                          backgroundColor: '#ffffff',
                          '&:hover': {
                            borderColor: '#10b981',
                            color: '#10b981',
                            backgroundColor: alpha('#10b981', 0.04),
                          },
                        }}
                        startIcon={<PlayArrowIcon />}
                      >
                        {content.heroSecondary}
                      </Button>
                    </motion.div>
                  </Stack>

                  <Box sx={{ mt: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {content.trustStats.map((stat, index) => (
                      <Box key={stat.label} sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="h5" sx={{ fontWeight: 700, color: '#334155' }}>
                            {stat.value}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                            {stat.label}
                          </Typography>
                        </Box>
                        {index < content.trustStats.length - 1 && (
                          <Box sx={{ width: 1, height: 30, backgroundColor: '#e2e8f0', ml: 4 }} />
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
              </motion.div>
            </Grid>

            <Grid size={{ xs: 12, lg: 6 }}>
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={heroInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      width: '100%',
                      maxWidth: 560,
                      borderRadius: 4,
                      overflow: 'hidden',
                      background: '#ffffff',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      boxShadow: '0 25px 80px rgba(0, 0, 0, 0.12)',
                    }}
                  >
                    <Box
                      sx={{
                        p: 2,
                        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        backgroundColor: '#fafafa',
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {['#ff5f57', '#febc2e', '#28c840'].map((color) => (
                          <Box
                            key={color}
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: '50%',
                              backgroundColor: color,
                            }}
                          />
                        ))}
                      </Box>
                      <Box
                        sx={{
                          flex: 1,
                          mx: 2,
                          py: 0.75,
                          px: 2,
                          borderRadius: 1.5,
                          backgroundColor: '#f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                        }}
                      >
                        <MonitorIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          webmonitor.app/dashboard
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ p: 3 }}>
                      <Grid container spacing={2} sx={{ mb: 3 }}>
                        {content.previewStats.map((stat, i) => (
                          <Grid key={stat.label} size={{ xs: 4 }}>
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={heroInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                              transition={{ delay: 0.6 + i * 0.1 }}
                            >
                              <Box
                                sx={{
                                  p: 2,
                                  borderRadius: 2,
                                  backgroundColor: alpha(stat.color, 0.08),
                                  textAlign: 'center',
                                }}
                              >
                                <Typography variant="h5" sx={{ fontWeight: 700, color: stat.color }}>
                                  {stat.value}
                                </Typography>
                                <Typography variant="caption" sx={{ color: '#64748b' }}>
                                  {stat.label}
                                </Typography>
                              </Box>
                            </motion.div>
                          </Grid>
                        ))}
                      </Grid>

                      <Box sx={{ backgroundColor: '#f8fafc', borderRadius: 2, p: 2 }}>
                        <Typography variant="subtitle2" sx={{ color: '#475569', mb: 2 }}>
                          {content.activityTitle}
                        </Typography>
                        {content.previewActivities.map((item, i) => (
                          <motion.div
                            key={`${item.url}-${item.status}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={heroInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -10 }}
                            transition={{ delay: 0.8 + i * 0.1 }}
                          >
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                py: 1.5,
                                borderBottom: i < content.previewActivities.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box
                                  sx={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: '50%',
                                    backgroundColor: item.statusColor,
                                  }}
                                />
                                <Typography variant="body2" sx={{ color: '#475569' }}>
                                  {item.url}
                                </Typography>
                              </Box>
                              <Typography variant="caption" sx={{ color: item.statusColor, fontWeight: 500 }}>
                                {item.status}
                              </Typography>
                            </Box>
                          </motion.div>
                        ))}
                      </Box>
                    </Box>
                  </Paper>

                  <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute',
                      top: -20,
                      right: -20,
                    }}
                  >
                    <Paper
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        backgroundColor: '#ffffff',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                      }}
                    >
                      <Avatar sx={{ width: 36, height: 36, backgroundColor: alpha('#10b981', 0.1) }}>
                        <CheckCircleIcon sx={{ color: '#10b981', fontSize: 20 }} />
                      </Avatar>
                      <Box>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          {content.floatingTitle}
                        </Typography>
                        <Typography variant="subtitle2" sx={{ color: '#10b981', fontWeight: 600 }}>
                          {content.floatingStatus}
                        </Typography>
                      </Box>
                    </Paper>
                  </motion.div>
                </Box>
              </motion.div>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Box
        ref={refFeatures}
        sx={{
          py: { xs: 10, md: 15 },
          position: 'relative',
          backgroundColor: '#f8fafc',
        }}
      >
        <Container maxWidth="xl" sx={{ px: { xs: 3, md: 6 } }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
          >
            <Box sx={{ textAlign: 'center', mb: { xs: 8, md: 10 } }}>
              <Typography
                variant="overline"
                component="div"
                sx={{
                  color: '#10b981',
                  fontWeight: 600,
                  mb: 2,
                  letterSpacing: 2,
                }}
              >
                {content.featuresOverline}
              </Typography>
              <Typography
                variant="h3"
                component="h2"
                sx={{
                  fontWeight: 800,
                  color: '#334155',
                  mb: 2,
                  fontSize: { xs: '2rem', md: '2.75rem' },
                  letterSpacing: '-0.02em',
                }}
              >
                {content.featuresTitle}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: '#64748b',
                  maxWidth: 500,
                  mx: 'auto',
                  lineHeight: 1.7,
                }}
              >
                {content.featuresSubtitle}
              </Typography>
            </Box>
          </motion.div>

          <Grid container spacing={3}>
            {content.features.map((feature, index) => (
              <Grid key={feature.title} size={{ xs: 12, sm: 6, md: 4 }}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={featuresInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{
                    duration: 0.5,
                    delay: featuresInView ? index * 0.1 : 0,
                  }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      p: 1,
                      border: '1px solid rgba(0, 0, 0, 0.06)',
                      borderRadius: 3,
                      backgroundColor: '#ffffff',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)',
                        borderColor: alpha(feature.color, 0.3),
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Avatar
                        sx={{
                          width: 56,
                          height: 56,
                          mb: 3,
                          backgroundColor: alpha(feature.color, 0.1),
                          color: feature.color,
                        }}
                      >
                        {feature.icon}
                      </Avatar>
                      <Typography variant="h6" component="h3" sx={{ fontWeight: 700, color: '#334155', mb: 1.5 }}>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.7 }}>
                        {feature.description}
                      </Typography>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box
        ref={refAdvantages}
        sx={{
          py: { xs: 10, md: 15 },
          position: 'relative',
          backgroundColor: '#ffffff',
        }}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 3, md: 6 } }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={advantagesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
          >
            <Box sx={{ textAlign: 'center', mb: { xs: 8, md: 10 } }}>
              <Typography
                variant="overline"
                component="div"
                sx={{
                  color: '#2563eb',
                  fontWeight: 600,
                  mb: 2,
                  letterSpacing: 2,
                }}
              >
                {content.advantagesOverline}
              </Typography>
              <Typography
                variant="h3"
                component="h2"
                sx={{
                  fontWeight: 800,
                  color: '#334155',
                  mb: 2,
                  fontSize: { xs: '2rem', md: '2.75rem' },
                  letterSpacing: '-0.02em',
                }}
              >
                {content.advantagesTitle}
              </Typography>
            </Box>
          </motion.div>

          <Grid container spacing={4} sx={{ alignItems: 'stretch' }}>
            {content.advantages.map((advantage, index) => (
              <Grid key={advantage.title} size={{ xs: 12, md: 4 }}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={advantagesInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
                  transition={{
                    duration: 0.5,
                    delay: advantagesInView ? index * 0.1 : 0,
                  }}
                  style={{ height: '100%' }}
                >
                  <Paper
                    sx={{
                      textAlign: 'center',
                      p: 5,
                      height: '100%',
                      backgroundColor: '#f8fafc',
                      border: '1px solid rgba(0, 0, 0, 0.04)',
                      borderRadius: 3,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        backgroundColor: '#ffffff',
                        transform: 'translateY(-4px)',
                        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)',
                      },
                    }}
                  >
                    <Avatar
                      sx={{
                        backgroundColor: alpha(advantage.color, 0.1),
                        color: advantage.color,
                        width: 72,
                        height: 72,
                        mx: 'auto',
                        mb: 3,
                      }}
                    >
                      {advantage.icon}
                    </Avatar>
                    <Typography variant="h6" component="h3" sx={{ fontWeight: 700, color: '#334155', mb: 2 }}>
                      {advantage.title}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.7 }}>
                      {advantage.description}
                    </Typography>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      <Box
        ref={refCTA}
        sx={{
          py: { xs: 12, md: 16 },
          position: 'relative',
          background: '#f8fafc',
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 20% 50%, ${alpha('#10b981', 0.08)} 0%, transparent 50%),
              radial-gradient(circle at 80% 50%, ${alpha('#2563eb', 0.08)} 0%, transparent 50%)
            `,
            pointerEvents: 'none',
          }}
        />

        <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1, px: { xs: 3, md: 6 } }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={ctaInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.6 }}
          >
            <Paper
              elevation={0}
              sx={{
                p: { xs: 5, md: 8 },
                borderRadius: 4,
                backgroundColor: '#ffffff',
                border: '1px solid rgba(0, 0, 0, 0.06)',
                boxShadow: '0 25px 80px rgba(0, 0, 0, 0.06)',
              }}
            >
              <Typography
                variant="h3"
                component="h2"
                sx={{
                  color: '#334155',
                  fontWeight: 800,
                  mb: 3,
                  fontSize: { xs: '2rem', md: '2.75rem' },
                  letterSpacing: '-0.02em',
                }}
              >
                {content.ctaTitle}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: '#64748b',
                  mb: 5,
                  maxWidth: 450,
                  mx: 'auto',
                  lineHeight: 1.7,
                }}
              >
                {content.ctaSubtitle}
              </Typography>

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ justifyContent: 'center' }}>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleRegister}
                    sx={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#ffffff',
                      py: 2,
                      px: 5,
                      fontSize: '1rem',
                      fontWeight: 600,
                      borderRadius: 2,
                      boxShadow: '0 8px 30px rgba(16, 185, 129, 0.25)',
                      '&:hover': {
                        boxShadow: '0 12px 40px rgba(16, 185, 129, 0.35)',
                      },
                    }}
                    endIcon={<ArrowForwardIcon />}
                  >
                    {content.heroPrimary}
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={handleLogin}
                    sx={{
                      borderColor: '#e2e8f0',
                      color: '#475569',
                      py: 2,
                      px: 5,
                      fontSize: '1rem',
                      fontWeight: 600,
                      borderRadius: 2,
                      backgroundColor: '#ffffff',
                      '&:hover': {
                        borderColor: '#10b981',
                        color: '#10b981',
                        backgroundColor: alpha('#10b981', 0.04),
                      },
                    }}
                  >
                    {content.heroSecondary}
                  </Button>
                </motion.div>
              </Stack>
            </Paper>
          </motion.div>
        </Container>
      </Box>

      <Box
        component="footer"
        sx={{
          py: 6,
          backgroundColor: '#ffffff',
          textAlign: 'center',
          borderTop: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 2 }}>
            <Box sx={{ mr: 1.5 }}>
              <WebMonitorLogo size={32} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#334155' }}>
              WebMonitor
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1 }}>
            © 2024 WebMonitor. All rights reserved.
          </Typography>
          <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
            {content.footerTagline}
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" sx={{ color: '#94a3b8' }}>
              {t('common.footerCta')}
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default HomePage;
