import React from 'react';
import { Alert, Snackbar } from '@mui/material';

/**
 * 统一的操作反馈：右上角、6000ms、可关闭。
 *
 * message 由调用方决定——本地提示先存 key/params 再 t()，服务端 detail 原样展示，
 * 不把 detail 当翻译 key。
 */
const FeedbackSnackbar = ({ open, message, severity = 'success', onClose }) => (
  <Snackbar
    open={open}
    autoHideDuration={6000}
    onClose={onClose}
    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
  >
    <Alert onClose={onClose} severity={severity} variant="filled" sx={{ width: '100%' }}>
      {message}
    </Alert>
  </Snackbar>
);

export default FeedbackSnackbar;
