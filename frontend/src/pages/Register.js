import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Paper,
  Avatar,
  Link,
  Grid,
  alpha,
  IconButton,
  InputAdornment,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Person as PersonIcon,
  Lock as LockIcon,
  Email as EmailIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowBack as ArrowBackIcon,
  CheckCircle as CheckCircleIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import api, { getApiErrorMessage } from '../api/client';
import WebMonitorLogo from '../components/WebMonitorLogo';
import LanguageSwitcher from '../components/LanguageSwitcher';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const benefits = t('register.benefits', { returnObjects: true });

  React.useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
    setSuccess('');
  };

  const calculatePasswordStrength = (password) => {
    let strength = 0;

    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;
    if (/\d/.test(password)) strength += 25;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 25;

    return Math.min(strength, 100);
  };

  const validateForm = () => {
    if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
      setError(t('register.validation.required'));
      return false;
    }

    if (formData.username.length < 3) {
      setError(t('register.validation.username'));
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('register.validation.mismatch'));
      return false;
    }

    if (formData.password.length < 6) {
      setError(t('register.validation.password'));
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError(t('register.validation.email'));
      return false;
    }

    return true;
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setFormData({
      ...formData,
      password: newPassword,
    });
    setPasswordStrength(calculatePasswordStrength(newPassword));
    setError('');
    setSuccess('');
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 30) return '#ef4444';
    if (passwordStrength < 70) return '#f59e0b';
    return '#10b981';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 30) return t('register.weak');
    if (passwordStrength < 70) return t('register.medium');
    return t('register.strong');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const registerData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      };

      await api.post('/api/auth/register', registerData);

      setSuccess(t('register.validation.success'));

      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(getApiErrorMessage(err, t('register.validation.failed')));
    } finally {
      setLoading(false);
    }
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
            radial-gradient(circle at 80% 30%, ${alpha('#2563eb', 0.04)} 0%, transparent 50%),
            radial-gradient(circle at 20% 70%, ${alpha('#10b981', 0.04)} 0%, transparent 50%)
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
                    aria-label={t('common.backHome')}
                    onClick={() => navigate('/')}
                    sx={{
                      color: '#64748b',
                      border: '1px solid #e2e8f0',
                      '&:hover': {
                        color: '#2563eb',
                        borderColor: '#2563eb',
                        backgroundColor: alpha('#2563eb', 0.04),
                      },
                    }}
                  >
                    <ArrowBackIcon />
                  </IconButton>
                  <LanguageSwitcher sx={{ ml: 'auto' }} />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                  <Box sx={{ mr: 2 }}>
                    <WebMonitorLogo size={48} />
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#334155' }}>
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
                  {t('register.heroTitleStart')}
                  <br />
                  <Box
                    component="span"
                    sx={{
                      background: 'linear-gradient(135deg, #2563eb 0%, #10b981 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {t('register.heroTitleAccent')}
                  </Box>
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
                  {t('register.heroSubtitle')}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography variant="subtitle2" sx={{ color: '#475569', fontWeight: 600 }}>
                    {t('register.benefitsTitle')}
                  </Typography>
                  {benefits.map((benefit, index) => {
                    const colors = ['#10b981', '#2563eb', '#f59e0b', '#8b5cf6'];
                    return (
                      <motion.div
                        key={benefit}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 + index * 0.1 }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <CheckCircleIcon sx={{ color: colors[index], mr: 1.5, fontSize: 20 }} />
                          <Typography variant="body2" sx={{ color: '#64748b' }}>
                            {benefit}
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
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        mr: 2,
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                      }}
                    >
                      <PersonAddIcon sx={{ fontSize: 22 }} />
                    </Avatar>
                    <Typography component="h2" variant="h4" sx={{ fontWeight: 700, color: '#334155' }}>
                      {t('register.formTitle')}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#64748b', ml: 7 }}>
                    {t('register.formSubtitle')}
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

                {success && (
                  <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                    <Alert
                      severity="success"
                      sx={{
                        width: '100%',
                        mb: 3,
                        borderRadius: 2,
                        backgroundColor: alpha('#10b981', 0.08),
                        border: `1px solid ${alpha('#10b981', 0.2)}`,
                        color: '#059669',
                        '& .MuiAlert-icon': {
                          color: '#10b981',
                        },
                      }}
                    >
                      {success}
                    </Alert>
                  </motion.div>
                )}

                <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    id="username"
                    label={t('register.username')}
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
                          borderColor: '#2563eb',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#2563eb',
                          borderWidth: 2,
                        },
                        '&.Mui-focused': {
                          backgroundColor: '#ffffff',
                        },
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: '#2563eb',
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
                    id="email"
                    label={t('register.email')}
                    name="email"
                    autoComplete="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={loading}
                    sx={{
                      mt: 2,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: '#f8fafc',
                        '& fieldset': {
                          borderColor: '#e2e8f0',
                        },
                        '&:hover fieldset': {
                          borderColor: '#2563eb',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#2563eb',
                          borderWidth: 2,
                        },
                        '&.Mui-focused': {
                          backgroundColor: '#ffffff',
                        },
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: '#2563eb',
                      },
                    }}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon sx={{ color: '#94a3b8' }} />
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
                    label={t('register.password')}
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handlePasswordChange}
                    disabled={loading}
                    sx={{
                      mt: 2,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: '#f8fafc',
                        '& fieldset': {
                          borderColor: '#e2e8f0',
                        },
                        '&:hover fieldset': {
                          borderColor: '#2563eb',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#2563eb',
                          borderWidth: 2,
                        },
                        '&.Mui-focused': {
                          backgroundColor: '#ffffff',
                        },
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: '#2563eb',
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
                              aria-label={t('common.togglePasswordVisibility')}
                              onClick={() => setShowPassword(!showPassword)}
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

                  {formData.password && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <Box sx={{ mt: 1.5, mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                          <Typography variant="caption" sx={{ color: '#64748b', flexGrow: 1 }}>
                            {t('register.passwordStrength')}:
                          </Typography>
                          <Typography variant="caption" sx={{ color: getPasswordStrengthColor(), fontWeight: 600 }}>
                            {getPasswordStrengthText()}
                          </Typography>
                        </Box>
                        <Box sx={{ height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, overflow: 'hidden' }}>
                          <Box
                            sx={{
                              height: '100%',
                              width: `${passwordStrength}%`,
                              backgroundColor: getPasswordStrengthColor(),
                              borderRadius: 2,
                              transition: 'all 0.3s ease',
                            }}
                          />
                        </Box>
                      </Box>
                    </motion.div>
                  )}

                  <TextField
                    margin="normal"
                    required
                    fullWidth
                    name="confirmPassword"
                    label={t('register.confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={loading}
                    sx={{
                      mt: 2,
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: '#f8fafc',
                        '& fieldset': {
                          borderColor: '#e2e8f0',
                        },
                        '&:hover fieldset': {
                          borderColor: '#2563eb',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#2563eb',
                          borderWidth: 2,
                        },
                        '&.Mui-focused': {
                          backgroundColor: '#ffffff',
                        },
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: '#2563eb',
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
                              aria-label={t('common.togglePasswordVisibility')}
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              edge="end"
                              disabled={loading}
                              sx={{ color: '#94a3b8' }}
                            >
                              {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
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
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        color: 'white',
                        fontWeight: 600,
                        borderRadius: 2,
                        fontSize: '1rem',
                        boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                        '&:hover': {
                          boxShadow: '0 6px 20px rgba(37, 99, 235, 0.35)',
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
                          {t('register.submitting')}
                        </Box>
                      ) : (
                        t('register.submit')
                      )}
                    </Button>
                  </motion.div>
                </Box>

                <Box sx={{ mt: 4, width: '100%', textAlign: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    {t('register.existingAccount')}
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() => navigate('/login')}
                      sx={{
                        ml: 0.5,
                        color: '#2563eb',
                        fontWeight: 600,
                        textDecoration: 'none',
                        '&:hover': {
                          textDecoration: 'underline',
                        },
                      }}
                    >
                      {t('register.loginNow')}
                    </Link>
                  </Typography>
                </Box>

                <Box sx={{ mt: 3, width: '100%', textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                    {t('register.footer')}
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

export default Register;
