/**
 * TeacherScenarioLab — roleplay packs (server only).
 *
 * A scenario's character configs (id/name/role) carry no persona: the
 * roleplay pack is what makes a character speak — background, emotional
 * baseline, communication style, and the deterministic scripted replies
 * used when no model is configured or the caller explicitly asks for the
 * scripted demo mode. Packs are code, versioned with the scenario they
 * belong to; task 4 adds the remaining roles' packs.
 *
 * Private facts are NOT in packs: they live in the scenario's fact table
 * and the prompt builder admits only the speaking character's own private
 * facts (see roleplay.ts).
 */
export interface RoleplayPack {
  characterId: string;
  background: string;
  emotionBaseline: string;
  communicationStyle: string;
  /**
   * Deterministic demo script, in turn order. Reply N uses index
   * min(N, length - 1) over this character's previous replies, so the
   * scripted path is fully reproducible without a model.
   */
  scriptedReplies: string[];
}

/**
 * Packs by scenario id. A character without a pack cannot reply: the reply
 * service returns 400 rather than inventing a persona.
 */
export const CHARACTER_PACKS: Record<string, RoleplayPack[]> = {
  'epi-class-fever': [
    {
      characterId: 'parent-1',
      background:
        '乐乐妈妈。孩子是三年级学生，昨晚发烧 39 度，早上请了假；去过社区医院，医生说先居家观察，没有确诊。担心孩子病情，也担心班里会不会传染开，对学校目前的防控安排心里没底。',
      emotionBaseline:
        '焦虑、急切。语气带情绪，先讲孩子情况，再追问学校安排；不对老师做人身攻击，但会反复确认。',
      communicationStyle:
        '短句为主，反复确认（“到底……？”“那……怎么办？”）。一次只问一件事，得到答复后常常再追问一句。',
      scriptedReplies: [
        '老师早上好，我是乐乐妈妈。乐乐昨晚烧到 39 度，今天请假了。我想问一下，班里现在到底有几个孩子发烧了？学校这边是怎么安排的？',
        '居家观察我理解，可我还是不放心。班里通风消毒都做了吗？其他孩子需不需要也注意点什么？',
        '行，老师您说的我记下了。我就是想确认一下，万一乐乐班里情况有变化，学校会第一时间通知我们家长，对吧？',
      ],
    },
  ],
};

export function getCharacterPack(
  scenarioId: string,
  characterId: string,
): RoleplayPack | undefined {
  return (CHARACTER_PACKS[scenarioId] ?? []).find((pack) => pack.characterId === characterId);
}
