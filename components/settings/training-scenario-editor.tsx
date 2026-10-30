'use client';

/**
 * TeacherScenarioLab — scenario draft editor (admin only).
 *
 * One form for creating a new version and for editing a draft. The server
 * is the boundary: it validates the whole document (400 with the issue
 * list), refuses duplicates (409), and refuses published versions (409 —
 * frozen: make a new version instead). The client only shapes the payload:
 * rules are one-per-line text, characters/facts/conditions are rows, and
 * the condition value is a topic, an event name, or one of the seven
 * training states depending on the condition type.
 */
import { useState } from 'react';

import { getClientTranslation } from '@/lib/i18n';

export interface EditorCharacter {
  id: string;
  name: string;
  role: string;
}

export interface EditorFact {
  id: string;
  content: string;
  category: string;
  visibility: string;
  ownerCharacterId: string;
  disclosureConditionId: string;
}

export interface EditorCondition {
  id: string;
  type: string;
  value: string;
}

export interface EditorScenario {
  scenarioId: string;
  version: number;
  title: string;
  setting: string;
  goal: string;
  rules: string[];
  learnerRole: string;
  characters: EditorCharacter[];
  facts: EditorFact[];
  disclosureConditions: Record<
    string,
    { type: string; topic?: string; event?: string; state?: string }
  >;
  publishedAt: number | null;
}

const CHARACTER_ROLES = ['student', 'parent', 'teacher', 'principal', 'other'];
const FACT_VISIBILITIES = ['public', 'character-private', 'hidden'];
const CONDITION_TYPES = ['userAskedAbout', 'eventOccurred', 'stateReached'];
const TRAINING_STATES = [
  'created',
  'briefing',
  'fact-checking',
  'coordination',
  'proposal',
  'evaluation',
  'completed',
];

function t(key: string): string {
  return getClientTranslation(`training.${key}`);
}

export function emptyScenario(): EditorScenario {
  return {
    scenarioId: '',
    version: 1,
    title: '',
    setting: '',
    goal: '',
    rules: [],
    learnerRole: '',
    characters: [{ id: '', name: '', role: 'teacher' }],
    facts: [],
    disclosureConditions: {},
    publishedAt: null,
  };
}

export function fromStored(stored: EditorScenario): EditorScenario {
  return {
    ...stored,
    rules: stored.rules ?? [],
    characters:
      stored.characters.length > 0 ? stored.characters : [{ id: '', name: '', role: 'teacher' }],
    facts: (stored.facts ?? []).map((fact) => ({
      ...fact,
      ownerCharacterId: fact.ownerCharacterId ?? '',
      disclosureConditionId: fact.disclosureConditionId ?? '',
    })),
  };
}

