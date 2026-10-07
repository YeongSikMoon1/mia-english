import React, { forwardRef, useImperativeHandle, useRef } from 'react';

export type Emotion = 'neutral' | 'joy' | 'delight' | 'laugh' | 'sorry' | 'worried' | 'surprise' | 'panic' | 'confused' | 'thinking' | 'cheeky' | 'shy' | 'proud' | 'pout';
export interface AvatarHandle {
  speak(on: boolean): void; listen(on: boolean): void;
  mood(m: { happy?: number; relaxed?: number; surprised?: number; sad?: number; angry?: number }): void;
  emote(name: Emotion, dur?: number): void;
  gesture(name: 'wave' | 'thumbs' | 'shrug' | 'clasp' | 'clap', dur?: number): void; nod(n?: number): void; shake(): void;
  camera(c: Partial<{ ey: number; ez: number; cy: number; fov: number }>): void;
}

export const AvatarView = forwardRef<AvatarHandle, { onReady?: () => void }>(({ onReady }, ref) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const post = (message: object) => frame.current?.contentWindow?.postMessage(message, '*');

  useImperativeHandle(ref, () => ({
    speak: (on) => post({ type: 'speak', on }),
    listen: (on) => post({ type: 'listen', on }),
    mood: (mood) => post({ type: 'mood', mood }),
    emote: (name, dur) => post({ type: 'emote', name, dur }),
    gesture: (name, dur) => post({ type: 'gesture', name, dur }),
    nod: (n = 1) => post({ type: 'nod', n }),
    shake: () => post({ type: 'shake' }),
    camera: (cam) => post({ type: 'camera', cam }),
  }));

  return (
    <iframe
      ref={frame}
      src="/avatar.html?vrm=/Mia.vrm"
      title="Mia 3D avatar"
      onLoad={onReady}
      allow="autoplay"
      style={{ width: '100%', height: '100%', border: 0, background: 'transparent' }}
    />
  );
});
