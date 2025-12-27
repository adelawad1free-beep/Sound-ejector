
import React, { useState, useRef, useEffect } from 'react';
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
import AudioVisualizer from './components/AudioVisualizer';
import { exportToPDF, exportToWord } from './services/exportService';

const App: React.FC = () => {
  const [text, setText] = useState<string>(() => {
    try {
      return localStorage.getItem('transcription_local') || '';
    } catch {
      return '';
    }
  });
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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const isStopCommanded = useRef(false);

  // Auto-scroll logic
  useEffect(() => {
    if (isAutoScroll && textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  }, [text, interimText, isAutoScroll]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setErrorMessage("عذراً، متصفحك لا يدعم خاصية التفريغ البرمجي. يرجى استخدام متصفح Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ar-SA';

    recognition.onresult = (event: any) => {
      let currentInterim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          setText(prev => (prev.trim() + ' ' + transcript.trim()).trim() + ' ');
          setInterimText(''); 
        } else {
          currentInterim += transcript;
        }
      }
      setInterimText(currentInterim);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') return;
      if (event.error === 'not-allowed') {
        setErrorMessage("يجب السماح بالوصول للميكروفون من إعدادات المتصفح للبدء.");
        setIsTranscribing(false);
      }
    };

    recognition.onend = () => {
      if (isTranscribing && !isStopCommanded.current) {
        try {
          recognition.start();
        } catch (e) {
          setTimeout(() => {
            if (isTranscribing && !isStopCommanded.current) recognition.start();
          }, 500);
        }
      }
    };

    recognitionRef.current = recognition;
  }, [isTranscribing]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        localStorage.setItem('transcription_local', text);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } catch (e) {
        console.error("Storage error:", e);
      }
    }, 1000);
    setSaveStatus('saving');
    return () => clearTimeout(timer);
  }, [text]);

  const toggleTranscription = () => {
    if (!recognitionRef.current) return;

    if (isTranscribing) {
      isStopCommanded.current = true;
      recognitionRef.current.stop();
      setIsTranscribing(false);
      setInterimText('');
    } else {
      setErrorMessage(null);
      isStopCommanded.current = false;
      try {
        recognitionRef.current.start();
        setIsTranscribing(true);
        if (audioRef.current && !isPlaying) {
          audioRef.current.play().catch(console.error);
          setIsPlaying(true);
        }
      } catch (e) {
        console.error("Start recognition failed:", e);
      }
    }
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
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans selection:bg-blue-100">
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-bg rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Mic size={22} className={isTranscribing ? 'animate-pulse' : ''} />
          </div>
          <div>
            <span className="text-xl font-black text-slate-800 tracking-tight">مُدوِّن <span className="text-blue-600">PRO</span></span>
            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
              <ShieldCheck size={10} className="text-blue-500" /> نظام التفريغ المتسلسل
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex gap-1 bg-slate-100 p-1 rounded-xl">
             <button onClick={() => exportToWord(text, audioFile?.name || 'تفريغ')} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white rounded-lg transition-all flex items-center gap-2">
               <FileText size={14} className="text-blue-600" /> وورد
             </button>
             <button onClick={() => exportToPDF(text, audioFile?.name || 'تفريغ')} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-white rounded-lg transition-all flex items-center gap-2">
               <Download size={14} className="text-red-600" /> PDF
             </button>
          </div>
          <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
          <div className="text-[10px] font-bold text-slate-400 min-w-[60px]">
            {saveStatus === 'saving' ? 'جاري الحفظ...' : 'تم الحفظ'}
          </div>
        </div>
      </nav>

      {errorMessage && (
        <div className="bg-red-50 border-b border-red-100 p-3 text-center flex items-center justify-center gap-2 text-red-600 text-sm font-bold animate-in slide-in-from-top">
          <AlertCircle size={18} />
          {errorMessage}
        </div>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 p-4 md:p-8">
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-200">
            <h2 className="text-[10px] font-black text-slate-400 mb-4 uppercase tracking-[0.2em] flex items-center gap-2">
               <Upload size={12} /> مصدر الصوت
            </h2>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="audio/*" className="hidden" />
            {!audioFile ? (
              <button onClick={() => fileInputRef.current?.click()} className="w-full h-36 border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center gap-3 hover:border-blue-400 hover:bg-blue-50/50 transition-all group">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-blue-500 group-hover:scale-110 transition-all">
                  <Upload size={24} />
                </div>
                <p className="text-xs font-bold text-slate-500">اختر ملفاً صوتياً للبدء</p>
              </button>
            ) : (
              <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md"><Volume2 size={20} /></div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-slate-700 truncate">{audioFile.name}</p>
                    <p className="text-[9px] font-bold text-blue-500">{(audioFile.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                </div>
                <button onClick={() => {setAudioFile(null); setAudioUrl('');}} className="w-8 h-8 flex items-center justify-center rounded-full text-slate-300 hover:bg-red-50 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
              </div>
            )}
          </section>

          {audioUrl && (
            <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-8 relative overflow-hidden">
               <AudioVisualizer audioElement={audioRef.current} />
               
               <div className="space-y-6">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-500 tabular-nums">
                    <span className="bg-slate-100 px-2 py-1 rounded-lg">{formatTime(currentTime)}</span>
                    <span className="bg-slate-100 px-2 py-1 rounded-lg">{formatTime(duration)}</span>
                  </div>
                  
                  <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden group">
                    <div 
                      className={`absolute top-0 right-0 h-full transition-all duration-300 ${isTranscribing ? 'bg-blue-600' : 'bg-slate-400'}`}
                      style={{ width: `${progressPercentage}%` }}
                    >
                      {isTranscribing && <div className="absolute left-0 top-0 h-full w-20 bg-gradient-to-r from-transparent to-white/30 animate-shimmer"></div>}
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max={duration || 0} 
                      value={currentTime} 
                      onChange={(e) => audioRef.current && (audioRef.current.currentTime = parseFloat(e.target.value))} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                    />
                  </div>

                  <div className="flex items-center justify-center gap-10">
                    <button onClick={() => audioRef.current && (audioRef.current.currentTime -= 10)} className="text-slate-300 hover:text-blue-600 transition-all active:scale-90"><Rewind size={28} /></button>
                    <button 
                      onClick={() => {
                        if (audioRef.current) {
                          if (isPlaying) {
                            audioRef.current.pause();
                          } else {
                            audioRef.current.play().catch(console.error);
                          }
                          setIsPlaying(!isPlaying);
                        }
                      }} 
                      className="w-20 h-20 gradient-bg rounded-full flex items-center justify-center text-white shadow-2xl shadow-blue-200 hover:scale-105 active:scale-95 transition-all"
                    >
                      {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="mr-1" />}
                    </button>
                    <button onClick={() => audioRef.current && (audioRef.current.currentTime += 10)} className="text-slate-300 hover:text-blue-600 transition-all active:scale-90"><FastForward size={28} /></button>
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={toggleTranscription} 
                      className={`w-full flex flex-col items-center justify-center gap-1 py-4 px-6 rounded-3xl text-sm font-bold transition-all shadow-xl ${
                        isTranscribing 
                        ? 'bg-red-500 text-white recording-pulse' 
                        : 'bg-slate-900 text-white hover:bg-black'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isTranscribing ? <MicOff size={20} /> : <Mic size={20} />}
                        <span>{isTranscribing ? 'إيقاف التفريغ' : 'بدء التفريغ البرمجي'}</span>
                      </div>
                    </button>
                  </div>
               </div>
               
               <audio 
                ref={audioRef} 
                src={audioUrl} 
                onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)} 
                onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)} 
                onEnded={() => setIsPlaying(false)} 
                className="hidden" 
               />
            </section>
          )}

          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200">
             <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600"><CheckCircle2 size={16}/></div>
                <h3 className="text-xs font-black text-slate-700">التفريغ المتتالي</h3>
             </div>
             <p className="text-[11px] text-slate-500 font-medium">سيظهر النص في الجهة المقابلة بشكل آلي مع تقدم الصوت. يمكنك تعديل النص يدوياً في أي وقت.</p>
          </div>
        </div>

        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="bg-white flex-1 rounded-[3rem] border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[600px] relative">
            <div className="bg-slate-50/50 border-b border-slate-200 px-10 py-5 flex items-center justify-between">
               <div className="flex items-center gap-4">
                 <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${isTranscribing ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`}></div>
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">المحرر الذكي</h3>
                 </div>
                 {isTranscribing && (
                   <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                     <Loader2 size={12} className="animate-spin" />
                     <span>جاري الكتابة بالتوالي...</span>
                   </div>
                 )}
               </div>
               
               <div className="flex items-center gap-2">
                 <button 
                  onClick={() => setIsAutoScroll(!isAutoScroll)} 
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${isAutoScroll ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                 >
                   التمرير التلقائي {isAutoScroll ? 'مفعل' : 'معطل'}
                 </button>
                 <button onClick={() => { if(window.confirm('مسح النص؟')) setText(''); }} className="p-2 text-slate-300 hover:text-red-500"><Trash2 size={18} /></button>
               </div>
            </div>
            
            <div className="flex-1 flex flex-col relative">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="ابدأ تشغيل الملف الصوتي ليظهر النص هنا..."
                className="flex-1 w-full p-12 text-xl md:text-2xl leading-[2] text-slate-800 focus:outline-none resize-none bg-transparent custom-scrollbar"
                dir="rtl"
              />
              
              {interimText && (
                <div className="absolute bottom-10 left-12 right-12 p-6 bg-slate-900/95 text-white rounded-[2rem] text-xl shadow-2xl backdrop-blur-xl border border-white/10">
                  <span className="leading-relaxed font-medium">{interimText}</span>
                </div>
              )}

              {!isAutoScroll && text.length > 500 && (
                <button 
                  onClick={() => setIsAutoScroll(true)}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-xs font-bold transition-all"
                >
                  <ChevronDown size={14} /> النزول للأسفل
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
