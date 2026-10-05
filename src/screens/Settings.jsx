import { useEffect, useRef, useState } from 'react';
import { DEFAULT_SETTINGS, macroTargets, pickSettings, useSettings } from '../lib/store';
import { exportJSON, exportNutritionCSV, exportWeightCSV, exportWorkoutCSV, readBackupFile, resetDB, restoreJSON } from '../lib/backup';
import { Button, Card, NumField, SectionTitle, Segmented, Sheet, TextField, useToast } from '../components/ui';

export default function Settings() {
  const s = useSettings();
  const t = macroTargets(s);
  const [toast, showToast] = useToast();

  const Row = ({ label, k, unit, decimal = false, hint }) => (
    <label className="flex items-center gap-3 py-2 min-h-14">
      <span className="flex-1">
        <span className="block text-[15px]">{label}</span>
        {hint && <span className="block text-xs text-faint">{hint}</span>}
      </span>
      <span className="w-24">
        <NumField value={s[k]} decimal={decimal} onCommit={(v) => v !== null && s.update({ [k]: v })} placeholder={String(DEFAULT_SETTINGS[k])} />
      </span>
      <span className="w-9 text-sm text-muted">{unit}</span>
    </label>
  );

  return (
    <div className="space-y-4">
      <Card>
        <SectionTitle>Giao diện & buổi tập</SectionTitle>
        <div className="space-y-3">
          <div>
            <div className="text-sm text-muted mb-1.5">Chế độ hiển thị</div>
            <Segmented
              value={s.theme}
              onChange={(v) => s.update({ theme: v })}
              options={[
                { value: 'dark', label: 'Tối' },
                { value: 'light', label: 'Sáng' },
              ]}
            />
          </div>
          <div>
            <div className="text-sm text-muted mb-1.5">Thời gian nghỉ mặc định</div>
            <Segmented
              value={[60, 90, 120].includes(s.restSeconds) ? s.restSeconds : 'custom'}
              onChange={(v) => v !== 'custom' && s.update({ restSeconds: v })}
              options={[
                { value: 60, label: '60s' },
                { value: 90, label: '90s' },
                { value: 120, label: '120s' },
              ]}
            />
          </div>
          <Toggle label="Rung khi hết giờ nghỉ" checked={s.vibrateOn} onChange={(v) => s.update({ vibrateOn: v })} hint="iPhone không hỗ trợ rung từ web — dùng âm thanh" />
          <Toggle label="Âm báo khi hết giờ nghỉ" checked={s.soundOn} onChange={(v) => s.update({ soundOn: v })} />
        </div>
      </Card>

      <Card>
        <SectionTitle>Mục tiêu cân nặng</SectionTitle>
        <div className="divide-y divide-line">
          {Row({ label: 'Cân nặng bắt đầu', k: 'startWeight', unit: 'kg', decimal: true })}
          {Row({ label: 'Cân nặng mục tiêu', k: 'goalWeight', unit: 'kg', decimal: true })}
        </div>
      </Card>

      <Card>
        <SectionTitle>Hạn mức Macros (Cutting)</SectionTitle>
        <div className="divide-y divide-line">
          {Row({ label: 'Protein tối thiểu', k: 'proteinMin', unit: 'g' })}
          {Row({ label: 'Protein tối đa', k: 'proteinMax', unit: 'g' })}
          {Row({ label: 'Trần Fat', k: 'fatCap', unit: 'g', hint: 'Thanh Fat chuyển đỏ khi vượt' })}
          {Row({ label: 'Kcal duy trì (TDEE)', k: 'maintenanceKcal', unit: 'kcal', hint: 'Ước lượng năng lượng tiêu hao/ngày' })}
          {Row({ label: 'Mức thâm hụt', k: 'deficitKcal', unit: 'kcal', hint: '≈500 kcal/ngày ≈ 0,5 kg/tuần' })}
        </div>
        <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm tnum">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Mục tiêu mỗi ngày (tự tính)</div>
          <b>{t.kcal.toLocaleString('vi-VN')} kcal</b> · P {t.proteinMin}–{t.proteinMax}g · F ≤ {t.fatCap}g · C ≈ {t.carbs}g
        </div>
      </Card>

      <BackupCard showToast={showToast} />
      <StorageCard />
      {toast}
    </div>
  );
}

