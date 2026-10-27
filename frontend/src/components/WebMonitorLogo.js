import { Box } from '@mui/material';

const faviconSrc = `${process.env.PUBLIC_URL || ''}/favicon.svg`;

/** WebMonitor 标志。唯一的消费者都只传 size/sx。 */
const WebMonitorLogo = ({ size = 40, sx }) => (
  <Box
    component="img"
    src={faviconSrc}
    alt="WebMonitor"
    sx={{
      display: 'block',
      width: size,
      height: size,
      objectFit: 'contain',
      ...sx,
    }}
  />
);

export default WebMonitorLogo;
