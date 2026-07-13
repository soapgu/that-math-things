import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Tag, List, Row, Col, Card, Statistic, Popconfirm, Empty } from 'antd';
import { DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import * as echarts from 'echarts';
import { getStats, getPracticeRecords, clearRecords } from '../../../utils/storage';
import { ERROR_CONFIG } from '../../../utils/marking';

function formatDate(iso) {
  const d = new Date(iso);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hour}:${min}`;
}

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}分${s}秒` : `${s}秒`;
}

function scoreColor(score) {
  if (score >= 90) return '#52c41a';
  if (score >= 80) return '#1677ff';
  if (score >= 60) return '#999';
  return '#ff4d4f';
}

function useECharts(ref, option) {
  useEffect(() => {
    if (!ref.current || !option) return;
    const chart = echarts.init(ref.current);
    chart.setOption(option);
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      chart.dispose();
    };
  }, [option]);
}

export default function PracticeStats() {
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const stats = useMemo(() => getStats(), [refreshKey]);
  const records = useMemo(() => getPracticeRecords(), [refreshKey]);

  const handleClear = useCallback(() => {
    clearRecords();
    setRefreshKey((k) => k + 1);
  }, []);

  const hasData = records.length > 0;
  const displayRecords = showAll ? records : records.slice(0, 5);

  const pieOption = useMemo(() => {
    if (stats.errorDistribution.length === 0) return null;
    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} 次 ({d}%)',
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        itemGap: 8,
        textStyle: { fontSize: 12 },
      },
      series: [
        {
          type: 'pie',
          center: ['28%', '50%'],
          radius: ['40%', '60%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 4,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: { show: false },
          data: stats.errorDistribution.map(({ type, count }) => {
            const cfg = ERROR_CONFIG.find(c => c.type === type) || {};
            return { name: type, value: count, itemStyle: { color: cfg.barColor } };
          }),
        },
      ],
    };
  }, [stats.errorDistribution]);

  const lineOption = useMemo(() => {
    if (records.length < 2) return null;
    const data = [...records].reverse().map((r, i) => ({
      name: `#${i + 1}`,
      value: r.score,
      date: formatDate(r.date),
    }));
    return {
      tooltip: {
        trigger: 'axis',
        formatter(params) {
          const p = params[0];
          const idx = p.dataIndex;
          return `${p.name} (${data[idx].date})<br/>分数: ${p.value} 分`;
        },
      },
      xAxis: {
        type: 'category',
        data: data.map(d => d.name),
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        splitLine: { lineStyle: { type: 'dashed' } },
      },
      grid: { left: 40, right: 16, top: 16, bottom: 24 },
      series: [
        {
          type: 'line',
          data: data.map(d => d.value),
          smooth: true,
          lineStyle: { width: 2, color: '#1677ff' },
          areaStyle: { color: 'rgba(22,119,255,0.08)' },
          symbol: 'circle',
          symbolSize: 6,
        },
      ],
    };
  }, [records]);

  const evaluationTrendOption = useMemo(() => {
    const evalRecords = records.filter(r => r.evaluation);
    if (evalRecords.length < 2) return null;
    const data = [...evalRecords].reverse().map((r, i) => ({
      name: `#${i + 1}`,
      difficulty: r.evaluation.difficulty,
      accuracy: r.evaluation.accuracy,
      speed: r.evaluation.speed,
      grade: r.evaluation.composite.grade,
      date: formatDate(r.date),
    }));
    return {
      tooltip: {
        trigger: 'axis',
        formatter(params) {
          const p = params[0];
          const d = data[p.dataIndex];
          const lines = params.map(l =>
            `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${l.color};margin-right:4px"></span>${l.seriesName}: ${l.value}★`
          );
          return `${d.date} (${d.name})<br/>${lines.join('<br/>')}<br/>评级: ${d.grade}`;
        },
      },
      legend: {
        data: ['难度', '准确', '速度'],
        top: 0,
        itemWidth: 10,
        itemHeight: 10,
      },
      xAxis: {
        type: 'category',
        data: data.map(d => d.name),
        axisLabel: { fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        min: 1,
        max: 5,
        interval: 1,
        splitLine: { lineStyle: { type: 'dashed' } },
      },
      grid: { left: 36, right: 16, top: 32, bottom: 24 },
      series: [
        { name: '难度', type: 'line', data: data.map(d => d.difficulty), smooth: true, lineStyle: { width: 2, color: '#1677ff' }, symbol: 'circle', symbolSize: 6 },
        { name: '准确', type: 'line', data: data.map(d => d.accuracy), smooth: true, lineStyle: { width: 2, color: '#52c41a' }, symbol: 'circle', symbolSize: 6 },
        { name: '速度', type: 'line', data: data.map(d => d.speed), smooth: true, lineStyle: { width: 2, color: '#fa8c16' }, symbol: 'circle', symbolSize: 6 },
      ],
    };
  }, [records]);

  const pieRef = useRef(null);
  const lineRef = useRef(null);
  const evalRef = useRef(null);

  useECharts(pieRef, pieOption);
  useECharts(lineRef, lineOption);
  useECharts(evalRef, evaluationTrendOption);

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <Typography.Title level={3} style={{ textAlign: 'center' }}>
        统计数据
      </Typography.Title>

      <Row gutter={8} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="练习次数" value={stats.totalPractices} valueStyle={{ fontSize: 20 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="总题数" value={stats.totalQuestions} valueStyle={{ fontSize: 20 }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic
              title="平均分"
              value={stats.avgScore}
              suffix="分"
              valueStyle={{ fontSize: 20, color: scoreColor(stats.avgScore) }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic
              title="最高分"
              value={stats.bestScore}
              suffix="分"
              valueStyle={{ fontSize: 20, color: scoreColor(stats.bestScore) }}
            />
          </Card>
        </Col>
      </Row>

      {!hasData ? (
        <Empty description="暂无练习记录" style={{ margin: '64px 0' }} />
      ) : (
        <>
          {evaluationTrendOption && (
            <Card title="综合评价趋势" size="small" style={{ marginBottom: 16 }}>
              <div ref={evalRef} style={{ height: 220 }} />
            </Card>
          )}

          <Row gutter={12}>
            <Col span={12}>
              {pieOption && (
                <Card title="错误分布" size="small" style={{ marginBottom: 16 }}>
                  <div ref={pieRef} style={{ height: 200 }} />
                </Card>
              )}
            </Col>
            <Col span={12}>
              {lineOption && (
                <Card title="分数趋势" size="small" style={{ marginBottom: 16 }}>
                  <div ref={lineRef} style={{ height: 200 }} />
                </Card>
              )}
            </Col>
          </Row>

          <Card
            title="历史记录"
            size="small"
            style={{ marginBottom: 24 }}
            extra={
              <Popconfirm
                title="确认清除所有练习记录？"
                description="此操作不可恢复"
                onConfirm={handleClear}
                okText="确认清除"
                cancelText="取消"
              >
                <Button size="small" danger icon={<DeleteOutlined />}>
                  清除数据
                </Button>
              </Popconfirm>
            }
          >
            <List
              dataSource={displayRecords}
              renderItem={(record) => {
                const errors = (record.results || []).reduce((acc, r) => {
                  if (!r.isCorrect) {
                    r.errors.forEach((e) => {
                      if (!acc.includes(e)) acc.push(e);
                    });
                  }
                  return acc;
                }, []);

                return (
                  <List.Item style={{ padding: '8px 0' }}>
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#999' }}>
                          {formatDate(record.date)}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 16, fontWeight: 600, color: scoreColor(record.score) }}>
                            {record.score}分
                          </span>
                          <Button size="small" onClick={() => navigate('/practice/result', { state: { record } })}>
                            详情
                          </Button>
                          {record.wrongCount > 0 && (
                            <Button size="small" onClick={() => navigate('/practice/correction', { state: { record } })}>
                              订正
                            </Button>
                          )}
                        </div>
                      </div>
                      <div style={{ marginTop: 4, display: 'flex', gap: 12, fontSize: 13, color: '#666' }}>
                        <span>正确 {record.correct}/{record.total}</span>
                        <span>用时 {formatDuration(record.timeSpent)}</span>
                        <span>错误 {record.wrongCount} 题</span>
                      </div>
                      {errors.length > 0 && (
                        <div style={{ marginTop: 4, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {errors.map((e) => (
                            <Tag key={e} color={(ERROR_CONFIG.find(c => c.type === e) || {}).tagColor} style={{ fontSize: 12, margin: 0 }}>
                              {e}
                            </Tag>
                          ))}
                        </div>
                      )}
                    </div>
                  </List.Item>
                );
              }}
            />
            {records.length > 5 && !showAll && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <Button type="link" onClick={() => setShowAll(true)}>
                  展开全部 ({records.length} 条)
                </Button>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
