import { getRandomInt } from '../../utils/random';

const createProblem = () => {
  const a = getRandomInt(12, 30);
  const b = getRandomInt(2, a - 2);

  const diff = a - b;
  const question1Answer = diff;
  const question2Answer = Math.floor(diff / 2);

  const steps = [
    {
      description: `乐乐有 ${a} 张，欢欢有 ${b} 张，乐乐比欢欢多几张？`,
      hint: `用乐乐的减去欢欢的：${a} - ${b} = ？`,
      answer: diff,
    },
    {
      description: '欢欢再添这些张，两人就同样多',
      hint: '多几张就添几张',
      answer: question1Answer,
    },
    {
      description: `乐乐每天送给欢欢 1 张，每天两人的差距缩小几张？`,
      hint: '乐乐减1，欢欢加1，差距每天减少2',
      answer: 2,
    },
    {
      description: `差距是 ${diff}，每天缩小 2 张，需要几天？`,
      hint: `${diff} ÷ 2 = ？`,
      answer: question2Answer,
    },
  ];

  return {
    params: { a, b },
    question: `乐乐有 ${a} 张贴纸，欢欢有 ${b} 张贴纸。\n① 欢欢再添多少张，两人的贴纸就同样多？\n② 乐乐每天送给欢欢 1 张，多少天后两人的贴纸就同样多？`,
    hint: '先算相差多少张。第一问：差几张补几张。第二问：每天乐乐少1欢欢多1，差距缩小2张。',
    steps,
    answers: [
      { label: '① 欢欢再添多少张？', answer: question1Answer },
      { label: '② 每天送1张，几天后同样多？', answer: question2Answer },
    ],
  };
};

const problem = {
  id: 'sticker-problem',
  title: '贴纸问题',
  tags: ['相差关系', '两步应用题'],
  createProblem,
};

export default problem;
