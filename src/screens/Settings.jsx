import { useEffect, useRef, useState } from 'react';
import { ACTIVITY_LEVELS, DEFAULT_SETTINGS, LOSS_RATES, pickSettings, useSettings } from '../lib/store';
import { useTargets } from '../lib/targets';
import { exportJSON, exportNutritionCSV, exportWeightCSV, exportWorkoutCSV, readBackupFile, resetDB, restoreJSON } from '../lib/backup';
import { Button, Card, GroupLabel, NumField, Segmented, Sheet, Switch, TextField, useToast } from '../components/ui';
import { IconFlame } from '../components/Icons';
import { fmtNum, todayStr, addDays, fmtDate } from '../lib/utils';

// Một hàng cài đặt kiểu iOS: nhãn bên trái, điều khiển bên phải
function Row({ label, hint, children }) {
  return (
    <div className="flex items-center gap-3 py-2.5 min-h-[52px] hairline-b last:shadow-none">
      <div className="flex-1 min-w-0">
        <div className="text-[17px] leading-snug">{label}</div>
        {hint && <div className="text-[13px] text-muted leading-snug">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function NumRow({ label, hint, k, unit, decimal = false }) {
  const s = useSettings();
  return (
    <Row label={label} hint={hint}>
      <div className="flex items-center gap-1.5">
        <NumField
          className="!w-[84px] !h-10 !text-[17px] text-right !pr-3"
          value={s[k]}
          decimal={decimal}
          placeholder={DEFAULT_SETTINGS[k] != null ? String(DEFAULT_SETTINGS[k]) : '—'}
          onCommit={(v) => v !== null && s.update({ [k]: v })}
          aria-label={label}
        />
        {unit && <span className="w-9 text-[15px] text-muted">{unit}</span>}
      </div>
    </Row>
  );
}

export default function Settings() {
  const s = useSettings();
  const t = useTargets();
  const [toast, showToast] = useToast();
  const eta = t.weeks ? addDays(todayStr(), Math.ceil(t.weeks * 7)) : null;

  return (
    <div>
      {/* Mục tiêu hiện hành — tự cập nhật khi đổi các thông số bên dưới */}
      <Card className="!p-0 overflow-hidden">
        <div className="p-4" style={{ background: 'linear-gradient(160deg, color-mix(in srgb, var(--accent) 22%, transparent), transparent 70%)' }}>
          <div className="text-[13px] font-semibold text-accent">Mục tiêu mỗi ngày</div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <IconFlame size={22} style={{ color: 'var(--warn)' }} />
            <span className="text-[40px] font-bold font-rounded tnum tracking-[-0.03em] leading-none">{t.kcal.toLocaleString('vi-VN')}</span>
            <span className="text-[17px] text-muted">kcal</span>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            <Pill label="Protein" color="var(--protein)" value={`${t.proteinMin}–${t.proteinMax}`} />
            <Pill label="Fat" color="var(--fat)" value={`≤ ${t.fatCap}`} />
            <Pill label="Carbs" color="var(--carbs)" value={`${t.carbs}`} />
          </div>
          <p className="text-[13px] text-muted mt-3 leading-relaxed">
            TDEE {t.tdee.toLocaleString('vi-VN')} kcal {t.tdeeFromProfile ? '(tính từ hồ sơ)' : '(nhập tay)'} − thâm hụt {t.deficit} kcal · cân hiện tại {fmtNum(t.weight)} kg.
            {t.atGoal
              ? ' Bạn đã đạt cân mục tiêu: app chuyển sang ăn duy trì.'
              : eta
                ? ` Dự kiến chạm ${fmtNum(s.goalWeight)} kg khoảng ${fmtDate(eta, false)} (~${Math.ceil(t.weeks)} tuần).`
                : ''}
            {t.floorHit && ' Thâm hụt đã được giới hạn để Kcal không thấp hơn mức chuyển hoá cơ bản.'}
          </p>
        </div>
      </Card>

      <GroupLabel>Cân nặng</GroupLabel>
      <Card className="!py-0">
        <NumRow label="Cân bắt đầu" k="startWeight" unit="kg" decimal />
        <NumRow label="Cân mục tiêu" k="goalWeight" unit="kg" decimal />
        <div className="py-3">
          <div className="text-[17px] mb-2">Tốc độ giảm mỗi tuần</div>
          <div className="grid grid-cols-4 gap-1.5">
            {LOSS_RATES.map((r) => {
              const on = s.lossRate === r.value;
              return (
                <button
                  key={r.value}
                  onClick={() => s.update({ lossRate: r.value, autoTargets: true })}
                  className={`press rounded-[12px] py-2 ${on ? 'bg-accent text-white' : 'bg-surface-2'}`}
                >
                  <span className="block text-[17px] font-semibold font-rounded tnum">{r.label}</span>
                  <span className={`block text-[11px] ${on ? 'text-white/80' : 'text-muted'}`}>{r.hint}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[13px] text-muted mt-2">kg/tuần · khuyến nghị 0,5–1% cân nặng/tuần để giữ cơ</p>
        </div>
      </Card>

      <GroupLabel>Hồ sơ cơ thể · để tính TDEE</GroupLabel>
      <Card className="!py-0">
        <Row label="Giới tính">
          <div className="w-[140px]">
            <Segmented
              value={s.sex}
              onChange={(v) => s.update({ sex: v })}
              options={[
                { value: 'male', label: 'Nam' },
                { value: 'female', label: 'Nữ' },
              ]}
            />
          </div>
        </Row>
        <NumRow label="Tuổi" k="age" unit="tuổi" />
        <NumRow label="Chiều cao" k="heightCm" unit="cm" />
        <div className="py-3">
          <div className="text-[17px] mb-2">Mức vận động</div>
          <div className="grid grid-cols-2 gap-1.5">
            {ACTIVITY_LEVELS.map((a) => {
              const on = s.activity === a.value;
              return (
                <button key={a.value} onClick={() => s.update({ activity: a.value })} className={`press rounded-[12px] px-3 py-2 text-left ${on ? 'bg-accent text-white' : 'bg-surface-2'}`}>
                  <span className="block text-[15px] font-semibold">
                    {a.label} ×{a.value}
                  </span>
                  <span className={`block text-[12px] leading-tight ${on ? 'text-white/80' : 'text-muted'}`}>{a.hint}</span>
                </button>
              );
            })}
          </div>
          {!t.tdeeFromProfile && s.autoTargets && (
            <p className="text-[13px] mt-2" style={{ color: 'var(--warn)' }}>
              Chưa đủ tuổi và chiều cao nên đang tạm dùng TDEE nhập tay ({s.maintenanceKcal.toLocaleString('vi-VN')} kcal).
            </p>
          )}
        </div>
      </Card>

      <GroupLabel>Dinh dưỡng</GroupLabel>
      <Card className="!py-0">
        <Row label="Tự tính mục tiêu" hint="Kcal, Protein, Carbs đổi theo cân nặng và hồ sơ">
          <Switch checked={s.autoTargets} onChange={(v) => s.update({ autoTargets: v })} label="Tự tính mục tiêu" />
        </Row>
        {s.autoTargets ? (
          <NumRow label="Protein mỗi kg cân nặng" hint={`= ${t.proteinMin}–${t.proteinMax} g/ngày · khuyến nghị 1,8–2,2`} k="proteinPerKg" unit="g/kg" decimal />
        ) : (
          <>
            <NumRow label="Kcal duy trì (TDEE)" k="maintenanceKcal" unit="kcal" />
            <NumRow label="Mức thâm hụt" hint="≈500 kcal/ngày ≈ 0,45 kg/tuần" k="deficitKcal" unit="kcal" />
            <NumRow label="Protein tối thiểu" k="proteinMin" unit="g" />
            <NumRow label="Protein tối đa" k="proteinMax" unit="g" />
          </>
        )}
        <NumRow label="Trần Fat" hint={`Khuyến nghị dài hạn ≥ 0,5 g/kg ≈ ${Math.round(t.weight * 0.5)} g`} k="fatCap" unit="g" />
        {s.autoTargets && <NumRow label="TDEE dự phòng" hint="Dùng khi chưa nhập tuổi, chiều cao" k="maintenanceKcal" unit="kcal" />}
      </Card>

      <GroupLabel>Buổi tập</GroupLabel>
      <Card className="!py-0">
        <Row label="Nghỉ giữa hiệp">
          <div className="w-[170px]">
            <Segmented
              value={[60, 90, 120].includes(s.restSeconds) ? s.restSeconds : 90}
              onChange={(v) => s.update({ restSeconds: v })}
              options={[
                { value: 60, label: '60s' },
                { value: 90, label: '90s' },
                { value: 120, label: '120s' },
              ]}
            />
          </div>
        </Row>
        <Row label="Âm báo hết giờ nghỉ">
          <Switch checked={s.soundOn} onChange={(v) => s.update({ soundOn: v })} label="Âm báo" />
        </Row>
        <Row label="Rung khi hết giờ nghỉ" hint="iPhone không cho web app rung máy">
          <Switch checked={s.vibrateOn} onChange={(v) => s.update({ vibrateOn: v })} label="Rung" />
        </Row>
      </Card>

      <GroupLabel>Giao diện</GroupLabel>
      <Card className="!py-3">
        <Segmented
          value={s.theme}
          onChange={(v) => s.update({ theme: v })}
          options={[
            { value: 'system', label: 'Tự động' },
            { value: 'dark', label: 'Tối' },
            { value: 'light', label: 'Sáng' },
          ]}
        />
      </Card>

      <BackupCard showToast={showToast} />
      <StorageCard />
      {toast}
    </div>
  );
}

function Pill({ label, value, color }) {
  return (
    <div className="rounded-[12px] bg-surface px-3 py-2">
      <div className="text-[12px] font-semibold" style={{ color }}>
        {label}
      </div>
      <div className="text-[16px] font-semibold font-rounded tnum leading-tight whitespace-nowrap">
        {value}
        <span className="text-[13px] text-muted font-normal"> g</span>
      </div>
    </div>
  );
}

const TABLE_LABEL = {
  workouts: 'Buổi tập',
  exerciseLogs: 'Set đã ghi',
  nutritionLogs: 'Món ăn',
  bodyMetrics: 'Số đo cân nặng',
  checkinPhotos: 'Ảnh check-in',
  foodPresets: 'Món của tôi',
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

  const RowBtn = ({ children, onClick, danger }) => (
    <button
      disabled={busy}
      onClick={onClick}
      className={`w-full text-left text-[17px] py-3 min-h-[48px] hairline-b last:shadow-none disabled:opacity-50 ${danger ? 'text-danger' : 'text-accent'}`}
    >
      {children}
    </button>
  );

  return (
    <>
      <GroupLabel>Sao lưu & dữ liệu</GroupLabel>
      <Card className="!py-0">
        <RowBtn onClick={() => run(() => exportJSON(pickSettings(settings)))}>Sao lưu toàn bộ (.json)</RowBtn>
        <RowBtn onClick={() => fileRef.current.click()}>Khôi phục từ file .json</RowBtn>
        <RowBtn onClick={() => run(exportWorkoutCSV)}>Xuất CSV lịch sử tập</RowBtn>
        <RowBtn onClick={() => run(exportWeightCSV)}>Xuất CSV cân nặng</RowBtn>
        <RowBtn onClick={() => run(exportNutritionCSV)}>Xuất CSV dinh dưỡng</RowBtn>
      </Card>
      <p className="px-4 pt-2 text-[13px] text-muted">
        Dữ liệu chỉ nằm trên máy này. Xuất file .json mỗi tuần và cất vào Tệp hoặc Drive để không mất khi đổi máy.
      </p>
      <Card className="!py-0 mt-4">
        <RowBtn danger onClick={() => setResetStep(1)}>
          Xoá trắng dữ liệu…
        </RowBtn>
      </Card>
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

      <Sheet open={!!pending} onClose={() => setPending(null)} title="Khôi phục dữ liệu?">
        {pending && (
          <>
            <p className="text-[15px] text-muted mb-3">
              File sao lưu lúc {new Date(pending.data.exportedAt).toLocaleString('vi-VN')}. Toàn bộ dữ liệu hiện tại sẽ được <b className="text-danger">thay thế</b> bằng:
            </p>
            <div className="rounded-[18px] bg-surface px-4 mb-4">
              {Object.entries(pending.counts).map(([k, n]) => (
                <div key={k} className="flex justify-between py-2.5 hairline-b last:shadow-none">
                  <span>{TABLE_LABEL[k]}</span>
                  <b className="font-rounded tnum">{n}</b>
                </div>
              ))}
            </div>
            <Button
              variant="primary"
              className="w-full"
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
            <p className="text-[15px] text-muted mb-4">
              Mọi buổi tập, nhật ký ăn uống, số đo và ảnh check-in trên máy này sẽ bị xoá vĩnh viễn, cài đặt về mặc định. Hãy sao lưu .json trước nếu cần.
            </p>
            <Button variant="danger" className="w-full" onClick={() => setResetStep(2)}>
              Tôi hiểu, tiếp tục
            </Button>
          </>
        ) : (
          <>
            <p className="text-[15px] text-muted mb-2">
              Gõ <b className="text-ink">XOA</b> để xác nhận.
            </p>
            <TextField value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="XOA" autoCapitalize="characters" />
            <Button
              variant="danger"
              className="w-full mt-3"
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
    </>
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
    <>
      <GroupLabel>Bộ nhớ máy</GroupLabel>
      <Card className="!py-0">
        <Row label="Đang dùng">
          <span className="text-muted font-rounded tnum">{mb(info?.usage)} MB</span>
        </Row>
        <Row label="Lưu trữ bền vững" hint="Trình duyệt không tự xoá dữ liệu khi thiếu bộ nhớ">
          {info?.persisted ? (
            <span style={{ color: 'var(--go)' }} className="font-semibold">
              Đã bật
            </span>
          ) : (
            <button
              className="text-accent font-semibold"
              onClick={async () => {
                await navigator.storage?.persist?.();
                refresh();
              }}
            >
              Bật
            </button>
          )}
        </Row>
      </Card>
      <p className="px-4 pt-3 pb-2 text-[13px] text-muted text-center">Baki Goal v2.0 · dữ liệu 100% trên máy, không máy chủ</p>
    </>
  );
}
