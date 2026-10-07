import { API_URL } from './config';

export type Level = 0 | 1 | 2;
export interface Line { en: string; ko: string; expr: [string, string][]; tag: string }
export interface Mission { label: string; done: boolean; key: string }
export interface TurnResult { line: Line; tags: string[]; done?: boolean; event?: string; note?: string; missions: Mission[] }
export interface SessionResult {
  id: string; level: Level; success: boolean; declinedPolitely: boolean;
  agreed: { day: string; time: string; place: string } | null; miaRefusals: number;
  events: { type: string; turn: number; title: string }[]; missions: Mission[]; myLines: string[]; expressions: [string, string][]; log: { w: 'mia' | 'me'; en: string; ko?: string }[];
}

// 앱 설치 단위의 익명 ID (로그인 붙이기 전까지). 영구 저장이 필요하면 expo-secure-store 로 교체.
const USER_ID = 'u_' + Math.random().toString(36).slice(2);

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API_URL + path, { ...init, headers: { 'content-type': 'application/json', 'x-user-id': USER_ID, ...(init?.headers as any) } });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status}`), { status: res.status });
  return res.json() as Promise<T>;
}

export const api = {
  createSession: (level: Level, events: boolean) => req<{ id: string; line: Line; missions: Mission[] }>('/sessions', { method: 'POST', body: JSON.stringify({ level, events }) }),
  turn: (id: string, text: string) => req<TurnResult>(`/sessions/${id}/turns`, { method: 'POST', body: JSON.stringify({ text }) }),
  finish: (id: string) => req<SessionResult>(`/sessions/${id}/finish`, { method: 'POST' }),
  history: () => req<{ id: string; startedAt: number; success: boolean; level: Level }[]>('/me/sessions'),
  /** 녹음 파일 업로드 → 인식된 영어 텍스트. 501이면 서버에 STT가 없다는 뜻. */
  async stt(uri: string): Promise<string> {
    const form = new FormData();
    form.append('audio', { uri, name: 'speech.m4a', type: 'audio/m4a' } as any);
    const res = await fetch(API_URL + '/speech/stt', { method: 'POST', body: form, headers: { 'x-user-id': USER_ID } });
    if (!res.ok) throw Object.assign(new Error(`STT ${res.status}`), { status: res.status });
    return (await res.json()).text as string;
  },
};