function Toggle({ label, checked, onChange, hint }) {
  return (
    <label className="flex items-center gap-3 min-h-12">
      <span className="flex-1">
        <span className="block text-[15px]">{label}</span>
        {hint && <span className="block text-xs text-faint">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-line'}`}
      >
        <span className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-[left] ${checked ? 'left-7' : 'left-1'}`} />
      </button>
    </label>
  );
}

const TABLE_LABEL = {
  workouts: 'Buổi tập',
  exerciseLogs: 'Set đã ghi',
  nutritionLogs: 'Món ăn',
  bodyMetrics: 'Số đo cân nặng',
  checkinPhotos: 'Ảnh check-in',
  foodPresets: 'Món mẫu',
};

function BackupCard({ showToast }) {
  const settings = useSettings();
  const fileRef = useRef();
  const [pending, setPending] = useState(null);
  const [resetStep, setResetStep] = useState(0);
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn();
      if (okMsg) showToast(okMsg);
    } catch (e) {
      showToast(e.message || 'Có lỗi xảy ra');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <SectionTitle>Sao lưu & dữ liệu</SectionTitle>
      <p className="text-xs text-faint mb-3">
        Mọi dữ liệu chỉ nằm trong trình duyệt của máy này. Xuất file JSON định kỳ (ví dụ mỗi Chủ nhật) để không mất dữ liệu khi đổi máy hoặc xoá dữ liệu trình duyệt.
      </p>
      <div className="space-y-2">
        <Button variant="primary" className="w-full" disabled={busy} onClick={() => run(() => exportJSON(pickSettings(settings)))}>
          Sao lưu toàn bộ (.json)
        </Button>
        <Button variant="outline" className="w-full" disabled={busy} onClick={() => fileRef.current.click()}>
          Khôi phục từ file .json
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              setPending(await readBackupFile(f));
            } catch (err) {
              showToast(err.message);
            }
          }}
        />
        <div className="grid grid-cols-3 gap-2 pt-1">
          <Button variant="ghost" className="text-sm px-2" disabled={busy} onClick={() => run(exportWorkoutCSV)}>
            CSV Tập
          </Button>
          <Button variant="ghost" className="text-sm px-2" disabled={busy} onClick={() => run(exportWeightCSV)}>
            CSV Cân
          </Button>
          <Button variant="ghost" className="text-sm px-2" disabled={busy} onClick={() => run(exportNutritionCSV)}>
            CSV Ăn
          </Button>
        </div>
        <Button variant="outline" className="w-full text-danger mt-3" onClick={() => setResetStep(1)}>
          Xoá trắng dữ liệu…
        </Button>
      </div>

      <Sheet open={!!pending} onClose={() => setPending(null)} title="Khôi phục dữ liệu?">
        {pending && (
          <>
            <p className="text-sm text-muted mb-3">
              File sao lưu lúc {new Date(pending.data.exportedAt).toLocaleString('vi-VN')}. Toàn bộ dữ liệu hiện tại trên máy sẽ được <b className="text-danger">thay thế</b> bằng:
            </p>
            <ul className="text-sm rounded-xl bg-surface-2 p-3 space-y-1 tnum mb-4">
              {Object.entries(pending.counts).map(([k, n]) => (
                <li key={k} className="flex justify-between">
                  <span>{TABLE_LABEL[k]}</span>
                  <b>{n}</b>
                </li>
              ))}
            </ul>
            <Button
              variant="primary"
              className="w-full h-14"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const restored = await restoreJSON(pending.data);
                  if (restored) settings.update(restored);
                  setPending(null);
                  setTimeout(() => location.reload(), 600);
                }, 'Đã khôi phục dữ liệu')
              }
            >
              Thay thế & khôi phục
            </Button>
          </>
        )}
      </Sheet>

      <Sheet
        open={resetStep > 0}
        onClose={() => {
          setResetStep(0);
          setConfirmText('');
        }}
        title={resetStep === 1 ? 'Xoá toàn bộ dữ liệu?' : 'Xác nhận lần 2'}
      >
        {resetStep === 1 ? (
          <>
            <p className="text-sm text-muted mb-4">
              Mọi buổi tập, nhật ký ăn uống, số đo và ảnh check-in trên máy này sẽ bị xoá vĩnh viễn. Không thể hoàn tác. Hãy sao lưu .json trước nếu cần.
            </p>
            <Button variant="danger" className="w-full" onClick={() => setResetStep(2)}>
              Tôi hiểu, tiếp tục
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted mb-2">
              Gõ <b className="text-ink">XOA</b> để xác nhận.
            </p>
            <TextField value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="XOA" autoCapitalize="characters" />
            <Button
              variant="danger"
              className="w-full mt-3 h-14"
              disabled={confirmText.trim().toUpperCase() !== 'XOA' || busy}
              onClick={() =>
                run(async () => {
                  await resetDB();
                  settings.resetSettings();
                  location.reload();
                })
              }
            >
              Xoá vĩnh viễn
            </Button>
          </>
        )}
      </Sheet>
    </Card>
  );
}

function StorageCard() {
  const [info, setInfo] = useState(null);
  const refresh = async () => {
    try {
      const est = (await navigator.storage?.estimate?.()) || {};
      const persisted = (await navigator.storage?.persisted?.()) ?? null;
      setInfo({ usage: est.usage, quota: est.quota, persisted });
    } catch {
      setInfo({});
    }
  };
  useEffect(() => {
    refresh();
  }, []);
  const mb = (b) => (b ? (b / 1048576).toFixed(1) : '–');
  return (
    <Card>
      <SectionTitle>Bộ nhớ máy</SectionTitle>
      <p className="text-sm tnum">
        Đang dùng <b>{mb(info?.usage)} MB</b>
        {info?.quota ? ` / khả dụng ~${Math.round(info.quota / 1073741824)} GB` : ''}
      </p>
      <p className="text-sm mt-1">
        Lưu trữ bền vững:{' '}
        <b className={info?.persisted ? 'text-accent' : 'text-warn'}>{info?.persisted ? 'Đã bật' : info?.persisted === false ? 'Chưa bật' : 'Không rõ'}</b>
      </p>
      {info?.persisted === false && (
        <Button
          variant="ghost"
          className="w-full mt-3 text-sm"
          onClick={async () => {
            await navigator.storage?.persist?.();
            refresh();
          }}
        >
          Yêu cầu trình duyệt không tự xoá dữ liệu
        </Button>
      )}
      <p className="text-xs text-faint mt-3">Shuru Tracker v1.0 · 100% local-first, không máy chủ.</p>
    </Card>
  );
}
