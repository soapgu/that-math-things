import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography } from 'antd';
import { HomeOutlined, BookOutlined, CalculatorOutlined } from '@ant-design/icons';

const { Header, Content } = Layout;

function getSelectedKey(pathname) {
  if (pathname === '/') return '/';
  if (pathname.startsWith('/practice')) return '/practice';
  return '/problems';
}

export default function AppLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: '首页' },
    { key: '/problems', icon: <BookOutlined />, label: '错题列表' },
    { key: '/practice', icon: <CalculatorOutlined />, label: '加减法训练' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px',
        }}
      >
        <Typography.Title
          level={4}
          style={{ color: '#fff', margin: 0, marginRight: 40, whiteSpace: 'nowrap' }}
        >
          那年那数那些事
        </Typography.Title>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[getSelectedKey(location.pathname)]}
          items={menuItems}
          onClick={({ key, domEvent }) => { domEvent.preventDefault(); navigate(key); }}
          style={{ flex: 1, minWidth: 0 }}
        />
      </Header>
      <Content style={{ padding: '24px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        {children}
      </Content>
    </Layout>
  );
}
