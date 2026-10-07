import React, { useState } from 'react';
import { ImageBackground, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LEVELS } from '../lib/config';
import type { Level } from '../lib/api';

const DESC = ['Mia가 천천히·쉬운 말로, 제안도 해줘요', '보통 속도, 자연스러운 표현', '빠른 속도, 숙어 표현, 힌트·제안 줄임'];

export function StartScreen({ onStart }: { onStart: (level: Level, events: boolean) => void }) {
  const [level, setLevel] = useState<Level>(1);
  const [events, setEvents] = useState(true);
  return (
    <ImageBackground source={require('../../assets/campus.jpg')} style={s.bg} resizeMode="cover">
      <View style={s.shade} />
      <SafeAreaView style={s.wrap}>
        <Text style={s.title}>Mia와 점심 약속 잡기</Text>
        <Text style={s.p}>수업이 막 끝난 캠퍼스에서 Mia와 영어로 대화해요. 시간과 장소를 정해 점심 약속이 만들어지면 끝나요. 대화 중 Mia가 거절하거나 돌발상황이 생길 수 있어요.</Text>
        <Text style={s.lab}>난이도</Text>
        <View style={s.seg}>{LEVELS.map((n, i) => (
          <Pressable key={n} style={[s.segBtn, level === i && s.on]} onPress={() => setLevel(i as Level)}><Text style={[s.segTx, level === i && s.onTx]}>{n}</Text></Pressable>))}
        </View>
        <Text style={s.desc}>{DESC[level]}</Text>
        <View style={s.row}><Text style={s.lab2}>⚡ 돌발상황</Text><Switch value={events} onValueChange={setEvents} /></View>
        <Pressable style={s.go} onPress={() => onStart(level, events)}><Text style={s.goTx}>시작하기</Text></Pressable>
      </SafeAreaView>
    </ImageBackground>
  );
}
const s = StyleSheet.create({
  bg: { flex: 1 }, shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,16,70,0.72)' }, wrap: { flex: 1, justifyContent: 'flex-end', padding: 20, gap: 8 },
  title: { color: '#fff', fontSize: 28, fontWeight: '800' }, p: { color: '#dfe6ff', fontSize: 14, lineHeight: 21, marginBottom: 8 },
  lab: { color: '#b8c4f5', fontSize: 12, fontWeight: '700' }, lab2: { color: '#fff', fontSize: 15, fontWeight: '700' },
  seg: { flexDirection: 'row', gap: 6 }, segBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,.14)', borderRadius: 14, paddingVertical: 11, alignItems: 'center' },
  segTx: { color: '#fff', fontWeight: '800' }, on: { backgroundColor: '#fff' }, onTx: { color: '#1c3fc4' }, desc: { color: '#dfe6ff', fontSize: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 8 },
  go: { backgroundColor: '#2a63e8', borderRadius: 18, height: 54, alignItems: 'center', justifyContent: 'center', marginTop: 6 }, goTx: { color: '#fff', fontSize: 17, fontWeight: '800' },
});
