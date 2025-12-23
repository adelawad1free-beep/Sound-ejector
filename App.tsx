
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  Download, 
  FileText, 
  FileCode, 
  File as FileIcon, 
  Clock, 
  FastForward, 
  Rewind, 
  Volume2, 
  Upload,
  Keyboard,
  Mic,
  MicOff,
  Trash2,
  Save,
  CheckCircle2,
  Info
} from 'lucide-react';
import AudioVisualizer from './components/AudioVisualizer';
import { exportToText, exportToPDF, exportToWord } from './services/exportService';

// Speech Recognition Type Definition
interface SpeechRecognitionEvent extends Event {
  results: {
    [key: number]: {
      [key: number]: {
        transcript: string;
      };
      isFinal: boolean;
    };
  };
}

const App: React.FC = () => {
  const [text, setText] = useState<string>(() => localStorage.getItem('transcription_draft') || '');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isDictating, setIsDictating] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const isIntentionalStop = useRef(false);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ar-SA';

      recognitionRef.current.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const transcript = event.results[i][0].transcript;
            setText(prev => prev.trim() + ' ' + transcript.trim() + ' ');
          }
        }
      };

      recognitionRef.current.onerror = (event: any) => {
        // البرمجة هنا تعالج خطأ no-speech لضمان عدم توقف البرنامج
        if (event.error === 'no-speech') {
          console.log('لم يتم اكتشاف صوت، جاري الاستمرار في وضع الاستماع...');
          return; // تجاهل الخطأ وعدم تغيير الحالة
        }
        
        if (event.error === 'not-allowed') {
          alert('يرجى السماح بالوصول للميكروفون من إعدادات المتصفح.');
          setIsDictating(false);
        }
        
        console.error('Speech recognition error:', event.error);
      };

      recognitionRef.current.onend = () => {
        // إذا لم يكن الإيقاف يدوياً، أعد التشغيل برمجياً
        if (isDictating && !isIntentionalStop.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.log('إعادة تشغيل المحرك...');
          }
        }
      };
    }
  }, [isDictating]);

  // Auto-save logic
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('transcription_draft', text);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1000);
    setSaveStatus('saving');
    return () => clearTimeout(timer);
  }, [text]);

  const toggleDictation = () => {
    if (!recognitionRef.current) {
      alert("عذراً، متصفحك لا يدعم ميزة الإملاء البرمجي. يفضل استخدام متصفح كروم.");
      return;
    }

    if (isDictating) {
      isIntentionalStop.current = true;
      recognitionRef.current.stop();
      setIsDictating(false);
    } else {
      isIntentionalStop.current = false;
      recognitionRef.current.start();
      setIsDictating(true);
      // إضافة طابع زمني تلقائي عند بدء الإملاء
      insertTimestamp();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setIsPlaying(false);
      setCurrentTime(0);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 1.5);
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime += seconds;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const insertTimestamp = () => {
    const timestamp = `\n[${formatTime(currentTime)}] `;
    setText(prev => prev + timestamp);
  };

  const clearText = () => {
    if (window.confirm("هل أنت متأكد من مسح كل النص المكتوب؟")) {
      setText('');
      localStorage.removeItem('transcription_draft');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 px-4 md:px-8 py-4 flex flex-wrap items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 leading-tight">مدون</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">التفريغ البرمجي المستقر</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {saveStatus === 'saving' && <span className="text-xs text-slate-400 animate-pulse font-bold">جاري المزامنة...</span>}
          {saveStatus === 'saved' && <span className="text-xs text-green-600 flex items-center gap-1 font-bold"><CheckCircle2 size={12} /> تم الحفظ محلياً</span>}
          
          <div className="h-8 w-[1px] bg-slate-200 mx-2 hidden md:block"></div>
          
          <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
             <button 
              onClick={() => exportToText(text, audioFile?.name || 'تفريغ_مدون')}
              className="px-3 py-1.5 text-xs font-bold hover:bg-white rounded-lg transition-all flex items-center gap-1.5 text-slate-600"
             >
              <FileIcon size={14} /> نص
             </button>
             <button 
              onClick={() => exportToWord(text, audioFile?.name || 'تفريغ_مدون')}
              className="px-3 py-1.5 text-xs font-bold hover:bg-white rounded-lg transition-all flex items-center gap-1.5 text-blue-600"
             >
              <FileCode size={14} /> وورد
             </button>
             <button 
              onClick={() => exportToPDF(text, audioFile?.name || 'تفريغ_مدون')}
              className="px-3 py-1.5 text-xs font-bold hover:bg-white rounded-lg transition-all flex items-center gap-1.5 text-red-600"
             >
              <Download size={14} /> PDF
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar / Tools */}
        <aside className="lg:col-span-4 space-y-6">
          {/* File Upload Area */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Upload size={20} className="text-indigo-600" />
                تحميل الصوت
              </h2>
              {audioFile && (
                <button onClick={() => setAudioFile(null)} className="text-slate-400 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="audio/*"
              className="hidden" 
            />
            
            {!audioFile ? (
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:border-indigo-400 hover:bg-indigo-50 transition-all group"
              >
                <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-500 transition-colors">
                  <Upload size={28} />
                </div>
                <span className="text-sm font-bold text-slate-600">اختر ملفاً صوتياً</span>
                <p className="text-[11px] text-slate-400 text-center">يعمل محلياً بالكامل لضمان خصوصيتك</p>
              </button>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0">
                  <Volume2 size={20} />
                </div>
                <div className="overflow-hidden text-right">
                  <p className="text-sm font-bold text-indigo-900 truncate">{audioFile.name}</p>
                  <p className="text-[10px] text-indigo-400 font-bold uppercase">{Math.round(audioFile.size / 1024 / 1024 * 100) / 100} MB</p>
                </div>
              </div>
            )}
          </div>

          {/* Player & Programmatic Controls */}
          {audioUrl && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm sticky top-24">
              <AudioVisualizer audioElement={audioRef.current} />

              <div className="mt-6 space-y-6">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[11px] font-black text-slate-400 tabular-nums">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={(e) => {
                      const time = parseFloat(e.target.value);
                      if (audioRef.current) audioRef.current.currentTime = time;
                    }}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                {/* Main Controls */}
                <div className="flex items-center justify-center gap-6">
                  <button onClick={() => skip(-5)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all">
                    <Rewind size={26} />
                  </button>
                  <button 
                    onClick={togglePlay}
                    className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 transition-all"
                  >
                    {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="mr-1" />}
                  </button>
                  <button onClick={() => skip(5)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all">
                    <FastForward size={26} />
                  </button>
                </div>

                {/* Speed Controls */}
                <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-xl">
                  {[0.75, 1, 1.25, 1.5, 2].map((rate) => (
                    <button
                      key={rate}
                      onClick={() => {
                        setPlaybackRate(rate);
                        if (audioRef.current) audioRef.current.playbackRate = rate;
                      }}
                      className={`py-1.5 text-[10px] font-black rounded-lg transition-all ${
                        playbackRate === rate ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {rate}x
                    </button>
                  ))}
                </div>

                {/* Programmatic Shortcuts */}
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={insertTimestamp}
                    className="flex items-center justify-center gap-2 py-3 bg-slate-800 text-white rounded-2xl text-xs font-bold hover:bg-slate-900 transition-all shadow-sm"
                  >
                    <Clock size={16} />
                    طابع زمني
                  </button>
                  <button 
                    onClick={toggleDictation}
                    className={`relative flex items-center justify-center gap-2 py-3 rounded-2xl text-xs font-bold transition-all ${
                      isDictating ? 'bg-red-500 text-white mic-active shadow-lg shadow-red-200' : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-indigo-600 hover:text-indigo-600'
                    }`}
                  >
                    {isDictating ? <MicOff size={16} /> : <Mic size={16} />}
                    {isDictating ? 'إيقاف الإملاء' : 'إملاء تلقائي'}
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
            </div>
          )}

          {/* Instructions Card */}
          <div className="bg-indigo-600 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-widest">
                <Keyboard size={18} />
                نظام التفريغ الذكي
              </h3>
              <ul className="text-xs space-y-3 font-medium opacity-90">
                <li className="flex gap-2"><span>•</span> ميزة <b>الإملاء التلقائي</b> الآن أكثر استقراراً وتتجاوز فترات الصمت.</li>
                <li className="flex gap-2"><span>•</span> عند الضغط على <b>إيقاف</b>، سيعود الصوت تلقائياً 1.5 ثانية للخلف.</li>
                <li className="flex gap-2"><span>•</span> يتم حفظ عملك في <b>ذاكرة المتصفح</b> تلقائياً كل ثانية.</li>
              </ul>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-12 translate-x-12"></div>
          </div>
        </aside>

        {/* Editor Area */}
        <section className="lg:col-span-8 flex flex-col h-[calc(100vh-12rem)] min-h-[600px]">
          <div className="bg-white flex flex-col h-full rounded-3xl border border-slate-200 shadow-sm overflow-hidden focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
            <div className="bg-slate-50/50 border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isDictating ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                <span className="text-xs font-black text-slate-500 uppercase tracking-tighter">
                  {isDictating ? 'جاري الاستماع...' : 'محرر النصوص النشط'}
                </span>
              </div>
              <div className="flex gap-4">
                 <div className="text-xs text-slate-400 font-bold bg-white px-3 py-1 rounded-full border border-slate-100">
                  {text.split(/\s+/).filter(Boolean).length} كلمة
                 </div>
                 <button onClick={clearText} className="text-slate-400 hover:text-red-500 transition-colors" title="مسح النص">
                    <Trash2 size={16} />
                 </button>
              </div>
            </div>
            
            <textarea
              className="flex-1 p-8 text-xl leading-[1.8] text-slate-700 focus:outline-none resize-none bg-transparent placeholder:text-slate-200 placeholder:font-light custom-scrollbar"
              placeholder="ابدأ الكتابة هنا... اضغط 'إملاء تلقائي' لتحويل صوتك إلى نص فوراً وبثبات عالي."
              value={text}
              onChange={(e) => setText(e.target.value)}
              dir="rtl"
            />
          </div>
          
          <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-400 bg-slate-100/50 p-3 rounded-xl border border-slate-200/50">
            <Info size={14} className="text-indigo-400 shrink-0" />
            <p>برمجة "مدون" تضمن استمرارية الإملاء حتى في فترات الصمت الطويلة. يتم معالجة كل شيء داخل جهازك.</p>
          </div>
        </section>
      </main>

      {/* SEO Footer */}
      <footer className="max-w-7xl mx-auto px-4 md:px-8 mt-12 grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-slate-200 pt-12 text-slate-500 pb-8">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-800">
             <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center text-white"><FileText size={18}/></div>
             <span className="font-black text-lg">مدون</span>
          </div>
          <p className="text-sm leading-relaxed text-right">أداة احترافية تهدف لتبسيط عملية التفريغ الصوتي العربي برمجياً، تجمع بين الدقة اليدوية وسرعة التعرف الآلي المدمج في المتصفح.</p>
        </div>
        <div className="space-y-4">
          <h4 className="font-black text-slate-800 uppercase tracking-widest text-sm text-right">أدوات المترجم</h4>
          <ul className="text-sm space-y-2 font-medium text-right">
            <li className="hover:text-indigo-600 cursor-default">• تفريغ صوتي آلي مستقر وبدون انقطاع.</li>
            <li className="hover:text-indigo-600 cursor-default">• إدراج الطوابع الزمنية لتنظيم العمل.</li>
            <li className="hover:text-indigo-600 cursor-default">• تصدير بصيغ Word و PDF متوافقة مع العربية.</li>
          </ul>
        </div>
        <div className="space-y-4">
          <h4 className="font-black text-slate-800 uppercase tracking-widest text-sm text-right">الخصوصية الرقمية</h4>
          <p className="text-sm leading-relaxed text-right">لا يتم تخزين أي بيانات على خوادمنا. يعتمد البرنامج على ذاكرة المتصفح المحلية وتقنيات الويب الحديثة لضمان أمان محتواك الصوتي.</p>
          <div className="flex gap-2 justify-end">
            <span className="px-2 py-1 bg-slate-200 text-[10px] rounded font-bold">Secure</span>
            <span className="px-2 py-1 bg-slate-200 text-[10px] rounded font-bold">Local Storage</span>
            <span className="px-2 py-1 bg-slate-200 text-[10px] rounded font-bold">Client-Side</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
