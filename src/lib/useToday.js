import { useEffect, useState } from 'react';
import { todayStr } from './utils';

// Ngày hôm nay, tự đổi khi qua nửa đêm hoặc khi mở lại app từ nền
export function useToday() {
  const [today, setToday] = useState(todayStr());
  useEffect(() => {
    const check = () => setToday((t) => (t === todayStr() ? t : todayStr()));
    const id = setInterval(check, 30000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
    };
  }, []);
  return today;
}
