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
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../contexts/AuthContext';
import api, { getApiErrorMessage } from '../api/client';
import { BrandLockup } from '../components/WebMonitorLogo';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { UI_COLORS, UI_FONTS, UI_SURFACE } from '../theme/tokens';

const mono = { fontFamily: UI_FONTS.mono, fontSize: 11, color: UI_COLORS.muted, letterSpacing: 0 };

const Login = () => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const { t } = useTranslation();

  React.useEffect(() => {
    if (isAuthenticated()) {
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formFormData = new FormData();
      formFormData.append('username', formData.username);
      formFormData.append('password', formData.password);

      const response = await api.post('/api/auth/login', formFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const { access_token, user } = response.data;
      await login(user, access_token);

      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, t('login.defaultError')));
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
            <Grid size={{ xs: 12, md: 6 }}>
              <Box className="enter">
                <Typography component="h1" variant="h1" sx={{ fontSize: { xs: 36, md: 44 }, maxWidth: '18ch' }}>
                  {t('login.heroTitle')}
                </Typography>
                <Typography sx={{ mt: 2, fontSize: 16, lineHeight: 1.6, color: UI_COLORS.secondary, maxWidth: '42ch' }}>
                  {t('login.heroSubtitle')}
                </Typography>
                <Typography sx={{ ...mono, mt: 4 }}>{t('login.facts')}</Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Paper
                elevation={0}
                sx={{ p: { xs: 3, md: 4 }, border: UI_SURFACE.border, borderRadius: 4, backgroundColor: UI_COLORS.surface }}
              >
                <Typography component="h2" variant="h5">
                  {t('login.formTitle')}
                </Typography>
                <Typography variant="body2" sx={{ color: UI_COLORS.secondary, mt: 0.5 }}>
                  {t('login.formSubtitle')}
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mt: 3 }}>
                    {error}
                  </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    required
                    fullWidth
                    id="username"
                    label={t('login.username')}
                    name="username"
                    autoComplete="username"
                    autoFocus
                    value={formData.username}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <TextField
                    required
                    fullWidth
                    name="password"
                    label={t('login.password')}
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    autoComplete="current-password"
                    value={formData.password}
                    onChange={handleChange}
                    disabled={loading}
                    slotProps={{
                      input: {
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label={t('common.togglePasswordVisibility')}
                              onClick={() => setShowPassword((value) => !value)}
                              edge="end"
                              disabled={loading}
                              sx={{ width: 28, height: 28, mr: -0.5 }}
                            >
                              {showPassword ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      },
                    }}
                  />
                  <Button type="submit" fullWidth variant="contained" size="large" disabled={loading} sx={{ mt: 1 }}>
                    {loading ? t('login.submitting') : t('login.submit')}
                  </Button>
                </Box>

                <Typography variant="body2" sx={{ mt: 3, color: UI_COLORS.secondary }}>
                  {t('login.noAccount')}{' '}
                  <Link component="button" type="button" variant="body2" onClick={() => navigate('/register')} sx={{ fontWeight: 500 }}>
                    {t('login.registerNow')}
                  </Link>
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default Login;
