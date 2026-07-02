import { getRandomInt } from '../../utils/random';

const createProblem = () => {
  const x = getRandomInt(1, 80);
  const y = getRandomInt(x + 1, 100);

  const finalAnswer = y - x + 1;

  const steps = [
    {
      description: `从 1 号编到 ${y} 号，一共有 ${y} 台电脑`,
      hint: '从 1 数到 Y，就是 Y 台',
      answer: y,
    },
    {
      description: `编号 ${x} 之前有 ${x - 1} 台，要去掉`,
      hint: `${x} 前面有几个数字？从 1 数到 ${x - 1}`,
      answer: x - 1,
    },
  ];

  return {
    params: { x, y },
    question: `学校新买一批电脑，从 ${x} 号编到 ${y} 号（编号不超过 100），一共新买了多少台电脑？`,
    hint: '想一想：从 1 号编到 Y 号是 Y 台，那从 X 号编到 Y 号呢？不要忘记两头都算哦！',
    steps,
    finalAnswer,
  };
};

const problem = {
  id: 'computer-number',
  title: '电脑编号',
  tags: ['端点问题', '数轴认知'],
  createProblem,
};

export default problem;
