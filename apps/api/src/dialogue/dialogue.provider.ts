import { DialogueState, Level, Line, Reply } from '@mia/dialogue';

export interface TurnInput { state: DialogueState; text: string; level: Level; history: { w: 'mia' | 'me'; en: string }[] }

/** 대화 엔진 공통 인터페이스. 규칙 기반 / Claude 하이브리드를 같은 모양으로 바꿔 끼운다. */
export interface DialogueProvider {
  open(sc: string, level: Level): Promise<Line>;
  reply(input: TurnInput): Promise<Reply>;
}
export const DIALOGUE_PROVIDER = Symbol('DIALOGUE_PROVIDER');
