/**
 * TeacherScenarioLab — single-role reply contract tests against real
 * PostgreSQL. Runs only when PG_CONTRACT_URL is set; otherwise skips.
 * The epidemic draft scenario is published into the worker database only
 * (test data, never the real database), so the reply path exercises the
 * actual scenario content and the parent roleplay pack.
 */
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { getDisclosedFactsForTraining } from '@/lib/training/disclosure';
import { getTrainingStore } from '@/lib/training/server';
import { EPIDEMIC_SCENARIO_V1_DRAFT } from '@/lib/training/scenarios/epidemic-v1';
import {
  appendUserMessage,
  createTraining,
  listEvents,
  listMessages,
  startTraining,
} from '@/lib/training/store';
import { generateCharacterReply } from '@/lib/training/roleplay';

const contractUrl = process.env.PG_CONTRACT_URL;
if (contractUrl) process.env.DATABASE_URL = contractUrl;
const describePg = contractUrl ? describe : describe.skip;

describePg('single-role reply (PostgreSQL contract)', () => {
  let pool: Pool;
  let trainingId: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString: contractUrl });
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    const store = await getTrainingStore();
    await pool.query('DELETE FROM training_snapshots');
    await pool.query('DELETE FROM training_events');
    await pool.query('DELETE FROM training_messages');
    await pool.query('DELETE FROM trainings');
    await pool.query('DELETE FROM training_scenarios');
    await store.saveScenarioVersion({ ...EPIDEMIC_SCENARIO_V1_DRAFT, publishedAt: 1000 });
    const training = await createTraining('owner-1', {
      scenarioId: 'epi-class-fever',
      scenarioVersion: 1,
    });
    trainingId = training.id;
    await startTraining('owner-1', trainingId);
    await appendUserMessage('owner-1', trainingId, { content: '家长您好，我是班主任' });
  });

  test('scripted replies follow the pack in turn order and ledger the mode', async () => {
    const first = await generateCharacterReply('owner-1', trainingId, {
      characterId: 'parent-1',
      mode: 'scripted',
    });
    expect(first.mode).toBe('scripted');
    expect(first.message.role).toBe('character');
    expect(first.message.characterId).toBe('parent-1');
    expect(first.message.content).toContain('班里现在到底有几个孩子发烧了');
    await appendUserMessage('owner-1', trainingId, { content: '通风消毒都做了' });
    const second = await generateCharacterReply('owner-1', trainingId, {
      characterId: 'parent-1',
      mode: 'scripted',
    });
    expect(second.message.content).toContain('班里通风消毒都做了吗');
    const events = await listEvents('owner-1', trainingId);
    const replies = events.filter((e) => e.type === 'character-reply');
    expect(replies).toHaveLength(2);
    expect(replies[0]?.payload).toMatchObject({ characterId: 'parent-1', mode: 'scripted' });
    const messages = await listMessages('owner-1', trainingId, false);
    expect(messages.filter((m) => m.role === 'character')).toHaveLength(2);
  });

  test('model mode uses the injected generator and keeps the boundary', async () => {
    let seenSystem = '';
    const result = await generateCharacterReply(
      'owner-1',
      trainingId,
      { characterId: 'parent-1', mode: 'model' },
      {
        generateModelReply: async (system) => {
          seenSystem = system;
          return '我是乐乐妈妈，谢谢老师。';
        },
      },
    );
    expect(result.mode).toBe('model');
    expect(result.message.content).toBe('我是乐乐妈妈，谢谢老师。');
    expect(seenSystem).toContain('乐乐昨晚发烧 39 度');
    expect(seenSystem).not.toContain('小雨今早有点咳嗽');
    expect(seenSystem).not.toContain('学校瞒报');
  });

  test('director picks the responder when characterId is omitted', async () => {
    await appendUserMessage('owner-1', trainingId, { content: '停课的事到底怎么定？' });
    const result = await generateCharacterReply('owner-1', trainingId, {
      mode: 'scripted',
    });
    expect(result.director).toMatchObject({
      characterId: 'principal-1',
      reason: '话题：停课决策与学校安排',
    });
    expect(result.message.characterId).toBe('principal-1');
    expect(result.message.content).toContain('要按流程报上级决定');
    const events = await listEvents('owner-1', trainingId);
    const reply = events.find((e) => e.type === 'character-reply');
    expect(reply?.payload).toMatchObject({
      characterId: 'principal-1',
      mode: 'scripted',
      director: { characterId: 'principal-1', reason: '话题：停课决策与学校安排' },
    });
  });

  test('dynamic rumor event fires once at three user messages and unlocks the fact', async () => {
    await appendUserMessage('owner-1', trainingId, { content: '第二条消息' });
    await generateCharacterReply('owner-1', trainingId, {
      characterId: 'parent-1',
      mode: 'scripted',
    });
    await appendUserMessage('owner-1', trainingId, { content: '第三条消息' });
    await generateCharacterReply('owner-1', trainingId, {
      characterId: 'parent-1',
      mode: 'scripted',
    });
    const events = await listEvents('owner-1', trainingId);
    expect(events.filter((e) => e.type === 'rumor-in-group')).toHaveLength(1);
    const disclosed = await getDisclosedFactsForTraining('owner-1', trainingId);
    expect(disclosed.facts.map((f) => f.id)).toEqual(['fact-rumor']);
    // A further reply must not re-fire the event.
    await appendUserMessage('owner-1', trainingId, { content: '第四条消息' });
    await generateCharacterReply('owner-1', trainingId, {
      characterId: 'parent-1',
      mode: 'scripted',
    });
    const eventsAfter = await listEvents('owner-1', trainingId);
    expect(eventsAfter.filter((e) => e.type === 'rumor-in-group')).toHaveLength(1);
  });

  test('model reply leaking another character’s private fact is blocked, not persisted', async () => {
    const before = await listMessages('owner-1', trainingId, false);
    await expect(
      generateCharacterReply(
        'owner-1',
        trainingId,
        { characterId: 'parent-1', mode: 'model' },
        {
          generateModelReply: async () =>
            '听说小雨今早有点咳嗽，怕被同学笑话，我很担心。',
        },
      ),
    ).rejects.toMatchObject({ status: 502 });
    const after = await listMessages('owner-1', trainingId, false);
    expect(after).toHaveLength(before.length);
    const events = await listEvents('owner-1', trainingId);
    expect(events.filter((e) => e.type === 'character-reply')).toHaveLength(0);
  });

  test('unknown characters, pack-less characters, wrong states, foreign owners fail', async () => {
    await expect(
      generateCharacterReply('owner-1', trainingId, {
        characterId: 'no-such-character',
        mode: 'scripted',
      }),
    ).rejects.toMatchObject({ status: 400 });
    // A character without a roleplay pack cannot reply, even in scripted mode.
    const store = await getTrainingStore();
    await store.saveScenarioVersion({
      scenarioId: 'packless-test',
      version: 1,
      title: '无包测试',
      setting: '测试',
      goal: '测试',
      rules: [],
      learnerRole: '小学教师',
      characters: [{ id: 'ghost-1', name: '幽灵', role: 'other' }],
      facts: [],
      disclosureConditions: {},
      publishedAt: 1000,
    });
    const ghost = await createTraining('owner-1', {
      scenarioId: 'packless-test',
      scenarioVersion: 1,
    });
    await startTraining('owner-1', ghost.id);
    await expect(
      generateCharacterReply('owner-1', ghost.id, {
        characterId: 'ghost-1',
        mode: 'scripted',
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      generateCharacterReply('owner-2', trainingId, {
        characterId: 'parent-1',
        mode: 'scripted',
      }),
    ).rejects.toMatchObject({ status: 404 });
    const fresh = await createTraining('owner-1', {
      scenarioId: 'epi-class-fever',
      scenarioVersion: 1,
    });
    await expect(
      generateCharacterReply('owner-1', fresh.id, {
        characterId: 'parent-1',
        mode: 'scripted',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
