import { Component, useEffect, useState } from 'react';

// Chặn lỗi hiển thị để app không bao giờ thành màn hình trắng.
// Dữ liệu nằm trong IndexedDB nên tải lại trang là an toàn.
export class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    console.error(error);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-full grid place-items-center p-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-[22px] font-bold">Có lỗi khi hiển thị</h1>
          <p className="text-[15px] text-muted mt-2">Dữ liệu của bạn vẫn còn nguyên trên máy. Tải lại app để tiếp tục.</p>
          <pre className="text-[11px] text-faint mt-3 whitespace-pre-wrap break-words">{String(this.state.error?.message || this.state.error)}</pre>
          <button className="mt-5 h-12 px-6 rounded-[14px] bg-accent text-white font-semibold" onClick={() => location.reload()}>
            Tải lại
          </button>
        </div>
      </div>
    );
  }
}

// Thông báo khi một thao tác ghi dữ liệu thất bại (vd. bộ nhớ máy đầy, trình duyệt chặn lưu trữ)
export function GlobalErrors() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    const onRejection = (e) => {
      const name = e.reason?.name || '';
      const text =
        name === 'QuotaExceededError' || /quota/i.test(e.reason?.message || '')
          ? 'Bộ nhớ máy đầy, không lưu được. Hãy xoá bớt ảnh check-in hoặc giải phóng dung lượng.'
          : /DatabaseClosed|InvalidState|OpenFailed/i.test(name)
            ? 'Trình duyệt đang chặn lưu dữ liệu (chế độ ẩn danh?). Hãy mở app ở chế độ thường.'
            : `Không thực hiện được thao tác: ${e.reason?.message || name || 'lỗi không rõ'}`;
      setMsg(text);
      setTimeout(() => setMsg(null), 5000);
    };
    window.addEventListener('unhandledrejection', onRejection);
    return () => window.removeEventListener('unhandledrejection', onRejection);
  }, []);
  if (!msg) return null;
  return (
    <div className="fixed inset-x-3 top-[calc(10px+env(safe-area-inset-top))] z-[80] rounded-[14px] px-4 py-3 text-[15px] font-semibold text-white shadow-lg" style={{ background: 'var(--danger)' }}>
      {msg}
    </div>
  );
}
