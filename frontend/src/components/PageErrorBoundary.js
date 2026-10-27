import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Box, Button, Container, Paper, Typography } from '@mui/material';
import { ReportProblemOutlined as ErrorIcon } from '@mui/icons-material';

/**
 * 渲染/chunk 加载失败时的兜底，避免整页白屏。
 *
 * 外层函数组件提供路由键与文案；内部 class 边界才是 React 需要的实现。
 * resetKey（当前 pathname）变化时清空错误状态，用户切页即可自愈。
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // 只记录到控制台：用户可见区域显示的是本地化提示与重载按钮
    console.error('Page render failed', error, info);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <Container maxWidth="sm" sx={{ py: 10 }}>
        <Paper sx={{ p: 5, textAlign: 'center', borderRadius: 4 }}>
          <ErrorIcon sx={{ fontSize: 56, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            {this.props.message}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            {this.props.description}
          </Typography>
          <Box>
            <Button variant="contained" onClick={() => window.location.reload()}>
              {this.props.reloadLabel}
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }
}

const PageErrorBoundary = ({ children }) => {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <ErrorBoundary
      resetKey={location.pathname}
      message={t('common.loadFailedTitle')}
      description={t('common.loadFailedBody')}
      reloadLabel={t('common.reload')}
    >
      {children}
    </ErrorBoundary>
  );
};

export default PageErrorBoundary;
