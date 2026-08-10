import React, { useEffect, useState } from 'react';
import { Button, Card, Col, Row, Statistic, Typography } from 'antd';
import { ArrowLeftOutlined, ReloadOutlined, StarFilled } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  isReloadNavigation,
  isValidMultiplicationResultState,
  markReloadNavigationHandled,
} from '../../../features/multiplication/routeState';
import { generateMultiplicationQuestions } from '../../../features/multiplication/model';
import { formatTimerDuration } from '../../../hooks/useTimer';
import './result.css';

export default function MultiplicationResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const [reloadedDocument] = useState(isReloadNavigation);
  const validState = !reloadedDocument && isValidMultiplicationResultState(location.state);

  useEffect(() => {
    if (!validState) {
      if (reloadedDocument) markReloadNavigationHandled();
      navigate('/multiplication', { replace: true });
    }
  }, [navigate, reloadedDocument, validState]);

  if (!validState) return null;

  const { settings, answeredCells, result, timeSpent } = location.state;
  const correct = Object.values(answeredCells).filter((entry) => entry.correct).length;
  const handleReplay = () => {
    navigate('/multiplication/session', {
      state: {
        settings: { ...settings },
        questions: generateMultiplicationQuestions(settings.questionCount),
      },
    });
  };

  return (
    <main className="multiplication-result-page">
      <Typography.Title level={2}>闯关结果</Typography.Title>
      <Card className="multiplication-result-card">
        {result.stars === 3 && (
          <div className="multiplication-confetti" aria-hidden="true">
            {Array.from({ length: 14 }, (_, index) => <i key={index} />)}
          </div>
        )}
        <div className="multiplication-result-stars" aria-label={`${result.stars}星`}>
          {Array.from({ length: 3 }, (_, index) => (
            <span className={index < result.stars ? 'is-earned' : ''} style={{ '--star-index': index }} key={index}>
              <StarFilled />
            </span>
          ))}
        </div>
        <div style={{ margin: '12px 0 24px', color: '#595959' }}>
          {result.stars === 3 ? '太棒了，准确又迅速！' : result.stars === 2 ? '完成得很好！' : '完成闯关，继续加油！'}
        </div>
        <Statistic title="得分" value={result.score} suffix="分" styles={{ content: { color: '#1677ff', fontSize: 48 } }} />
        <Row gutter={16} style={{ marginTop: 24 }}>
          <Col span={8}><Statistic title="正确题数" value={correct} suffix={`/ ${settings.questionCount}`} /></Col>
          <Col span={8}><Statistic title="总题数" value={settings.questionCount} /></Col>
          <Col span={8}><Statistic title="作答用时" value={formatTimerDuration(timeSpent)} /></Col>
        </Row>
      </Card>
      <div className="multiplication-result-actions">
        <Button type="primary" icon={<ReloadOutlined />} size="large" onClick={handleReplay}>
          再来一局
        </Button>
        <Button icon={<ArrowLeftOutlined />} size="large" onClick={() => navigate('/multiplication')}>
          返回难度选择
        </Button>
      </div>
    </main>
  );
}
