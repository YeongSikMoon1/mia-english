import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LEVELS } from '../lib/config';
import { speak } from '../lib/speech';
import type { SessionResult } from '../lib/api';

export function ResultScreen({ result: r, onHome, onRetry }: { result: SessionResult; onHome: () => void; onRetry: () => void }) {
  const title = r.declinedPolitely ? '정중하게 거절했어요!' : r.success ? '점심 약속이 만들어졌어요!' : '아직 약속을 완성하지 못했어요';
  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Text style={s.hd}>연습 결과</Text>
        <View style={s.card}>
          <Text style={s.t}>{title}</Text>
          {r.agreed && <Text style={s.v}>🍽 {r.agreed.day} {r.agreed.time} · {r.agreed.place}</Text>}
          <Text style={s.meta}>🎚 난이도 {LEVELS[r.level]}{r.miaRefusals ? ` · 🙅 Mia의 거절 ${r.miaRefusals}번` : ''}</Text>
        </View>
        <Section title="🎯 미션 달성">{r.missions.map((m) => <Text key={m.key} style={[s.li, !m.done && { color: '#6a71a8' }]}>{m.done ? '✓ 해냈어요  ' : '– 아직이에요  '}{m.label.slice(2)}</Text>)}</Section>
        {r.events.length > 0 && <Section title="⚡ 돌발상황">{r.events.map((e, i) => <Text key={i} style={s.li}>✓ 대응했어요  {e.title} · {e.turn}번째 턴</Text>)}</Section>}
        <Section title="📝 내가 말한 문장">{r.myLines.map((l, i) => <Text key={i} style={s.li}>{i + 1}. {l}</Text>)}</Section>
        <Section title="⭐ 오늘 배운 표현">{r.expressions.slice(0, 8).map((e, i) => <Text key={i} style={s.li}><Text style={{ color: '#168a53', fontWeight: '800' }}>{e[0]}</Text>  {e[1]}</Text>)}</Section>
        <Section title="📄 전체 스크립트">{r.log.map((l, i) => l.w === 'mia'
          ? <Pressable key={i} onPress={() => speak(l.en, 1, {})}><Text style={s.li}><Text style={{ color: '#1c3fc4', fontWeight: '800' }}>Mia  </Text>{l.en} 🔊{l.ko ? `\n` : ''}<Text style={{ color: '#6a71a8', fontSize: 12 }}>{l.ko}</Text></Text></Pressable>
          : <Text key={i} style={s.li}><Text style={{ color: '#21b068', fontWeight: '800' }}>나  </Text>{l.en}</Text>)}</Section>
        <View style={s.cta}>
          <Pressable style={s.btn} onPress={onHome}><Text style={s.btnTx}>처음으로</Text></Pressable>
          <Pressable style={[s.btn, { backgroundColor: '#2a63e8' }]} onPress={onRetry}><Text style={[s.btnTx, { color: '#fff' }]}>다시 연습하기</Text></Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => <View style={s.card2}><Text style={s.h4}>{title}</Text>{children}</View>;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#eef3ff' }, hd: { textAlign: 'center', fontSize: 20, fontWeight: '800', color: '#141a4a' },
  card: { backgroundColor: '#fff', borderRadius: 22, padding: 18, alignItems: 'center', gap: 4 }, t: { fontSize: 13, color: '#6a71a8' }, v: { fontSize: 20, fontWeight: '900', color: '#1c3fc4' }, meta: { fontSize: 12.5, color: '#1c3fc4', fontWeight: '700' },
  card2: { backgroundColor: '#fff', borderRadius: 18, padding: 14, gap: 4 }, h4: { fontSize: 15, fontWeight: '800', color: '#141a4a', marginBottom: 4 }, li: { fontSize: 14, lineHeight: 22, color: '#141a4a' },
  cta: { flexDirection: 'row', gap: 10 }, btn: { flex: 1, height: 50, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#e0e6fb', alignItems: 'center', justifyContent: 'center' }, btnTx: { fontWeight: '800', fontSize: 15, color: '#141a4a' },
});
