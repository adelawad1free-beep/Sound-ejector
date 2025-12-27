
import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioElement }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!audioElement || !canvasRef.current) return;

    const setupAudio = () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        const ctx = audioContextRef.current;
        
        // لمنع خطأ: "MediaElementAudioSourceNode already connected"
        if (!sourceRef.current) {
          sourceRef.current = ctx.createMediaElementSource(audioElement);
          analyzerRef.current = ctx.createAnalyser();
          sourceRef.current.connect(analyzerRef.current);
          analyzerRef.current.connect(ctx.destination);
        }

        const analyzer = analyzerRef.current!;
        analyzer.fftSize = 256;
        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const canvas = canvasRef.current!;
        const canvasCtx = canvas.getContext('2d');
        if (!canvasCtx) return;

        const draw = () => {
          animationFrameRef.current = requestAnimationFrame(draw);
          analyzer.getByteFrequencyData(dataArray);
          
          canvasCtx.fillStyle = '#f8fafc';
          canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
          
          const barWidth = (canvas.width / bufferLength) * 2.5;
          let barHeight;
          let x = 0;
          
          for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] / 2;
            canvasCtx.fillStyle = '#3b82f6';
            canvasCtx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
          }
        };

        draw();
      } catch (err) {
        console.error("Audio Visualizer Error:", err);
      }
    };

    // ننتظر تشغيل الصوت لتفعيل الـ AudioContext (سياسة المتصفح)
    audioElement.addEventListener('play', () => {
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
      setupAudio();
    });

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioElement]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-16 rounded-xl bg-slate-50 border border-slate-100 shadow-inner"
      width={600}
      height={64}
    />
  );
};

export default AudioVisualizer;
