import { getRandomInt } from '../../utils/random';

const createProblem = () => {
  const total = getRandomInt(10, 20);
  const remainingMax = getRandomInt(3, total - 2);
  const maxRemaining = remainingMax - 1;
  const finalAnswer = total - maxRemaining;

  const steps = [
    {
      description: '剩下的不满 7 个，最多还能剩几个？',
      hint: '不满 7 个，就是 1~6 个，最多剩 6 个',
      answer: 6,
    },
    {
      description: `原来有 ${total} 个，最多剩 6 个，至少吃了几个？`,
      hint: `总数 - 最多剩下的 = 至少吃掉的：${total} - 6 = ？`,
      answer: finalAnswer,
    },
  ];

  return {
    params: { total, remainingMax },
    question: `妈妈买了 ${total} 个苹果，吃掉一些后，剩下的不满 7 个，至少吃了多少个？`,
    hint: '「不满 7 个」就是比 7 少，最多剩 6 个。吃掉的 = 总数 - 剩下的。要想「至少」吃了多少，就让剩下的尽可能多。',
    steps,
    finalAnswer,
    answer: finalAnswer,
  };
};

const problem = {
  id: 'apple-eaten',
  title: '吃苹果',
  tags: ['逆向思维', '最多最少'],
  createProblem,
};

export default problem;
