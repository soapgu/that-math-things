import { getCellKey } from '../coordinates';

export const SHARPSHOOTER = 'sharpshooter';
export const MILESTONES = [5, 10, 20, 40, 81];
export const CELLS = Array.from({ length: 81 }, (_, id) => {
  const a = Math.floor(id / 9) + 1;
  const b = id % 9 + 1;
  return { a, b, key: getCellKey(a, b), product: a * b };
});
export const PRODUCTS = [...new Set(CELLS.map((cell) => cell.product))];
export const targetCells = (product) => CELLS.filter((cell) => cell.product === product);

export function createSharpshooterRouteState(rng = Math.random) {
  const rounds = [...PRODUCTS];
  for (let i = rounds.length - 1; i > 0; i -= 1) {
    const value = rng();
    if (!Number.isFinite(value) || value < 0 || value >= 1) throw new RangeError('随机数必须在0与1之间');
    const j = Math.floor(value * (i + 1));
    [rounds[i], rounds[j]] = [rounds[j], rounds[i]];
  }
  return { settings: { difficulty: SHARPSHOOTER, questionCount: 36 }, rounds };
}

export function isValidSharpshooterRoute(state) {
  return state?.settings?.difficulty === SHARPSHOOTER && state.settings.questionCount === 36
    && Array.isArray(state.rounds) && state.rounds.length === 36
    && new Set(state.rounds).size === 36 && PRODUCTS.every((p) => state.rounds.includes(p));
}

export function createGame(rounds) {
  return { rounds, roundIndex: 0, shots: [], hits: [], combo: 0, maxCombo: 0, perfectRounds: 0, event: null };
}
export function roundShots(game) { return game.shots.filter((shot) => shot.roundIndex === game.roundIndex); }
export function isRoundOver(game) { return roundShots(game).length === targetCells(game.rounds[game.roundIndex]).length; }
export function roundRating(game) {
  const shots = roundShots(game);
  const hits = shots.filter((shot) => shot.hit).length;
  return hits === targetCells(game.rounds[game.roundIndex]).length
    ? { title: '完美', message: '全部命中！' }
    : hits > 0 ? { title: '加油', message: '找对了一部分，看看漏掉了哪些' }
      : { title: '再试试', message: '看看这些算式，下次再挑战' };
}

// 纯状态转换一次性完成扣弹、命中、连击与轮末记录，重复射击返回原状态。
export function shoot(game, key) {
  const cell = CELLS.find((entry) => entry.key === key);
  if (!cell || isRoundOver(game) || game.hits.includes(key) || roundShots(game).some((shot) => shot.key === key)) return game;
  const hit = cell.product === game.rounds[game.roundIndex];
  const combo = hit ? game.combo + 1 : 0;
  const shot = { key, hit, roundIndex: game.roundIndex };
  const next = { ...game, shots: [...game.shots, shot], hits: hit ? [...game.hits, key] : game.hits,
    combo, maxCombo: Math.max(combo, game.maxCombo) };
  const perfect = isRoundOver(next) && roundShots(next).every((entry) => entry.hit);
  return { ...next, perfectRounds: game.perfectRounds + Number(perfect),
    event: { id: next.shots.length, key, hit, combo, broken: !hit && game.combo > 0,
      milestone: hit && MILESTONES.includes(combo), perfect } };
}
export function nextRound(game) {
  return isRoundOver(game) && game.roundIndex < 35
    ? { ...game, roundIndex: game.roundIndex + 1, event: null } : game;
}
export function calculateSharpshooterResult(game, timeSpent) {
  const score = Math.round(game.hits.length / 81 * 100);
  return { score, stars: score >= 90 ? 3 : score >= 80 ? 2 : 1,
    hitCount: game.hits.length, perfectRounds: game.perfectRounds, maxCombo: game.maxCombo, timeSpent };
}
export function isValidSharpshooterResult(state) {
  if (!isValidSharpshooterRoute(state) || !Array.isArray(state.shots) || state.shots.length !== 81
    || !Number.isSafeInteger(state.timeSpent) || state.timeSpent < 0) return false;
  let game = createGame(state.rounds);
  for (const shot of state.shots) {
    if (isRoundOver(game)) game = nextRound(game);
    if (shot?.roundIndex !== game.roundIndex) return false;
    const next = shoot(game, shot.key);
    if (next === game || next.event.hit !== shot.hit) return false;
    game = next;
  }
  const expected = calculateSharpshooterResult(game, state.timeSpent);
  return isRoundOver(game) && game.roundIndex === 35
    && Object.entries(expected).every(([key, value]) => state.result?.[key] === value);
}
