import { getRandomInt } from '../../utils/random';

const createProblem = () => {
  const takeAway = getRandomInt(1, 10);
  const putIn = getRandomInt(takeAway + 2, takeAway + 15);
  const net = putIn - takeAway;
  const direction = net > 0 ? '多' : '少';

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
      description: `两次一共变化：-${takeAway} + ${putIn} = ${net}，所以是${direction}了 ${Math.abs(net)} 个`,
      hint: `放进去的比拿掉的多 ${net} 个，所以是${direction}了`,
      answer: net,
    },
  ];

  return {
    params: { takeAway, putIn },
    question: `第一天从篮子里拿掉 ${takeAway} 个苹果，第二天又放进去 ${putIn} 个苹果，现在篮子里的苹果比原来多还是少？多/少几个？`,
    hint: '拿掉就是减少，放进去就是增加。先减少再增加，看一看最后是多了还是少了。',
    steps,
    finalAnswer: `${direction}${Math.abs(net)}`,
    answer: net,
  };
};

const problem = {
  id: 'basket-change',
  title: '增减问题',
  tags: ['逆向思维', '增减变化'],
  createProblem,
};

export default problem;
