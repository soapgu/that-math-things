import React, { useState } from 'react';
import { BulbOutlined } from '@ant-design/icons';
import { Button, Card, Space, Typography } from 'antd';
import { ASSIST_METHODS } from '../../../utils/assistGenerator';
import CarryAnimation from './CarryAnimation';
import BorrowAnimation from './BorrowAnimation';

/**
 * 两层辅助交互：低强调入口 → 文字提醒 → 数位方法演示。
 * 状态保存在当前题组件内；Session 通过 key 切题时会自然销毁并重置。
 */
export default function MathAssist({ assistance, onReturnToQuestion, onLevelChange }) {
  const [phase, setPhase] = useState('collapsed');
  const hint = assistance?.hint;

  if (!hint) return null;

  const returnToQuestion = () => {
    setPhase('collapsed');
    onReturnToQuestion?.();
  };

  if (phase === 'collapsed') {
    return (
      <Button
        type="text"
        size="small"
        icon={<BulbOutlined />}
        onClick={() => {
          // 入口点击即代表孩子实际看到了第一层提醒，由会话统一保留最高层级。
          onLevelChange?.(1);
          setPhase('hint');
        }}
        style={{ color: '#8c8c8c' }}
      >
        需要提示
      </Button>
    );
  }

  if (phase === 'method') {
    const Animation = assistance.method === ASSIST_METHODS.PLACE_VALUE_CARRY
      ? CarryAnimation
      : assistance.method === ASSIST_METHODS.PLACE_VALUE_BORROW
        ? BorrowAnimation
        : null;

    if (!Animation) return null;
    return (
      <Card
        size="small"
        styles={{ body: { padding: '14px 16px' } }}
        style={{ maxWidth: 560, margin: '0 auto', textAlign: 'left', background: '#f6ffed' }}
      >
        <Animation assistance={assistance} onComplete={returnToQuestion} />
      </Card>
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
        <Button type="text" size="small" onClick={returnToQuestion}>
          我再想想
        </Button>
        <Button
          size="small"
          onClick={() => {
            // 进入播放器时记录第二层；之后跳过、重播或返回都不会撤销这次使用。
            onLevelChange?.(2);
            setPhase('method');
          }}
        >
          看看计算方法
        </Button>
      </Space>
    </Card>
  );
}
