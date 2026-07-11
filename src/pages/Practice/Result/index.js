import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Typography, Button, Tag, List, Row, Col, Card, Statistic, Alert } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, HomeOutlined, BarChartOutlined } from '@ant-design/icons';
import { OP_DISPLAY } from '../../../utils/mathGenerator';
import { ERROR_CONFIG } from '../../../utils/marking';

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}分${s}秒` : `${s}秒`;
}

export default function PracticeResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const [record, setRecord] = useState(null);
  const [pruned, setPruned] = useState(0);

  useEffect(() => {
    const rec = location.state?.record;
    if (!rec) {
      navigate('/practice', { replace: true });
      return;
    }
    setRecord(rec);
    setPruned(rec._pruned || 0);
  }, []);

  if (!record) return null;

  const { score, total, correct, wrongCount, timeSpent, results, questions, userAnswers } = record;
  const grade = score >= 100 ? { label: 'A🌟 完美', color: '#faad14' }
    : score >= 90  ? { label: 'A 优秀',   color: '#52c41a' }
    : score >= 80  ? { label: 'B 良好',   color: '#1677ff' }
    : score >= 60  ? { label: 'C 一般',   color: '#999' }
    :                { label: 'F 不及格', color: '#ff4d4f' };

  const errorCount = {};
  results.forEach(r => {
    if (!r.isCorrect) {
      r.errors.forEach(e => { errorCount[e] = (errorCount[e] || 0) + 1; });
    }
  });

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {pruned > 0 && (
        <Alert
          message={`已自动清理 ${pruned} 条历史记录以释放存储空间`}
          type="info"
          showIcon
          closable
          style={{ marginBottom: 16 }}
        />
      )}

      <Typography.Title level={3} style={{ textAlign: 'center' }}>
        练习结果
      </Typography.Title>

      {/* 得分卡片 */}
      <Card style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 64, fontWeight: 700, color: grade.color }}>
          {score}
          <span style={{ fontSize: 24, color: '#999', marginLeft: 4 }}>分</span>
        </div>
        <div style={{ marginTop: 8, color: grade.color, fontSize: 16, userSelect: 'none' }}>
          {grade.label}
        </div>
        <Row gutter={16} style={{ marginTop: 20, textAlign: 'center' }}>
          <Col span={8}>
            <Statistic title="正确" value={correct} suffix={`/ ${total}`} valueStyle={{ color: '#52c41a' }} />
          </Col>
          <Col span={8}>
            <Statistic title="错误" value={wrongCount} valueStyle={{ color: '#ff4d4f' }} />
          </Col>
          <Col span={8}>
            <Statistic title="用时" value={formatDuration(timeSpent)} valueStyle={{ fontSize: 16 }} />
          </Col>
        </Row>
      </Card>

      {/* 错误分布 */}
      {Object.keys(errorCount).length > 0 && (
        <Card title="错误分析" size="small" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {Object.entries(errorCount).map(([type, count]) => (
              <Tag key={type} color={(ERROR_CONFIG.find(c => c.type === type) || {}).tagColor}>
                {type} ×{count}
              </Tag>
            ))}
          </div>
        </Card>
      )}

      {/* 逐题详情 */}
      <Card title="题目详情" size="small" style={{ marginBottom: 24 }}>
        <List
          dataSource={results}
          renderItem={(result, index) => {
            const q = questions[index];
            if (!q) return null;
            const opDisplay = OP_DISPLAY[q.op] || q.op;

            return (
              <List.Item
                style={{
                  backgroundColor: result.isCorrect ? '#f6ffed' : '#fff2f0',
                  padding: '12px 16px',
                  borderRadius: 6,
                  marginBottom: 8,
                }}
              >
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {result.isCorrect ? (
                      <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                    ) : (
                      <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
                    )}
                    <span style={{ fontSize: 16, fontWeight: 500, userSelect: 'none' }}>
                      {q.a} {opDisplay} {q.b} =
                    </span>
                    {result.isCorrect ? (
                      <span style={{ fontSize: 16, fontWeight: 600, color: '#52c41a' }}>{q.answer}</span>
                    ) : (
                      <span style={{ fontSize: 16 }}>
                        <span style={{ textDecoration: 'line-through', color: '#ff4d4f', marginRight: 8 }}>
                          {userAnswers[index]}
                        </span>
                        <span style={{ color: '#52c41a', fontWeight: 600 }}>{q.answer}</span>
                      </span>
                    )}
                  </div>

                  {result.errors.length > 0 && (
                    <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                      {result.errors.map(e => (
                        <Tag key={e} color={(ERROR_CONFIG.find(c => c.type === e) || {}).tagColor} style={{ margin: 0 }}>{e}</Tag>
                      ))}
                      {result.detail && (() => {
                        const parts = Array.isArray(result.detail) ? result.detail : [{ text: result.detail, bold: false }];
                        return (
                          <span style={{ fontSize: 13, color: '#999', lineHeight: '22px', userSelect: 'none' }}>
                            — {parts.map((p, i) => (
                              <React.Fragment key={i}>
                                {i > 0 && '，'}
                                <span style={p.bold ? { fontWeight: 700, color: '#ff4d4f' } : undefined}>{p.text}</span>
                              </React.Fragment>
                            ))}
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </List.Item>
            );
          }}
        />
      </Card>

      {/* 操作按钮 */}
      <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Button type="primary" icon={<ReloadOutlined />} onClick={() => navigate('/practice')}>
          再来一次
        </Button>
        <Button icon={<BarChartOutlined />} onClick={() => navigate('/practice/stats')}>
          统计数据
        </Button>
        <Button icon={<HomeOutlined />} onClick={() => navigate('/')}>
          返回首页
        </Button>
      </div>
    </div>
  );
}
