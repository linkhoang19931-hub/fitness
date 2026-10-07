// Số đo vòng & % mỡ ước tính theo công thức Hải quân Mỹ (Hodgdon & Beckett, 1984).
// Nam: vòng bụng ngang rốn, cổ, chiều cao. Nữ: vòng eo chỗ nhỏ nhất, mông, cổ, chiều cao. Đơn vị cm.
// Sai số so với DEXA khoảng ±3–4%, nhưng đo đều cùng một cách thì XU HƯỚNG đáng tin.

export const FIELDS = [
  { k: 'waist', label: (sex) => (sex === 'female' ? 'Vòng eo (chỗ nhỏ nhất)' : 'Vòng bụng (ngang rốn)'), short: (sex) => (sex === 'female' ? 'Eo' : 'Bụng'), required: true },
  { k: 'neck', label: () => 'Vòng cổ (dưới yết hầu)', short: () => 'Cổ', required: true },
  { k: 'hip', label: () => 'Vòng mông (chỗ to nhất)', short: () => 'Mông', female: true },
  { k: 'chest', label: () => 'Vòng ngực (ngang núm vú)', short: () => 'Ngực' },
  { k: 'arm', label: () => 'Bắp tay (gồng, chỗ to nhất)', short: () => 'Bắp tay' },
  { k: 'thigh', label: () => 'Đùi (dưới mông)', short: () => 'Đùi' },
];

export function navyBodyFat({ sex, heightCm, waist, neck, hip }) {
  const h = +heightCm, w = +waist, n = +neck, hp = +hip;
  if (!h || !w || !n) return null;
  let bf;
  if (sex === 'female') {
    if (!hp || w + hp - n <= 0) return null;
    bf = 495 / (1.29579 - 0.35004 * Math.log10(w + hp - n) + 0.221 * Math.log10(h)) - 450;
  } else {
    if (w - n <= 0) return null;
    bf = 495 / (1.0324 - 0.19077 * Math.log10(w - n) + 0.15456 * Math.log10(h)) - 450;
  }
  return Number.isFinite(bf) && bf > 2 && bf < 65 ? Math.round(bf * 10) / 10 : null;
}

// Phân loại theo bảng của ACE (American Council on Exercise)
export function bfCategory(bf, sex) {
  if (bf == null) return null;
  const t = sex === 'female' ? [14, 21, 25, 32] : [6, 14, 18, 25];
  if (bf < t[0]) return { label: 'Rất thấp', color: 'var(--warn)' };
  if (bf < t[1]) return { label: 'Vận động viên', color: 'var(--go)' };
  if (bf < t[2]) return { label: 'Săn chắc', color: 'var(--go)' };
  if (bf < t[3]) return { label: 'Trung bình', color: 'var(--warn)' };
  return { label: 'Cao', color: 'var(--danger)' };
}

// Cân nặng gần nhất trước/đúng ngày đo (để tính khối nạc)
export function weightOn(date, weights) {
  let best = null;
  for (const w of weights) if (w.date <= date && (!best || w.date > best.date)) best = w;
  return best?.weightKg ?? null;
}
