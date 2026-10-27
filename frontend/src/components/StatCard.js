import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  alpha,
  LinearProgress,
} from '@mui/material';
import { useTranslation } from 'react-i18next';

const StatCard = ({ title, value, icon, color, subtitle, trend }) => {
  const { t } = useTranslation();

  const getTrendColor = () => {
    if (trend > 0) return 'success.main';
    if (trend < 0) return 'error.main';
    return 'text.secondary';
  };

  const getTrendText = () => {
    if (trend > 0) return `+${trend}%`;
    if (trend < 0) return `${trend}%`;
    return '';
  };

  return (
    <Card
      sx={{
        height: '100%',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        borderRadius: 3,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        position: 'relative',
        overflow: 'hidden',
        '&:hover': {
          transform: 'translateY(-4px) scale(1.02)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
          '& .stat-icon': {
            transform: 'scale(1.1)',
          },
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.6)} 100%)`,
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box
            className="stat-icon"
            sx={{
              background: `linear-gradient(45deg, ${color} 30%, ${alpha(color, 0.7)} 90%)`,
              color: 'white',
              borderRadius: 3,
              p: 1.5,
              display: 'flex',
              transition: 'transform 0.3s ease',
              boxShadow: `0 4px 15px ${alpha(color, 0.3)}`,
            }}
          >
            {icon}
          </Box>
          {trend !== undefined && (
            <Box sx={{ textAlign: 'right' }}>
              <Typography
                variant="caption"
                sx={{
                  color: getTrendColor(),
                  fontWeight: 'bold',
                  display: 'block',
                }}
              >
                {getTrendText()}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {t('common.vsLastWeek')}
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ mb: 1 }}>
          <Typography
            variant="h3"
            component="div"
            sx={{
              fontWeight: 700,
              color: '#1a1a1a',
              mb: 0.5,
              fontSize: { xs: '1.8rem', md: '2.2rem' },
            }}
          >
            {value}
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              mb: subtitle ? 0.5 : 0,
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* Progress indicator */}
        <Box sx={{ mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={(() => {
              if (typeof value === 'number') {
                return Math.min(value, 100);
              }
              if (typeof value === 'string') {
                const num = parseFloat(value);
                return isNaN(num) ? 0 : Math.min(num, 100);
              }
              return 0;
            })()}
            sx={{
              height: 6,
              borderRadius: 3,
              backgroundColor: alpha(color, 0.1),
              '& .MuiLinearProgress-bar': {
                background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.7)} 100%)`,
                borderRadius: 3,
              },
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default StatCard;