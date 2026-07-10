import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
  const [refreshKey, setRefreshKey] = useState(0);

  const stats = useMemo(() => getStats(), [refreshKey]);
  const records = useMemo(() => getPracticeRecords(), [refreshKey]);

  const handleClear = useCallback(() => {
    clearRecords();
    setRefreshKey((k) => k + 1);
  }, []);

  const hasData = records.length > 0;

  const pieOption = useMemo(() => {
    if (stats.errorDistribution.length === 0) return null;
    return {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} 次 ({d}%)',
      },
      legend: {
        bottom: 0,
        textStyle: { fontSize: 12 },
      },
      series: [
        {
          type: 'pie',
          radius: ['45%', '70%'],
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

  const pieRef = useRef(null);
  const lineRef = useRef(null);

  useECharts(pieRef, pieOption);
  useECharts(lineRef, lineOption);

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      <Typography.Title level={3} style={{ textAlign: 'center' }}>
        统计数据
      </Typography.Title>

      <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="练习次数" value={stats.totalPractices} />
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic title="总题数" value={stats.totalQuestions} />
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic
              title="平均分"
              value={stats.avgScore}
              suffix="分"
              valueStyle={{ color: scoreColor(stats.avgScore) }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <Statistic
              title="最高分"
              value={stats.bestScore}
              suffix="分"
              valueStyle={{ color: scoreColor(stats.bestScore) }}
            />
          </Card>
        </Col>
      </Row>

      {!hasData ? (
        <Empty description="暂无练习记录" style={{ margin: '64px 0' }} />
      ) : (
        <>
          {pieOption && (
            <Card title="错误分布" size="small" style={{ marginBottom: 24 }}>
              <div ref={pieRef} style={{ height: 260 }} />
            </Card>
          )}

          {lineOption && (
            <Card title="分数趋势" size="small" style={{ marginBottom: 24 }}>
              <div ref={lineRef} style={{ height: 220 }} />
            </Card>
          )}

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
              dataSource={records}
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
                  <List.Item style={{ padding: '12px 0' }}>
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, color: '#999' }}>
                          {formatDate(record.date)}
                        </span>
                        <span style={{ fontSize: 16, fontWeight: 600, color: scoreColor(record.score) }}>
                          {record.score}分
                        </span>
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
          </Card>
        </>
      )}
    </div>
  );
}
