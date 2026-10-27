import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';

/**
 * 危险操作确认框，替代 window.confirm。
 *
 * pending 时禁用确认/取消/ESC/点击遮罩：避免重复提交，也避免请求在途时关掉窗口。
 */
const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  pending = false,
  onConfirm,
  onClose,
}) => (
  <Dialog
    open={open}
    onClose={pending ? undefined : onClose}
    disableEscapeKeyDown={pending}
    maxWidth="xs"
    fullWidth
  >
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <DialogContentText>{message}</DialogContentText>
    </DialogContent>
    <DialogActions sx={{ px: 3, pb: 2 }}>
      <Button onClick={onClose} disabled={pending}>
        {cancelLabel}
      </Button>
      <Button onClick={onConfirm} color="error" variant="contained" disabled={pending}>
        {confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
