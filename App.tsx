
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Download, 
  FileText, 
  Clock, 
  FastForward, 
  Rewind, 
  Volume2, 
  Upload,
  Mic,
  MicOff,
  Trash2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown
} from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";
import AudioVisualizer from './components/AudioVisualizer.tsx';
import { exportToPDF, exportToWord } from './services/exportService.ts';

const App: React.FC = () => {
  const [text, setText] = useState<string>(() => localStorage.getItem('transcription_local') || '');
  const [interimText, setInterimText] = useState<string>('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sessionRef = useRef<any>(null);
  
  // Audio Graph Persistent References
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  // Initialize or get audio context and nodes
  const initAudioGraph = useCallback(() => {
    if (!audioRef.current) return null;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    }

    const ctx = audioContextRef.current;

    if (!sourceNodeRef.current) {
      try {
        sourceNodeRef.current = ctx.createMediaElementSource(audioRef.current);
        analyserNodeRef.current = ctx.createAnalyser();
        
        // Connect nodes
        sourceNodeRef.current.connect(analyserNodeRef.current);
        analyserNodeRef.current.connect(ctx.destination);
        
        setAnalyser(analyserNodeRef.current);
      } catch (err) {
        console.error("Audio Graph Init Error:", err);
      }
    }

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    return { ctx, source: sourceNodeRef.current, analyser: analyserNodeRef.current };
  }, []);

  // Helper functions for base64 and audio encoding
  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const createBlob = (data: Float32Array) => {
    const int16 = new Int16Array(data.length);
    for (let i = 0; i < data.length; i++) {
      int16[i] = Math.max(-1, Math.min(1, data[i])) * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  useEffect(() => {
    if (isAutoScroll && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [text, interimText, isAutoScroll]);

  // Save to local storage
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('transcription_local', text);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000);
    setSaveStatus('saving');
    return () => clearTimeout(timer);
  }, [text]);

  const startGeminiTranscription = async () => {
    const graph = initAudioGraph();
    if (!graph || !graph.source) return;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const { ctx, source } = graph;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          systemInstruction: 'أنت خبير تفريغ نصوص عربية محترف. قم بتفريغ الصوت بدقة كما تسمعه. ركز فقط على التفريغ. لا تقم بالرد على المستخدم. استخدم التنسيق المناسب للنصوص الطويلة.',
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini Session Opened");
            // Setup transcription processing
            if (!scriptProcessorRef.current) {
              scriptProcessorRef.current = ctx.createScriptProcessor(4096, 1, 1);
              scriptProcessorRef.current.onaudioprocess = (e) => {
                if (isTranscribing) {
                  const inputData = e.inputBuffer.getChannelData(0);
                  const pcmBlob = createBlob(inputData);
                  sessionPromise.then(session => session.sendRealtimeInput({ media: pcmBlob }));
                }
              };
              source.connect(scriptProcessorRef.current);
              scriptProcessorRef.current.connect(ctx.destination);
            }
          },
          onmessage: (message) => {
            if (message.serverContent?.inputTranscription) {
              const newText = message.serverContent.inputTranscription.text;
              setInterimText(prev => prev + newText);
            }
            if (message.serverContent?.turnComplete) {
              setInterimText(current => {
                setText(prev => (prev.trim() + ' ' + current.trim()).trim() + ' ');
                return '';
              });
            }
          },
          onerror: (e) => {
            console.error("Gemini Error:", e);
            setErrorMessage("حدث خطأ في الاتصال بخادم التفريغ الذكي.");
            setIsTranscribing(false);
          },
          onclose: () => setIsTranscribing(false)
        }
      });

      sessionRef.current = await sessionPromise;
      setIsTranscribing(true);
      audioRef.current?.play();
      setIsPlaying(true);

    } catch (err) {
      console.error(err);
      setErrorMessage("فشل بدء نظام التفريغ الذكي. تأكد من اتصال الإنترنت.");
    }
  };

  const stopTranscription = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsTranscribing(false);
    setInterimText('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
      setIsPlaying(false);
      setCurrentTime(0);
      setErrorMessage(null);
      // Reset analyser node state if needed
      setAnalyser(null);
      sourceNodeRef.current = null; // Forces re-creation for the same audio element but new URL if needed, although context handles it.
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    initAudioGraph(); // Ensure graph is ready on play
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans">
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center text-white shadow-lg">
            <Mic size={22} className={isTranscribing ? 'animate-pulse' : ''} />
          </div>
          <div>
            <span className="text-xl font-black text-slate-800 tracking-tight">مُدوِّن <span className="text-blue-600">PRO</span></span>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
              <ShieldCheck size={10} className="text-blue-500" /> مدعوم بذكاء Gemini Live
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => exportToWord(text, audioFile?.name || 'تفريغ')} className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all">
            <FileText size={14} className="text-blue-600" /> وورد
          </button>
          <button onClick={() => exportToPDF(text, audioFile?.name || 'تفريغ')} className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all">
            <Download size={14} className="text-red-600" /> PDF
          </button>
          <div className="h-6 w-px bg-slate-200 mx-2"></div>
          <span className="text-[10px] font-bold text-slate-400">{saveStatus === 'saving' ? 'جاري الحفظ...' : 'تم الحفظ'}</span>
        </div>
      </nav>

      {errorMessage && (
        <div className="bg-red-50 border-b border-red-100 p-3 text-center flex items-center justify-center gap-2 text-red-600 text-sm font-bold">
          <AlertCircle size={18} /> {errorMessage}
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 md:p-8">
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
            <h2 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-widest flex items-center gap-2">
               <Upload size={12} /> تحميل الملف
            </h2>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="audio/*" className="hidden" />
            {!audioFile ? (
              <button onClick={() => fileInputRef.current?.click()} className="w-full h-40 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center gap-3 hover:border-blue-400 hover:bg-blue-50/50 transition-all group">
                <Upload size={24} className="text-slate-300 group-hover:text-blue-500" />
                <p className="text-xs font-bold text-slate-500">اختر ملف صوتي (MP3, WAV)</p>
              </button>
            ) : (
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0"><Volume2 size={20} /></div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-700 truncate">{audioFile.name}</p>
                    <p className="text-[9px] font-bold text-blue-500">{(audioFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                </div>
                <button onClick={() => {setAudioFile(null); setAudioUrl('');}} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={16} /></button>
              </div>
            )}
          </section>

          {audioUrl && (
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-8">
               <AudioVisualizer analyser={analyser} />
               
               <div className="space-y-6">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-500">
                    <span className="bg-slate-100 px-2 py-1 rounded-lg">{formatTime(currentTime)}</span>
                    <span className="bg-slate-100 px-2 py-1 rounded-lg">{formatTime(duration)}</span>
                  </div>
                  
                  <div className="relative h-2 bg-slate-100 rounded-full">
                    <div className="absolute top-0 right-0 h-full bg-blue-600 rounded-full transition-all" style={{ width: `${(currentTime/duration)*100}%` }}></div>
                  </div>

                  <div className="flex items-center justify-center gap-8">
                    <button onClick={() => audioRef.current && (audioRef.current.currentTime -= 10)} className="text-slate-300 hover:text-blue-600"><Rewind size={24} /></button>
                    <button 
                      onClick={togglePlay} 
                      className="w-16 h-16 gradient-bg rounded-full flex items-center justify-center text-white shadow-xl hover:scale-105 transition-all"
                    >
                      {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
                    </button>
                    <button onClick={() => audioRef.current && (audioRef.current.currentTime += 10)} className="text-slate-300 hover:text-blue-600"><FastForward size={24} /></button>
                  </div>

                  <button 
                    onClick={isTranscribing ? stopTranscription : startGeminiTranscription} 
                    className={`w-full flex flex-col items-center py-4 rounded-3xl text-sm font-bold transition-all ${isTranscribing ? 'bg-red-500 text-white recording-pulse' : 'bg-slate-900 text-white hover:bg-black'}`}
                  >
                    <div className="flex items-center gap-2">
                      {isTranscribing ? <MicOff size={18} /> : <Mic size={18} />}
                      <span>{isTranscribing ? 'إيقاف التفريغ الذكي' : 'بدء التفريغ بذكاء Gemini'}</span>
                    </div>
                  </button>
               </div>
               
               <audio 
                ref={audioRef} 
                src={audioUrl} 
                onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)} 
                onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)} 
                onEnded={() => setIsPlaying(false)} 
                onPlay={() => initAudioGraph()} // Ensure graph is connected on native play too
                className="hidden" 
               />
            </section>
          )}
        </div>

        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-white flex-1 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[600px] relative">
            <div className="bg-slate-50/50 border-b border-slate-200 px-10 py-5 flex items-center justify-between">
               <div className="flex items-center gap-4">
                 <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">المحرر الذكي</h3>
                 {isTranscribing && (
                   <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                     <Loader2 size={12} className="animate-spin" />
                     <span>جاري التحليل والكتابة...</span>
                   </div>
                 )}
               </div>
               <button onClick={() => setIsAutoScroll(!isAutoScroll)} className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${isAutoScroll ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                 التمرير التلقائي {isAutoScroll ? 'مفعل' : 'معطل'}
               </button>
            </div>
            
            <div className="flex-1 flex flex-col relative">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="ابدأ تشغيل الملف ليقوم Gemini بكتابة النص هنا فوراً..."
                className="flex-1 w-full p-12 text-xl md:text-2xl leading-[2.2] text-slate-800 focus:outline-none resize-none bg-transparent custom-scrollbar"
                dir="rtl"
              />
              
              {interimText && (
                <div className="absolute bottom-10 left-12 right-12 p-6 bg-slate-900/95 text-white rounded-[2rem] text-xl shadow-2xl backdrop-blur-xl border border-white/10 animate-in slide-in-from-bottom-4">
                  <div className="flex gap-1 mb-2">
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  </div>
                  <span className="leading-relaxed font-medium">{interimText}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
