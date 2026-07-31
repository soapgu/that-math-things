import React from 'react';
import { AppstoreOutlined, CheckCircleFilled, PlayCircleOutlined } from '@ant-design/icons';
import { Button, Card, Tag, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  DEFAULT_MULTIPLICATION_SETTINGS,
  generateMultiplicationQuestions,
} from '../../../features/multiplication/model';

export default function MultiplicationSettings() {
  const navigate = useNavigate();

  const handleStart = () => {
    const settings = { ...DEFAULT_MULTIPLICATION_SETTINGS };
    navigate('/multiplication/session', {
      state: {
        settings,
        questions: generateMultiplicationQuestions(settings.questionCount),
      },
    });
  };

  return (
    <main className="multiplication-settings-page" style={{ maxWidth: 640, margin: '0 auto' }}>
      <Typography.Title level={2}>九九乘法</Typography.Title>
      <Typography.Paragraph type="secondary">
        沿着乘法矩阵找到答案，一题一题点亮九九乘法表。
      </Typography.Paragraph>

      <Typography.Title level={4}>难度</Typography.Title>
      <Card
        aria-label="简单难度，已选中"
        style={{ borderColor: '#1677ff', background: '#e6f4ff', marginBottom: 24 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <AppstoreOutlined style={{ color: '#1677ff', fontSize: 28 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>简单</div>
            <div style={{ color: '#595959' }}>显示目标所在整行和整列，使用四选一作答</div>
          </div>
          <CheckCircleFilled style={{ color: '#1677ff', fontSize: 22 }} aria-hidden="true" />
        </div>
      </Card>

      <Typography.Title level={4}>题目数量</Typography.Title>
      <Tag color="blue" style={{ padding: '6px 18px', fontSize: 16, marginBottom: 28 }}>
        10 题
      </Tag>

      <Button type="primary" size="large" block icon={<PlayCircleOutlined />} onClick={handleStart}>
        开始闯关
      </Button>
    </main>
  );
}
