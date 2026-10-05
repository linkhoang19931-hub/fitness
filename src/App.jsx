import { useEffect, useState } from 'react';
import { useSettings } from './lib/store';
import { fmtDate, todayStr } from './lib/utils';
import Workout from './screens/Workout';
import Nutrition from './screens/Nutrition';
import Body from './screens/Body';
import Settings from './screens/Settings';
import RestTimer from './components/RestTimer';
import { IconBowl, IconDumbbell, IconGear, IconScale } from './components/Icons';

const TABS = [
  { id: 'workout', label: 'Tập', icon: IconDumbbell, title: 'Buổi tập', Screen: Workout },
  { id: 'nutrition', label: 'PFC', icon: IconBowl, title: 'Dinh dưỡng PFC', Screen: Nutrition },
  { id: 'body', label: 'Cơ thể', icon: IconScale, title: 'Thể trạng', Screen: Body },
  { id: 'settings', label: 'Cài đặt', icon: IconGear, title: 'Cài đặt & Sao lưu', Screen: Settings },
];

export default function App() {
  const theme = useSettings((s) => s.theme);
  const [tab, setTab] = useState(() => {
    try {
      return sessionStorage.getItem('shuru-tab') || 'workout';
    } catch {
      return 'workout';
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme !== 'light');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f4f4f1' : '#0e0e10');
  }, [theme]);

  useEffect(() => {
    try {
      sessionStorage.setItem('shuru-tab', tab);
    } catch {}
    window.scrollTo(0, 0);
  }, [tab]);

  useEffect(() => {
    // Xin trình duyệt giữ dữ liệu lâu dài (không tự dọn khi máy thiếu bộ nhớ)
    navigator.storage?.persist?.().catch(() => {});
  }, []);

  const current = TABS.find((t) => t.id === tab) || TABS[0];
  const Screen = current.Screen;

  return (
    <div className="min-h-full">
      <main className="mx-auto max-w-lg px-4 pb-[calc(96px+env(safe-area-inset-bottom))]">
        {tab !== 'workout' && (
          <header className="pt-[calc(16px+env(safe-area-inset-top))] pb-4">
            <div className="text-xs text-muted">{fmtDate(todayStr())}</div>
            <h1 className="text-2xl font-black tracking-tight">{current.title}</h1>
          </header>
        )}
        {tab === 'workout' && <WorkoutHeader />}
        <Screen />
      </main>

      <RestTimer />

      <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur border-t border-line safe-bottom">
        <div className="mx-auto max-w-lg grid grid-cols-4">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`h-16 flex flex-col items-center justify-center gap-1 ${on ? 'text-accent' : 'text-muted'}`}
                aria-current={on ? 'page' : undefined}
              >
                <Icon width={24} height={24} strokeWidth={on ? 2.4 : 1.8} />
                <span className="text-[11px] font-semibold">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function WorkoutHeader() {
  return (
    <header className="pt-[calc(16px+env(safe-area-inset-top))] pb-4 flex items-end justify-between">
      <div>
        <div className="text-xs text-muted">{fmtDate(todayStr())} · khung 6:00 – 6:50</div>
        <h1 className="text-2xl font-black tracking-tight">Shuru Workout</h1>
      </div>
    </header>
  );
}
