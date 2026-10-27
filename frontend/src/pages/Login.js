import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Paper,
  Grid,
  alpha,
  IconButton,
  InputAdornment,
  Link,
} from '@mui/material';
import {
  Lock as LockIcon,
  Person as PersonIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import axios from 'axios';
import { WebMonitorLogo } from '../components/WebMonitorLogo';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { isChineseLanguage } from '../utils/i18n';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const { i18n } = useTranslation();
  const isChinese = isChineseLanguage(i18n.language);

  const content = isChinese ? {
    title: '欢迎回来',
    subtitle: '登录您的账户，继续监控您关心的网页内容变化',
    badges: ['实时监控', '即时通知', '安全可靠'],
    formTitle: '用户登录',
    formSubtitle: '请输入您的账户信息',
    username: '用户名',
    password: '密码',
    submit: '登录',
    submitting: '登录中...',
    noAccount: '还没有账户？',
    registerNow: '立即注册',
    footer: '基于 Selenium 的专业网页监控解决方案',
    defaultError: '登录失败，请检查用户名和密码',
  } : {
    title: 'Welcome back',
    subtitle: 'Sign in to continue monitoring the pages and content changes that matter to you.',
    badges: ['Real-time monitoring', 'Instant alerts', 'Reliable and secure'],
    formTitle: 'Log in',
    formSubtitle: 'Enter your account details below',
    username: 'Username',
    password: 'Password',
    submit: 'Log in',
    submitting: 'Logging in...',
    noAccount: 'Don\'t have an account?',
    registerNow: 'Sign up now',
    footer: 'A professional web monitoring solution powered by Selenium',
    defaultError: 'Login failed. Please check your username and password.',
  };

  React.useEffect(() => {
    if (isAuthenticated()) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formFormData = new FormData();
      formFormData.append('username', formData.username);
      formFormData.append('password', formData.password);

      const response = await axios.post('/api/auth/login', formFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const { access_token, user } = response.data;
      login(user, access_token);

      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.message ||
        content.defaultError
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 30%, ${alpha('#10b981', 0.04)} 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, ${alpha('#2563eb', 0.04)} 0%, transparent 50%)
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
            linear-gradient(${alpha('#e2e8f0', 0.4)} 1px, transparent 1px),
            linear-gradient(90deg, ${alpha('#e2e8f0', 0.4)} 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <Container
        maxWidth="lg"
        sx={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          py: 4,
        }}
      >
        <Grid container spacing={8} sx={{ alignItems: 'center' }}>
          <Grid size={{ xs: 12, md: 6 }}>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Box sx={{ pr: { md: 6 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                  <IconButton
                    onClick={() => navigate('/')}
                    sx={{
                      color: '#64748b',
                      border: '1px solid #e2e8f0',
                      '&:hover': {
                        color: '#10b981',
                        borderColor: '#10b981',
                        backgroundColor: alpha('#10b981', 0.04),
                      },
                    }}
                  >
                    <ArrowBackIcon />
                  </IconButton>
                  <LanguageSwitcher sx={{ ml: 'auto' }} />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                  <Box sx={{ mr: 2 }}>
                    <WebMonitorLogo size={48} showPulse />
                  </Box>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 700,
                      color: '#334155',
                    }}
                  >
                    WebMonitor
                  </Typography>
                </Box>

                <Typography
                  variant="h2"
                  component="h1"
                  sx={{
                    color: '#334155',
                    fontWeight: 800,
                    mb: 3,
                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {content.title}
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: '#64748b',
                    mb: 4,
                    fontSize: { xs: '1rem', md: '1.15rem' },
                    lineHeight: 1.7,
                    fontWeight: 400,
                  }}
                >
                  {content.subtitle}
                </Typography>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {content.badges.map((label, index) => {
                    const color = ['#10b981', '#2563eb', '#f59e0b'][index];
                    return (
                      <motion.div
                        key={label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                      >
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            px: 2,
                            py: 1,
                            borderRadius: 2,
                            backgroundColor: alpha(color, 0.08),
                            border: `1px solid ${alpha(color, 0.15)}`,
                          }}
                        >
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              backgroundColor: color,
                              mr: 1,
                            }}
                          />
                          <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
                            {label}
                          </Typography>
                        </Box>
                      </motion.div>
                    );
                  })}
                </Box>
              </Box>
            </motion.div>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 4, md: 5 },
                  background: '#ffffff',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  borderRadius: 4,
                  boxShadow: '0 25px 80px rgba(0, 0, 0, 0.06)',
                }}
              >
                <Box sx={{ mb: 4 }}>
                  <Typography component="h2" variant="h4" sx={{ fontWeight: 700, color: '#334155', mb: 1 }}>
                    {content.formTitle}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    {content.formSubtitle}
                  </Typography>
                </Box>

                {error && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <Alert
                      severity="error"
                      sx={{
                        width: '100%',
                        mb: 3,
                        borderRadius: 2,
                        backgroundColor: alpha('#ef4444', 0.08),
                        border: `1px solid ${alpha('#ef4444', 0.2)}`,
                        color: '#dc2626',
                        '& .MuiAlert-icon': {
                          color: '#ef4444',
                        },
                      }}
                    >
                      {error}
                    </Alert>
                  </motion.div>
                )}

                <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="username"
                    label={content.username}
                    name="username"
                    autoComplete="username"
                    autoFocus
                    value={formData.username}
                    onChange={handleChange}
                    disabled={loading}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: '#f8fafc',
                        '& fieldset': {
                          borderColor: '#e2e8f0',
                        },
                        '&:hover fieldset': {
                          borderColor: '#10b981',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#10b981',
                          borderWidth: 2,
                        },
                        '&.Mui-focused': {
                          backgroundColor: '#ffffff',
                        },
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: '#10b981',
                      },
                    }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon sx={{ color: '#94a3b8' }} />
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="password"
                    label={content.password}
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    sx={{
                      mt: 3,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: '#f8fafc',
                        '& fieldset': {
                          borderColor: '#e2e8f0',
                        },
                        '&:hover fieldset': {
                          borderColor: '#10b981',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#10b981',
                          borderWidth: 2,
                        },
                        '&.Mui-focused': {
                          backgroundColor: '#ffffff',
                        },
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: '#10b981',
                      },
                    }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon sx={{ color: '#94a3b8' }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="toggle password visibility"
                              onClick={handleTogglePasswordVisibility}
                              edge="end"
                              disabled={loading}
                              sx={{ color: '#94a3b8' }}
                            >
                              {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />

                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      disabled={loading}
                      size="large"
                      sx={{
                        mt: 4,
                        mb: 2,
                        py: 1.75,
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        fontWeight: 600,
                        borderRadius: 2,
                        fontSize: '1rem',
                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.25)',
                        '&:hover': {
                          boxShadow: '0 6px 20px rgba(16, 185, 129, 0.35)',
                        },
                        '&:disabled': {
                          background: '#e2e8f0',
                          color: '#94a3b8',
                        },
                      }}
                      endIcon={!loading && <ArrowForwardIcon />}
                    >
                      {loading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Box
                            sx={{
                              width: 20,
                              height: 20,
                              mr: 2,
                              border: '2px solid rgba(255,255,255,0.3)',
                              borderTop: '2px solid #fff',
                              borderRadius: '50%',
                              animation: 'spin 1s linear infinite',
                              '@keyframes spin': {
                                '0%': { transform: 'rotate(0deg)' },
                                '100%': { transform: 'rotate(360deg)' },
                              },
                            }}
                          />
                          {content.submitting}
                        </Box>
                      ) : (
                        content.submit
                      )}
                    </Button>
                  </motion.div>
                </Box>

                <Box sx={{ mt: 4, width: '100%', textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    {content.noAccount}
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() => navigate('/register')}
                      sx={{
                        ml: 0.5,
                        color: '#10b981',
                        fontWeight: 600,
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      {content.registerNow}
                    </Link>
                  </Typography>
                </Box>

                <Box sx={{ mt: 3, width: '100%', textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                    {content.footer}
                  </Typography>
                </Box>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default Login;
