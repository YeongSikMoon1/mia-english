import { Injectable, NotImplementedException, BadGatewayException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SpeechService {
  constructor(private readonly cfg: ConfigService) {}

  /** 녹음 파일(m4a/wav/webm …) → 영어 텍스트. OpenAI Whisper API 사용. */
  async transcribe(file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<string> {
    const key = this.cfg.get<string>('OPENAI_API_KEY');
    if (!key) throw new NotImplementedException('STT가 설정되지 않았어요(OPENAI_API_KEY). 앱은 입력창으로 대체합니다.');
    const form = new FormData();
    const bytes = new Uint8Array(file.buffer.byteLength);
    bytes.set(file.buffer);
    form.append('file', new Blob([bytes], { type: file.mimetype }), file.originalname || 'speech.m4a');
    form.append('model', this.cfg.get('STT_MODEL') ?? 'whisper-1');
    form.append('language', 'en');
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form });
    if (!res.ok) throw new BadGatewayException(`STT 실패(HTTP ${res.status})`);
    const j: any = await res.json();
    return String(j.text ?? '').trim();
  }
}
