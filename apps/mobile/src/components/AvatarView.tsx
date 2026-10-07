import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';

export type Emotion = 'neutral' | 'joy' | 'delight' | 'laugh' | 'sorry' | 'worried' | 'surprise' | 'panic' | 'confused' | 'thinking' | 'cheeky' | 'shy' | 'proud' | 'pout';
export interface AvatarHandle {
  speak(on: boolean): void; listen(on: boolean): void;
  mood(m: { happy?: number; relaxed?: number; surprised?: number; sad?: number; angry?: number }): void;
  emote(name: Emotion, dur?: number): void;
  gesture(name: 'wave' | 'thumbs' | 'shrug' | 'clasp' | 'clap', dur?: number): void; nod(n?: number): void; shake(): void;
  camera(c: Partial<{ ey: number; ez: number; cy: number; fov: number }>): void;
}

/**
 * Mia 3D 아바타. WebView 안에서 avatar.html(WebGL2 VRM 렌더러)이 돌고, 앱과는 postMessage(JSON)로만 통신한다.
 * 모델(Mia.vrm)은 번들 에셋을 기기 로컬 파일로 풀어 두고 그 경로를 window.__VRM_URL__ 로 넘겨서 WebView가 직접 읽는다.
 */
export const AvatarView = forwardRef<AvatarHandle, { onReady?: () => void }>(({ onReady }, ref) => {
  const web = useRef<WebView>(null);
  const [src, setSrc] = useState<{ html: string; vrm: string } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const [h, v] = [Asset.fromModule(require('../../assets/avatar.html')), Asset.fromModule(require('../../assets/Mia.vrm'))];
      await Promise.all([h.downloadAsync(), v.downloadAsync()]);
      setSrc({ html: h.localUri!, vrm: v.localUri! });
    })();
  }, []);

  const post = (o: object) => web.current?.postMessage(JSON.stringify(o));
  useImperativeHandle(ref, () => ({
    speak: (on) => post({ type: 'speak', on }), listen: (on) => post({ type: 'listen', on }),
    mood: (mood) => post({ type: 'mood', mood }), emote: (name, dur) => post({ type: 'emote', name, dur }), gesture: (name, dur) => post({ type: 'gesture', name, dur }),
    nod: (n = 1) => post({ type: 'nod', n }), shake: () => post({ type: 'shake' }), camera: (cam) => post({ type: 'camera', cam }),
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      {src && (
        <WebView
          ref={web} source={{ uri: src.html }} style={styles.web} originWhitelist={['*']} javaScriptEnabled
          allowFileAccess allowUniversalAccessFromFileURLs allowFileAccessFromFileURLs allowingReadAccessToURL={src.html.replace(/[^/]+$/, '')}
          injectedJavaScriptBeforeContentLoaded={`window.__VRM_URL__=${JSON.stringify(src.vrm)};true;`}
          onMessage={(e) => { try { const m = JSON.parse(e.nativeEvent.data); if (m.type === 'ready') { setReady(true); onReady?.(); } else if (m.type === 'error') console.warn('[avatar]', m.message); } catch {} }}
          scrollEnabled={false} bounces={false} overScrollMode="never" setSupportMultipleWindows={false}
        />
      )}
      {!ready && <View style={styles.loading}><ActivityIndicator color="#2a63e8" size="large" /></View>}
    </View>
  );
});
const styles = StyleSheet.create({ web: { flex: 1, backgroundColor: 'transparent' }, loading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' } });
