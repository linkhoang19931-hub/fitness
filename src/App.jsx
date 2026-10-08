import { useEffect, useRef, useState } from 'react';
import { MotionConfig, motion } from 'motion/react';
import { haptic } from './components/ui';
import { useDraft, useSettings } from './lib/store';
import Workout from './screens/Workout';
import Nutrition from './screens/Nutrition';
import Body from './screens/Body';
import Settings from './screens/Settings';
import Sleep from './screens/Sleep';
import RestTimer from './components/RestTimer';
import BackupNudge from './components/BackupNudge';
import { IconDumbbell, IconFork, IconGear, IconMoon, IconScale } from './components/Icons';

const TABS = [
  { id: 'workout', label: 'Tập luyện', icon: IconDumbbell, title: 'Tập luyện', Screen: Workout },
  { id: 'nutrition', label: 'Dinh dưỡng', icon: IconFork, title: 'Dinh dưỡng', Screen: Nutrition },
  { id: 'sleep', label: 'Giấc ngủ', icon: IconMoon, title: 'Giấc ngủ', Screen: Sleep },
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
  const unsaved = useDraft((d) => !!d.draft && Object.keys(d.draft).length > 0);
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
  // hướng trượt khi chuyển tab: sang phải nếu tab mới nằm bên phải
  const prevIdx = useRef(TABS.indexOf(current));
  const idx = TABS.indexOf(current);
  const dir = idx === prevIdx.current ? 0 : idx > prevIdx.current ? 1 : -1;
  useEffect(() => {
    prevIdx.current = idx;
  }, [idx]);
  const Screen = current.Screen;
  const now = new Date();
  const dateLine = `${WEEKDAY[now.getDay()]}, ${now.getDate()} tháng ${now.getMonth() + 1}`;

  return (
    <MotionConfig reducedMotion="user">
    <div className="min-h-full overflow-x-clip">
      <main className="mx-auto max-w-lg px-4 pb-[calc(110px+env(safe-area-inset-bottom))]">
        {/* Chỉ hiệu ứng vào (không chờ màn cũ thoát) để chuyển tab luôn tức thì */}
        <motion.div
          key={current.id}
          initial={dir === 0 ? false : { opacity: 0, x: dir * 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ x: { type: 'spring', damping: 32, stiffness: 420 }, opacity: { duration: 0.16 } }}
        >
          <header className="pt-[calc(14px+env(safe-area-inset-top))] pb-3">
            <div className="text-[13px] font-semibold uppercase tracking-[0.02em] text-muted">{dateLine}</div>
            <h1 className="text-[34px] leading-[1.15] font-bold tracking-[-0.03em]">{current.title}</h1>
          </header>
          {current.id !== 'settings' && current.id !== 'workout' && <BackupNudge />}
          <Screen />
        </motion.div>
      </main>

      <RestTimer />

      <nav className="fixed bottom-0 inset-x-0 z-40 material hairline-t safe-bottom">
        <div className="mx-auto max-w-lg grid grid-cols-5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const on = t.id === tab;
            return (
              <button
                key={t.id}
                onClick={() => {
                  if (t.id !== tab) haptic();
                  setTab(t.id);
                }}
                className={`h-[56px] flex flex-col items-center justify-center gap-0.5 transition-colors ${on ? 'text-accent' : 'text-faint'}`}
                aria-current={on ? 'page' : undefined}
              >
                <motion.span className="relative" animate={on ? { scale: [1, 0.82, 1.08, 1] } : { scale: 1 }} transition={{ duration: 0.35 }}>
                  <Icon size={28} filled={on} />
                  {t.id === 'settings' && unsaved && (
                    <span className="absolute -top-0.5 -right-1 h-2.5 w-2.5 rounded-full" style={{ background: 'var(--danger)' }} aria-label="Có thay đổi chưa lưu" />
                  )}
                </motion.span>
                <span className="text-[10px] font-medium tracking-[0.01em]">{t.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
    </MotionConfig>
  );
}
