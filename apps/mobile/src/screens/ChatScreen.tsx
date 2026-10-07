import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ImageBackground, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { AvatarHandle, AvatarView, Emotion } from '../components/AvatarView';
import { api, Level, Line, Mission } from '../lib/api';
import { Recorder, speak, stopSpeaking } from '../lib/speech';
import { LEVELS } from '../lib/config';

/** 대사 종류 → 감정 연기 + 제스처 (HTML 프로토타입과 동일한 매핑) */
function emoFor(tag: string, ev?: string): [Emotion, 'wave' | 'thumbs' | 'shrug' | 'clasp' | 'clap' | undefined] {
  if (ev) return ev === 'prof' ? ['sorry', 'clasp'] : ev === 'closed' ? ['worried', 'shrug'] : ev === 'rain' ? ['surprise', undefined] : ev === 'friend' ? ['delight', undefined] : ['panic', undefined];
  const M: Record<string, [Emotion, any]> = { open: ['joy', 'wave'], askLunch: ['delight', undefined], freeResp: ['delight', undefined], done: ['laugh', 'clap'], doneDecline: ['joy', 'thumbs'], miaNo: ['sorry', 'clasp'], decline: ['worried', 'shrug'], askWhy: ['worried', undefined], push: ['cheeky', undefined], unknown: ['confused', 'shrug'], badTime: ['confused', 'shrug'], askAlt: ['worried', undefined], nudge: ['shy', undefined], thanks: ['shy', undefined], confirm: ['proud', undefined], tomorrow: ['delight', undefined], wait: ['surprise', undefined] };
  return M[tag] ?? ['joy', undefined];
}

const EVENT_TITLE: Record<string, string> = { prof: '교수님 호출', closed: '식당 휴업', rain: '갑작스러운 비', friend: '친구 합류', wallet: '지갑을 두고 옴' };

type TranscriptLine = { w: 'mia' | 'me'; en: string; ko?: string };

function resetWebViewport() {
  if (Platform.OS !== 'web') return;
  (document.activeElement as HTMLElement | null)?.blur?.();
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
}

function hintsFor(line: Line | null, missions: Mission[], activeEvent: string | null): string[] {
  if (!line) return ['Hi, Mia!', 'How are you doing?'];
  const eventHints: Record<string, string[]> = {
    prof: ['Sure. How about 1:30 instead?', 'No problem. What time works for you?'],
    closed: ['No problem. Let\'s go to the cafeteria.', 'How about the pizza place instead?'],
    rain: ['Yes, I have an umbrella.', 'No, I don\'t. Can we share yours?'],
    friend: ['Of course! He can join us.', 'Sorry, could it be just the two of us today?'],
    wallet: ['Don\'t worry. Lunch is on me today.', 'We can wait while you go back and get it.'],
  };
  if (activeEvent && eventHints[activeEvent]) return eventHints[activeEvent];
  const byTag: Record<string, string[]> = {
    open: ['I don\'t have any plans yet.', 'Would you like to grab lunch with me?'],
    askLunch: ['Sure, I\'d love to!', 'Sorry, I have class. How about tomorrow?'],
    freeResp: ['Yes, let\'s have lunch together!', 'How about the cafeteria?'],
    miaNo: ['No problem. How about Friday instead?', 'What day works for you?'],
    askAlt: ['How about Friday?', 'Are you free tomorrow?'],
    askTime: ['How about 12:30?', 'Does noon work for you?'],
    askPlace: ['Let\'s meet at the cafeteria.', 'How about the pizza place?'],
    timeGiven: ['How about the cafeteria?', 'Let\'s go to the student center.'],
    placeGiven: ['How about 12:30?', 'Let\'s meet at noon.'],
    confirm: ['Yes, that sounds perfect!', 'Could we change the time?'],
    decline: ['Tomorrow works for me.', 'How about Friday instead?'],
    askWhy: ['I have a class at noon.', 'I\'m sorry, I already have plans.'],
    push: ['I\'d love to, but I really can\'t today.', 'Can we do it another day?'],
    event: ['Sure, we can change it.', 'No problem. What works for you?'],
    unknown: ['Could you say that again?', 'I\'d like to talk about lunch.'],
  };
  const tagged = byTag[line.tag];
  if (tagged) return tagged;
  const next = missions.find((mission) => !mission.done)?.key;
  if (next === 'time') return ['How about 12:30?', 'Does noon work for you?'];
  if (next === 'place') return ['Let\'s meet at the cafeteria.', 'How about the pizza place?'];
  return ['That sounds good!', 'What about you?'];
}

