import { useLiveQuery } from 'dexie-react-hooks';
import { NEED_LOGGED, NEED_SPAN, NEED_WEIGHTS, WINDOW_DAYS, adaptiveSuggestion, loadAdaptive } from '../lib/adaptive';
import { useSettings } from '../lib/store';
import { useLatestWeight } from '../lib/targets';
import { addDays, fmtDate, fmtNum } from '../lib/utils';
import { useToday } from '../lib/useToday';
import { Button, Card } from './ui';

const k = (n) => Math.round(n).toLocaleString('vi-VN');

// Chỉnh calo theo cân nặng & ăn uống thực tế.
//  compact: chỉ hiện ở tab Dinh dưỡng khi có đề xuất cần duyệt.
export default function AdaptiveCard({ compact = false, onApplied }) {
  const today = useToday();
  const settings = useSettings();
  const weight = useLatestWeight();
  const res = useLiveQuery(() => loadAdaptive(today), [today]);
  if (!res) return null;
  const sug = adaptiveSuggestion(res, settings, weight, today);

  if (compact) {
    if (!sug || sug.small || sug.recent || (settings.adaptiveSnooze && today < settings.adaptiveSnooze)) return null;
  }

  const apply = () => {
    settings.update({ tdeeOverride: { kcal: sug.newTdee, at: today }, autoTargets: true, adaptiveSnooze: null });
    onApplied?.(`Mục tiêu mới ${k(sug.next.kcal)} kcal/ngày`);
  };

  if (!settings.autoTargets)
    return compact ? null : (
      <Card>
        <Title />
        <p className="text-[15px] text-muted mt-1">Đang đặt calo thủ công trong Cài đặt. Bật lại “Tự tính mục tiêu” để dùng tính năng này.</p>
      </Card>
    );

  if (!res.ready)
    return (
      <Card>
        <Title />
        <p className="text-[15px] text-muted mt-1">
          App so lượng ăn đã ghi với tốc độ đổi cân trong {WINDOW_DAYS} ngày gần nhất để đo mức tiêu hao THẬT của bạn (công thức thường lệch 10–15%). Cần thêm dữ liệu:
        </p>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <Need label="Ngày ghi ăn đủ" have={res.logged} need={NEED_LOGGED} />
          <Need label="Lần cân" have={res.weighIns} need={NEED_WEIGHTS} />
          <Need label="Số ngày theo dõi" have={res.span} need={NEED_SPAN} />
        </div>
      </Card>
    );

  const cur = sug.current;
  const losing = res.kgPerWeek;
  return (
    <Card style={compact ? { boxShadow: 'inset 0 0 0 2px var(--accent)' } : undefined}>
      <Title />
      <div className="grid grid-cols-3 gap-2 mt-2">
        <Stat label="Ăn trung bình" value={k(res.avgIntake)} unit="kcal" />
        <Stat label="Cân thay đổi" value={`${losing > 0 ? '+' : ''}${fmtNum(Math.round(losing * 100) / 100)}`} unit="kg/tuần" />
        <Stat label="Tiêu hao thực" value={k(res.tdee)} unit="kcal" color="var(--accent)" />
      </div>
      <p className="text-[13px] text-muted mt-2">
        Dữ liệu {fmtDate(res.from, false)} – {fmtDate(res.to, false)}: {res.logged} ngày ghi ăn, {res.weighIns} lần cân. TDEE đang dùng {k(cur.tdee)} kcal
        {cur.tdeeAdaptive ? ' (đã chỉnh theo thực tế)' : ' (theo công thức)'}.
      </p>
      {res.lowCoverage && (
        <p className="text-[13px] mt-2" style={{ color: 'var(--warn)' }}>
          Chỉ ghi {Math.round(res.coverage * 100)}% số ngày. Nếu có hôm ăn mà quên ghi, mức tiêu hao sẽ bị tính THẤP hơn thật → app đề xuất ăn ít hơn mức cần. Ghi đủ thì kết quả mới đúng.
        </p>
      )}
      {sug.recent ? (
        <p className="text-[15px] mt-3">
          Vừa chỉnh ngày {fmtDate(settings.tdeeOverride.at, false)}. Chờ thêm 1 tuần dữ liệu, kiểm tra lại từ {fmtDate(sug.nextCheck, false)}.
        </p>
      ) : sug.small ? (
        <p className="text-[15px] mt-3">
          <b style={{ color: 'var(--go)' }}>Mục tiêu đang khớp thực tế</b> (lệch {k(Math.abs(sug.diff))} kcal). Giữ nguyên {k(cur.kcal)} kcal/ngày.
        </p>
      ) : (
        <>
          <div className="mt-3 rounded-[14px] bg-surface-2 p-3">
            <div className="text-[13px] text-muted">{sug.diff < 0 ? 'Bạn tiêu hao ít hơn công thức ước tính' : 'Bạn tiêu hao nhiều hơn công thức ước tính'}</div>
            <div className="text-[22px] font-bold font-rounded tnum mt-0.5">
              {k(cur.kcal)} → <span style={{ color: 'var(--accent)' }}>{k(sug.next.kcal)}</span> <span className="text-[14px] text-muted font-normal">kcal/ngày</span>
            </div>
            <div className="text-[13px] text-muted">
              Carbs {cur.carbs} → {sug.next.carbs} g · protein & fat giữ nguyên
              {sug.capped ? ` · chỉnh tối đa ${k(Math.abs(sug.newTdee - cur.tdee))} kcal mỗi tuần, phần còn lại sẽ chỉnh ở lần sau` : ''}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Button variant="primary" onClick={apply}>
              Áp dụng
            </Button>
            <Button variant="ghost" onClick={() => settings.update({ adaptiveSnooze: addDays(today, 7) })}>
              {compact ? 'Để tuần sau' : 'Chưa chỉnh'}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

function Title() {
  return <div className="text-[17px] font-semibold">Chỉnh calo theo thực tế</div>;
}

function Need({ label, have, need }) {
  const ok = have >= need;
  return (
    <div className="rounded-[14px] bg-surface-2 p-2.5">
      <div className="text-[11px] text-muted leading-tight">{label}</div>
      <div className="font-rounded tnum text-[20px] font-bold" style={{ color: ok ? 'var(--go)' : undefined }}>
        {Math.min(have, need)}
        <span className="text-[13px] text-muted font-normal">/{need}</span>
      </div>
    </div>
  );
}

function Stat({ label, value, unit, color }) {
  return (
    <div className="rounded-[14px] bg-surface-2 p-2.5">
      <div className="text-[11px] text-muted leading-tight">{label}</div>
      <div className="font-rounded tnum leading-tight mt-0.5" style={{ color }}>
        <span className="text-[19px] font-bold">{value}</span>
        <span className="text-[11px] text-muted"> {unit}</span>
      </div>
    </div>
  );
}
