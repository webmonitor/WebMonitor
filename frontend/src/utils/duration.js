/**
 * 把任务间隔（秒）压成一段可读的读数。
 *
 * 60 秒以内显示秒；整分钟显示分钟；超过一小时显示小时和分钟。
 * 文案走 i18n，保证中英文单位都正确。
 */
export const formatInterval = (seconds, t) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return t('common.emptyValue');
  }

  if (seconds < 60) {
    return t('common.duration.seconds', { value: seconds });
  }

  if (seconds < 3600) {
    return t('common.duration.minutes', { value: Math.round(seconds / 60) });
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);

  return minutes > 0
    ? t('common.duration.hoursMinutes', { hours, minutes })
    : t('common.duration.hours', { value: hours });
};
