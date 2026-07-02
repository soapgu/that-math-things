import computerNumber from './data/computerNumber';
import stickerProblem from './data/stickerProblem';
import appleEaten from './data/appleEaten';
import basketChange from './data/basketChange';

const problemRegistry = {
  [computerNumber.id]: computerNumber,
  [stickerProblem.id]: stickerProblem,
  [appleEaten.id]: appleEaten,
  [basketChange.id]: basketChange,
};

export function getProblem(id) {
  return problemRegistry[id] || null;
}

export function getAllProblems() {
  return Object.values(problemRegistry);
}

export function getAllProblemIds() {
  return Object.keys(problemRegistry);
}

export default problemRegistry;
