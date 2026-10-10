import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildBoardSlug,
  parseSlugSuffixFromParam,
  resolveBoardFromSlugParam,
  slugifyName,
} from '@/modules/boards/utils/boardSlug';

test('slugifyName lowercases and hyphenates', () => {
  assert.equal(slugifyName('Team Astro'), 'team-astro');
  assert.equal(slugifyName('  MrinZeus 1  '), 'mrinzeus-1');
});

test('slugifyName strips unsafe characters and falls back to board', () => {
  assert.equal(slugifyName('!!!'), 'board');
  assert.equal(slugifyName('Long-Term House Repair Plans'), 'long-term-house-repair-plans');
});

test('buildBoardSlug joins prefix and suffix', () => {
  assert.equal(buildBoardSlug('Team Astro', 'a1b2c3d4'), 'team-astro-a1b2c3d4');
});

test('buildBoardSlug rejects invalid suffix', () => {
  assert.throws(() => buildBoardSlug('Board', 'short'), /Invalid board slug suffix/);
});

test('parseSlugSuffixFromParam reads trailing 8-char id', () => {
  assert.equal(
    parseSlugSuffixFromParam('long-term-house-repair-plans-a1b2c3d4'),
    'a1b2c3d4',
  );
  assert.equal(parseSlugSuffixFromParam('board-ABCDEF12'), 'abcdef12');
  assert.equal(parseSlugSuffixFromParam('no-suffix-here'), null);
});

test('resolveBoardFromSlugParam matches exact slug then suffix fallback', () => {
  const boards = [
    { slug: 'team-astro-a1b2c3d4', slugSuffix: 'a1b2c3d4' },
    { slug: 'other-board-deadbeef', slugSuffix: 'deadbeef' },
  ];

  assert.equal(
    resolveBoardFromSlugParam(boards, 'team-astro-a1b2c3d4')?.slugSuffix,
    'a1b2c3d4',
  );
  assert.equal(
    resolveBoardFromSlugParam(boards, 'renamed-title-a1b2c3d4')?.slugSuffix,
    'a1b2c3d4',
  );
  assert.equal(resolveBoardFromSlugParam(boards, 'missing-ffffffff'), undefined);
});

test('rename keeps suffix via buildBoardSlug', () => {
  const suffix = 'x7k2m9pq';
  const before = buildBoardSlug('Old Name', suffix);
  const after = buildBoardSlug('New Name', suffix);
  assert.equal(parseSlugSuffixFromParam(before), suffix);
  assert.equal(parseSlugSuffixFromParam(after), suffix);
  assert.equal(after, 'new-name-x7k2m9pq');
});
