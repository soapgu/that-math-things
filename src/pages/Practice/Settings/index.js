import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Slider, InputNumber, Switch, Radio, Rate, Button, Space, Divider } from 'antd';
import { BarChartOutlined, PlayCircleOutlined, StarFilled } from '@ant-design/icons';

const STORAGE_KEY = 'practice-settings';

const STAR_PROB_MAP = { 1: 40, 2: 60, 3: 80 };

function probToStars(prob) {
  const entry = Object.entries(STAR_PROB_MAP).find(([, v]) => v === prob);
  return entry ? Number(entry[0]) : 1;
}

function loadDefaults() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return {
    range: 50,
    addRatio: 50,
    carryBorrowProb: 40,
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

  const probStars = probToStars(settings.carryBorrowProb);

  return (
    <div style={{ maxWidth: 480, margin: '0 auto' }}>
      <Card
        title={<span style={{ fontSize: 16, fontWeight: 600, userSelect: 'none' }}>计算训练</span>}
        styles={{ body: { padding: 16 } }}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {/* 运算范围 */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, userSelect: 'none' }}>运算范围</span>
              <InputNumber
                min={10}
                max={100}
                value={settings.range}
                onChange={(v) => update('range', v)}
                style={{ width: 140 }}
                addonAfter="以内"
                size="small"
              />
            </div>
          </div>

          {/* 加法比例 */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2, userSelect: 'none' }}>
              加法比例：{settings.addRatio}%
            </div>
            <Slider
              min={0}
              max={100}
              value={settings.addRatio}
              onChange={(v) => update('addRatio', v)}
              marks={{ 0: '全减', 50: '各半', 100: '全加' }}
              tooltip={{ formatter: (v) => `${v}%` }}
            />
            <span style={{ fontSize: 11, color: '#999', userSelect: 'none' }}>
              剩余 {100 - settings.addRatio}% 为减法
            </span>
          </div>

          {/* 进位退位概率 */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2, userSelect: 'none' }}>
              进位/退位难度
            </div>
            <Space>
              <Rate
                value={probStars}
                count={3}
                character={<StarFilled />}
                onChange={(v) => update('carryBorrowProb', STAR_PROB_MAP[v])}
              />
              <span style={{ userSelect: 'none' }}>{settings.carryBorrowProb}%</span>
              <span style={{ fontSize: 11, color: '#999', userSelect: 'none' }}>
                {probStars <= 1 ? '偶尔出现' : probStars === 2 ? '一半题目' : '大部分都有'}
              </span>
            </Space>
          </div>

          <Divider style={{ margin: '4px 0' }} />

          {/* 辅助运算 */}
          <div>
            <Space>
              <Switch
                size="small"
                checked={settings.assistEnabled}
                onChange={(v) => update('assistEnabled', v)}
              />
              <span style={{ fontWeight: 600, userSelect: 'none' }}>辅助运算</span>
              <span style={{ fontSize: 11, color: '#999', userSelect: 'none' }}>
                开启后每题展示分步引导
              </span>
            </Space>
          </div>

          {settings.assistEnabled && (
            <div style={{ paddingLeft: 44 }}>
              <Radio.Group
                value={settings.assistMethod}
                onChange={(e) => update('assistMethod', e.target.value)}
                size="small"
              >
                <Space direction="vertical" size={2}>
                  <Radio value="breakTen">破十法（拆大数，减小数）</Radio>
                  <Radio value="flatTen">平十法（拆小数，连减法）</Radio>
                </Space>
              </Radio.Group>
            </div>
          )}

          <Divider style={{ margin: '4px 0' }} />

          {/* 题目数量 */}
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4, userSelect: 'none' }}>
              题目数量
            </div>
            <Radio.Group
              value={settings.questionCount}
              onChange={(e) => update('questionCount', e.target.value)}
              optionType="button"
              buttonStyle="solid"
              size="small"
            >
              <Radio value={10}>10 题</Radio>
              <Radio value={20}>20 题</Radio>
              <Radio value={50}>50 题</Radio>
            </Radio.Group>
          </div>
        </Space>
      </Card>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <Button type="primary" icon={<PlayCircleOutlined />} block onClick={handleStart}>
          开始训练
        </Button>
        <Button icon={<BarChartOutlined />} block onClick={() => navigate('/practice/stats')}>
          统计数据
        </Button>
      </div>
    </div>
  );
}
