import assert from 'node:assert/strict';
import test from 'node:test';
import { moveBoardInOrder } from '@/modules/boards/utils/moveBoardInOrder';

test('moveBoardInOrder moves a board earlier or later', () => {
  assert.deepEqual(moveBoardInOrder(['a', 'b', 'c'], 'b', -1), ['b', 'a', 'c']);
  assert.deepEqual(moveBoardInOrder(['a', 'b', 'c'], 'b', 1), ['a', 'c', 'b']);
});

test('moveBoardInOrder leaves the ends in place', () => {
  assert.equal(moveBoardInOrder(['a', 'b'], 'a', -1), null);
  assert.equal(moveBoardInOrder(['a', 'b'], 'b', 1), null);
});

test('moveBoardInOrder ignores an unknown board and does not mutate the input', () => {
  const orderedIds = ['a', 'b'];
  assert.equal(moveBoardInOrder(orderedIds, 'missing', 1), null);
  assert.deepEqual(orderedIds, ['a', 'b']);
});
