import { assertMultiplicationCoordinate, getCellKey, getProduct } from '../coordinates';

/**
 * 九九乘法口诀背诵的纯领域模型。
 *
 * 这里统一负责45句口诀、81格交换律映射、会话状态转换和安全视图生成。
 * 模块不访问浏览器存储或语音API，因此可以被生产页面、技术原型和测试共同复用。
 */
export const RECITATION_SCHEMA_VERSION = 1;
export const ORDERING_MODES = Object.freeze({ SEQUENTIAL: 'sequential', CUSTOM: 'custom' });

const DIGITS = Object.freeze(['', '一', '二', '三', '四', '五', '六', '七', '八', '九']);

function productText(value) {
  if (value < 10) return DIGITS[value];
  // 乘法口诀沿用教材固定读法“二五一十”，10不能简写为“十”。
  if (value === 10) return '一十';
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return `${tens === 1 ? '' : DIGITS[tens]}十${ones ? DIGITS[ones] : ''}`;
}

function makePhrase(a, b) {
  const product = getProduct(a, b);
  return Object.freeze({
    id: `${a}×${b}`,
    a,
    b,
    group: b,
    product,
    text: `${DIGITS[a]}${DIGITS[b]}${product < 10 ? '得' : ''}${productText(product)}`,
  });
}

/** 按第一组至第九组的传统顺序生成并冻结45句标准口诀。 */
export const RECITATION_PHRASES = Object.freeze(
  Array.from({ length: 9 }, (_, groupIndex) => {
    const b = groupIndex + 1;
    return Array.from({ length: b }, (_, index) => makePhrase(index + 1, b));
  }).flat(),
);

const PHRASE_BY_ID = new Map(RECITATION_PHRASES.map((phrase) => [phrase.id, phrase]));
const PHRASE_ORDER = new Map(RECITATION_PHRASES.map((phrase, index) => [phrase.id, index]));

export function createPhraseId(a, b) {
  assertMultiplicationCoordinate(a, b);
  return getCellKey(Math.min(a, b), Math.max(a, b));
}

/** 根据规范ID查找口诀；无法识别时返回null，避免调用方直接操作内部索引。 */
export function getPhraseById(id) {
  return PHRASE_BY_ID.get(id) ?? null;
}

/**
 * 将有方向的乘法坐标转换为规范口诀。
 * 例如9×1保留为所选坐标，但口诀ID和朗读文本统一映射到1×9。
 */
export function coordinateToPhrase(a, b) {
  const phrase = getPhraseById(createPhraseId(a, b));
  return Object.freeze({ ...phrase, selectedCoordinate: Object.freeze({ a, b }) });
}

/** 返回完成一句口诀后应展开的一个平方格或两个交换律对称格。 */
export function getExpandedCoordinates(id) {
  const phrase = getPhraseById(id);
  if (!phrase) throw new RangeError(`无法识别的口诀 ID：${id}`);
  const first = Object.freeze({ a: phrase.a, b: phrase.b });
  return phrase.a === phrase.b
    ? Object.freeze([first])
    : Object.freeze([first, Object.freeze({ a: phrase.b, b: phrase.a })]);
}

// 完成集合只接受规范口诀ID，并统一去重、恢复为传统背诵顺序。
function normalizedCompletedIds(values) {
  if (!Array.isArray(values)) return null;
  const unique = new Set();
  for (const value of values) {
    if (typeof value !== 'string' || !PHRASE_BY_ID.has(value)) return null;
    unique.add(value);
  }
  return [...unique].sort((left, right) => PHRASE_ORDER.get(left) - PHRASE_ORDER.get(right));
}

/** 查找传统顺序中最早尚未完成的口诀。 */
export function findFirstIncompletePhrase(completedIds = []) {
  const completed = new Set(completedIds);
  return RECITATION_PHRASES.find(({ id }) => !completed.has(id)) ?? null;
}

/** 分组标题只有在该组全部口诀完成后才进入已背状态。 */
export function isPhraseGroupComplete(group, completedIds = []) {
  if (!Number.isInteger(group) || group < 1 || group > 9) return false;
  const completed = new Set(completedIds);
  return RECITATION_PHRASES.filter((phrase) => phrase.group === group)
    .every(({ id }) => completed.has(id));
}

function nowIso() {
  return new Date().toISOString();
}

