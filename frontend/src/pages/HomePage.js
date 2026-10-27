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

import WebMonitorLogo from '../components/WebMonitorLogo';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { PROJECT_AUTHOR_URL, PROJECT_REPO_URL } from '../utils/links';

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

// 展示用配置：图标与颜色只属于页面，文案全部来自翻译资源，按 locale 的 key 对应。
const FEATURE_PRESENTATION = {
  realtime: { Icon: MonitorIcon, color: '#10b981' },
  notifications: { Icon: NotificationsIcon, color: '#2563eb' },
  secure: { Icon: SecurityIcon, color: '#f59e0b' },
  performance: { Icon: SpeedIcon, color: '#ec4899' },
  analysis: { Icon: AssessmentIcon, color: '#8b5cf6' },
  schedule: { Icon: ScheduleIcon, color: '#06b6d4' },
};

const ADVANTAGE_PRESENTATION = {
  setup: { Icon: CheckCircleIcon, color: '#10b981' },
  scale: { Icon: TrendingUpIcon, color: '#2563eb' },
  api: { Icon: IntegrationIcon, color: '#f59e0b' },
};

// 示例数据：数值与颜色是页面固定的演示内容，标签来自 home.previewStats。
const PREVIEW_STATS = [
  { key: 'activeTasks', value: '12', color: '#10b981' },
  { key: 'changesToday', value: '5', color: '#2563eb' },
  { key: 'successRate', value: '99%', color: '#f59e0b' },
];

// 示例活动：状态文案来自 home.previewActivities。
const PREVIEW_ACTIVITIES = [
  { url: 'example.com/products', statusKey: 'changed', statusColor: '#f59e0b' },
  { url: 'shop.example.com', statusKey: 'normal', statusColor: '#10b981' },
  { url: 'news.example.com', statusKey: 'normal', statusColor: '#10b981' },
];

const HomePage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const refHero = useRef(null);
  const refFeatures = useRef(null);
  const refAdvantages = useRef(null);
  const refCTA = useRef(null);
  const heroInView = useInView(refHero, { once: true, margin: '-100px' });
  const featuresInView = useInView(refFeatures, { once: true, margin: '-100px' });
  const advantagesInView = useInView(refAdvantages, { once: true, margin: '-100px' });
  const ctaInView = useInView(refCTA, { once: true, margin: '-100px' });

  const features = t('home.features', { returnObjects: true }).map((item) => ({
    ...item,
    ...FEATURE_PRESENTATION[item.key],
  }));
  const advantages = t('home.advantages', { returnObjects: true }).map((item) => ({
    ...item,
    ...ADVANTAGE_PRESENTATION[item.key],
  }));

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
                <WebMonitorLogo size={40} />
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
                {t('home.navDocs')}
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
                {t('home.navLogin')}
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
                {t('home.navRegister')}
              </Button>
              <Tooltip title="GitHub" arrow>
                <IconButton
                  href={PROJECT_REPO_URL}
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
                        {t('home.badge')}
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
                    {t('home.heroTitleLine1')}
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
                      {t('home.heroTitleLine2')}
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
                    {t('home.heroSubtitle')}
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
                        {t('home.heroPrimary')}
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
                        {t('home.heroSecondary')}
                      </Button>
                    </motion.div>
                  </Stack>
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
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: '#94a3b8', mb: 1.5, letterSpacing: 0.5 }}
                  >
                    {t('home.previewLabel')}
                  </Typography>
                  <Box
                    sx={{
                      position: 'relative',
                      width: '100%',
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
                          {PREVIEW_STATS.map((stat, i) => (
                            <Grid key={stat.key} size={{ xs: 4 }}>
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
                                    {t(`home.previewStats.${stat.key}`)}
                                  </Typography>
                                </Box>
                              </motion.div>
                            </Grid>
                          ))}
                        </Grid>

                        <Box sx={{ backgroundColor: '#f8fafc', borderRadius: 2, p: 2 }}>
                          <Typography variant="subtitle2" sx={{ color: '#475569', mb: 2 }}>
                            {t('home.activityTitle')}
                          </Typography>
                          {PREVIEW_ACTIVITIES.map((item, i) => (
                            <motion.div
                              key={`${item.url}-${item.statusKey}`}
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
                                  borderBottom: i < PREVIEW_ACTIVITIES.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
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
                                  {t(`home.previewActivities.${item.statusKey}`)}
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
                            {t('home.floatingTitle')}
                          </Typography>
                          <Typography variant="subtitle2" sx={{ color: '#10b981', fontWeight: 600 }}>
                            {t('home.floatingStatus')}
                          </Typography>
                        </Box>
                      </Paper>
                    </motion.div>
                  </Box>
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
                {t('home.featuresOverline')}
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
                {t('home.featuresTitle')}
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
                {t('home.featuresSubtitle')}
              </Typography>
            </Box>
          </motion.div>

          <Grid container spacing={3}>
            {features.map((feature, index) => (
              <Grid key={feature.key} size={{ xs: 12, sm: 6, md: 4 }}>
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
                        <feature.Icon sx={{ fontSize: 28 }} />
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
                {t('home.advantagesOverline')}
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
                {t('home.advantagesTitle')}
              </Typography>
            </Box>
          </motion.div>

          <Grid container spacing={4} sx={{ alignItems: 'stretch' }}>
            {advantages.map((advantage, index) => (
              <Grid key={advantage.key} size={{ xs: 12, md: 4 }}>
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
                      <advantage.Icon />
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
                {t('home.ctaTitle')}
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
                {t('home.ctaSubtitle')}
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
                    {t('home.heroPrimary')}
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
                    {t('home.heroSecondary')}
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
            {t('home.footerTagline')}
          </Typography>
          <Stack
            direction="row"
            spacing={2}
            sx={{ mt: 2, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}
          >
            <Box
              component="a"
              href={PROJECT_REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                color: '#94a3b8',
                textDecoration: 'none',
                fontSize: '0.8125rem',
                '&:hover': { color: '#10b981' },
              }}
            >
              <GitHubIcon width="16" height="16" />
              {t('common.repoLink')}
            </Box>
            <Typography variant="caption" sx={{ color: '#cbd5e1' }}>
              {t('common.author')}{' '}
              <Box
                component="a"
                href={PROJECT_AUTHOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: '#94a3b8', textDecoration: 'none', '&:hover': { color: '#10b981' } }}
              >
                ox0pine
              </Box>
            </Typography>
          </Stack>
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
