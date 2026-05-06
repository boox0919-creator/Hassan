import React, { useState, useEffect, useRef, Component, ErrorInfo, ReactNode, createContext, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Link } from 'react-router-dom';
import { 
  LayoutDashboard, FileText, Timer, Settings, AlertTriangle, 
  Book, Dumbbell, User, PlusCircle, Bell, CheckCircle2, Circle,
  Plus, X, Image as ImageIcon, Trash2, Search, Filter, RefreshCw, Settings2, Brain, Play, Pause, Quote
} from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import Dexie, { type Table } from 'dexie';
import { format, isAfter } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// --- Types & Constants ---
export type Category = 'Study' | 'Fitness' | 'Personal' | 'دراسة' | 'رياضة' | 'شخصي';
export interface Note { id?: number; title: string; content: string; category: Category; imageUrl?: string; createdAt: number; }
export interface Reminder { id?: number; title: string; time: number; completed: number; }
export interface Thought { id?: number; content: string; createdAt: number; }
export type TimerMode = 'Pomodoro' | 'ShortBreak' | 'Interval';

const translations = {
  en: {
    dash: "Dash", notes: "Notes", timer: "Timer", setup: "Setup",
    dashboard: "Dashboard", reminders: "Reminders", addNew: "Add New",
    quickActions: "Quick Actions", createNote: "Create Note",
    study: "Study", fitness: "Fitness", personal: "Personal",
    noTasks: "No active tasks.", mindfulness: "Mindfulness",
    dailyThought: "Daily Thought", save: "Save", placeholderThought: "What's on your mind?",
    placeholderHeadline: "Headline", placeholderDetail: "Details...",
    publish: "Publish", search: "Search notes...", all: "All",
    flowing: "Flowing", awaiting: "Ready", deepWork: "Deep Work", break: "Rest",
    focusio: "Focus.io", pomo: "Pomo", breakMode: "Break", work: "Work"
  },
  ar: {
    dash: "لوحة التحكم", notes: "الملاحظات", timer: "المؤقت", setup: "الإعدادات",
    dashboard: "لوحة القيادة", reminders: "التذكيرات", addNew: "إضافة جديد",
    quickActions: "إجراءات سريعة", createNote: "ملحوظة جديدة",
    study: "دراسة", fitness: "رياضة", personal: "شخصي",
    noTasks: "لا توجد مهام حالياً", mindfulness: "تأمل وفكر",
    dailyThought: "خاطرة اليوم", save: "حفظ", placeholderThought: "ماذا يدور في ذهنك؟",
    placeholderHeadline: "العنوان", placeholderDetail: "التفاصيل...",
    publish: "نشر", search: "بحث...", all: "الكل",
    flowing: "جاري التركيز", awaiting: "مستعد", deepWork: "عمل عميق", break: "راحة",
    focusio: "تركيز", pomo: "بومودورو", breakMode: "استراحة", work: "عمل"
  }
};

const quotesArr = [
  { en: "The best way to predict the future is to create it.", ar: "أفضل طريقة للتنبؤ بالمستقبل هي أن تصنعه." },
  { en: "Focus on being productive instead of busy.", ar: "ركز على أن تكون منتجاً بدلاً من أن تكون مشغولاً." },
  { en: "Your mind is for having ideas, not holding them.", ar: "عقلك مخصص لإنتاج الأفكار، وليس لتخزينها." },
  { en: "Discipline is choosing between what you want now and what you want most.", ar: "الانضباط هو الاختيار بين ما تريده الآن وما تريده بشدة." }
];

// --- Database ---
class MyDatabase extends Dexie {
  notes!: Table<Note>;
  reminders!: Table<Reminder>;
  thoughts!: Table<Thought>;
  constructor() {
    super('DroidNotesDB');
    this.version(2).stores({
      notes: '++id, title, category, createdAt',
      reminders: '++id, time, completed',
      thoughts: '++id, createdAt'
    });
  }
}
const db = new MyDatabase();

// --- Context ---
const LangContext = createContext({ 
  lang: 'en' as 'en' | 'ar', 
  setLang: (l: 'en' | 'ar') => {}, 
  t: translations.en 
});
const useLang = () => useContext(LangContext);

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

// --- Components ---

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="p-6 bg-white dark:bg-neutral-800 border border-theme-border rounded-theme-lg shadow-theme-card flex flex-col items-start space-y-2">
      <div className="p-2 bg-theme-bg dark:bg-neutral-900/50 rounded-lg">{icon}</div>
      <div className="flex flex-col">
        <span className="text-2xl font-bold tracking-tight">{value}</span>
        <span className="text-[10px] uppercase font-bold text-theme-text-muted tracking-widest">{label}</span>
      </div>
    </div>
  );
}

