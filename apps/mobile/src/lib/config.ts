import Constants from 'expo-constants';
import { Platform } from 'react-native';
/** 개발 중에는 PC의 LAN 주소(예: http://192.168.0.10:3000)로 바꿔 주세요. Android 에뮬레이터는 10.0.2.2 */
const configuredUrl: string = (Constants.expoConfig?.extra as any)?.apiUrl ?? 'http://localhost:3000';
export const API_URL = Platform.OS === 'web' ? 'http://localhost:3000' : configuredUrl;
export const LEVELS = ['쉬움', '보통', '어려움'] as const;
export const SPEECH_RATE = [0.8, 0.95, 1.1];
