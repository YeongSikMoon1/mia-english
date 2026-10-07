import { Injectable } from '@nestjs/common';
import { Dialogue, Line, Level, Reply } from '@mia/dialogue';
import { DialogueProvider, TurnInput } from './dialogue.provider';

/**
 * 규칙 기반 엔진. 정보 채우기(시간·장소·날짜), 거절/돌발상황 흐름, 종료 판정을 모두 여기서 결정한다.
 * 엔진은 모듈 전역 변수(난이도·돌발상황 ON/OFF)를 쓰므로, 호출 직전에 난이도를 설정한다(Node는 단일 스레드라 안전).
 */
@Injectable()
export class RuleProvider implements DialogueProvider {
  async open(sc: string, level: Level): Promise<Line> {
    Dialogue.setLevel(level);
    return Dialogue.open(sc);
  }
  async reply({ state, text, level }: TurnInput): Promise<Reply> {
    Dialogue.setLevel(level);
    Dialogue.setEvents(state.evOn !== false);
    return Dialogue.reply(state, text);
  }
}