export default function ScenarioEditor({
  mode,
  initial,
}: {
  mode: 'create' | 'edit';
  initial: EditorScenario;
}) {
  const [form, setForm] = useState<EditorScenario>(initial);
  const [rulesText, setRulesText] = useState(initial.rules.join('\n'));
  const [characters, setCharacters] = useState<EditorCharacter[]>(initial.characters);
  const [facts, setFacts] = useState<EditorFact[]>(initial.facts);
  const [conditions, setConditions] = useState<EditorCondition[]>(
    Object.entries(initial.disclosureConditions).map(([id, condition]) => ({
      id,
      type: condition.type,
      value: condition.topic ?? condition.event ?? condition.state ?? '',
    })),
  );
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  function buildPayload(): Record<string, unknown> {
    const disclosureConditions: Record<string, Record<string, string>> = {};
    for (const condition of conditions) {
      if (!condition.id) continue;
      if (condition.type === 'userAskedAbout') {
        disclosureConditions[condition.id] = { type: condition.type, topic: condition.value };
      } else if (condition.type === 'eventOccurred') {
        disclosureConditions[condition.id] = { type: condition.type, event: condition.value };
      } else {
        disclosureConditions[condition.id] = { type: condition.type, state: condition.value };
      }
    }
    return {
      scenarioId: form.scenarioId.trim(),
      version: form.version,
      title: form.title,
      setting: form.setting,
      goal: form.goal,
      rules: rulesText
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
      learnerRole: form.learnerRole,
      characters: characters.filter((c) => c.id.trim() !== ''),
      facts: facts
        .filter((f) => f.id.trim() !== '')
        .map((f) => {
          const fact: Record<string, string> = {
            id: f.id,
            content: f.content,
            category: f.category,
            visibility: f.visibility,
          };
          if (f.visibility === 'character-private' && f.ownerCharacterId) {
            fact.ownerCharacterId = f.ownerCharacterId;
          }
          if (f.visibility === 'hidden' && f.disclosureConditionId) {
            fact.disclosureConditionId = f.disclosureConditionId;
          }
          return fact;
        }),
      disclosureConditions,
    };
  }

  async function save() {
    setNotice('');
    setSaving(true);
    try {
      const url =
        mode === 'create'
          ? '/api/training/admin/scenarios'
          : `/api/training/admin/scenarios/${encodeURIComponent(form.scenarioId)}/versions/${form.version}`;
      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setNotice(data.error ?? t('adminFormSaveFailed'));
        return;
      }
      setNotice(t('adminFormSaveDone'));
    } catch {
      setNotice(t('adminFormSaveFailed'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main>
      <h1>{mode === 'create' ? t('adminFormTitleNew') : t('adminFormTitleEdit')}</h1>
      {notice && <p>{notice}</p>}
      <p>
        <label>
          {t('adminFormScenarioId')}:{' '}
          <input
            value={form.scenarioId}
            disabled={mode === 'edit'}
            onChange={(event) => setForm({ ...form, scenarioId: event.target.value })}
          />
        </label>{' '}
        <label>
          {t('adminFormVersion')}:{' '}
          <input
            type="number"
            min={1}
            value={form.version}
            disabled={mode === 'edit'}
            onChange={(event) => setForm({ ...form, version: Number(event.target.value) })}
          />
        </label>
      </p>
      <p>
        <label>
          {t('adminFormTitle')}:{' '}
          <input
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </label>
      </p>
      <p>
        <label>
          {t('adminFormSetting')}:{' '}
          <textarea
            value={form.setting}
            onChange={(event) => setForm({ ...form, setting: event.target.value })}
          />
        </label>
      </p>
      <p>
        <label>
          {t('adminFormGoal')}:{' '}
          <textarea
            value={form.goal}
            onChange={(event) => setForm({ ...form, goal: event.target.value })}
          />
        </label>
      </p>
      <p>
        <label>
          {t('adminFormRules')}:{' '}
          <textarea value={rulesText} onChange={(event) => setRulesText(event.target.value)} />
        </label>
      </p>
      <p>
        <label>
          {t('adminFormLearnerRole')}:{' '}
          <input
            value={form.learnerRole}
            onChange={(event) => setForm({ ...form, learnerRole: event.target.value })}
          />
        </label>
      </p>
      <section>
        <h2>{t('adminFormCharacters')}</h2>
        {characters.map((character, index) => (
          <p key={index}>
            <input
              value={character.id}
              placeholder="id"
              onChange={(event) => {
                const next = [...characters];
                next[index] = { ...next[index], id: event.target.value };
                setCharacters(next);
              }}
            />{' '}
            <input
              value={character.name}
              placeholder="name"
              onChange={(event) => {
                const next = [...characters];
                next[index] = { ...next[index], name: event.target.value };
                setCharacters(next);
              }}
            />{' '}
            <select
              value={character.role}
              onChange={(event) => {
                const next = [...characters];
                next[index] = { ...next[index], role: event.target.value };
                setCharacters(next);
              }}
            >
              {CHARACTER_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>{' '}
            <button onClick={() => setCharacters(characters.filter((_, i) => i !== index))}>
              {t('adminFormRemoveRow')}
            </button>
          </p>
        ))}
        <p>
          <button
            onClick={() => setCharacters([...characters, { id: '', name: '', role: 'teacher' }])}
          >
            {t('adminFormAddRow')}
          </button>
        </p>
      </section>
      <section>
        <h2>{t('adminFormFacts')}</h2>
        {facts.map((fact, index) => (
          <p key={index}>
            <input
              value={fact.id}
              placeholder="id"
              onChange={(event) => {
                const next = [...facts];
                next[index] = { ...next[index], id: event.target.value };
                setFacts(next);
              }}
            />{' '}
            <input
              value={fact.category}
              placeholder="category"
              onChange={(event) => {
                const next = [...facts];
                next[index] = { ...next[index], category: event.target.value };
                setFacts(next);
              }}
            />{' '}
            <select
              value={fact.visibility}
              onChange={(event) => {
                const next = [...facts];
                next[index] = { ...next[index], visibility: event.target.value };
                setFacts(next);
              }}
            >
              {FACT_VISIBILITIES.map((visibility) => (
                <option key={visibility} value={visibility}>
                  {visibility}
                </option>
              ))}
            </select>{' '}
            <input
              value={fact.ownerCharacterId}
              placeholder="ownerCharacterId"
              onChange={(event) => {
                const next = [...facts];
                next[index] = { ...next[index], ownerCharacterId: event.target.value };
                setFacts(next);
              }}
            />{' '}
            <input
              value={fact.disclosureConditionId}
              placeholder="disclosureConditionId"
              onChange={(event) => {
                const next = [...facts];
                next[index] = { ...next[index], disclosureConditionId: event.target.value };
                setFacts(next);
              }}
            />{' '}
            <input
              value={fact.content}
              placeholder="content"
              onChange={(event) => {
                const next = [...facts];
                next[index] = { ...next[index], content: event.target.value };
                setFacts(next);
              }}
            />{' '}
            <button onClick={() => setFacts(facts.filter((_, i) => i !== index))}>
              {t('adminFormRemoveRow')}
            </button>
          </p>
        ))}
        <p>
          <button
            onClick={() =>
              setFacts([
                ...facts,
                {
                  id: '',
                  content: '',
                  category: '',
                  visibility: 'public',
                  ownerCharacterId: '',
                  disclosureConditionId: '',
                },
              ])
            }
          >
            {t('adminFormAddRow')}
          </button>
        </p>
      </section>
      <section>
        <h2>{t('adminConditions')}</h2>
        {conditions.map((condition, index) => (
          <p key={index}>
            <input
              value={condition.id}
              placeholder="id"
              onChange={(event) => {
                const next = [...conditions];
                next[index] = { ...next[index], id: event.target.value };
                setConditions(next);
              }}
            />{' '}
            <select
              value={condition.type}
              onChange={(event) => {
                const next = [...conditions];
                next[index] = { ...next[index], type: event.target.value };
                setConditions(next);
              }}
            >
              {CONDITION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>{' '}
            {condition.type === 'stateReached' ? (
              <select
                value={condition.value}
                onChange={(event) => {
                  const next = [...conditions];
                  next[index] = { ...next[index], value: event.target.value };
                  setConditions(next);
                }}
              >
                <option value="">—</option>
                {TRAINING_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={condition.value}
                placeholder={condition.type === 'userAskedAbout' ? 'topic' : 'event'}
                onChange={(event) => {
                  const next = [...conditions];
                  next[index] = { ...next[index], value: event.target.value };
                  setConditions(next);
                }}
              />
            )}{' '}
            <button onClick={() => setConditions(conditions.filter((_, i) => i !== index))}>
              {t('adminFormRemoveRow')}
            </button>
          </p>
        ))}
        <p>
          <button
            onClick={() =>
              setConditions([...conditions, { id: '', type: 'userAskedAbout', value: '' }])
            }
          >
            {t('adminFormAddRow')}
          </button>
        </p>
      </section>
      <p>
        <button onClick={() => void save()} disabled={saving}>
          {t('adminFormSave')}
        </button>
      </p>
    </main>
  );
}