export function createEmptyRecitationSession(updatedAt = nowIso()) {
  return {
    schemaVersion: RECITATION_SCHEMA_VERSION,
    orderingMode: ORDERING_MODES.SEQUENTIAL,
    currentPhraseId: RECITATION_PHRASES[0].id,
    selectedCoordinate: null,
    completedPhraseIds: [],
    updatedAt,
  };
}

function isIsoDate(value) {
  if (typeof value !== 'string') return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

function isCoordinate(value) {
  if (!value || typeof value !== 'object') return false;
  try {
    assertMultiplicationCoordinate(value.a, value.b);
    return Object.keys(value).every((key) => key === 'a' || key === 'b');
  } catch {
    return false;
  }
}

function normalizeSessionOrNull(input) {
  // 会话中的字段彼此关联，任何不一致组合都整体判为无效，避免恢复出半损坏状态。
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  if (input.schemaVersion !== RECITATION_SCHEMA_VERSION) return null;
  if (!Object.values(ORDERING_MODES).includes(input.orderingMode)) return null;
  if (!isIsoDate(input.updatedAt)) return null;
  const completedPhraseIds = normalizedCompletedIds(input.completedPhraseIds);
  if (!completedPhraseIds) return null;
  const complete = completedPhraseIds.length === RECITATION_PHRASES.length;
  const currentPhrase = input.currentPhraseId === null ? null : getPhraseById(input.currentPhraseId);
  if ((!complete && input.orderingMode === ORDERING_MODES.SEQUENTIAL && !currentPhrase)
    || (complete && input.currentPhraseId !== null)) return null;
  if (currentPhrase && completedPhraseIds.includes(currentPhrase.id)) return null;
  if (input.selectedCoordinate !== null && !isCoordinate(input.selectedCoordinate)) return null;
  if (input.orderingMode === ORDERING_MODES.SEQUENTIAL && input.selectedCoordinate !== null) return null;
  if (input.orderingMode === ORDERING_MODES.CUSTOM) {
    if ((input.currentPhraseId === null) !== (input.selectedCoordinate === null)) return null;
    if (input.selectedCoordinate && createPhraseId(input.selectedCoordinate.a, input.selectedCoordinate.b) !== input.currentPhraseId) return null;
  }
  if (input.orderingMode === ORDERING_MODES.SEQUENTIAL && !complete
    && findFirstIncompletePhrase(completedPhraseIds)?.id !== input.currentPhraseId) return null;
  return {
    schemaVersion: RECITATION_SCHEMA_VERSION,
    orderingMode: input.orderingMode,
    currentPhraseId: input.currentPhraseId,
    selectedCoordinate: input.selectedCoordinate ? { ...input.selectedCoordinate } : null,
    completedPhraseIds,
    updatedAt: input.updatedAt,
  };
}

/** 判断输入是否是内部状态完全一致的Schema v1会话。 */
export function isValidRecitationSession(input) {
  return normalizeSessionOrNull(input) !== null;
}

/** 将外部输入规范化为安全会话；损坏或不兼容数据统一回退为空会话。 */
export function normalizeRecitationSession(input) {
  return normalizeSessionOrNull(input) ?? createEmptyRecitationSession();
}

/** 判断45句口诀是否已经全部完成。 */
export function isRecitationComplete(session) {
  return normalizedCompletedIds(session?.completedPhraseIds)?.length === RECITATION_PHRASES.length;
}

/** 在自定义模式选择一个尚未完成的坐标，并保留用户点击的显示方向。 */
export function selectRecitationCoordinate(session, coordinate, updatedAt = nowIso()) {
  const current = normalizeRecitationSession(session);
  if (current.orderingMode !== ORDERING_MODES.CUSTOM || !isCoordinate(coordinate)) return current;
  const id = createPhraseId(coordinate.a, coordinate.b);
  if (current.completedPhraseIds.includes(id)) return current;
  return { ...current, currentPhraseId: id, selectedCoordinate: { ...coordinate }, updatedAt };
}

/** 切换背诵方式；切回顺序背时自动定位最早未完成句。 */
export function switchRecitationMode(session, orderingMode, updatedAt = nowIso()) {
  const current = normalizeRecitationSession(session);
  if (!Object.values(ORDERING_MODES).includes(orderingMode)) return current;
  if (isRecitationComplete(current)) return { ...current, orderingMode, updatedAt };
  return {
    ...current,
    orderingMode,
    currentPhraseId: orderingMode === ORDERING_MODES.SEQUENTIAL
      ? findFirstIncompletePhrase(current.completedPhraseIds).id
      : null,
    selectedCoordinate: null,
    updatedAt,
  };
}

/**
 * 完成当前口诀并推进会话。
 * expectedPhraseId用于隔离快速重复确认产生的旧事件，防止误完成下一句。
 */
export function completeCurrentPhrase(session, updatedAt = nowIso(), expectedPhraseId = null) {
  const current = normalizeRecitationSession(session);
  if (expectedPhraseId !== null && current.currentPhraseId !== expectedPhraseId) return current;
  if (!current.currentPhraseId || current.completedPhraseIds.includes(current.currentPhraseId)) return current;
  const completedPhraseIds = normalizedCompletedIds([...current.completedPhraseIds, current.currentPhraseId]);
  const complete = completedPhraseIds.length === RECITATION_PHRASES.length;
  return {
    ...current,
    completedPhraseIds,
    currentPhraseId: complete || current.orderingMode === ORDERING_MODES.CUSTOM
      ? null
      : findFirstIncompletePhrase(completedPhraseIds).id,
    selectedCoordinate: null,
    updatedAt,
  };
}

/** 创建一轮新的45句顺序背会话。 */
export function resetRecitationSession(updatedAt = nowIso()) {
  return createEmptyRecitationSession(updatedAt);
}

/** 构建口诀表的9个分组标题、45个口诀格和36个占位格。 */
export function buildRecitationTableView(session) {
  const current = normalizeRecitationSession(session);
  const completed = new Set(current.completedPhraseIds);
  return Object.freeze({
    headers: Object.freeze(Array.from({ length: 9 }, (_, index) => {
      const group = index + 1;
      return Object.freeze({ group, label: DIGITS[group], done: isPhraseGroupComplete(group, current.completedPhraseIds) });
    })),
    cells: Object.freeze(Array.from({ length: 9 }, (_, rowIndex) => (
      Array.from({ length: 9 }, (_, columnIndex) => {
        if (columnIndex > rowIndex) return Object.freeze({ kind: 'placeholder', row: rowIndex + 1, column: columnIndex + 1 });
        const phrase = getPhraseById(`${columnIndex + 1}×${rowIndex + 1}`);
        const state = completed.has(phrase.id) ? 'done' : current.currentPhraseId === phrase.id ? 'current' : 'pending';
        // 未背格只提供因数组合占位，完整口诀仅在成为当前项或完成后进入视图文本。
        const phraseIndex = `${DIGITS[phrase.a]}${DIGITS[phrase.b]}`;
        const displayText = state === 'pending' ? `${phraseIndex} ···` : phrase.text;
        const ariaLabel = state === 'pending'
          ? `${phraseIndex}，未背`
          : `${phrase.text}，${state === 'done' ? '已背' : '当前口诀'}`;
        return Object.freeze({ kind: 'phrase', row: rowIndex + 1, column: columnIndex + 1, state, phrase, displayText, ariaLabel });
      })
    )).flat()),
  });
}

/**
 * 构建81格乘法表的安全视图。
 * 未背格刻意不生成value，辅助名称中也不包含乘积，防止答案通过DOM泄露。
 */
export function buildRecitationMatrixView(session) {
  const current = normalizeRecitationSession(session);
  const completed = new Set(current.completedPhraseIds);
  const currentPhrase = getPhraseById(current.currentPhraseId);
  return Object.freeze(Array.from({ length: 9 }, (_, rowIndex) => (
    Array.from({ length: 9 }, (_, columnIndex) => {
      const a = rowIndex + 1;
      const b = columnIndex + 1;
      const phraseId = createPhraseId(a, b);
      const done = completed.has(phraseId);
      const selected = current.selectedCoordinate?.a === a && current.selectedCoordinate?.b === b;
      const canonicalCurrent = current.currentPhraseId === phraseId;
      const sequentialCurrent = current.orderingMode === ORDERING_MODES.SEQUENTIAL
        && currentPhrase?.a === a && currentPhrase?.b === b;
      const state = done ? 'done' : selected || sequentialCurrent ? 'current' : canonicalCurrent ? 'related' : 'hidden';
      const selectable = current.orderingMode === ORDERING_MODES.CUSTOM && !done;
      const cell = { key: getCellKey(a, b), a, b, phraseId, state, selectable };
      if (done) cell.value = getProduct(a, b);
      cell.ariaLabel = done ? `${a}乘${b}等于${cell.value}，已背` : selectable ? `${a}乘${b}，未背，可选择` : `${a}乘${b}，未背`;
      return Object.freeze(cell);
    })
  )).flat());
}
