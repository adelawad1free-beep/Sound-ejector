
import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioElement }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!audioElement || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaElementSource(audioElement);
    const analyzer = audioContext.createAnalyser();
    
    source.connect(analyzer);
    analyzer.connect(audioContext.destination);
    
    analyzer.fftSize = 256;
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!ctx || !canvas) return;
      requestAnimationFrame(draw);
      
      analyzer.getByteFrequencyData(dataArray);
      
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2;
        ctx.fillStyle = `rgb(59, 130, 246)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };

    draw();

    return () => {
      source.disconnect();
      analyzer.disconnect();
    };
  }, [audioElement]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-16 rounded-lg bg-slate-50 border border-slate-200"
      width={600}
      height={64}
    />
  );
};

export default AudioVisualizer;
