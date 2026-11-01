import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  IconButton,
  InputAdornment,
  Link,
  LinearProgress,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../contexts/AuthContext';
import api, { getApiErrorMessage } from '../api/client';
import { BrandLockup } from '../components/WebMonitorLogo';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { UI_COLORS, UI_FONTS, UI_SURFACE } from '../theme/tokens';

const mono = { fontFamily: UI_FONTS.mono, fontSize: 11, color: UI_COLORS.muted, letterSpacing: 0 };

const PasswordToggle = ({ shown, onToggle, disabled, label }) => (
  <InputAdornment position="end">
    <IconButton
      aria-label={label}
      onClick={onToggle}
      edge="end"
      disabled={disabled}
      sx={{ width: 28, height: 28, mr: -0.5 }}
    >
      {shown ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
    </IconButton>
  </InputAdornment>
);

const Register = () => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
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

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
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

  const handlePasswordChange = (event) => {
    const newPassword = event.target.value;
    setFormData({ ...formData, password: newPassword });
    setPasswordStrength(calculatePasswordStrength(newPassword));
    setError('');
    setSuccess('');
  };

  const strengthColor = passwordStrength < 30 ? UI_COLORS.danger : passwordStrength < 70 ? UI_COLORS.warning : UI_COLORS.success;
  const strengthText =
    passwordStrength < 30 ? t('register.weak') : passwordStrength < 70 ? t('register.medium') : t('register.strong');

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/api/auth/register', {
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      setSuccess(t('register.validation.success'));
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(getApiErrorMessage(err, t('register.validation.failed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: UI_COLORS.background, display: 'flex', flexDirection: 'column' }}>
      <Box component="header" sx={{ borderBottom: UI_SURFACE.divider, backgroundColor: UI_COLORS.surface }}>
        <Container maxWidth="lg">
          <Box sx={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <BrandLockup size={22} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton aria-label={t('common.backHome')} onClick={() => navigate('/')} sx={{ width: 32, height: 32 }}>
                <ArrowBackIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <LanguageSwitcher />
            </Box>
          </Box>
        </Container>
      </Box>

      <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', py: { xs: 6, md: 8 } }}>
        <Container maxWidth="lg">
          <Grid container spacing={{ xs: 5, md: 8 }} sx={{ alignItems: 'center' }}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Box className="enter">
                <Typography component="h1" variant="h1" sx={{ fontSize: { xs: 36, md: 44 } }}>
                  {t('register.heroTitleStart')}
                  <br />
                  {t('register.heroTitleAccent')}
                </Typography>
                <Typography sx={{ mt: 2, fontSize: 16, lineHeight: 1.6, color: UI_COLORS.secondary, maxWidth: '42ch' }}>
                  {t('register.heroSubtitle')}
                </Typography>

                <Box sx={{ mt: 4 }}>
                  <Typography sx={{ ...mono, mb: 1 }}>{t('register.benefitsTitle')}</Typography>
                  {benefits.map((benefit) => (
                    <Box
                      key={benefit}
                      sx={{ py: 1.25, borderTop: UI_SURFACE.divider, display: 'flex', alignItems: 'baseline', gap: 1.5 }}
                    >
                      <Box sx={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: UI_COLORS.muted, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ color: UI_COLORS.secondary }}>
                        {benefit}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 7 }}>
              <Paper
                elevation={0}
                sx={{ p: { xs: 3, md: 4 }, border: UI_SURFACE.border, borderRadius: 4, backgroundColor: UI_COLORS.surface }}
              >
                <Typography component="h2" variant="h5">
                  {t('register.formTitle')}
                </Typography>
                <Typography variant="body2" sx={{ color: UI_COLORS.secondary, mt: 0.5 }}>
                  {t('register.formSubtitle')}
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mt: 3 }}>
                    {error}
                  </Alert>
                )}
                {success && (
                  <Alert severity="success" sx={{ mt: 3 }}>
                    {success}
                  </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
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
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <TextField
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
                      />
                    </Grid>
                  </Grid>

                  <TextField
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
                    slotProps={{
                      input: {
                        endAdornment: (
                          <PasswordToggle
                            shown={showPassword}
                            onToggle={() => setShowPassword((value) => !value)}
                            disabled={loading}
                            label={t('common.togglePasswordVisibility')}
                          />
                        ),
                      },
                    }}
                  />

                  {formData.password && (
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.75 }}>
                        <Typography variant="caption" sx={{ color: UI_COLORS.secondary }}>
                          {t('register.passwordStrength')}
                        </Typography>
                        <Typography variant="caption" sx={{ color: strengthColor }}>
                          {strengthText}
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={passwordStrength}
                        sx={{ backgroundColor: UI_COLORS.raised, '& .MuiLinearProgress-bar': { backgroundColor: strengthColor } }}
                      />
                    </Box>
                  )}

                  <TextField
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
                    slotProps={{
                      input: {
                        endAdornment: (
                          <PasswordToggle
                            shown={showConfirmPassword}
                            onToggle={() => setShowConfirmPassword((value) => !value)}
                            disabled={loading}
                            label={t('common.togglePasswordVisibility')}
                          />
                        ),
                      },
                    }}
                  />

                  <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 1 }}>
                    {loading ? t('register.submitting') : t('register.submit')}
                  </Button>
                </Box>

                <Typography variant="body2" sx={{ mt: 3, color: UI_COLORS.secondary }}>
                  {t('register.existingAccount')}{' '}
                  <Link component="button" type="button" variant="body2" onClick={() => navigate('/login')} sx={{ fontWeight: 500 }}>
                    {t('register.loginNow')}
                  </Link>
                </Typography>
                <Typography variant="caption" sx={{ mt: 1, color: UI_COLORS.muted, display: 'block' }}>
                  {t('register.instanceNote')}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default Register;
