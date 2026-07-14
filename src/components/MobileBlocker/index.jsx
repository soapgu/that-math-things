import React from 'react';
import { Typography } from 'antd';
import useMobile from '../../hooks/useMobile';

const { Title, Text } = Typography;

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 99999,
};

const cardStyle = {
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: '48px 32px',
  textAlign: 'center',
  maxWidth: 360,
  margin: '0 24px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
};

const iconStyle = {
  fontSize: 64,
  lineHeight: 1,
};

export default function MobileBlocker({ children }) {
  const isMobile = useMobile();

  if (!isMobile) return children;

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={iconStyle}>💻</div>
        <Title level={4} style={{ marginTop: 16, marginBottom: 8 }}>
          目前网站只支持电脑和 Pad 访问
        </Title>
        <Text type="secondary">
          暂不支持手机访问，请切换合适的终端
        </Text>
      </div>
    </div>
  );
}
