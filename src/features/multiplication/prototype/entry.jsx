import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import MultiplicationMatrix from '../MultiplicationMatrix';
import {
  DEFAULT_MULTIPLICATION_SETTINGS,
  DIFFICULTIES,
  QUESTION_COUNTS,
  generateAnswerChoices,
  generateMultiplicationQuestions,
  recordAnsweredCell,
} from '../model';
import './prototype.css';

const DIFFICULTY_LABELS = {
  easy: '简单',
  medium: '提升',
  hard: '挑战',
};

function createSeededRng(seed = 2605) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function answerFirst(questions, amount, wrongEvery = 0) {
  return questions.slice(0, amount).reduce((answered, question, index) => {
    const wrong = wrongEvery > 0 && index % wrongEvery === wrongEvery - 1;
    return recordAnsweredCell(answered, question, wrong ? Math.max(1, question.answer - 1) : question.answer);
  }, {});
}

function TechnicalPrototype() {
  const [difficulty, setDifficulty] = useState(DEFAULT_MULTIPLICATION_SETTINGS.difficulty);
  const [questionCount, setQuestionCount] = useState(DEFAULT_MULTIPLICATION_SETTINGS.questionCount);
  const [sequenceMode, setSequenceMode] = useState('deterministic');
  const [viewport, setViewport] = useState(1024);
  const [questions, setQuestions] = useState(() => generateMultiplicationQuestions(10, createSeededRng()));
  const [index, setIndex] = useState(0);
  const [answeredCells, setAnsweredCells] = useState({});
  const [phase, setPhase] = useState('READY');

  const question = questions[index];
  const choices = useMemo(
    () => generateAnswerChoices(question, createSeededRng(question.a * 10 + question.b)),
    [question]
  );

  const reset = (count = questionCount, mode = sequenceMode) => {
    const rng = mode === 'deterministic' ? createSeededRng() : Math.random;
    setQuestions(generateMultiplicationQuestions(count, rng));
    setIndex(0);
    setAnsweredCells({});
    setPhase('READY');
  };

  const submit = (correct) => {
    if (phase !== 'READY') return;
    const submittedValue = correct ? question.answer : Math.max(1, question.answer - 1);
    setAnsweredCells((current) => recordAnsweredCell(current, question, submittedValue));
    setPhase(correct ? 'FEEDBACK_CORRECT' : 'FEEDBACK_WRONG');
  };

  const next = () => {
    if (index >= questions.length - 1) return;
    setIndex((current) => current + 1);
    setPhase('READY');
  };

  const setScenario = (scenario) => {
    const rng = createSeededRng();
    if (scenario === 'empty') {
      reset();
      return;
    }
    if (scenario === 'early' || scenario === 'dense') {
      const count = scenario === 'early' ? 10 : 50;
      const generated = generateMultiplicationQuestions(count, rng);
      const opened = scenario === 'early' ? 6 : 40;
      setQuestionCount(count);
      setQuestions(generated);
      setAnsweredCells(answerFirst(generated, opened, 5));
      setIndex(opened);
      setPhase('READY');
      return;
    }
    const generated = generateMultiplicationQuestions(81, rng);
    setQuestionCount(81);
    setQuestions(generated);
    if (scenario === 'last81') {
      setAnsweredCells(answerFirst(generated, 80, 5));
      setIndex(80);
      setPhase('READY');
    } else if (scenario === 'complete81') {
      setAnsweredCells(answerFirst(generated, 81, 5));
      setIndex(80);
      setPhase('FEEDBACK_WRONG');
    } else {
      const current = { a: 3, b: 4, op: '*', answer: 12 };
      const symmetric = { a: 4, b: 3, op: '*', answer: 12 };
      setQuestions([current, ...generated.filter(({ a, b }) => !(a === 3 && b === 4))]);
      let answered = recordAnsweredCell({}, symmetric, 11);
      answered = recordAnsweredCell(answered, current, 12);
      setAnsweredCells(answered);
      setIndex(0);
      setPhase('FEEDBACK_CORRECT');
    }
  };

  const theme = {
    easy: ['#1677ff', '#0958d9', '#e6f4ff'],
    medium: ['#ad4e00', '#873800', '#fff7e6'],
    hard: ['#722ed1', '#531dab', '#f9f0ff'],
  }[difficulty];

  return (
    <div className="tech-page">
      <header className="tech-toolbar">
        <strong>步骤 5 · 矩阵技术原型</strong>
        <label>
          评审宽度
          <select value={viewport} onChange={(event) => setViewport(Number(event.target.value))}>
            <option value={768}>768</option>
            <option value={1024}>1024</option>
            <option value={1440}>1440</option>
          </select>
        </label>
        <label>
          快速状态
          <select defaultValue="empty" onChange={(event) => setScenario(event.target.value)}>
            <option value="empty">空白局</option>
            <option value="early">累计开图·早期</option>
            <option value="dense">累计开图·高密度</option>
            <option value="symmetric">对称格已作答</option>
            <option value="last81">81题·最后一题</option>
            <option value="complete81">81/81·全表完成</option>
          </select>
        </label>
        <span>仅用于模型与 DOM 验证，不属于产品界面</span>
      </header>

      <main
        className="tech-stage"
        style={{
          maxWidth: viewport,
          '--multiplication-accent': theme[0],
          '--multiplication-text': theme[1],
          '--multiplication-soft': theme[2],
        }}
      >
        <section className="tech-controls" aria-label="技术原型设置">
          <label>
            难度
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
              {Object.values(DIFFICULTIES).map((value) => (
                <option value={value} key={value}>{DIFFICULTY_LABELS[value]}</option>
              ))}
            </select>
          </label>
          <label>
            题量
            <select
              value={questionCount}
              onChange={(event) => {
                const count = Number(event.target.value);
                setQuestionCount(count);
                reset(count, sequenceMode);
              }}
            >
              {QUESTION_COUNTS.map((value) => <option value={value} key={value}>{value}题</option>)}
            </select>
          </label>
          <label>
            题序
            <select value={sequenceMode} onChange={(event) => setSequenceMode(event.target.value)}>
              <option value="deterministic">确定性</option>
              <option value="random">随机</option>
            </select>
          </label>
          <button type="button" onClick={() => reset()}>重新生成</button>
        </section>

        <section className="tech-workspace">
          <div className="tech-matrix-card">
            <MultiplicationMatrix
              question={question}
              difficulty={difficulty}
              phase={phase}
              answeredCells={answeredCells}
            />
          </div>
          <aside className="tech-side">
            <p className="tech-progress">
              第 {index + 1}/{questions.length} 题 · 已打开 {Object.keys(answeredCells).length} 格
            </p>
            <h1>{question.a} × {question.b} = ?</h1>
            {difficulty === 'easy' ? (
              <p>四选一模型：{choices.join(' / ')}</p>
            ) : (
              <p>格内输入模型：目标格作答前不包含答案。</p>
            )}
            <div className="tech-actions">
              <button type="button" disabled={phase !== 'READY'} onClick={() => submit(true)}>模拟答对</button>
              <button type="button" disabled={phase !== 'READY'} onClick={() => submit(false)}>模拟答错</button>
              <button type="button" disabled={!phase.startsWith('FEEDBACK') || index >= questions.length - 1} onClick={next}>
                下一题
              </button>
            </div>
            <pre>{JSON.stringify({ phase, currentKey: `${question.a}×${question.b}` }, null, 2)}</pre>
          </aside>
        </section>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TechnicalPrototype />
  </React.StrictMode>
);