export function ChatScreen({ level, events, onExit, onFinish }: { level: Level; events: boolean; onExit: () => void; onFinish: (r: any) => void }) {
  const avatar = useRef<AvatarHandle>(null);
  const rec = useRef(new Recorder());
  const sid = useRef<string>('');
  const [caption, setCaption] = useState<Line | null>(null);
  const [showKo, setShowKo] = useState(level === 0);
  const [showCap, setShowCap] = useState(level < 2);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [status, setStatus] = useState('Mia를 불러오는 중…');
  const [busy, setBusy] = useState(true);
  const [recording, setRecording] = useState(false);
  const [text, setText] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [sheet, setSheet] = useState<'hint' | 'script' | null>(null);
  const [transcript, setTranscript] = useState<TranscriptLine[]>([]);
  const [activeEvent, setActiveEvent] = useState<string | null>(null);
  const lastLine = useRef<Line | null>(null);

  const miaSays = useCallback((line: Line, emo: Emotion, gesture?: 'wave' | 'thumbs' | 'shrug' | 'clasp' | 'clap') => {
    lastLine.current = line; setCaption(line); setStatus('Mia가 말하는 중…'); setBusy(true);
    avatar.current?.emote(emo, Math.max(2.6, line.en.length * 0.07 + 1.4)); if (gesture) avatar.current?.gesture(gesture, gesture === 'clap' ? 3.4 : 2.4);
    speak(line.en, level, {
      onStart: () => avatar.current?.speak(true),
      onDone: () => { avatar.current?.speak(false); setBusy(false); setStatus('내 차례예요. 마이크를 누르거나 입력해 보세요'); },
    });
  }, [level]);

  // 아바타가 준비되면 세션을 만들고 Mia가 먼저 인사한다.
  useEffect(() => {
    if (!ready) return;
    api.createSession(level, events).then((r) => { sid.current = r.id; setMissions(r.missions); setTranscript([{ w: 'mia', en: r.line.en, ko: r.line.ko }]); miaSays(r.line, 'joy', 'wave'); })
      .catch(() => setStatus('서버에 연결할 수 없어요. API 주소를 확인해 주세요.'));
    return () => { void stopSpeaking(); };
  }, [ready]);

  const send = useCallback(async (t: string) => {
    t = t.trim(); if (!t || busy || !sid.current) return;
    setBusy(true); setText(''); setStatus('…'); setActiveEvent(null); setTranscript((log) => [...log, { w: 'me', en: t }]); avatar.current?.nod(1); setTimeout(() => avatar.current?.emote('thinking', 1.3), 350);
    try {
      const r = await api.turn(sid.current, t);
      setMissions(r.missions);
      if (r.event) { setActiveEvent(r.event); setToast('⚡ 돌발상황! ' + (EVENT_TITLE[r.event] ?? '')); setTimeout(() => setToast(null), 3600); }
      const [emo, gesture] = emoFor(r.line.tag, r.event);
      if (r.done) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTranscript((log) => [...log, { w: 'mia', en: r.line.en, ko: r.line.ko }]);
      miaSays(r.line, emo, gesture);
      if (r.note) setTimeout(() => setStatus(r.note!), 50);
      if (r.done) setTimeout(async () => onFinish(await api.finish(sid.current)), 3200);
    } catch { setBusy(false); setStatus('전송에 실패했어요. 다시 시도해 주세요.'); }
  }, [busy, miaSays, onFinish]);

  const toggleMic = async () => {
    if (busy && !recording) return;
    if (!recording) {
      try { stopSpeaking(); await rec.current.start(); setRecording(true); avatar.current?.listen(true); setStatus('듣고 있어요… 다시 누르면 전송돼요'); }
      catch { setStatus('마이크 권한이 필요해요. 입력창을 써도 돼요.'); }
      return;
    }
    setRecording(false); avatar.current?.listen(false); setStatus('인식하는 중…');
    const uri = await rec.current.stop();
    if (!uri) return setStatus('녹음에 실패했어요.');
    try { send(await api.stt(uri)); }
    catch (e: any) { setStatus(e?.status === 501 ? '이 서버에는 음성 인식이 설정되지 않았어요. 입력창을 써 주세요.' : '잘 인식되지 않았어요. 다시 시도해 주세요.'); }
  };

  return (
    <ImageBackground source={require('../../assets/campus.jpg')} style={s.root} resizeMode="cover">
      <View style={s.stage}><AvatarView ref={avatar} onReady={() => setReady(true)} /></View>
      <SafeAreaView style={s.top} edges={['top']}>
        <Pressable style={s.round} onPress={() => { stopSpeaking(); onExit(); }}><Text style={s.rt}>‹</Text></Pressable>
        <View style={s.title}><Text style={s.titleTx}>🍽 점심 약속 잡기 · {LEVELS[level]}</Text></View>
        <Pressable style={[s.pill, showCap && s.pillOn]} onPress={() => setShowCap(!showCap)}><Text style={[s.pillTx, showCap && s.pillOnTx]}>자막</Text></Pressable>
        <Pressable style={[s.pill, showKo && s.pillOn]} onPress={() => setShowKo(!showKo)}><Text style={[s.pillTx, showKo && s.pillOnTx]}>뜻</Text></Pressable>
      </SafeAreaView>
      <View style={s.chips}>{missions.map((m) => <View key={m.key} style={[s.chip, m.done && s.chipOn]}><Text style={[s.chipTx, m.done && { color: '#fff' }]}>{m.label}</Text></View>)}</View>
      {toast && <View style={s.toast}><Text style={s.toastTx}>{toast}</Text></View>}
      {showCap && caption && <View style={s.cap}><Text style={s.capEn}>{caption.en}</Text>{showKo && <Text style={s.capKo}>{caption.ko}</Text>}</View>}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SafeAreaView edges={['bottom']} style={s.panel}>
          <Text style={s.status} numberOfLines={1}>{status}</Text>
          <View style={s.row}>
            <Pressable style={s.side} onPress={() => lastLine.current && miaSays(lastLine.current, 'joy')}><Text style={s.sideI}>↻</Text><Text style={s.sideT}>다시 듣기</Text></Pressable>
            <Pressable style={[s.mic, recording && s.micRec, busy && !recording && { opacity: 0.55 }]} onPress={toggleMic}><Text style={{ fontSize: 30 }}>{recording ? '■' : '🎤'}</Text></Pressable>
            <View style={s.sideActions}>
              <Pressable style={s.toolBtn} onPress={() => { resetWebViewport(); setSheet('hint'); }}><Text style={s.toolIcon}>💡</Text><Text style={s.toolTx}>힌트</Text></Pressable>
              <Pressable style={s.toolBtn} onPress={() => { resetWebViewport(); setSheet('script'); }}><Text style={s.toolIcon}>📄</Text><Text style={s.toolTx}>스크립트</Text></Pressable>
            </View>
          </View>
          <View style={s.typed}>
            <TextInput style={s.input} value={text} onChangeText={setText} placeholder="영어로 입력해도 돼요 (마이크 대신)" onSubmitEditing={() => send(text)} returnKeyType="send" />
            <Pressable style={s.sendBtn} onPress={() => send(text)}><Text style={{ color: '#fff', fontWeight: '800' }}>보내기</Text></Pressable>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
      <Modal visible={sheet !== null} transparent animationType="fade" onRequestClose={() => setSheet(null)}>
        <Pressable style={s.modalShade} onPress={() => { setSheet(null); resetWebViewport(); }}>
          <Pressable style={s.sheet} onPress={(event) => event.stopPropagation()}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{sheet === 'hint' ? '💡 이렇게 말해 보세요' : '📄 대화 스크립트'}</Text>
              <Pressable style={s.closeBtn} onPress={() => { setSheet(null); resetWebViewport(); }}><Text style={s.closeTx}>×</Text></Pressable>
            </View>
            {sheet === 'hint' ? (
              <View style={s.hintList}>{hintsFor(caption, missions, activeEvent).map((hint, index) => (
                <Pressable key={hint} style={s.hintCard} onPress={() => { setText(hint); setSheet(null); resetWebViewport(); }}>
                  <Text style={s.hintNum}>{index + 1}</Text><Text style={s.hintText}>{hint}</Text><Text style={s.useHint}>사용</Text>
                </Pressable>
              ))}</View>
            ) : (
              <ScrollView style={s.scriptList} contentContainerStyle={s.scriptContent}>
                {transcript.map((line, index) => <View key={`${line.w}-${index}`} style={[s.scriptLine, line.w === 'me' && s.myLine]}>
                  <Text style={[s.speaker, line.w === 'me' && s.myText]}>{line.w === 'mia' ? 'Mia' : '나'}</Text>
                  <Text style={[s.scriptEn, line.w === 'me' && s.myText]}>{line.en}</Text>
                  {line.ko && <Text style={s.scriptKo}>{line.ko}</Text>}
                </View>)}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#8fb8e8', justifyContent: 'flex-end' }, stage: { ...StyleSheet.absoluteFillObject, bottom: 250 },
  top: { position: 'absolute', top: 0, left: 12, right: 12, flexDirection: 'row', gap: 7, alignItems: 'center', paddingTop: 6 },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.95)', alignItems: 'center', justifyContent: 'center' }, rt: { fontSize: 24, fontWeight: '700' },
  title: { flex: 1, backgroundColor: 'rgba(255,255,255,.95)', borderRadius: 22, paddingVertical: 10, paddingHorizontal: 13 }, titleTx: { fontWeight: '700', fontSize: 13 },
  pill: { backgroundColor: 'rgba(255,255,255,.95)', borderRadius: 22, paddingVertical: 10, paddingHorizontal: 13 }, pillOn: { backgroundColor: '#2a63e8' },
  pillTx: { fontWeight: '700', fontSize: 13, color: '#141a4a' }, pillOnTx: { color: '#fff' },
  chips: { position: 'absolute', top: 108, left: 12, flexDirection: 'row', gap: 5 },
  chip: { backgroundColor: 'rgba(255,255,255,.92)', borderRadius: 14, paddingVertical: 5, paddingHorizontal: 10 }, chipOn: { backgroundColor: '#21b068' }, chipTx: { fontSize: 11.5, fontWeight: '800', color: '#6a71a8' },
  toast: { position: 'absolute', top: 146, alignSelf: 'center', backgroundColor: '#ffb800', borderRadius: 20, paddingVertical: 9, paddingHorizontal: 18 }, toastTx: { fontWeight: '900', fontSize: 14, color: '#3b2600' },
  cap: { marginHorizontal: 12, marginBottom: 10, backgroundColor: 'rgba(255,255,255,.96)', borderRadius: 18, borderBottomLeftRadius: 4, padding: 12, alignSelf: 'flex-start', maxWidth: '92%' },
  capEn: { fontSize: 15, fontWeight: '700', lineHeight: 21, color: '#141a4a' }, capKo: { fontSize: 12.5, color: '#6a71a8', marginTop: 3 },
  panel: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 12, minHeight: 250 },
  status: { textAlign: 'center', fontSize: 13, color: '#6a71a8', fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }, side: { width: 76, alignItems: 'center', gap: 3 },
  sideI: { fontSize: 20, color: '#1c3fc4' }, sideT: { fontSize: 12, fontWeight: '700', color: '#1c3fc4' },
  sideActions: { width: 88, gap: 5 }, toolBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#eef3ff', borderRadius: 10, paddingVertical: 6 },
  toolIcon: { fontSize: 13 }, toolTx: { fontSize: 11, fontWeight: '800', color: '#1c3fc4' },
  mic: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2a63e8', alignItems: 'center', justifyContent: 'center', borderWidth: 8, borderColor: '#e8f0ff' }, micRec: { backgroundColor: '#e0324f', borderColor: '#ffe3e8' },
  typed: { flexDirection: 'row', gap: 6, marginTop: 10, marginBottom: 6 }, input: { flex: 1, borderWidth: 1.5, borderColor: '#e0e6fb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  sendBtn: { backgroundColor: '#2a63e8', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  modalShade: { flex: 1, backgroundColor: 'rgba(10,16,45,.52)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 18, maxHeight: '72%' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }, sheetTitle: { color: '#141a4a', fontSize: 18, fontWeight: '900' },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eef1fb', alignItems: 'center', justifyContent: 'center' }, closeTx: { fontSize: 24, lineHeight: 25, color: '#555d8c' },
  hintList: { gap: 9, paddingBottom: 8 }, hintCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#dfe7ff', borderRadius: 14, padding: 13 },
  hintNum: { width: 26, height: 26, lineHeight: 26, textAlign: 'center', borderRadius: 13, overflow: 'hidden', backgroundColor: '#2a63e8', color: '#fff', fontWeight: '900' }, hintText: { flex: 1, color: '#141a4a', fontSize: 14, fontWeight: '700' }, useHint: { color: '#2a63e8', fontSize: 12, fontWeight: '900' },
  scriptList: { maxHeight: 430 }, scriptContent: { gap: 9, paddingBottom: 12 }, scriptLine: { alignSelf: 'flex-start', maxWidth: '90%', backgroundColor: '#eef3ff', borderRadius: 15, borderBottomLeftRadius: 4, padding: 11 }, myLine: { alignSelf: 'flex-end', backgroundColor: '#2a63e8', borderBottomLeftRadius: 15, borderBottomRightRadius: 4 },
  speaker: { fontSize: 10, fontWeight: '900', color: '#7990d4', marginBottom: 3 }, scriptEn: { color: '#141a4a', fontSize: 14, fontWeight: '700' }, scriptKo: { color: '#6a71a8', fontSize: 12, marginTop: 3 },
  myText: { color: '#fff' },
});
