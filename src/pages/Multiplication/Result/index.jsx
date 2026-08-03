import React, { useEffect } from 'react';
import { Button, Card, Col, Row, Statistic, Typography } from 'antd';
import { ArrowLeftOutlined, StarFilled } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { isValidMultiplicationResultState } from '../../../features/multiplication/routeState';
import { formatTimerDuration } from '../../../hooks/useTimer';

export default function MultiplicationResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const validState = isValidMultiplicationResultState(location.state);

  useEffect(() => {
    if (!validState) navigate('/multiplication', { replace: true });
  }, [navigate, validState]);

  if (!validState) return null;

  const { settings, answeredCells, result, timeSpent } = location.state;
  const correct = Object.values(answeredCells).filter((entry) => entry.correct).length;

  return (
    <main style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
      <Typography.Title level={2}>闯关结果</Typography.Title>
      <Card>
        <div aria-label={`${result.stars}星`} style={{ color: '#faad14', fontSize: 48, letterSpacing: 8 }}>
          {Array.from({ length: 3 }, (_, index) => (
            <StarFilled key={index} style={{ color: index < result.stars ? '#faad14' : '#d9d9d9' }} />
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
      <Button
        icon={<ArrowLeftOutlined />}
        size="large"
        style={{ marginTop: 24 }}
        onClick={() => navigate('/multiplication')}
      >
        返回难度选择
      </Button>
    </main>
  );
}