function ActionButton({ to, label, icon, color }: { to: string; label: string; icon: ReactNode; color: string }) {
  return (
    <Link to={to} className={cn("flex-shrink-0 flex flex-col items-center justify-center w-32 h-32 rounded-theme-lg text-white space-y-2 shadow-theme-card hover:opacity-90 active:scale-95 transition-all text-center px-2", color)}>
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-widest">{label}</span>
    </Link>
  );
}

function Dashboard() {
  const { t, lang } = useLang();
  const notesCount = useLiveQuery(() => db.notes.count()) ?? 0;
  const reminders = useLiveQuery(() => db.reminders.where('completed').equals(0).toArray()) ?? [];
  const thoughts = useLiveQuery(() => db.thoughts.orderBy('createdAt').reverse().limit(3).toArray()) ?? [];
  
  const [thoughtText, setThoughtText] = useState('');
  const [quote] = useState(() => quotesArr[Math.floor(Math.random() * quotesArr.length)]);

  const studyCount = useLiveQuery(() => db.notes.where('category').anyOf(['Study', 'دراسة']).count()) ?? 0;
  const fitnessCount = useLiveQuery(() => db.notes.where('category').anyOf(['Fitness', 'رياضة']).count()) ?? 0;
  const personalCount = useLiveQuery(() => db.notes.where('category').anyOf(['Personal', 'شخصي']).count()) ?? 0;

  const saveThought = async () => {
    if (thoughtText.trim()) {
      await db.thoughts.add({ content: thoughtText, createdAt: Date.now() });
      setThoughtText('');
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <header className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-sm font-medium text-theme-text-muted">{format(new Date(), 'EEEE, MMMM do')}</p>
          <h1 className="text-3xl font-bold tracking-tight text-theme-text-primary">{t.dashboard}</h1>
        </div>
      </header>

      <section className="bg-white dark:bg-neutral-800 border border-theme-border rounded-theme-lg p-6 shadow-theme-card space-y-4 text-start">
        <div className="flex items-center gap-2 mb-2">
          <Quote className="text-theme-accent" size={18} />
          <h3 className="section-title !mb-0">{t.mindfulness}</h3>
        </div>
        <p className="text-sm italic text-theme-text-primary/80 leading-relaxed font-serif">"{quote[lang]}"</p>
        
        <div className="space-y-3 pt-4 border-t border-theme-bg">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-theme-text-muted">{t.dailyThought}</h4>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder={t.placeholderThought}
              value={thoughtText}
              onChange={(e) => setThoughtText(e.target.value)}
              className="flex-1 bg-theme-bg dark:bg-neutral-900 border border-theme-border rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-theme-accent/20"
            />
            <button onClick={saveThought} className="p-2 bg-theme-accent text-white rounded-xl active:scale-95 transition-all"><Plus size={20} /></button>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-hide pt-2">
            {thoughts.map(th => (
              <div key={th.id} className="text-xs p-2 bg-theme-bg dark:bg-neutral-900/50 rounded-lg border border-theme-border/50 text-theme-text-primary/70">{th.content}</div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-4">
        <StatCard icon={<Book className="text-theme-accent" size={20} />} label={t.study} value={studyCount} />
        <StatCard icon={<Dumbbell className="text-emerald-500" size={20} />} label={t.fitness} value={fitnessCount} />
        <StatCard icon={<User className="text-amber-500" size={20} />} label={t.personal} value={personalCount} />
        <StatCard icon={<Timer className="text-theme-accent" size={20} />} label={t.notes} value={notesCount} />
      </div>

      <section className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="section-title">{t.reminders}</h3>
          <button className="text-theme-accent text-[10px] font-bold uppercase tracking-widest hover:underline">{t.addNew}</button>
        </div>
        <div className="space-y-3">
          {reminders.length === 0 ? <div className="p-8 bg-white dark:bg-neutral-800/10 rounded-theme-lg border border-theme-border text-center text-xs text-theme-text-muted">{t.noTasks}</div> : reminders.map(r => (
            <div key={r.id} className="flex items-center gap-4 p-4 bg-white dark:bg-neutral-900 border border-theme-border rounded-theme-md shadow-theme-card">
              <Circle size={20} className="text-theme-text-muted" />
              <div className="flex-1"><p className="text-sm font-semibold tracking-tight text-start">{r.title}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="section-title">{t.quickActions}</h3>
        <div className="flex space-x-4 rtl:space-x-reverse overflow-x-auto pb-4 scrollbar-hide">
          <ActionButton to="/notes" label={t.createNote} icon={<PlusCircle size={22} />} color="bg-theme-accent" />
          <ActionButton to="/timer" label={t.timer} icon={<Timer size={22} />} color="bg-theme-text-primary dark:bg-neutral-700" />
        </div>
      </section>
    </div>
  );
}

function NoteCard({ note }: { note: Note }) {
  const { lang } = useLang();
  const handleDelete = async () => { if (confirm(lang === 'en' ? 'Delete?' : 'حذف؟')) { await db.notes.delete(note.id!); } };
  return (
    <div className="bg-white dark:bg-neutral-900 border border-theme-border rounded-theme-lg p-6 shadow-theme-card hover:shadow-lg transition-all relative text-start">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[8px] font-black uppercase tracking-[0.2em] px-2 py-1 rounded bg-theme-bg text-theme-accent">{note.category}</span>
        <button onClick={handleDelete} className="p-1.5 text-theme-text-muted hover:text-red-500 rounded-lg"><Trash2 size={16} /></button>
      </div>
      <h3 className="font-bold text-xl mb-2 tracking-tight">{note.title}</h3>
      <p className="text-theme-text-primary/70 text-sm leading-relaxed whitespace-pre-wrap">{note.content}</p>
      <div className="mt-6 pt-4 border-t border-theme-bg flex justify-between text-[10px] text-theme-text-muted font-mono">
        <span>{format(note.createdAt, 'MMM dd, yyyy')}</span>
        <span>{format(note.createdAt, 'HH:mm')}</span>
      </div>
    </div>
  );
}

function Notes() {
  const { t, lang } = useLang();
  const [isAdding, setIsAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [cat, setCat] = useState<any>('All');
  const notes = useLiveQuery(() => {
    let q: any = db.notes.orderBy('createdAt').reverse();
    if (cat !== 'All' && cat !== 'الكل') q = db.notes.where('category').equals(cat).reverse();
    return q.toArray();
  }, [cat]);
  const filtered = notes?.filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()));

  const cats = lang === 'en' ? ['All', 'Study', 'Fitness', 'Personal'] : ['الكل', 'دراسة', 'رياضة', 'شخصي'];

  return (
    <div className="space-y-8 min-h-full pb-20 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t.notes}</h1>
        <button onClick={() => setIsAdding(true)} className="p-3 bg-theme-accent text-white rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"><Plus size={24} /></button>
      </header>
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 rtl:left-auto rtl:right-4 top-1/2 -translate-y-1/2 text-theme-text-muted" size={18} />
          <input type="text" placeholder={t.search} value={search} onChange={(e) => setSearch(e.target.value)} className={cn("w-full bg-white dark:bg-neutral-800 border border-theme-border rounded-theme-md py-3 text-sm outline-none px-12")} />
        </div>
        <div className="flex space-x-2 rtl:space-x-reverse overflow-x-auto pb-1 scrollbar-hide">
          {cats.map(c => (
            <button key={c} onClick={() => setCat(c)} className={cn("px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest border transition-all whitespace-nowrap", (cat === c) ? "bg-theme-accent text-white" : "bg-white text-theme-text-muted")}>{c}</button>
          ))}
        </div>
      </div>
      <div className="grid gap-6">{filtered?.map(n => <NoteCard key={n.id} note={n} />)}</div>
      {isAdding && <NoteModal onClose={() => setIsAdding(false)} />}
    </div>
  );
}

function NoteModal({ onClose }: { onClose: () => void }) {
  const { t, lang } = useLang();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const categoriesList: any[] = lang === 'en' ? ['Study', 'Fitness', 'Personal'] : ['دراسة', 'رياضة', 'شخصي'];
  const [category, setCategory] = useState(categoriesList[0]);
  const handleSave = async () => { if (title.trim() && content.trim()) { await db.notes.add({ title, content, category, createdAt: Date.now() }); onClose(); } };
  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-t-[32px] sm:rounded-[32px] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-bold">{t.createNote}</h2><button onClick={onClose}><X size={24} /></button></div>
        <div className="space-y-6">
          <div className="flex gap-2 rtl:flex-row-reverse">{categoriesList.map(c => <button key={c} onClick={() => setCategory(c)} className={cn("flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase transition-all", category === c ? "bg-theme-accent text-white" : "bg-theme-bg text-theme-text-muted")}>{c}</button>)}</div>
          <input type="text" placeholder={t.placeholderHeadline} value={title} onChange={e => setTitle(e.target.value)} className="w-full text-2xl font-bold bg-transparent border-none outline-none text-start" autoFocus />
          <textarea placeholder={t.placeholderDetail} value={content} onChange={e => setContent(e.target.value)} className="w-full min-h-[200px] bg-transparent border-none outline-none resize-none text-start" />
          <button onClick={handleSave} className="w-full bg-theme-accent text-white py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-all">{t.publish}</button>
        </div>
      </div>
    </div>
  );
}

function TimerPage() {
  const { t } = useLang();
  const [mode, setMode] = useState<TimerMode>('Pomodoro');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isRunning && timeLeft > 0) timerRef.current = setInterval(() => setTimeLeft(p => p - 1), 1000);
    else if (timeLeft === 0) setIsRunning(false);
    return () => clearInterval(timerRef.current);
  }, [isRunning, timeLeft]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="flex flex-col items-center space-y-12 py-12 min-h-screen animate-in fade-in duration-500">
      <header className="text-center space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">{t.focusio}</h1>
        <div className="flex bg-white dark:bg-neutral-800 p-1.5 rounded-2xl border border-theme-border shadow-theme-card">
          <button onClick={() => { setMode('Pomodoro'); setTimeLeft(25 * 60); setIsRunning(false); }} className={cn("px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase", mode === 'Pomodoro' ? "bg-theme-bg text-theme-accent" : "text-theme-text-muted")}>{t.pomo}</button>
          <button onClick={() => { setMode('ShortBreak'); setTimeLeft(5 * 60); setIsRunning(false); }} className={cn("px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase", mode === 'ShortBreak' ? "bg-theme-bg text-green-500" : "text-theme-text-muted")}>{t.breakMode}</button>
        </div>
      </header>
      <div className="text-center space-y-2">
        <div className="text-[10px] font-bold text-theme-text-muted uppercase tracking-[0.3em] font-sans">{isRunning ? t.flowing : t.awaiting}</div>
        <div className="text-8xl font-bold tracking-tighter text-theme-text-primary px-4 font-mono">{formatTime(timeLeft)}</div>
      </div>
      <div className="flex items-center space-x-12 rtl:space-x-reverse">
        <button onClick={() => { setIsRunning(false); setTimeLeft(mode === 'Pomodoro' ? 25 * 60 : 5 * 60); }} className="p-5 rounded-full bg-white border border-theme-border shadow-theme-card"><RefreshCw size={24} /></button>
        <button onClick={() => setIsRunning(!isRunning)} className={cn("p-10 rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-90", isRunning ? "bg-theme-text-primary text-white" : "bg-theme-accent text-white")}>{isRunning ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-1 rtl:ml-0 rtl:mr-1" />}</button>
        <button className="p-5 rounded-full bg-white border border-theme-border shadow-theme-card"><Settings2 size={24} /></button>
      </div>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: ReactNode; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => cn("flex flex-col items-center justify-center space-y-1 w-16 h-full transition-all", isActive ? "text-theme-accent" : "text-theme-text-muted")}>
      <div className="p-1 rounded-lg transition-colors">{icon}</div>
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </NavLink>
  );
}

// --- Main App ---

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="p-8 text-center space-y-4">
        <AlertTriangle className="mx-auto text-amber-500" size={48} />
        <h2 className="text-xl font-bold text-theme-text-primary">Error</h2>
        <button onClick={() => this.setState({ hasError: false })} className="px-4 py-2 bg-theme-accent text-white rounded-xl">Retry</button>
      </div>
    );
    return this.props.children;
  }
}

