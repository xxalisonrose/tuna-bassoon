import { useCallback, useRef, useState } from 'react';

type StateUpdater<T> = T | ((current: T) => T);

type HistoryOptions = {
  groupKey?: string;
};

type HistoryEntry<T> = {
  state: T;
  groupKey?: string;
  changedAt: number;
};

const DEFAULT_HISTORY_LIMIT = 100;
const GROUPING_WINDOW_MS = 800;

function shallowEqual<T>(left: T, right: T) {
  if (Object.is(left, right)) {
    return true;
  }

  if (
    typeof left !== 'object' ||
    left === null ||
    typeof right !== 'object' ||
    right === null
  ) {
    return false;
  }

  const leftRecord = left as Record<string, unknown>;
  const rightRecord = right as Record<string, unknown>;
  const leftKeys = Object.keys(leftRecord);
  const rightKeys = Object.keys(rightRecord);

  return leftKeys.length === rightKeys.length &&
    leftKeys.every((key) => Object.is(leftRecord[key], rightRecord[key]));
}

export function useUndoableState<T>(
  initialState: T,
  historyLimit = DEFAULT_HISTORY_LIMIT,
) {
  const [state, setState] = useState(initialState);
  const stateRef = useRef(state);
  const pastRef = useRef<HistoryEntry<T>[]>([]);
  const futureRef = useRef<T[]>([]);
  const lastGroupRef = useRef<{
    key: string;
    changedAt: number;
  } | null>(null);

  const applyState = useCallback((nextState: T) => {
    stateRef.current = nextState;
    setState(nextState);
  }, []);

  const clearHistory = useCallback(() => {
    pastRef.current = [];
    futureRef.current = [];
    lastGroupRef.current = null;
  }, []);

  const resetState = useCallback((nextState: T) => {
    clearHistory();
    applyState(nextState);
  }, [applyState, clearHistory]);

  const updateState = useCallback((
    updater: StateUpdater<T>,
    options: HistoryOptions = {},
  ) => {
    const currentState = stateRef.current;
    const nextState = typeof updater === 'function'
      ? (updater as (current: T) => T)(currentState)
      : updater;

    if (shallowEqual(currentState, nextState)) {
      return;
    }

    const changedAt = Date.now();
    const previousGroup = lastGroupRef.current;
    const continuesGroup =
      options.groupKey !== undefined &&
      previousGroup?.key === options.groupKey &&
      changedAt - previousGroup.changedAt <= GROUPING_WINDOW_MS;

    if (!continuesGroup) {
      pastRef.current = [
        ...pastRef.current,
        {
          state: currentState,
          groupKey: options.groupKey,
          changedAt,
        },
      ].slice(-historyLimit);
    }

    futureRef.current = [];
    lastGroupRef.current = options.groupKey === undefined
      ? null
      : { key: options.groupKey, changedAt };
    applyState(nextState);
  }, [applyState, historyLimit]);

  const undo = useCallback(() => {
    const previous = pastRef.current.at(-1);

    if (previous === undefined) {
      return undefined;
    }

    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, stateRef.current].slice(
      -historyLimit,
    );
    lastGroupRef.current = null;
    applyState(previous.state);
    return previous.state;
  }, [applyState, historyLimit]);

  const redo = useCallback(() => {
    const nextState = futureRef.current.at(-1);

    if (nextState === undefined) {
      return undefined;
    }

    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [
      ...pastRef.current,
      {
        state: stateRef.current,
        changedAt: Date.now(),
      },
    ].slice(-historyLimit);
    lastGroupRef.current = null;
    applyState(nextState);
    return nextState;
  }, [applyState, historyLimit]);

  return {
    state,
    updateState,
    resetState,
    clearHistory,
    undo,
    redo,
  };
}
