import { Injectable } from '@nestjs/common';
import { DialogueState, Level } from '@mia/dialogue';

export interface LogEntry { w: 'mia' | 'me'; en: string; ko?: string; expr?: [string, string][]; tag?: string; tags?: string[]; at: number }
export interface SessionRecord {
  id: string; userId: string; level: Level; events: boolean; topic: 'lunch';
  state: DialogueState; log: LogEntry[]; eventLog: { type: string; turn: number }[];
  startedAt: number; finishedAt?: number;
}

/** 저장소 추상화. 지금은 메모리 구현이며, 운영에서는 같은 인터페이스로 PostgreSQL(Prisma/TypeORM)을 붙인다. */
export abstract class SessionStore {
  abstract save(s: SessionRecord): Promise<void>;
  abstract get(id: string): Promise<SessionRecord | undefined>;
  abstract listByUser(userId: string): Promise<SessionRecord[]>;
}

@Injectable()
export class MemorySessionStore extends SessionStore {
  private readonly m = new Map<string, SessionRecord>();
  async save(s: SessionRecord) { this.m.set(s.id, s); }
  async get(id: string) { return this.m.get(id); }
  async listByUser(userId: string) { return [...this.m.values()].filter((s) => s.userId === userId).sort((a, b) => b.startedAt - a.startedAt); }
}
