import { getRandomInt } from '../../utils/random';

const createProblem = () => {
  const total = getRandomInt(10, 20);
  const threshold = getRandomInt(3, 8);
  const maxRemaining = threshold - 1;
  const finalAnswer = total - maxRemaining;

  const steps = [
    {
      description: `剩下的不满 ${threshold} 个，最多还能剩几个？`,
      hint: `不满 ${threshold} 个，就是 1~${maxRemaining} 个，最多剩 ${maxRemaining} 个`,
      answer: maxRemaining,
    },
    {
      description: `原来有 ${total} 个，最多剩 ${maxRemaining} 个，至少吃了几个？`,
      hint: `总数 - 最多剩下的 = 至少吃掉的：${total} - ${maxRemaining} = ？`,
      answer: finalAnswer,
    },
  ];

  return {
    params: { total, threshold },
    question: `妈妈买了 ${total} 个苹果，吃掉一些后，剩下的不满 ${threshold} 个，至少吃了多少个？`,
    hint: `「不满 ${threshold} 个」就是比 ${threshold} 少，最多剩 ${maxRemaining} 个。吃掉的 = 总数 - 剩下的。要想「至少」吃了多少，就让剩下的尽可能多。`,
    steps,
    finalAnswer,
  };
};

const problem = {
  id: 'apple-eaten',
  title: '吃苹果',
  tags: ['逆向思维', '最多最少'],
  createProblem,
};

export default problem;
