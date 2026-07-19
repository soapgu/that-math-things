import React, { useState } from 'react';
import { BulbOutlined } from '@ant-design/icons';
import { Button, Card, Space, Typography } from 'antd';

/**
 * 第一层辅助：默认只显示低强调入口，点击后才展示关键提醒。
 * onRequestMethod 在 Phase 3/4 接入完整演示前为空，因此第二层入口暂时禁用。
 */
export default function MathAssist({ hint, onRequestMethod }) {
  const [expanded, setExpanded] = useState(false);

  if (!hint) return null;

  if (!expanded) {
    return (
      <Button
        type="text"
        size="small"
        icon={<BulbOutlined />}
        onClick={() => setExpanded(true)}
        style={{ color: '#8c8c8c' }}
      >
        需要提示
      </Button>
    );
  }

  return (
    <Card
      size="small"
      styles={{ body: { padding: '12px 16px' } }}
      style={{ maxWidth: 420, margin: '0 auto', textAlign: 'left', background: '#fffbe6' }}
      aria-live="polite"
    >
      <Typography.Text>{hint.message}</Typography.Text>
      <div style={{ marginTop: 6 }}>
        <Typography.Text strong>想一想：{hint.question}</Typography.Text>
      </div>
      <Space size="small" style={{ marginTop: 10, width: '100%', justifyContent: 'flex-end' }}>
        <Button type="text" size="small" onClick={() => setExpanded(false)}>
          我再想想
        </Button>
        <Button size="small" disabled={!onRequestMethod} onClick={onRequestMethod}>
          看看计算方法
        </Button>
      </Space>
      {!onRequestMethod && (
        <div style={{ textAlign: 'right', marginTop: 2 }}>
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            分步演示将在下一阶段提供
          </Typography.Text>
        </div>
      )}
    </Card>
  );
}
