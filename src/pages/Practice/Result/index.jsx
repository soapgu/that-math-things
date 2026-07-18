import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Typography, Button, Tag, Row, Col, Card, Statistic, Alert } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, HomeOutlined, BarChartOutlined, EditOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import RadarChart from './RadarChart';
import { OP_DISPLAY } from '../../../utils/mathGenerator';
import { ERROR_CONFIG } from '../../../utils/marking';

function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}分${s}秒` : `${s}秒`;
}

const GRADE_STYLE = {
  UR: { background: 'linear-gradient(135deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff)', color: '#fff', textShadow: '0 0 8px rgba(255,215,0,0.6)', boxShadow: '0 0 16px rgba(255,215,0,0.3)' },
  SSR: { background: 'linear-gradient(135deg, #faad14, #d48806)', color: '#fff', textShadow: '0 0 4px rgba(0,0,0,0.2)' },
  SR: { background: 'linear-gradient(135deg, #722ed1, #531dab)', color: '#fff' },
  R: { background: 'linear-gradient(135deg, #1677ff, #0958d9)', color: '#fff' },
  N: { background: '#d9d9d9', color: '#666' },
};

const DIM_COLORS = ['#1677ff', '#52c41a', '#fa8c16'];
const DIM_EMOJIS = ['🚩', '🎯', '🚀'];

function StarRating({ stars, baseDelay = 0 }) {
  return (
    <span style={{ color: '#faad14', fontSize: 20, letterSpacing: 2, lineHeight: 1 }}>
      {Array.from({ length: stars }, (_, i) => (
        <motion.span
          key={i}
          style={{ display: 'inline-block' }}
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 8, delay: baseDelay + i * 0.08 }}
        >
          ★
        </motion.span>
      ))}
      {'☆'.repeat(5 - stars)}
    </span>
  );
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

  const { score, total, correct, wrongCount, timeSpent, results, questions, userAnswers, evaluation } = record;
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

      {/* 综合评价 */}
      {evaluation && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <Card title="综合评价" size="small" style={{ marginBottom: 24, textAlign: 'center' }}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 12, delay: 0.3 }}
            >
              <div
                style={{
                  display: 'inline-block',
                  padding: '8px 32px',
                  borderRadius: 8,
                  fontSize: 32,
                  fontWeight: 700,
                  letterSpacing: 4,
                  userSelect: 'none',
                  ...(GRADE_STYLE[evaluation.composite.grade] || GRADE_STYLE.N),
                }}
              >
                {evaluation.composite.grade}
              </div>
            </motion.div>

            <Row gutter={16} style={{ marginTop: 20, textAlign: 'center' }}>
              {[
                { label: '难度', stars: evaluation.difficulty },
                { label: '准确', stars: evaluation.accuracy },
                { label: '速度', stars: evaluation.speed },
              ].map((dim, i) => (
                <Col span={8} key={dim.label}>
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.15, duration: 0.35 }}
                  >
                    <div style={{ color: DIM_COLORS[i], fontSize: 13, marginBottom: 4 }}>
                      <span style={{ fontSize: 20, lineHeight: 1 }}>{DIM_EMOJIS[i]}</span>
                      <span style={{ marginLeft: 4 }}>{dim.label}</span>
                    </div>
                    <StarRating stars={dim.stars} baseDelay={0.55 + i * 0.15} />
                  </motion.div>
                </Col>
              ))}
            </Row>

            <RadarChart
              difficulty={evaluation.difficulty}
              accuracy={evaluation.accuracy}
              speed={evaluation.speed}
              delay={800}
            />

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.4 }}
            >
              <div style={{ color: '#333', fontSize: 16, marginTop: 12, lineHeight: 1.8, textAlign: 'center', fontStyle: 'italic', letterSpacing: 0.5 }}>
                「{evaluation.composite.comment}」
              </div>
            </motion.div>
          </Card>
        </motion.div>
      )}

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
            <Statistic title="正确" value={correct} suffix={`/ ${total}`} styles={{ content: { color: '#52c41a' } }} />
          </Col>
          <Col span={8}>
            <Statistic title="错误" value={wrongCount} styles={{ content: { color: '#ff4d4f' } }} />
          </Col>
          <Col span={8}>
            <Statistic title="用时" value={formatDuration(timeSpent)} styles={{ content: { fontSize: 16 } }} />
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
        <div role="list">
          {results.map((result, index) => {
            const q = questions[index];
            if (!q) return null;
            const opDisplay = OP_DISPLAY[q.op] || q.op;

            return (
              <div
                key={index}
                role="listitem"
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
              </div>
            );
          })}
        </div>
      </Card>

      {/* 操作按钮 */}
      <div style={{ textAlign: 'center', marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
        <Button type="primary" icon={<ReloadOutlined />} onClick={() => navigate('/practice')}>
          再来一次
        </Button>
        {wrongCount > 0 && (
          <Button icon={<EditOutlined />} onClick={() => navigate('/practice/correction', { state: { record } })}>
            订正
          </Button>
        )}
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
