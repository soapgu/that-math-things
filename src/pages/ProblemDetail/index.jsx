import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Typography, Card, Input, Button, Tabs, Space, Tag, Empty, Alert, Radio } from 'antd';
import {
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BulbOutlined,
  PlayCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { getProblem } from '../../problems/registry';
import useGuidedSolve from '../../hooks/useGuidedSolve';
import ComputerNumberAnimation from '../../components/animations/ComputerNumber';
import StickerProblemAnimation from '../../components/animations/StickerProblem';
import AppleEatenAnimation from '../../components/animations/AppleEaten';
import BasketChangeAnimation from '../../components/animations/BasketChange';

function DirectAnswer({ problem, problemData, onRegenerate }) {
  const answers = problemData.answers || [];
  const isMulti = answers.length > 1;
  const [inputs, setInputs] = useState(Array(answers.length).fill(''));
  const [results, setResults] = useState(Array(answers.length).fill(null));
  const [submitted, setSubmitted] = useState(false);
  const inputRefs = useRef([]);

  if (inputRefs.current.length !== answers.length) {
    inputRefs.current = Array(answers.length).fill().map((_, i) => inputRefs.current[i] || React.createRef());
  }

  useEffect(() => {
    const timer = setTimeout(() => inputRefs.current[0]?.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, [problemData]);

  const allCorrect = results.length > 0 && results.every((r) => r === 'correct');

  const handleSubmit = (i) => {
    if (isMulti) {
      const newResults = answers.map((ans, idx) => {
        const num = Number(inputs[idx]);
        return num === ans.answer ? 'correct' : 'wrong';
      });
      setResults(newResults);
      setSubmitted(true);
    } else {
      const num = Number(inputs[0]);
      const correct = num === answers[0].answer;
      setResults([correct ? 'correct' : 'wrong']);
      setSubmitted(true);
    }
  };

  const allFilled = isMulti
    ? inputs.every((v) => v.trim() !== '')
    : inputs[0].trim() !== '';

  const handleRegenerate = () => {
    setInputs(Array(answers.length).fill(''));
    setResults(Array(answers.length).fill(null));
    setSubmitted(false);
    onRegenerate();
  };

  return (
    <div>
      <Typography.Paragraph
        style={{ fontSize: 18, lineHeight: 1.8, whiteSpace: 'pre-wrap', marginBottom: 24 }}
      >
        {problemData.question}
      </Typography.Paragraph>

      {!isMulti ? (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {answers[0].type === 'choice' ? (
            <Radio.Group
              ref={inputRefs.current[0]}
              value={inputs[0] ? Number(inputs[0]) : undefined}
              onChange={(e) => setInputs([String(e.target.value)])}
              disabled={submitted}
            >
              {answers[0].options.map((opt) => (
                <Radio key={opt.value} value={opt.value}>{opt.label}</Radio>
              ))}
            </Radio.Group>
          ) : (
            <Input
              ref={inputRefs.current[0]}
              size="large"
              placeholder="输入你的答案"
              value={inputs[0]}
              onChange={(e) => setInputs([e.target.value])}
              onPressEnter={() => handleSubmit(0)}
              disabled={submitted}
              style={{ maxWidth: 300 }}
            />
          )}
          <Space>
            <Button type="primary" onClick={() => handleSubmit(0)} disabled={!inputs[0] || submitted}>
              提交答案
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleRegenerate}>
              随机换参
            </Button>
          </Space>
          {results[0] === 'correct' && (
            <Alert type="success" showIcon icon={<CheckCircleOutlined />} message="答对了！真棒！" description={problem.hint} />
          )}
          {results[0] === 'wrong' && (
            <Alert type="error" showIcon icon={<CloseCircleOutlined />} message="再想想哦" description={`正确答案是：${answers[0].type === 'choice' ? answers[0].options.find(o => o.value === answers[0].answer)?.label : answers[0].answer}`} />
          )}
        </Space>
      ) : (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {answers.map((ans, i) => {
            const res = results[i];
            const done = res !== null;
            const answerLabel = ans.type === 'choice'
              ? ans.options.find((o) => o.value === ans.answer)?.label
              : ans.answer;
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <Typography.Text style={{ fontSize: 15, minWidth: 160 }}>{ans.label}</Typography.Text>
                {ans.type === 'choice' ? (
                  <Radio.Group
                    ref={inputRefs.current[i]}
                    value={inputs[i] ? Number(inputs[i]) : undefined}
                    onChange={(e) => {
                      const next = [...inputs];
                      next[i] = String(e.target.value);
                      setInputs(next);
                    }}
                    disabled={submitted}
                  >
                    {ans.options.map((opt) => (
                      <Radio key={opt.value} value={opt.value}>{opt.label}</Radio>
                    ))}
                  </Radio.Group>
                ) : (
                  <Input
                    ref={inputRefs.current[i]}
                    size="middle"
                    placeholder="输入答案"
                    value={inputs[i]}
                    onChange={(e) => {
                      const next = [...inputs];
                      next[i] = e.target.value;
                      setInputs(next);
                    }}
                    onPressEnter={() => {
                      const emptyIdx = inputs.findIndex((v) => v.trim() === '');
                      if (emptyIdx >= 0) {
                        inputRefs.current[emptyIdx]?.current?.focus();
                      } else {
                        handleSubmit();
                      }
                    }}
                    disabled={submitted}
                    style={{ width: 120 }}
                    suffix={
                      done ? (
                        res === 'correct' ? (
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        ) : (
                          <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                        )
                      ) : null
                    }
                  />
                )}
                {done && (
                  res === 'correct' ? (
                    <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                  ) : (
                    <Typography.Text type="danger" style={{ fontSize: 13 }}>
                      正确答案：{answerLabel}
                    </Typography.Text>
                  )
                )}
              </div>
            );
          })}
          <Space>
            <Button type="primary" onClick={() => handleSubmit()} disabled={!allFilled || submitted}>
              提交答案
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleRegenerate}>
              随机换参
            </Button>
          </Space>
          {allCorrect && (
            <Alert type="success" showIcon icon={<CheckCircleOutlined />} message="全部答对了！真棒！" description={problem.hint} />
          )}
        </Space>
      )}
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

function AnimationRenderer({ problemId, params, onComplete }) {
  switch (problemId) {
    case 'computer-number':
      return <ComputerNumberAnimation params={params} onComplete={onComplete} />;
    case 'sticker-problem':
      return <StickerProblemAnimation params={params} onComplete={onComplete} />;
    case 'apple-eaten':
      return <AppleEatenAnimation params={params} onComplete={onComplete} />;
    case 'basket-change':
      return <BasketChangeAnimation params={params} onComplete={onComplete} />;
    default:
      return (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Typography.Text type="secondary">[动画组件待实现：{problemId}]</Typography.Text>
          <br />
          <Button type="primary" onClick={onComplete} style={{ marginTop: 16 }}>
            继续
          </Button>
        </div>
      );
  }
}

function GuidedSolve({ problem, problemData, onRegenerate }) {
  const guided = useGuidedSolve(problemData.steps);
  const [userInput, setUserInput] = useState('');
  const inputRefs = useRef([]);

  if (inputRefs.current.length !== problemData.steps.length) {
    inputRefs.current = Array(problemData.steps.length)
      .fill()
      .map((_, i) => inputRefs.current[i] || React.createRef());
  }

  useEffect(() => {
    if (guided.phase === 'step_input' && inputRefs.current[guided.stepIndex]) {
      inputRefs.current[guided.stepIndex].current?.focus();
    }
  }, [guided.phase, guided.stepIndex]);

  const handleStart = () => {
    guided.start();
  };

  const handleAnimationDone = () => {
    guided.finishAnimation();
  };

  const handleSubmitStep = () => {
    const correct = guided.submitStepAnswer(userInput);
    if (correct) setUserInput('');
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
          <AnimationRenderer
            problemId={problem.id}
            params={problemData.params}
            onComplete={handleAnimationDone}
          />
        );

      case guided.PHASES.STEP_INPUT: {
        const steps = problemData.steps;
        return (
          <div>
            {steps.map((step, i) => {
              const isDone = i < guided.stepIndex;
              const isCurrent = i === guided.stepIndex;
              const isWrong = isCurrent && guided.stepAnswers[i]?.correct === false;
              const answerData = guided.stepAnswers[i];
              const isFinalStep = i === steps.length - 1;
              const stepLabel = isFinalStep ? `第 ${i + 1} 步（最终答案）` : `第 ${i + 1} 步`;

              return (
                <Card
                  key={i}
                  size="small"
                  style={{
                    marginBottom: 8,
                    background: isCurrent ? '#f0f5ff' : isDone ? '#fafafa' : '#fff',
                    border: isCurrent ? '1px solid #1677ff' : isDone ? '1px solid #e8e8e8' : '1px dashed #e8e8e8',
                    opacity: isDone && !isCurrent ? 0.85 : 1,
                  }}
                  title={
                    <Space size={4}>
                      {isDone ? (
                        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                      ) : isCurrent ? (
                        <RightOutlined style={{ color: '#1677ff', fontSize: 16 }} />
                      ) : (
                        <span style={{ display: 'inline-block', width: 16, height: 16, borderRadius: '50%', border: '2px solid #d9d9d9' }} />
                      )}
                      <span style={{ fontSize: 13, color: isCurrent ? '#1677ff' : isDone ? '#666' : '#999' }}>
                        {stepLabel}
                      </span>
                    </Space>
                  }
                >
                  <Typography.Paragraph style={{ fontSize: 15, lineHeight: 1.6, margin: 0, marginBottom: 8 }}>
                    {step.description}
                  </Typography.Paragraph>

                  {isDone && answerData && (
                    <div style={{ fontSize: 13, color: answerData.correct ? '#52c41a' : '#ff4d4f' }}>
                      你的答案：{answerData.value} {answerData.correct ? '✓' : '✗'}
                    </div>
                  )}

                  {isCurrent && (
                    <div>
                      {isWrong && (
                        <Alert
                          type="warning"
                          showIcon
                          message="再算算看"
                          style={{ marginBottom: 8, fontSize: 13 }}
                        />
                      )}
                      <Space.Compact style={{ width: '100%' }}>
                        <Input
                          key={`input-${i}-${guided.stepAnswers[i]?.correct ?? 'fresh'}`}
                          ref={inputRefs.current[i]}
                          placeholder={step.hint}
                          value={userInput}
                          onChange={(e) => setUserInput(e.target.value)}
                          onPressEnter={handleSubmitStep}
                          size="middle"
                          style={{ flex: 1 }}
                        />
                        <Button type="primary" onClick={handleSubmitStep} disabled={!userInput}>
                          确认
                        </Button>
                      </Space.Compact>
                    </div>
                  )}

                  {!isDone && !isCurrent && (
                    <Typography.Text style={{ fontSize: 13, color: '#d9d9d9' }}>等待填写</Typography.Text>
                  )}
                </Card>
              );
            })}

            <Space style={{ marginTop: 8 }}>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>
                重新开始
              </Button>
            </Space>
          </div>
        );
      }

      case guided.PHASES.CORRECT:
        return (
          <div>
            {problemData.steps.map((step, i) => {
              const answerData = guided.stepAnswers[i];
              return (
                <Card
                  key={i}
                  size="small"
                  style={{ marginBottom: 8, background: '#fafafa' }}
                  title={
                    <Space size={4}>
                      <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                      <span style={{ fontSize: 13, color: '#666' }}>
                        第 {i + 1} 步
                      </span>
                    </Space>
                  }
                >
                  <Typography.Paragraph style={{ fontSize: 15, lineHeight: 1.6, margin: 0 }}>
                    {step.description}
                  </Typography.Paragraph>
                  {answerData && (
                    <div style={{ fontSize: 13, color: '#52c41a', marginTop: 4 }}>
                      你的答案：{answerData.value} ✓
                    </div>
                  )}
                </Card>
              );
            })}

            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 12 }} />
              <Typography.Title level={4} style={{ color: '#52c41a' }}>
                全部答对了！太棒了！
              </Typography.Title>
              <Button type="primary" icon={<ReloadOutlined />} onClick={handleReset}>
                再来一题
              </Button>
            </div>
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
