import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Level, Line, Reply } from '@mia/dialogue';
import { DialogueProvider, TurnInput } from './dialogue.provider';
import { RuleProvider } from './rule.provider';

const LEVEL_GUIDE = ['아주 쉬운 단어와 짧은 문장(최대 12단어), 천천히 또박또박', '일상적이고 자연스러운 표현(최대 25단어)', '원어민처럼 빠르고 관용구·구어체 사용(최대 30단어)'];

/**
 * 하이브리드: 상태·종료 판정은 규칙 엔진이 맡고(그래서 약속이 반드시 정해지고 끝남),
 * Claude는 "사용자가 방금 한 말에 자연스럽게 반응하면서 같은 의도를 전달하는" 대사로 다듬는 역할만 한다.
 * 실패·타임아웃이면 규칙 엔진의 원문을 그대로 쓴다.
 */
@Injectable()
export class ClaudeProvider implements DialogueProvider {
  private readonly log = new Logger(ClaudeProvider.name);
  constructor(private readonly rule: RuleProvider, private readonly cfg: ConfigService) {}

  open(sc: string, level: Level) { return this.rule.open(sc, level); }

  async reply(input: TurnInput): Promise<Reply> {
    const base = await this.rule.reply(input);
    try {
      const polished = await this.polish(input, base.line);
      return polished ? { ...base, line: { ...base.line, en: polished.en, ko: polished.ko } } : base;
    } catch (e) {
      this.log.warn(`Claude 보정 실패, 규칙 대사 사용: ${(e as Error).message}`);
      return base;
    }
  }

  private async polish(input: TurnInput, line: Line): Promise<{ en: string; ko: string } | null> {
    const key = this.cfg.get<string>('ANTHROPIC_API_KEY');
    if (!key) return null;
    const recent = input.history.slice(-6).map((h) => `${h.w === 'mia' ? 'Mia' : 'User'}: ${h.en}`).join('\n');
    const prompt = `You are Mia, a friendly university student helping a Korean learner practice English.\n` +
      `Level guide: ${LEVEL_GUIDE[input.level]}.\n` +
      `Recent conversation:\n${recent}\nUser just said: "${input.text}"\n\n` +
      `Planned reply (must keep its meaning, question and any slot values such as time/place/day exactly): "${line.en}"\n` +
      `Rewrite it so it first reacts naturally to what the user actually said, then delivers the planned meaning. ` +
      `Do not end the conversation or change times/places. Return JSON only: {"en":"...","ko":"(natural Korean translation)"}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: ctrl.signal,
        headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: this.cfg.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-5', max_tokens: 300, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: any = await res.json();
      const text: string = data?.content?.[0]?.text ?? '';
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) return null;
      const j = JSON.parse(m[0]);
      return typeof j.en === 'string' && typeof j.ko === 'string' ? { en: j.en, ko: j.ko } : null;
    } finally { clearTimeout(t); }
  }
}
