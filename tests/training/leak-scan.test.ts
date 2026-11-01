import { describe, expect, test } from 'vitest';

import { scanReplyForLeaks } from '@/lib/training/leak-scan';
import type { TrainingFact } from '@/lib/training/scenario';
import { EPIDEMIC_SCENARIO_V1_DRAFT as scenario } from '@/lib/training/scenarios/epidemic-v1';

const studentFact: TrainingFact = {
  id: 'fact-student-cough',
  content: '小雨今早有点咳嗽，怕被同学笑话，不敢主动跟老师说。',
  category: 'student',
  visibility: 'character-private',
  ownerCharacterId: 'student-1',
};

describe('scanReplyForLeaks', () => {
  test('a doctor can repeat an explicitly known policy while other principal facts stay protected', () => {
    const principal = scenario.facts.find((fact) => fact.id === 'fact-principal-decision')!;
    const known = scenario.facts.filter(
      (fact) =>
        fact.visibility === 'public' ||
        (fact.visibility === 'character-private' && fact.ownerCharacterId === 'doctor-1'),
    );
    const reply = '是否调整上课安排仍需上级部门决定。';
    expect(scanReplyForLeaks(reply, [principal])).toEqual([principal.id]);
    expect(scanReplyForLeaks(reply, [principal], known)).toEqual([]);
    expect(scanReplyForLeaks(principal.content, [principal], known)).toEqual([principal.id]);
  });
  test('known overlapping text never exempts unrelated private or locked information', () => {
    const shared = { ...studentFact, content: '学校每天进行晨检，某学生已经办理秘密转学。' };
    const known = [
      { ...studentFact, visibility: 'public' as const, content: '学校每天进行晨检，学生应配合。' },
    ];
    expect(scanReplyForLeaks('学校每天进行晨检。', [shared], known)).toEqual([]);
    expect(
      scanReplyForLeaks('学校每天进行晨检，某学生已经办理秘密转学。', [shared], known),
    ).toEqual([shared.id]);
    const hidden = scenario.facts.find((fact) => fact.visibility === 'hidden')!;
    expect(scanReplyForLeaks(hidden.content, [hidden], known)).toEqual([hidden.id]);
    expect(scanReplyForLeaks(studentFact.content, [studentFact], known)).toEqual([studentFact.id]);
  });
  test('flags full content and qualifying segments', () => {
    expect(scanReplyForLeaks('听说小雨今早有点咳嗽，是真的吗？', [studentFact])).toEqual([
      'fact-student-cough',
    ]);
    expect(
      scanReplyForLeaks('小雨今早有点咳嗽，怕被同学笑话，不敢主动跟老师说。', [studentFact]),
    ).toEqual(['fact-student-cough']);
  });

  test('ignores short shared words and unrelated text', () => {
    expect(scanReplyForLeaks('小雨今天来上学了', [studentFact])).toEqual([]);
    expect(scanReplyForLeaks('', [studentFact])).toEqual([]);
  });
});
