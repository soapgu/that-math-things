import { CELLS, PRODUCTS, MILESTONES, createSharpshooterRouteState, isValidSharpshooterRoute, createGame,
  targetCells, roundShots, isRoundOver, roundRating, shoot, nextRound, calculateSharpshooterResult, isValidSharpshooterResult } from './model';
import { isValidMultiplicationSessionState, isValidMultiplicationResultState, isValidMultiplicationSettings } from '../routeState';

function routeStartingWith(product) {
  const route = createSharpshooterRouteState(() => 0.5);
  route.rounds = [product, ...route.rounds.filter((p) => p !== product)];
  return route;
}
function finishGame(misses = 0) {
  const route = createSharpshooterRouteState();
  let game = createGame(route.rounds);
  let left = misses;
  for (let i = 0; i < 36; i += 1) {
    const targets = targetCells(game.rounds[i]);
    for (const target of targets) {
      const key = left > 0 ? CELLS.find((cell) => cell.product !== game.rounds[i]
        && !game.hits.includes(cell.key) && !roundShots(game).some((s) => s.key === cell.key)).key : target.key;
      game = shoot(game, key);
      if (left > 0) left -= 1;
    }
    if (i < 35) game = nextRound(game);
  }
  return { route, game };
}

describe('九九神枪手领域规则', () => {
  it('36种乘积覆盖81格，每轮1至4发，随机源可复现', () => {
    expect(PRODUCTS).toHaveLength(36);
    expect(CELLS).toHaveLength(81);
    expect(PRODUCTS.flatMap(targetCells)).toHaveLength(81);
    expect(PRODUCTS.every((p) => targetCells(p).length >= 1 && targetCells(p).length <= 4)).toBe(true);
    expect(createSharpshooterRouteState(() => 0.5)).toEqual(createSharpshooterRouteState(() => 0.5));
    expect(() => createSharpshooterRouteState(() => 1)).toThrow();
  });
  it.each([[81, 1], [7, 2], [24, 4], [36, 3]])('目标%i包含%i格', (product, size) => {
    expect(targetCells(product)).toHaveLength(size);
  });
  it('打空中断连击，重复射击与耗尽后的输入不扣弹，漏射不算命中', () => {
    let game = createGame(routeStartingWith(24).rounds);
    expect(nextRound(game)).toBe(game);
    game = shoot(game, '3×8');
    expect(game.combo).toBe(1);
    expect(shoot(game, '3×8')).toBe(game);
    expect(shoot(game, '非法')).toBe(game);
    game = shoot(game, '1×1');
    expect(game.event.broken).toBe(true);
    expect(game.combo).toBe(0);
    game = shoot(shoot(game, '8×3'), '4×6');
    expect(isRoundOver(game)).toBe(true);
    expect(roundRating(game).title).toBe('加油');
    expect(game.hits).not.toContain('6×4');
    expect(shoot(game, '6×4')).toBe(game);
    const next = nextRound(game);
    expect(next.combo).toBe(2);
    expect(roundShots(next)).toEqual([]);
    expect(shoot(next, '3×8')).toBe(next);
    expect(shoot(next, '1×1')).not.toBe(next);
  });
  it('单发全中和零命中对应完美与再试试', () => {
    const game = createGame(routeStartingWith(81).rounds);
    expect(roundRating(shoot(game, '9×9')).title).toBe('完美');
    expect(roundRating(shoot(game, '1×1')).title).toBe('再试试');
  });
  it('81连击可达成，里程碑每个触发一次，换轮不增加或中断连击', () => {
    let game = createGame(PRODUCTS);
    const seen = [];
    for (let i = 0; i < 36; i += 1) {
      for (const cell of targetCells(PRODUCTS[i])) {
        game = shoot(game, cell.key);
        if (game.event.milestone) seen.push(game.combo);
      }
      game = nextRound(game);
    }
    expect(seen).toEqual(MILESTONES);
    expect(game.hits).toHaveLength(81);
    expect(game.maxCombo).toBe(81);
    expect(game.perfectRounds).toBe(36);
    expect(nextRound(game)).toBe(game);
    expect(calculateSharpshooterResult(game, 9999)).toMatchObject({ stars: 3, score: 100 });
  });
  it.each([[0, 100, 3], [8, 90, 3], [9, 89, 2], [16, 80, 2], [17, 79, 1], [81, 0, 1]])('错%i发得到%i分与%i星', (misses, score, stars) => {
    const { game, route } = finishGame(misses);
    const result = calculateSharpshooterResult(game, 0);
    expect(result).toMatchObject({ score, stars });
    const state = { ...route, shots: game.shots, timeSpent: 0, result };
    expect(isValidSharpshooterResult(state)).toBe(true);
    expect(isValidMultiplicationResultState(state)).toBe(true);
    expect(isValidSharpshooterResult({ ...state, result: { ...result, maxCombo: -1 } })).toBe(false);
    expect(isValidSharpshooterResult({ ...state, shots: state.shots.slice(1) })).toBe(false);
    expect(isValidSharpshooterResult({ ...state, timeSpent: Infinity })).toBe(false);
  });
  it('独立会话拒绝伪造、重复乘积与旧题量', () => {
    const route = createSharpshooterRouteState();
    expect(isValidSharpshooterRoute(route)).toBe(true);
    expect(isValidMultiplicationSessionState(route)).toBe(true);
    expect(isValidMultiplicationSettings(route.settings)).toBe(true);
    expect(isValidSharpshooterRoute({ ...route, rounds: Array(36).fill(24) })).toBe(false);
    expect(isValidMultiplicationSettings({ difficulty: 'sharpshooter', questionCount: 81 })).toBe(false);
    expect(isValidMultiplicationSessionState({ ...route, rounds: null })).toBe(false);
  });
});
