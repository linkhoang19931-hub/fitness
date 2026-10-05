import { useEffect, useState } from 'react';
import { useSettings } from './lib/store';
import Workout from './screens/Workout';
import Nutrition from './screens/Nutrition';
import Body from './screens/Body';
import Settings from './screens/Settings';
import RestTimer from './components/RestTimer';
import { IconDumbbell, IconFork, IconGear, IconScale } from './components/Icons';

const TABS = [
  { id: 'workout', label: 'Tập luyện', icon: IconDumbbell, title: 'Tập luyện', Screen: Workout },
  { id: 'nutrition', label: 'Dinh dưỡng', icon: IconFork, title: 'Dinh dưỡng', Screen: Nutrition },
  { id: 'body', label: 'Cơ thể', icon: IconScale, title: 'Cơ thể', Screen: Body },
  { id: 'settings', label: 'Cài đặt', icon: IconGear, title: 'Cài đặt', Screen: Settings },
];

const WEEKDAY = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

// theme: 'dark' | 'light' | 'system'
function useTheme(theme) {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#000000' : '#f2f2f7');
    };
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, [theme]);
}

export default function App() {
  const theme = useSettings((s) => s.theme);
  useTheme(theme);
  const [tab, setTab] = useState(() => {
    try {
      return sessionStorage.getItem('shuru-tab') || 'workout';
    } catch {
      return 'workout';
    }
  });

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
  const now = new Date();
  const dateLine = `${WEEKDAY[now.getDay()]}, ${now.getDate()} tháng ${now.getMonth() + 1}`;

  return (
    <div className="min-h-full">
      <main className="mx-auto max-w-lg px-4 pb-[calc(110px+env(safe-area-inset-bottom))]">
        <header className="pt-[calc(14px+env(safe-area-inset-top))] pb-3">
          <div className="text-[13px] font-semibold uppercase tracking-[0.02em] text-muted">{dateLine}</div>
          <h1 className="text-[34px] leading-[1.15] font-bold tracking-[-0.03em]">{current.title}</h1>
        </header>
        <Screen />
      </main>

      <RestTimer />

      <nav className="fixed bottom-0 inset-x-0 z-40 material hairline-t safe-bottom">
        <div className="mx-auto max-w-lg grid grid-cols-4">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`h-[56px] flex flex-col items-center justify-center gap-0.5 transition-colors ${on ? 'text-accent' : 'text-faint'}`}
                aria-current={on ? 'page' : undefined}
              >
                <Icon size={28} filled={on} />
                <span className="text-[10px] font-medium tracking-[0.01em]">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
