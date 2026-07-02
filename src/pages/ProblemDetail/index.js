import React, { useState, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Card, Input, Button, Tabs, Space, Tag, Empty, Alert } from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BulbOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { getProblem } from '../../problems/registry';
import useGuidedSolve from '../../hooks/useGuidedSolve';

function DirectAnswer({ problem, problemData, onRegenerate }) {
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = () => {
    const numAnswer = Number(answer);
    const isCorrect = problemData.checkAnswer
      ? problemData.checkAnswer(numAnswer)
      : numAnswer === problemData.finalAnswer;
    setResult(isCorrect ? 'correct' : 'wrong');
  };

  const handleRegenerate = () => {
    setAnswer('');
    setResult(null);
    onRegenerate();
  };

  return (
    <div>
      <Typography.Paragraph
        style={{ fontSize: 18, lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: 24 }}
      >
        {problemData.question}
      </Typography.Paragraph>

      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Input
          size="large"
          placeholder="输入你的答案"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onPressEnter={handleSubmit}
          disabled={result !== null}
          style={{ maxWidth: 300 }}
        />

        <Space>
          <Button type="primary" onClick={handleSubmit} disabled={!answer || result !== null}>
            提交答案
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleRegenerate}>
            随机换参
          </Button>
        </Space>

        {result === 'correct' && (
          <Alert
            type="success"
            showIcon
            icon={<CheckCircleOutlined />}
            message="答对了！真棒！"
            description={problem.hint}
          />
        )}
        {result === 'wrong' && (
          <Alert
            type="error"
            showIcon
            icon={<CloseCircleOutlined />}
            message="再想想哦"
            description={`正确答案是：${problemData.finalAnswer}`}
          />
        )}
      </Space>
    </div>
  );
}

function ViewHint({ problem, problemData, onRegenerate }) {
  return (
    <div>
      <Typography.Paragraph
        style={{ fontSize: 18, lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: 24 }}
      >
        {problemData.question}
      </Typography.Paragraph>

      <Card
        title={
          <Space>
            <BulbOutlined style={{ color: '#faad14' }} />
            <span>思考指引</span>
          </Space>
        }
        style={{ background: '#fffbe6', marginBottom: 16 }}
      >
        <Typography.Paragraph style={{ fontSize: 16, lineHeight: 1.8 }}>
          {problemData.hint}
        </Typography.Paragraph>
      </Card>

      <Button icon={<ReloadOutlined />} onClick={onRegenerate}>
        随机换参
      </Button>
    </div>
  );
}

