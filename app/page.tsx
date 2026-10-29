/**
 * TeacherScenarioLab — product homepage.
 *
 * This file replaces the upstream workbench home at `/`. The workbench
 * itself is untouched: /workspace, /workbench/new, /classroom and the rest
 * keep working; only the root landing changes. The page is a server
 * component so it can own the document metadata; all interactive copy
 * lives in the client island below.
 */
import type { Metadata } from 'next';

import { TrainingHomeClient } from '@/components/training/home-client';

export const metadata: Metadata = {
  title: 'TeacherScenarioLab 教师情境实训实验室',
  description: '通过 AI 模拟真实教育情境，训练教师的沟通、信息核实、教育判断和多方协同处置能力。',
};

export default function HomePage() {
  return <TrainingHomeClient />;
}
