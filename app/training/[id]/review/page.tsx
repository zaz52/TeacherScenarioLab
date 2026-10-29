'use client';

/**
 * TeacherScenarioLab — training review page: the replayable record of one
 * training, in chronological order. It composes only existing read APIs
 * (training, public scenario, messages, events, disclosures, evaluation):
 * key dialogue with speaker labels, state transitions, disclosed facts and
 * the five-dimension evaluation with evidence resolved back to the exact
 * messages it cites. Nothing here is fabricated: an empty section means
 * the underlying record has nothing there.
 */
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getClientTranslation } from '@/lib/i18n';

interface TrainingInfo {
  id: string;
  scenarioId: string;
  scenarioVersion: number;
  state: string;
}

interface ScenarioInfo {
  title: string;
  characters: Array<{ id: string; name: string; role: string }>;
}

interface ChatMessage {
  id: string;
  role: string;
  characterId: string | null;
  content: string;
}

interface TrainingEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

interface DisclosedFact {
  id: string;
  content: string;
}

interface Evaluation {
  dimensions: Array<{
    dimension: string;
    score: number;
    evidence: string[];
    comment: string;
  }>;
  summary: string;
  suggestions: string[];
}

function t(key: string): string {
  return getClientTranslation(`training.${key}`);
}

/** Dimension id → the room's dim label key (fact-checking → dimFactChecking). */
function dimLabelKey(dimension: string): string {
  return (
    'dim' +
    dimension
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
  );
}

export default function TrainingReviewPage() {
  const params = useParams<{ id: string }>();
  const trainingId = params.id;
  const [training, setTraining] = useState<TrainingInfo | null>(null);
  const [scenario, setScenario] = useState<ScenarioInfo | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<TrainingEvent[]>([]);
  const [disclosures, setDisclosures] = useState<DisclosedFact[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const trainingRes = await fetch(`/api/training/trainings/${trainingId}`);
        const trainingData = (await trainingRes.json()) as {
          success?: boolean;
          training?: TrainingInfo;
        };
        if (!trainingRes.ok || !trainingData.success || !trainingData.training) {
          setError(t('reviewLoadFailed'));
          return;
        }
        const info = trainingData.training;
        setTraining(info);
        const [scenarioRes, messagesRes, eventsRes, disclosuresRes, evaluationRes] =
          await Promise.all([
            fetch(
              `/api/training/scenarios/${encodeURIComponent(info.scenarioId)}/versions/${info.scenarioVersion}`,
            ),
            fetch(`/api/training/trainings/${trainingId}/messages`),
            fetch(`/api/training/trainings/${trainingId}/events`),
            fetch(`/api/training/trainings/${trainingId}/disclosures`),
            fetch(`/api/training/trainings/${trainingId}/evaluation`),
          ]);
        const scenarioData = (await scenarioRes.json()) as {
          success?: boolean;
          scenario?: ScenarioInfo;
        };
        if (scenarioRes.ok && scenarioData.scenario) setScenario(scenarioData.scenario);
        const messagesData = (await messagesRes.json()) as {
          success?: boolean;
          messages?: ChatMessage[];
        };
        if (messagesRes.ok && Array.isArray(messagesData.messages)) {
          setMessages(messagesData.messages);
        }
        const eventsData = (await eventsRes.json()) as {
          success?: boolean;
          events?: TrainingEvent[];
        };
        if (eventsRes.ok && Array.isArray(eventsData.events)) {
          setEvents([...eventsData.events].sort((a, b) => a.createdAt - b.createdAt));
        }
        const disclosuresData = (await disclosuresRes.json()) as {
          success?: boolean;
          facts?: DisclosedFact[];
        };
        if (disclosuresRes.ok && Array.isArray(disclosuresData.facts)) {
          setDisclosures(disclosuresData.facts);
        }
        const evaluationData = (await evaluationRes.json()) as {
          success?: boolean;
          evaluation?: Evaluation;
        };
        if (evaluationRes.ok && evaluationData.evaluation) {
          setEvaluation(evaluationData.evaluation);
        }
      } catch {
        setError(t('reviewLoadFailed'));
      } finally {
        setLoading(false);
      }
    })();
  }, [trainingId]);

  if (loading)
    return (
      <main>
        <p>{t('trainingLoading')}</p>
      </main>
    );
  if (error)
    return (
      <main>
        <p>{error}</p>
      </main>
    );
  if (!training)
    return (
      <main>
        <p>{t('reviewLoadFailed')}</p>
      </main>
    );

  const messageById = new Map(messages.map((message) => [message.id, message]));
  const characterName = (characterId: string | null): string => {
    if (!characterId) return t('reviewTeacher');
    return scenario?.characters.find((c) => c.id === characterId)?.name ?? characterId;
  };
  const transitions = events.filter((event) => event.type === 'training-transition');

  return (
    <main>
      <h1>{t('reviewTitle')}</h1>
      <p>
        <Link href={`/training/${training.id}`}>{t('reviewBackRoom')}</Link>{' '}
        <Link href="/training/records">{t('reviewBackRecords')}</Link>
      </p>
      <section>
        <h2>{t('reviewOverview')}</h2>
        <p>
          {t('reviewScenario')}：{scenario?.title ?? training.scenarioId}（{training.scenarioId} v
          {training.scenarioVersion}）
        </p>
        <p>
          {t('reviewState')}：{training.state}
        </p>
      </section>
      <section>
        <h2>{t('reviewMessages')}</h2>
        {messages.length === 0 && <p>{t('reviewEmpty')}</p>}
        <ul>
          {messages.map((message, index) => (
            <li key={message.id} id={`msg-${message.id}`}>
              <p>
                {index + 1}.{' '}
                {message.role === 'user' ? t('reviewTeacher') : characterName(message.characterId)}
              </p>
              <p>{message.content}</p>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>{t('reviewDecisions')}</h2>
        {transitions.length === 0 && <p>{t('reviewEmpty')}</p>}
        <ul>
          {transitions.map((event) => (
            <li key={event.id}>
              {t('reviewTransition')}：{String(event.payload.from ?? '')} →{' '}
              {String(event.payload.to ?? '')}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>{t('reviewDisclosures')}</h2>
        {disclosures.length === 0 && <p>{t('reviewEmpty')}</p>}
        <ul>
          {disclosures.map((fact) => (
            <li key={fact.id}>
              [{fact.id}] {fact.content}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2>{t('reviewEvaluation')}</h2>
        {!evaluation && <p>{t('reviewNoEvaluation')}</p>}
        {evaluation && (
          <>
            <p>{evaluation.summary}</p>
            <ul>
              {evaluation.dimensions.map((dimension) => (
                <li key={dimension.dimension}>
                  <p>
                    {t(dimLabelKey(dimension.dimension))}：{dimension.score} — {dimension.comment}
                  </p>
                  {dimension.evidence.length > 0 && (
                    <p>
                      {t('reviewEvidence')}：
                      {dimension.evidence.map((id) => {
                        const cited = messageById.get(id);
                        return cited ? (
                          <a key={id} href={`#msg-${id}`}>
                            {cited.content.slice(0, 40)}
                          </a>
                        ) : (
                          <span key={id}>{id}</span>
                        );
                      })}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            {evaluation.suggestions.length > 0 && (
              <ul>
                {evaluation.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </main>
  );
}
