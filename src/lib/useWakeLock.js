import { useEffect, useState } from 'react';

// Screen Wake Lock API: giữ màn hình sáng trong suốt buổi tập.
// Trình duyệt tự nhả khoá khi app xuống nền, nên phải xin lại khi quay về.
export function useWakeLock(active) {
  const [status, setStatus] = useState('off'); // off | on | unsupported
  useEffect(() => {
    if (!active) {
      setStatus('off');
      return;
    }
    if (!('wakeLock' in navigator)) {
      setStatus('unsupported');
      return;
    }
    let sentinel = null;
    let cancelled = false;
    const request = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) return sentinel.release();
        setStatus('on');
        sentinel.addEventListener('release', () => !cancelled && setStatus('off'));
      } catch {
        setStatus('off');
      }
    };
    request();
    const onVis = () => document.visibilityState === 'visible' && request();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
  return status;
}
