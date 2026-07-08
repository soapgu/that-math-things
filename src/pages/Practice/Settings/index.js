import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Card, Slider, InputNumber, Switch, Radio, Button, Space, Divider } from 'antd';
import { BarChartOutlined, PlayCircleOutlined } from '@ant-design/icons';

const STORAGE_KEY = 'practice-settings';

function loadDefaults() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    range: 50,
    addRatio: 60,
    carryBorrowProb: 30,
    assistEnabled: false,
    assistMethod: 'breakTen',
    questionCount: 10,
  };
}

export default function PracticeSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(loadDefaults);

  const update = (key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleStart = () => {
    navigate('/practice/session', { state: { settings } });
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto' }}>
      <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 32 }}>
        加减法训练
      </Typography.Title>

      <Card style={{ borderRadius: 12 }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {/* 运算范围 */}
          <div>
            <Typography.Text strong>运算范围</Typography.Text>
            <div style={{ marginTop: 4 }}>
              <InputNumber
                min={10}
                max={100}
                value={settings.range}
                onChange={(v) => update('range', v)}
                style={{ width: '100%' }}
                addonAfter="以内"
              />
            </div>
          </div>

          {/* 加法比例 */}
          <div>
            <Typography.Text strong>
              加法比例：{settings.addRatio}%
            </Typography.Text>
            <Slider
              min={0}
              max={100}
              value={settings.addRatio}
              onChange={(v) => update('addRatio', v)}
              marks={{ 0: '全减', 50: '各半', 100: '全加' }}
              tooltip={{ formatter: (v) => `${v}%` }}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              剩余 {100 - settings.addRatio}% 为减法
            </Typography.Text>
          </div>

          {/* 进位退位概率 */}
          <div>
            <Typography.Text strong>
              进位/退位概率：{settings.carryBorrowProb}%
            </Typography.Text>
            <Slider
              min={0}
              max={100}
              value={settings.carryBorrowProb}
              onChange={(v) => update('carryBorrowProb', v)}
              marks={{ 0: '无', 50: '一半', 100: '全部' }}
              tooltip={{ formatter: (v) => `${v}%` }}
            />
          </div>

          <Divider style={{ margin: '8px 0' }} />

          {/* 辅助运算 */}
          <div>
            <Space>
              <Switch
                checked={settings.assistEnabled}
                onChange={(v) => update('assistEnabled', v)}
              />
              <Typography.Text strong>辅助运算</Typography.Text>
            </Space>
            <Typography.Text
              type="secondary"
              style={{ display: 'block', fontSize: 12, marginTop: 2 }}
            >
              开启后每题展示分步引导（破十法/平十法）
            </Typography.Text>
          </div>

          {settings.assistEnabled && (
            <div style={{ paddingLeft: 52 }}>
              <Typography.Text strong style={{ display: 'block', marginBottom: 8 }}>
                计算方法
              </Typography.Text>
              <Radio.Group
                value={settings.assistMethod}
                onChange={(e) => update('assistMethod', e.target.value)}
              >
                <Space direction="vertical">
                  <Radio value="breakTen">破十法（拆大数，减小数）</Radio>
                  <Radio value="flatTen">平十法（拆小数，连减法）</Radio>
                </Space>
              </Radio.Group>
            </div>
          )}

          <Divider style={{ margin: '8px 0' }} />

          {/* 题目数量 */}
          <div>
            <Typography.Text strong>题目数量</Typography.Text>
            <div style={{ marginTop: 4 }}>
              <InputNumber
                min={5}
                max={100}
                value={settings.questionCount}
                onChange={(v) => update('questionCount', v)}
                style={{ width: '100%' }}
                addonAfter="题"
              />
            </div>
          </div>
        </Space>
      </Card>

      <Space direction="vertical" style={{ width: '100%', marginTop: 24 }} size="middle">
        <Button
          type="primary"
          size="large"
          icon={<PlayCircleOutlined />}
          block
          onClick={handleStart}
        >
          开始训练
        </Button>
        <Button
          icon={<BarChartOutlined />}
          block
          onClick={() => navigate('/practice/stats')}
        >
          统计数据
        </Button>
      </Space>
    </div>
  );
}
