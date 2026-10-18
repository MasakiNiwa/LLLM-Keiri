import { Square, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { isSpeechSupported, useSpeech } from './speechStore';

/** 文章の読み上げを始める・止めるボタン */
export function SpeakToggle({
  id,
  text,
  label = '読み上げ',
}: {
  id: string;
  text: string;
  label?: string;
}) {
  const speaking = useSpeech((s) => s.speakingId === id);
  if (!isSpeechSupported()) return null;
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={() =>
        speaking ? useSpeech.getState().stop() : useSpeech.getState().speak(id, text)
      }
      aria-label={speaking ? '読み上げを止める' : `${label}を始める`}
    >
      {speaking ? <Square /> : <Volume2 />}
      {speaking ? '止める' : label}
    </Button>
  );
}
