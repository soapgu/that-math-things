import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Card, Row, Col } from 'antd';
import { BookOutlined, CalculatorOutlined } from '@ant-design/icons';

const entries = [
  {
    key: 'problems',
    icon: <BookOutlined style={{ fontSize: 48, color: '#1677ff' }} />,
    title: '错题列表',
    desc: '电脑编号、贴纸问题、吃苹果、增减问题，边看动画边学会',
    path: '/problems',
  },
  {
    key: 'practice',
    icon: <CalculatorOutlined style={{ fontSize: 48, color: '#52c41a' }} />,
    title: '计算训练',
    desc: '50以内计算，可调参数、辅助运算、统计错题',
    path: '/practice',
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ margin: '40px 0 48px' }}>
        <Typography.Title level={2}>那年那数那些事</Typography.Title>
        <Typography.Paragraph style={{ fontSize: 16, color: '#666' }}>
          一年级数学，边练边学
        </Typography.Paragraph>
      </div>

      <Row gutter={[24, 24]} justify="center">
        {entries.map((entry) => (
          <Col xs={24} sm={12} md={10} key={entry.key}>
            <Card
              hoverable
              style={{ borderRadius: 12, padding: '24px 16px', height: '100%' }}
              onClick={() => navigate(entry.path)}
            >
              <div style={{ marginBottom: 16 }}>{entry.icon}</div>
              <Typography.Title level={4}>{entry.title}</Typography.Title>
              <Typography.Paragraph style={{ color: '#666', margin: 0 }}>
                {entry.desc}
              </Typography.Paragraph>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
