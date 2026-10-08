import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../lib/db';
import { exportJSON } from '../lib/backup';
import { pickSettings, useSettings } from '../lib/store';
import { addDays } from '../lib/utils';
import { useToday } from '../lib/useToday';
import { Button, Card } from './ui';

// Nhắc sao lưu: có dữ liệu mà chưa sao lưu, hoặc lần cuối đã hơn 7 ngày
export default function BackupNudge() {
  const s = useSettings();
  const today = useToday();
  const [busy, setBusy] = useState(false);
  const hasData = useLiveQuery(async () => (await db.workouts.count()) + (await db.bodyMetrics.count()) + (await db.nutritionLogs.count()) + (await db.sleeps.count()) > 0, []);
  const days = s.lastBackupAt ? Math.floor((Date.now() - s.lastBackupAt) / 86400000) : null;
  const due = hasData && (days == null || days >= 7) && !(s.backupSnooze && today < s.backupSnooze);
  if (!due) return null;
  return (
    <Card className="mb-3" style={{ boxShadow: 'inset 0 0 0 2px var(--warn)' }}>
      <div className="text-[17px] font-semibold">{days == null ? 'Chưa có bản sao lưu' : `Đã ${days} ngày chưa sao lưu`}</div>
      <p className="text-[14px] text-muted mt-1">
        Dữ liệu chỉ nằm trong app trên máy này; xoá app khỏi màn hình chính hoặc mất máy là mất hết. Bấm sao lưu → chọn “Lưu vào Tệp” → iCloud Drive (mất 10 giây).
      </p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <Button
          variant="primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await exportJSON(pickSettings(useSettings.getState()));
            } finally {
              setBusy(false);
            }
          }}
        >
          Sao lưu ngay
        </Button>
        <Button variant="ghost" onClick={() => s.update({ backupSnooze: addDays(today, 3) })}>
          Để sau
        </Button>
      </div>
    </Card>
  );
}
