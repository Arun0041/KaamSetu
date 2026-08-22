import React, { useState } from 'react';
import { Mic } from 'lucide-react';

/**
 * Voice note recorder using the Web Speech API.
 * Streams interim results and passes final transcripts to `onText`.
 */
export default function VoiceRecorder({ onText, textDraft }) {
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState('');

  const toggle = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onText('Microphone unavailable. Please type.');
      return;
    }
    if (recording) {
      window.recognition?.stop();
      setRecording(false);
      setInterim('');
      return;
    }

    const r = new SpeechRecognition();
    r.lang = 'en-IN';
    r.continuous = true;
    r.interimResults = true;

    r.onresult = (e) => {
      let finalT = '';
      let interimT = '';
      Array.from(e.results).forEach((res) => {
        if (res.isFinal) finalT += res[0].transcript + ' ';
        else interimT += res[0].transcript;
      });
      onText(finalT.trim());
      setInterim(interimT);
    };
    r.onend = () => { setRecording(false); setInterim(''); };
    r.onerror = () => { setRecording(false); setInterim(''); };

    r.start();
    window.recognition = r;
    setRecording(true);
  };

  return (
    <div className="voice-input-options fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span className="mini-label">VOICE NOTE INPUT</span>
        <button
          type="button"
          className={`secondary-button ${recording ? 'recording-active' : ''}`}
          onClick={toggle}
        >
          <Mic size={16} /> {recording ? 'Stop recording' : 'Record voice note'}
        </button>
      </div>
      {(textDraft || interim) && (
        <div className="data-box fade-in" style={{ margin: 0 }}>
          <strong>Transcript: </strong>
          {textDraft}{' '}
          <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>{interim}</span>
        </div>
      )}
    </div>
  );
}