function GuidedSolve({ problem, problemData, onRegenerate }) {
  const guided = useGuidedSolve(problemData.steps);
  const [userInput, setUserInput] = useState('');

  const handleStart = () => {
    guided.start();
  };

  const handleAnimationDone = () => {
    guided.finishAnimation();
  };

  const handleSubmitStep = () => {
    const correct = guided.submitStepAnswer(Number(userInput));
    if (correct) setUserInput('');
  };

  const handleSubmitFinal = () => {
    const correct = guided.submitFinalAnswer(userInput);
    if (!correct) setUserInput('');
  };

  const handleRetry = () => {
    setUserInput('');
    guided.retryFinal();
  };

  const handleReset = () => {
    setUserInput('');
    guided.reset();
    onRegenerate();
  };

  const renderPhase = () => {
    switch (guided.phase) {
      case guided.PHASES.IDLE:
        return (
          <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
            <Typography.Paragraph
              style={{ fontSize: 18, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}
            >
              {problemData.question}
            </Typography.Paragraph>
            <Button type="primary" size="large" icon={<PlayCircleOutlined />} onClick={handleStart}>
              开始辅助解题
            </Button>
          </Space>
        );

      case guided.PHASES.ANIMATION:
        return (
          <div style={{ textAlign: 'center' }}>
            <Typography.Title level={4}>动画演示</Typography.Title>
            <div
              style={{
                width: '100%',
                height: 280,
                background: '#f0f5ff',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <Typography.Text type="secondary">
                [动画组件待实现：{problem.title}]
              </Typography.Text>
            </div>
            <Button type="primary" onClick={handleAnimationDone}>
              继续
            </Button>
          </div>
        );

      case guided.PHASES.STEP_INPUT:
        return (
          <div>
            <Card
              title={`第 ${guided.stepIndex + 1} 步 / 共 ${guided.totalSteps} 步`}
              style={{ marginBottom: 16 }}
            >
              <Typography.Paragraph style={{ fontSize: 16, lineHeight: 1.8 }}>
                {guided.currentStep?.description}
              </Typography.Paragraph>
            </Card>

            {guided.stepAnswers[guided.stepIndex]?.correct === false && (
              <Alert
                type="warning"
                showIcon
                message="再算算看"
                style={{ marginBottom: 12 }}
              />
            )}

            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                size="large"
                placeholder={guided.currentStep?.hint || '输入中间结果'}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onPressEnter={handleSubmitStep}
                style={{ maxWidth: 300 }}
              />
              <Space>
                <Button type="primary" onClick={handleSubmitStep} disabled={!userInput}>
                  确认
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重新开始
                </Button>
              </Space>
            </Space>
          </div>
        );

      case guided.PHASES.FINAL_ANSWER:
        return (
          <div>
            <Typography.Title level={5} style={{ marginBottom: 16 }}>
              请填写最终答案
            </Typography.Title>

            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                size="large"
                placeholder="输入最终答案"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onPressEnter={handleSubmitFinal}
                style={{ maxWidth: 300 }}
              />
              <Space>
                <Button type="primary" onClick={handleSubmitFinal} disabled={!userInput}>
                  提交答案
                </Button>
                <Button icon={<ReloadOutlined />} onClick={handleReset}>
                  重新开始
                </Button>
              </Space>
            </Space>
          </div>
        );

      case guided.PHASES.CORRECT:
        return (
          <div style={{ textAlign: 'center' }}>
            <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }} />
            <Typography.Title level={4} style={{ color: '#52c41a' }}>
              全部答对了！太棒了！
            </Typography.Title>
            <Space style={{ marginTop: 16 }}>
              <Button type="primary" icon={<ReloadOutlined />} onClick={handleReset}>
                再来一题
              </Button>
            </Space>
          </div>
        );

      case guided.PHASES.WRONG:
        return (
          <div style={{ textAlign: 'center' }}>
            <CloseCircleOutlined style={{ fontSize: 64, color: '#ff4d4f', marginBottom: 16 }} />
            <Typography.Title level={4}>答案不对哦</Typography.Title>
            <Typography.Paragraph style={{ fontSize: 16 }}>
              提示：{problemData.hint}
            </Typography.Paragraph>
            <Space style={{ marginTop: 16 }}>
              <Button type="primary" onClick={handleRetry}>
                再试一次
              </Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重新开始
              </Button>
            </Space>
          </div>
        );

      default:
        return null;
    }
  };

  return <div>{renderPhase()}</div>;
}

export default function ProblemDetail() {
  const { id } = useParams();
  const problem = getProblem(id);
  const [problemData, setProblemData] = useState(null);

  useMemo(() => {
    if (problem) {
      setProblemData(problem.createProblem());
    }
  }, [problem]);

  const handleRegenerate = useCallback(() => {
    if (problem) {
      setProblemData(problem.createProblem());
    }
  }, [problem]);

  if (!problem) {
    return <Empty description="题目不存在" />;
  }

  const renderTabContent = (tabKey) => {
    switch (tabKey) {
      case 'direct':
        return (
          <DirectAnswer
            problem={problem}
            problemData={problemData}
            onRegenerate={handleRegenerate}
          />
        );
      case 'hint':
        return (
          <ViewHint
            problem={problem}
            problemData={problemData}
            onRegenerate={handleRegenerate}
          />
        );
      case 'guided':
        return (
          <GuidedSolve
            problem={problem}
            problemData={problemData}
            onRegenerate={handleRegenerate}
          />
        );
      default:
        return null;
    }
  };

  const tabItems = [
    { key: 'direct', label: '直接答题', children: renderTabContent('direct') },
    { key: 'hint', label: '查看提示', children: renderTabContent('hint') },
    { key: 'guided', label: '辅助解题', children: renderTabContent('guided') },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          {problem.title}
        </Typography.Title>
        <div style={{ marginTop: 8 }}>
          {problem.tags?.map((tag) => (
            <Tag key={tag} color="blue">
              {tag}
            </Tag>
          ))}
        </div>
      </div>

      <Tabs defaultActiveKey="direct" items={tabItems} />
    </div>
  );
}
