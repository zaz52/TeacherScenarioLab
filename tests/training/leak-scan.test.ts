import { describe, expect, test } from 'vitest';

import { scanReplyForLeaks } from '@/lib/training/leak-scan';
import type { TrainingFact } from '@/lib/training/scenario';

const studentFact: TrainingFact = {
  id: 'fact-student-cough',
  content: '小雨今早有点咳嗽，怕被同学笑话，不敢主动跟老师说。',
  category: 'student',
  visibility: 'character-private',
  ownerCharacterId: 'student-1',
};

describe('scanReplyForLeaks', () => {
  test('flags full content and qualifying segments', () => {
    expect(
      scanReplyForLeaks('听说小雨今早有点咳嗽，是真的吗？', [studentFact]),
    ).toEqual(['fact-student-cough']);
    expect(
      scanReplyForLeaks('小雨今早有点咳嗽，怕被同学笑话，不敢主动跟老师说。', [studentFact]),
    ).toEqual(['fact-student-cough']);
  });

  test('ignores short shared words and unrelated text', () => {
    expect(scanReplyForLeaks('小雨今天来上学了', [studentFact])).toEqual([]);
    expect(scanReplyForLeaks('', [studentFact])).toEqual([]);
  });
});
