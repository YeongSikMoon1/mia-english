import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StartScreen } from './src/screens/StartScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { ResultScreen } from './src/screens/ResultScreen';
import type { Level, SessionResult } from './src/lib/api';

type Route = { name: 'start' } | { name: 'chat'; level: Level; events: boolean } | { name: 'result'; result: SessionResult; level: Level; events: boolean };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'start' });
  return (
    <SafeAreaProvider>
      <StatusBar style={route.name === 'result' ? 'dark' : 'light'} />
      {route.name === 'start' && <StartScreen onStart={(level, events) => setRoute({ name: 'chat', level, events })} />}
      {route.name === 'chat' && <ChatScreen level={route.level} events={route.events} onExit={() => setRoute({ name: 'start' })} onFinish={(result) => setRoute({ name: 'result', result, level: route.level, events: route.events })} />}
      {route.name === 'result' && <ResultScreen result={route.result} onHome={() => setRoute({ name: 'start' })} onRetry={() => setRoute({ name: 'chat', level: route.level, events: route.events })} />}
    </SafeAreaProvider>
  );
}
