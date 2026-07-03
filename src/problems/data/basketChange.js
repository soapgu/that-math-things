import { getRandomInt } from '../../utils/random';

const createProblem = () => {
  const takeAway = getRandomInt(1, 10);
  const putIn = getRandomInt(1, 15);
  const net = putIn - takeAway;
  const absNet = Math.abs(net);

  const steps = [
    {
      description: `第一天拿掉 ${takeAway} 个，少了 ${takeAway} 个`,
      hint: `拿掉就是减少：-${takeAway}`,
      answer: -takeAway,
    },
    {
      description: `第二天放进去 ${putIn} 个，多了 ${putIn} 个`,
      hint: `放进去就是增加：+${putIn}`,
      answer: putIn,
    },
    {
      description: `两次一共变化：-${takeAway} + ${putIn} = ${net}${
        net > 0 ? `，多了 ${net} 个` : net < 0 ? `，少了 ${absNet} 个` : '，和原来一样多'
      }`,
      hint: net > 0
        ? `放进去的比拿掉的多 ${net} 个，所以是多了 ${net} 个`
        : net < 0
          ? `拿掉的比放进去的多 ${absNet} 个，所以是少了 ${absNet} 个`
          : '拿掉的和放进来的一样多，所以没变',
      answer: net,
    },
  ];

  return {
    params: { takeAway, putIn },
    question: `第一天从篮子里拿掉 ${takeAway} 个苹果，第二天又放进去 ${putIn} 个苹果，现在篮子里的苹果比原来多了还是少了？多了或少了几个？`,
    hint: '拿掉就是减少，放进去就是增加。先算总共少了多少，再算总共多了多少，比一比就知道。',
    steps,
    answers: [
      {
        label: '比原来多了还是少了？',
        type: 'choice',
        options: [
          { label: '多了', value: 1 },
          { label: '少了', value: -1 },
          { label: '一样多', value: 0 },
        ],
        answer: Math.sign(net),
      },
      { label: '差几个？', answer: absNet },
    ],
  };
};

const problem = {
  id: 'basket-change',
  title: '增减问题',
  tags: ['逆向思维', '增减变化'],
  createProblem,
};

export default problem;
