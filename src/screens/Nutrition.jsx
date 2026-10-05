import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, kcalOf } from '../lib/db';
import { macroTargets, useSettings } from '../lib/store';
import { addDays, fmtDate, fmtNum, parseNum, todayStr } from '../lib/utils';
import { Button, Card, MacroBar, NumField, SectionTitle, Segmented, Sheet, TextField, useToast } from '../components/ui';
import { FOOD_GROUPS, FOODS, SRC_LABEL, normalize } from '../lib/foods';
import { MEAL_PLANS, itemEntry, planTotals, totals } from '../lib/mealplans';
import { IconChevron, IconTrash } from '../components/Icons';

export default function Nutrition() {
  const settings = useSettings();
  const t = macroTargets(settings);
  const [date, setDate] = useState(todayStr());
  const [toast, showToast] = useToast();
  const logs = useLiveQuery(() => db.nutritionLogs.where('date').equals(date).sortBy('createdAt'), [date]) || [];
  const presets = useLiveQuery(() => db.foodPresets.orderBy('name').toArray(), []) || [];

  const sum = logs.reduce(
    (a, l) => ({ p: a.p + (+l.protein || 0), f: a.f + (+l.fat || 0), c: a.c + (+l.carbs || 0), k: a.k + (+l.calories || 0) }),
    { p: 0, f: 0, c: 0, k: 0 }
  );
  const fatOver = sum.f > t.fatCap;
  const fatLeft = Math.round((t.fatCap - sum.f) * 10) / 10;
  const kcalLeft = t.kcal - Math.round(sum.k);
  const isToday = date === todayStr();

  const addEntry = async ({ name, protein, fat, carbs }) => {
    await db.nutritionLogs.add({
      date,
      mealName: name,
      protein: +protein || 0,
      fat: +fat || 0,
      carbs: +carbs || 0,
      calories: kcalOf(protein, fat, carbs),
      createdAt: Date.now(),
    });
    showToast(`Đã thêm: ${name}`);
  };

  const addMany = async (entries, label) => {
    const now = Date.now();
    await db.nutritionLogs.bulkAdd(
      entries.map((e, i) => ({
        date,
        mealName: e.name,
        protein: +e.protein || 0,
        fat: +e.fat || 0,
        carbs: +e.carbs || 0,
        calories: kcalOf(e.protein, e.fat, e.carbs),
        createdAt: now + i,
      }))
    );
    showToast(`Đã thêm ${label}`);
  };
  const [guide, setGuide] = useState(false);

  return (
    <div className="space-y-4">
      {/* Chọn ngày */}
      <div className="flex items-center gap-2">
        <button className="h-12 w-12 rounded-xl bg-surface-2 grid place-items-center" onClick={() => setDate(addDays(date, -1))} aria-label="Ngày trước">
          <IconChevron dir="left" />
        </button>
        <div className="flex-1 text-center">
          <div className="font-bold">{isToday ? 'Hôm nay' : fmtDate(date)}</div>
          <div className="text-xs text-muted">{fmtDate(date, false)}</div>
        </div>
        <button
          className="h-12 w-12 rounded-xl bg-surface-2 grid place-items-center disabled:opacity-30"
          disabled={isToday}
          onClick={() => setDate(addDays(date, 1))}
          aria-label="Ngày sau"
        >
          <IconChevron />
        </button>
      </div>

      {/* Tổng quan PFC */}
      <Card className={fatOver ? 'border-danger' : ''}>
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.1em] text-muted">Năng lượng</div>
            <div className="tnum">
              <span className="text-4xl font-black">{Math.round(sum.k).toLocaleString('vi-VN')}</span>
              <span className="text-muted"> / {t.kcal.toLocaleString('vi-VN')} kcal</span>
            </div>
          </div>
          <div className={`text-right text-sm tnum ${kcalLeft < 0 ? 'text-warn font-semibold' : 'text-muted'}`}>
            {kcalLeft >= 0 ? `Còn ${kcalLeft.toLocaleString('vi-VN')}` : `Vượt ${(-kcalLeft).toLocaleString('vi-VN')}`}
            <div className="text-xs text-faint">thâm hụt −{settings.deficitKcal}</div>
          </div>
        </div>
        <div className="space-y-4">
          <MacroBar
            label="Protein"
            value={sum.p}
            min={t.proteinMin}
            target={t.proteinMax}
            hint={sum.p < t.proteinMin ? `Cần thêm ${fmtNum(t.proteinMin - sum.p)}g để đạt mức tối thiểu` : 'Đã đạt mức Protein tối thiểu'}
          />
          <MacroBar
            label="Fat (trần cứng)"
            value={sum.f}
            target={t.fatCap}
            over={fatOver}
            hint={fatOver ? `VƯỢT TRẦN FAT ${fmtNum(-fatLeft)}g` : `Còn ${fmtNum(fatLeft)}g Fat được phép`}
          />
          <MacroBar label="Carbs" value={sum.c} target={t.carbs} over={false} hint={`Mục tiêu tự tính từ Kcal còn lại sau P & F`} />
        </div>
      </Card>

      {/* Thêm món: món của tôi · kho món ăn · thực đơn mẫu */}
      <AddFood presets={presets} onPick={addEntry} onPickMany={addMany} targets={t} />

      <Button variant="outline" className="w-full" onClick={() => setGuide(true)}>
        Hướng dẫn dinh dưỡng khi giảm mỡ
      </Button>
      <Sheet open={guide} onClose={() => setGuide(false)} title="Dinh dưỡng khi giảm mỡ">
        <NutritionGuide settings={settings} targets={t} />
      </Sheet>

      {/* Nhập nhanh */}
      <QuickEntry onAdd={addEntry} />

      {/* Danh sách */}
      <Card>
        <SectionTitle>Đã ăn ({logs.length})</SectionTitle>
        {logs.length === 0 ? (
          <p className="text-sm text-faint">Chưa ghi món nào cho ngày này.</p>
        ) : (
          <ul className="divide-y divide-line -my-1">
            {logs.map((l) => (
              <li key={l.id} className="flex items-center gap-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{l.mealName}</div>
                  <div className="text-xs text-muted tnum">
                    P {fmtNum(l.protein)} · <span className={l.fat >= 10 ? 'text-warn font-semibold' : ''}>F {fmtNum(l.fat)}</span> · C{' '}
                    {fmtNum(l.carbs)} · {l.calories} kcal
                  </div>
                </div>
                <button className="h-12 w-12 grid place-items-center text-faint active:text-danger" onClick={() => db.nutritionLogs.delete(l.id)} aria-label="Xoá">
                  <IconTrash width={20} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {toast}
    </div>
  );
}

function AddFood({ presets, onPick, onPickMany, targets }) {
  const [tab, setTab] = useState(() => {
    try {
      return localStorage.getItem('fitness-addfood-tab') || 'library';
    } catch {
      return 'library';
    }
  });
  const choose = (v) => {
    setTab(v);
    try {
      localStorage.setItem('fitness-addfood-tab', v);
    } catch {}
  };
  return (
    <Card>
      <SectionTitle>Thêm món</SectionTitle>
      <Segmented
        value={tab}
        onChange={choose}
        options={[
          { value: 'library', label: 'Kho món' },
          { value: 'plans', label: 'Thực đơn' },
          { value: 'mine', label: 'Của tôi' },
        ]}
      />
      <div className="mt-3">
        {tab === 'library' && <FoodLibrary onPick={onPick} />}
        {tab === 'plans' && <MealPlans onPickMany={onPickMany} targets={targets} />}
        {tab === 'mine' && <PresetGrid presets={presets} onPick={onPick} />}
      </div>
    </Card>
  );
}

const MULTS = [0.5, 1, 1.5, 2];

function FoodLibrary({ onPick }) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('all');
  const [open, setOpen] = useState(null);
  const [mult, setMult] = useState(1);
  const nq = normalize(query.trim());
  const list = FOODS.filter((f) => (group === 'all' || f.group === group) && (!nq || normalize(f.name).includes(nq)));

  return (
    <div>
      <TextField placeholder="Tìm món: pho, uc ga, com…" value={query} onChange={(e) => setQuery(e.target.value)} type="search" />
      <div className="flex gap-2 overflow-x-auto mt-2 pb-1 -mx-1 px-1">
        {[{ id: 'all', label: 'Tất cả' }, ...FOOD_GROUPS].map((g) => (
          <button
            key={g.id}
            onClick={() => setGroup(g.id)}
            className={`shrink-0 min-h-10 px-3 rounded-full text-sm font-semibold border ${
              group === g.id ? 'bg-accent text-accent-ink border-accent' : 'border-line text-muted'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
      <ul className="mt-2 divide-y divide-line">
        {list.map((f) => {
          const isOpen = open === f.id;
          const k = kcalOf(f.protein, f.fat, f.carbs);
          return (
            <li key={f.id}>
              <button
                className="w-full text-left py-2.5 min-h-12 flex items-center gap-2"
                onClick={() => {
                  setOpen(isOpen ? null : f.id);
                  setMult(1);
                }}
              >
                <span className="flex-1 min-w-0">
                  <span className="block font-medium leading-snug">{f.name}</span>
                  <span className="block text-xs text-muted tnum">
                    P {fmtNum(f.protein)} · <span className={f.fat >= 10 ? 'text-warn font-semibold' : ''}>F {fmtNum(f.fat)}</span> · C {fmtNum(f.carbs)} · {k} kcal
                  </span>
                </span>
                {f.fat >= 10 && <span className="shrink-0 text-[10px] font-bold uppercase rounded-full border border-warn text-warn px-2 py-0.5">Nhiều fat</span>}
              </button>
              {isOpen && (
                <div className="pb-3">
                  <div className="flex gap-1.5">
                    {MULTS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMult(m)}
                        className={`flex-1 min-h-11 rounded-lg text-sm font-bold tnum ${mult === m ? 'bg-ink text-bg' : 'bg-surface-2 text-muted'}`}
                      >
                        ×{m}
                      </button>
                    ))}
                  </div>
                  <Button
                    variant="primary"
                    className="w-full mt-2"
                    onClick={() => {
                      onPick(itemEntryFromFood(f, mult));
                      setOpen(null);
                    }}
                  >
                    Thêm · {kcalOf(f.protein * mult, f.fat * mult, f.carbs * mult)} kcal
                  </Button>
                  <p className="text-[11px] text-faint mt-1.5">Nguồn: {SRC_LABEL[f.src]}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {list.length === 0 && <p className="text-sm text-faint py-4">Không tìm thấy. Nhập tay ở ô “Nhập nhanh” bên dưới.</p>}
    </div>
  );
}

const itemEntryFromFood = (f, n) => itemEntry([f.id, n]);

function MealPlans({ onPickMany, targets }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="space-y-2">
      <p className="text-xs text-faint">
        Mỗi thực đơn đã tính sẵn ~1.900 kcal, Protein ~150g, Fat dưới 30g. Chạm “Thêm” để ghi cả bữa vào nhật ký hôm nay.
      </p>
      {MEAL_PLANS.map((p) => {
        const tot = planTotals(p);
        const k = kcalOf(tot.protein, tot.fat, tot.carbs);
        const diff = targets.kcal - k;
        const isOpen = open === p.id;
        return (
          <div key={p.id} className="rounded-xl border border-line overflow-hidden">
            <button className="w-full text-left p-3 min-h-14 flex items-center gap-3" onClick={() => setOpen(isOpen ? null : p.id)}>
              <span className="text-2xl font-black text-accent w-6">{p.id}</span>
              <span className="flex-1 min-w-0">
                <span className="block font-semibold">{p.name}</span>
                <span className="block text-xs text-muted tnum">
                  {k} kcal · P {Math.round(tot.protein)} · F {Math.round(tot.fat)} · C {Math.round(tot.carbs)}
                </span>
              </span>
              <IconChevron dir={isOpen ? 'up' : 'down'} width={18} className="text-faint" />
            </button>
            {isOpen && (
              <div className="px-3 pb-3 space-y-3">
                <p className="text-xs text-muted">{p.note}</p>
                {Math.abs(diff) > 150 && (
                  <p className="text-xs text-warn">
                    Mục tiêu của bạn là {targets.kcal} kcal, chênh {diff > 0 ? '+' : ''}
                    {diff} kcal so với thực đơn này. {diff > 0 ? 'Thêm' : 'Bớt'} khoảng {Math.round(Math.abs(diff) / 195 * 10) / 10} bát cơm.
                  </p>
                )}
                {p.meals.map((m) => {
                  const mt = totals(m.items);
                  return (
                    <div key={m.name} className="rounded-lg bg-surface-2 p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold tnum text-muted w-11">{m.time}</span>
                        <span className="flex-1 font-semibold text-sm">{m.name}</span>
                        <span className="text-xs text-muted tnum">{kcalOf(mt.protein, mt.fat, mt.carbs)} kcal</span>
                      </div>
                      <ul className="mt-1.5 pl-[3.25rem] text-sm space-y-0.5">
                        {m.items.map((it) => (
                          <li key={it[0]} className="leading-snug">
                            {itemEntry(it).name}
                          </li>
                        ))}
                      </ul>
                      <Button className="w-full mt-2 text-sm min-h-11" onClick={() => onPickMany(m.items.map(itemEntry), `bữa ${m.name.toLowerCase()}`)}>
                        + Thêm bữa này · P {Math.round(mt.protein)} F {fmtNum(mt.fat)}
                      </Button>
                    </div>
                  );
                })}
                <Button variant="primary" className="w-full" onClick={() => onPickMany(p.meals.flatMap((m) => m.items).map(itemEntry), `cả thực đơn ${p.id}`)}>
                  Thêm cả ngày
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function NutritionGuide({ settings, targets }) {
  const w = settings.startWeight;
  const pLo = Math.round(w * 1.8);
  const pHi = Math.round(w * 2.2);
  const fatMin = Math.round(w * 0.5);
  const fatPct = Math.round(((settings.fatCap * 9) / Math.max(targets.kcal, 1)) * 100);
  const H = ({ children }) => <h4 className="font-bold mt-4 mb-1">{children}</h4>;
  return (
    <div className="text-[15px] leading-relaxed text-ink">
      <H>Protein: giữ cơ khi ăn thâm hụt</H>
      <p>
        Tổng quan cho người tập thể hình khuyến nghị 1,8–2,7 g/kg/ngày khi giảm mỡ. Với {fmtNum(w)} kg, mức hợp lý là{' '}
        <b>
          {pLo}–{pHi} g
        </b>
        . Mục tiêu hiện tại của bạn ({settings.proteinMin}–{settings.proteinMax} g) nằm trong khoảng này. Chia đều 4–5 bữa, mỗi bữa 30–40 g.
      </p>
      <H>Fat: trần 30 g đang thấp hơn khuyến nghị</H>
      <p>
        30 g Fat ở mức {targets.kcal.toLocaleString('vi-VN')} kcal chỉ bằng khoảng <b>{fatPct}% năng lượng</b>. Các khuyến nghị cho giai đoạn giảm mỡ dùng 10–25% trong thời gian ngắn và
        cảnh báo không nên ăn rất ít béo kéo dài. Một phân tích gộp ở nam giới thấy chế độ ít béo (~20% năng lượng) làm testosterone giảm khoảng 10–15%. Mức an toàn
        hơn để duy trì lâu dài là khoảng <b>0,5 g/kg ≈ {fatMin} g/ngày</b>, ưu tiên cá, trứng, lạc, dầu thực vật. Bạn có thể đổi trần Fat trong Cài đặt.
      </p>
      <H>Tốc độ giảm cân</H>
      <p>
        Giảm 0,5–1% cân nặng mỗi tuần (≈ 0,4–0,8 kg/tuần) giữ được cơ tốt hơn giảm nhanh. Thâm hụt 500 kcal/ngày tương ứng khoảng 0,45 kg/tuần, tức đi từ 81 về 70 kg
        mất khoảng 5–6 tháng. Theo dõi đường trung bình 7 ngày ở tab Cơ thể: nếu 2 tuần liền không giảm, bớt thêm 100–150 kcal (bớt tinh bột, giữ protein).
      </p>
      <H>Ăn quanh buổi tập 6:00 sáng</H>
      <ul className="list-disc pl-5 space-y-1">
        <li>Nếu tập bụng đói thấy đuối: 5:30 uống 1 muỗng whey hoặc ăn 1 quả chuối.</li>
        <li>Bữa sau tập (7:00) nên có 30–40 g protein và phần lớn tinh bột trong ngày.</li>
        <li>Bữa cuối ngày 1–2 giờ trước khi ngủ vẫn nên có protein.</li>
      </ul>
      <H>Mẹo giữ Fat dưới trần với món Việt</H>
      <ul className="list-disc pl-5 space-y-1">
        <li>Một tô phở/bún ngoài hàng đã có 12–18 g Fat, gần nửa trần ngày. Xin ít nước béo, không hành mỡ.</li>
        <li>1 thìa canh dầu = 14 g Fat. Luộc, hấp, áp chảo chống dính thay cho chiên xào.</li>
        <li>Ưu tiên ức gà, cá rô phi, cá ngừ, tôm, mực, lòng trắng trứng, thịt bò/lợn nạc thăn. Tránh ba chỉ, da gà, nội tạng, giò chả chiên.</li>
        <li>Món ngoài hàng dao động ±20–30% tuỳ quán; số trong app là mức trung bình.</li>
      </ul>
      <H>Nguồn</H>
      <ul className="text-xs text-muted space-y-1.5 break-words">
        <li>Nutritional Recommendations for Physique Athletes, J Hum Kinet — pmc.ncbi.nlm.nih.gov/articles/PMC7052702</li>
        <li>Aragon et al. (2017), ISSN position stand: diets and body composition — pmc.ncbi.nlm.nih.gov/articles/PMC5470183</li>
        <li>Whittaker & Wu (2021), Low-fat diets and testosterone in men, J Steroid Biochem Mol Biol</li>
        <li>USDA FoodData Central; Bảng thành phần thực phẩm Việt Nam (Viện Dinh dưỡng); NutriHome — bảng calo món ăn Việt Nam</li>
      </ul>
      <p className="text-xs text-faint mt-3">Thông tin tham khảo, không thay cho tư vấn của bác sĩ hoặc chuyên gia dinh dưỡng.</p>
    </div>
  );
}

function PresetGrid({ presets, onPick }) {
  const [edit, setEdit] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-faint">Món bạn lưu · chạm để thêm</span>
        <button className="text-sm font-semibold text-accent min-h-10 px-2" onClick={() => setEdit(!edit)}>
          {edit ? 'Xong' : 'Sửa'}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {presets.map((p) => (
          <div key={p.id} className="relative">
            <button
              onClick={() => (edit ? null : onPick({ name: p.name, protein: p.protein, fat: p.fat, carbs: p.carbs }))}
              className={`w-full min-h-16 rounded-xl bg-surface-2 p-2.5 text-left active:bg-line ${edit ? 'opacity-60' : ''}`}
            >
              <div className="text-sm font-semibold leading-tight line-clamp-2">{p.name}</div>
              <div className="text-[11px] text-muted tnum mt-1">
                P{fmtNum(p.protein)} F{fmtNum(p.fat)} C{fmtNum(p.carbs)} · {kcalOf(p.protein, p.fat, p.carbs)}
              </div>
            </button>
            {edit && (
              <button
                onClick={() => confirm(`Xoá món mẫu "${p.name}"?`) && db.foodPresets.delete(p.id)}
                className="absolute -top-2 -right-2 h-9 w-9 rounded-full bg-danger text-white grid place-items-center shadow"
                aria-label="Xoá món mẫu"
              >
                <IconTrash width={16} />
              </button>
            )}
          </div>
        ))}
      </div>
      {presets.length === 0 && <p className="text-sm text-faint">Chưa có món mẫu. Tick “Lưu làm món mẫu” khi nhập món bên dưới.</p>}
    </div>
  );
}

function QuickEntry({ onAdd }) {
  const empty = { name: '', protein: null, fat: null, carbs: null };
  const [f, setF] = useState(empty);
  const [savePreset, setSavePreset] = useState(false);
  const [key, setKey] = useState(0);
  const kcal = kcalOf(f.protein, f.fat, f.carbs);
  const valid = f.name.trim() && (f.protein || f.fat || f.carbs);

  const submit = async () => {
    if (!valid) return;
    const entry = { name: f.name.trim(), protein: f.protein || 0, fat: f.fat || 0, carbs: f.carbs || 0 };
    await onAdd(entry);
    if (savePreset) await db.foodPresets.add(entry);
    setF(empty);
    setSavePreset(false);
    setKey((k) => k + 1); // làm mới các ô số
  };

  return (
    <Card>
      <SectionTitle>Nhập nhanh</SectionTitle>
      <TextField placeholder="Tên món" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <div className="grid grid-cols-3 gap-2 mt-2" key={key}>
        {[
          ['protein', 'P (g)'],
          ['fat', 'F (g)'],
          ['carbs', 'C (g)'],
        ].map(([k, label]) => (
          <label key={k} className="block">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted mb-1 text-center">{label}</span>
            <NumField value={f[k]} placeholder="0" onCommit={(v) => setF((s) => ({ ...s, [k]: v }))} />
          </label>
        ))}
      </div>
      <label className="flex items-center gap-3 mt-3 min-h-11">
        <input type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={savePreset} onChange={(e) => setSavePreset(e.target.checked)} />
        <span className="text-sm">Lưu làm món mẫu</span>
      </label>
      <Button variant="primary" className="w-full mt-2" disabled={!valid} onClick={submit}>
        Thêm món · {kcal} kcal
      </Button>
    </Card>
  );
}

export { parseNum };
