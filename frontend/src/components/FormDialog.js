import React from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

/**
 * 简单表单弹窗：标题 + 内容 + 取消/提交。
 *
 * 用真正的 <form> 提交，所以回车也能提交；pending 时按钮禁用。
 * 只服务"内容很简单"的两个表单（黑名单、订阅设置），复杂表单保留各自结构。
 */
const FormDialog = ({
  open,
  title,
  icon,
  children,
  submitLabel,
  cancelLabel,
  onSubmit,
  onClose,
  pending = false,
  submitDisabled = false,
}) => (
  <Dialog open={open} onClose={pending ? undefined : onClose} maxWidth="sm" fullWidth>
    <form onSubmit={onSubmit} noValidate>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {icon}
        <Typography component="span" variant="h6">
          {title}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>{children}</Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={pending}>
          {cancelLabel}
        </Button>
        <Button type="submit" variant="contained" disabled={pending || submitDisabled}>
          {submitLabel}
        </Button>
      </DialogActions>
    </form>
  </Dialog>
);

export default FormDialog;