export default function App() {
  const [lang, setLang] = useState<'en' | 'ar'>('en');
  return (
    <ErrorBoundary>
      <LangContext.Provider value={{ lang, setLang, t: translations[lang] }}>
        <Router>
          <div className={cn("min-h-screen bg-theme-bg text-theme-text-primary transition-all duration-200 font-sans")} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <main className="pb-32 pt-10 px-6 max-w-lg mx-auto min-h-screen relative bg-theme-bg shadow-none sm:shadow-theme-card sm:bg-white sm:dark:bg-neutral-900 border-none sm:border-x sm:border-theme-border">
              <main className="flex justify-end p-2 absolute top-2 right-2 rtl:left-2 rtl:right-auto z-[60]">
                <button onClick={() => setLang(lang === 'en' ? 'ar' : 'en')} className="px-3 py-1 bg-white/50 dark:bg-neutral-800/50 backdrop-blur rounded-full text-[10px] font-bold uppercase border border-theme-border">{lang === 'en' ? 'AR' : 'EN'}</button>
              </main>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/notes" element={<Notes />} />
                <Route path="/timer" element={<TimerPage />} />
                <Route path="/settings" element={<div className="p-4 pt-20 text-center text-theme-text-muted">Settings Coming Soon</div>} />
              </Routes>
            </main>
            <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-t border-theme-border flex items-center justify-around px-2 max-w-lg mx-auto z-50">
              <NavItem to="/" icon={<LayoutDashboard size={20} strokeWidth={2.5} />} label={translations[lang].dash} />
              <NavItem to="/notes" icon={<FileText size={20} strokeWidth={2.5} />} label={translations[lang].notes} />
              <NavItem to="/timer" icon={<Timer size={20} strokeWidth={2.5} />} label={translations[lang].timer} />
              <NavItem to="/settings" icon={<Settings size={20} strokeWidth={2.5} />} label={translations[lang].setup} />
            </nav>
          </div>
        </Router>
      </LangContext.Provider>
    </ErrorBoundary>
  );
}
