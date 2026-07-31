import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography } from 'antd';
import { HomeOutlined, BookOutlined, CalculatorOutlined, AppstoreOutlined } from '@ant-design/icons';
import './app-layout.css';

const { Header, Content } = Layout;

function getSelectedKey(pathname) {
  if (pathname === '/') return '/';
  if (pathname.startsWith('/multiplication')) return '/multiplication';
  if (pathname.startsWith('/practice')) return '/practice';
  return '/problems';
}

export default function AppLayout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: '首页' },
    { key: '/problems', icon: <BookOutlined />, label: '错题列表' },
    { key: '/practice', icon: <CalculatorOutlined />, label: '计算训练' },
    { key: '/multiplication', icon: <AppstoreOutlined />, label: '九九乘法' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header className="app-header">
        <Typography.Title
          className="app-brand"
          level={4}
          style={{ color: '#fff', margin: 0 }}
        >
          <span className="app-brand-full">那年那数那些事</span>
          <span className="app-brand-short">那些数</span>
          <span className="app-version">
            v{__APP_VERSION__}
          </span>
        </Typography.Title>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[getSelectedKey(location.pathname)]}
          items={menuItems}
          onClick={({ key, domEvent }) => { domEvent.preventDefault(); navigate(key); }}
          className="app-menu"
        />
      </Header>
      <Content style={{ padding: '24px', maxWidth: 960, margin: '0 auto', width: '100%' }}>
        {children}
      </Content>
    </Layout>
  );
}
