import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';
import { SPEECH_RATE } from './config';
import type { Level } from './api';

/** Mia의 목소리(기기 TTS). 시작/끝 콜백으로 아바타의 입 모양을 켜고 끈다. */
export function speak(text: string, level: Level, cb: { onStart?: () => void; onDone?: () => void }) {
  Speech.stop();
  Speech.speak(text, { language: 'en-US', rate: SPEECH_RATE[level], pitch: 1.1, onStart: cb.onStart, onDone: cb.onDone, onStopped: cb.onDone, onError: cb.onDone });
}
export const stopSpeaking = () => Speech.stop();

/** 마이크 녹음 (expo-av). start() 후 stop()을 부르면 파일 경로를 돌려준다. */
export class Recorder {
  private rec: Audio.Recording | null = null;
  async start() {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) throw new Error('mic-denied');
    await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
    const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    this.rec = recording;
  }
  async stop(): Promise<string | null> {
    if (!this.rec) return null;
    await this.rec.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    const uri = this.rec.getURI();
    this.rec = null;
    return uri;
  }
}
