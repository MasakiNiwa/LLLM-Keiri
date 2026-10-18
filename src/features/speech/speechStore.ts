import { create } from 'zustand';
import { speechText } from '@/lib/speech/text';
import { useSettings } from '@/features/settings/settingsStore';

/** ブラウザの読み上げ（Web Speech API）が使えるか */
export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function japaneseVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === 'ja-JP') ?? voices.find((v) => v.lang.startsWith('ja'));
}

/** 読み上げの状態（どの文章を読んでいるか）。読み上げは端末の音声合成で行い、外部に送らない */
export const useSpeech = create<{
  /** 読み上げ中の文章の id */
  speakingId: string | null;
  speak: (id: string, markdown: string) => void;
  stop: () => void;
}>()((set) => ({
  speakingId: null,
  speak: (id, markdown) => {
    if (!isSpeechSupported()) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const text = speechText(markdown);
    if (!text) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'ja-JP';
    const voice = japaneseVoice();
    if (voice) u.voice = voice;
    u.rate = useSettings.getState().speechRate;
    const done = () => set((s) => (s.speakingId === id ? { speakingId: null } : s));
    u.onend = done;
    u.onerror = done;
    set({ speakingId: id });
    synth.speak(u);
  },
  stop: () => {
    if (isSpeechSupported()) window.speechSynthesis.cancel();
    set({ speakingId: null });
  },
}));
