import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Dialogue, Level } from '@mia/dialogue';
import { DIALOGUE_PROVIDER, DialogueProvider } from '../dialogue/dialogue.provider';
import { MemorySessionStore, SessionRecord, SessionStore } from './session.store';

@Injectable()
export class SessionsService {
  constructor(@Inject(DIALOGUE_PROVIDER) private readonly dlg: DialogueProvider, @Inject(SessionStore) private readonly store: SessionStore) {}

  private missions(r: SessionRecord) {
    return Dialogue.missions(r.state, false).map(([label, on, key]: any) => ({ label, done: !!on, key }));
  }

  async create(userId: string, level: Level, events: boolean) {
    Dialogue.setLevel(level); Dialogue.setEvents(events);
    const state: any = Dialogue.create('plan'); state.evOn = events;
    const line = await this.dlg.open('plan', level);
    const rec: SessionRecord = { id: randomUUID(), userId, level, events, topic: 'lunch', state, log: [{ w: 'mia', ...line, at: Date.now() }], eventLog: [], startedAt: Date.now() };
    await this.store.save(rec);
    return { id: rec.id, line, missions: this.missions(rec) };
  }

  async turn(id: string, text: string) {
    const rec = await this.store.get(id);
    if (!rec) throw new NotFoundException('session not found');
    if (rec.finishedAt) return { line: rec.log[rec.log.length - 1], done: true, missions: this.missions(rec), tags: [] as string[] };
    rec.log.push({ w: 'me', en: text, at: Date.now() });
    const history = rec.log.map((l) => ({ w: l.w, en: l.en }));
    const r = await this.dlg.reply({ state: rec.state, text, level: rec.level, history });
    rec.log[rec.log.length - 1].tags = r.tags;
    rec.log.push({ w: 'mia', ...r.line, at: Date.now() });
    if (r.event) rec.eventLog.push({ type: r.event, turn: rec.state.turns });
    if (r.done) rec.finishedAt = Date.now();
    await this.store.save(rec);
    return { ...r, missions: this.missions(rec) };
  }

  async finish(id: string) {
    const rec = await this.store.get(id);
    if (!rec) throw new NotFoundException('session not found');
    rec.finishedAt ??= Date.now();
    await this.store.save(rec);
    return this.result(rec);
  }

  async get(id: string) {
    const rec = await this.store.get(id);
    if (!rec) throw new NotFoundException('session not found');
    return this.result(rec);
  }

  async list(userId: string) {
    return (await this.store.listByUser(userId)).map((r) => ({ id: r.id, startedAt: r.startedAt, finishedAt: r.finishedAt, level: r.level, success: !!r.state.done, softEnd: !!r.state.softEnd }));
  }

  private result(r: SessionRecord) {
    const s: any = r.state;
    return {
      id: r.id, level: r.level, success: !!s.done, declinedPolitely: !!s.softEnd,
      agreed: s.done && !s.softEnd ? { day: Dialogue.dayKo(s.day), time: s.timeLabel && Dialogue.tko(s.timeLabel), place: s.place?.ko } : null,
      miaRefusals: s.refused, events: r.eventLog.map((e) => ({ ...e, title: (Dialogue.EVT as any)[e.type] })),
      missions: this.missions(r), log: r.log,
      myLines: r.log.filter((l) => l.w === 'me').map((l) => l.en),
      expressions: [...new Map(r.log.filter((l) => l.w === 'mia').flatMap((l) => l.expr ?? []).map((e) => [e[0], e])).values()],
    };
  }
}
export { MemorySessionStore };
