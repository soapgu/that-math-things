import { getRandomInt } from '../../utils/random';

const createProblem = () => {
  const x = getRandomInt(1, 80);
  const y = getRandomInt(x + 1, 100);

  const finalAnswer = y - x + 1;

  const steps = [
    {
      description: `从 1 号编到 ${y} 号，一共有多少台电脑？`,
      hint: `从 1 数到 ${y} ，就是 ${y}  台`,
      answer: y,
    },
    {
      description: `从 1 号编到 ${x} 号，一共有多少台电脑？`,
      hint: `到编号${x} 有几个数字？从 1 数到 ${x}`,
      answer: x,
    },
    {
      description: `总电脑数${y}去掉从 1 号编到 ${x} 号电脑,结果(就是从编号${x+1}号到${y} 号)是多少台电脑？`,
      hint: `${y}（总数) - ${x}（前${x}号电脑）= (  ) `,
      answer: y-x,
    },
    {
      description: `但是编号${x}这1台也被去掉了,要加回来是多少`,
      hint: `${y-x} + 1= (  ) `,
      answer: y-x+1,
    },
  ];

  return {
    params: { x, y },
    question: `学校新买一批电脑，从 ${x} 号编到 ${y} 号（编号不超过 100），一共新买了多少台电脑？`,
    hint: `想一想：从 1 号编到 ${y} 号是 ${y} 台，那从 ${x} 号编到 ${y} 号呢？不要忘记两头都算哦！`,
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
