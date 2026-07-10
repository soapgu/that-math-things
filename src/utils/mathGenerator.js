import { getRandomInt, shuffleArray } from './random';

function needsCarry(a, b) {
  return (a % 10) + (b % 10) >= 10;
}

function needsBorrow(a, b) {
  return (a % 10) < (b % 10);
}

function generateAddition(range, wantCarry) {
  for (let i = 0; i < 200; i++) {
    const a = getRandomInt(1, range - 1);
    const b = getRandomInt(1, range - a);
    if (needsCarry(a, b) === wantCarry) {
      return { a, b, op: '+', answer: a + b, hasCarry: true, hasBorrow: false };
    }
  }
  const a = getRandomInt(1, Math.min(range - 1, 9));
  const b = wantCarry ? getRandomInt(10 - (a % 10), Math.min(9, range - a)) : getRandomInt(1, Math.min(9 - (a % 10), range - a));
  return { a, b, op: '+', answer: a + b, hasCarry: true, hasBorrow: false };
}

function generateSubtraction(range, wantBorrow) {
  for (let i = 0; i < 200; i++) {
    const a = getRandomInt(2, range);
    const b = getRandomInt(1, a - 1);
    if (needsBorrow(a, b) === wantBorrow) {
      return { a, b, op: '-', answer: a - b, hasCarry: false, hasBorrow: true };
    }
  }
  const a = getRandomInt(11, range);
  const unitsA = a % 10;
  const b = wantBorrow
    ? getRandomInt(unitsA + 1, Math.min(9, a - 1))
    : getRandomInt(1, unitsA);
  return { a, b: b || 1, op: '-', answer: a - (b || 1), hasCarry: false, hasBorrow: true };
}

export function generateQuestions({ range, addRatio, carryBorrowProb, questionCount }) {
  const questions = [];
  const addCount = Math.round((questionCount * addRatio) / 100);
  const subCount = questionCount - addCount;

  const withCarryOrBorrowCount = Math.round((questionCount * carryBorrowProb) / 100);

  let carryRemaining = withCarryOrBorrowCount;
  let addRemaining = addCount;
  let subRemaining = subCount;

  for (let i = 0; i < questionCount; i++) {
    const isAdd = addRemaining > 0 && (subRemaining === 0 || Math.random() < addRemaining / (addRemaining + subRemaining));

    if (isAdd) {
      addRemaining--;
      const wantCarry = carryRemaining > 0 && Math.random() < carryRemaining / (addRemaining + subRemaining + 1);
      if (wantCarry) carryRemaining--;
      questions.push(generateAddition(range, wantCarry));
    } else {
      subRemaining--;
      const wantBorrow = carryRemaining > 0 && Math.random() < carryRemaining / (addRemaining + subRemaining + 1);
      if (wantBorrow) carryRemaining--;
      questions.push(generateSubtraction(range, wantBorrow));
    }
  }

  return shuffleArray(questions);
}
