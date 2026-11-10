// Static reference data. Every user-facing string exists in Roman Urdu, Urdu script and English
// so the UI can switch language without extra translation calls.

export const LANGUAGES = [
  { id: 'roman_urdu', label: 'Roman Urdu', native: 'Apni zubaan', note: 'Default', speech: 'ur-PK' },
  { id: 'urdu', label: 'Urdu', native: 'اردو', note: 'Urdu', speech: 'ur-PK' },
  { id: 'english', label: 'English', native: 'English', note: 'English', speech: 'en-PK' },
];

export const TRADES = {
  electrician: {
    id: 'electrician', icon: 'zap', roman: 'Electrician', urdu: 'الیکٹریشن', en: 'Electrician',
    price_options: [1000, 1500, 2000],
    keywords: ['pankha', 'pankhay', 'pankhe', 'fan', 'bijli', 'wiring', 'wire', 'switch', 'socket', 'bulb', 'light', 'roshni', 'fuse', 'breaker', 'short circuit', 'shortcircuit', 'current', 'meter', 'ups', 'solar', 'electric', 'پنکھا', 'پنکھے', 'بجلی', 'تار', 'سوئچ', 'ساکٹ', 'بلب', 'لائٹ', 'فیوز', 'کرنٹ', 'میٹر', 'سولر'],
  },
  plumber: {
    id: 'plumber', icon: 'droplet', roman: 'Plumber', urdu: 'پلمبر', en: 'Plumber',
    price_options: [800, 1500, 2500],
    keywords: ['nal', 'nalka', 'nalke', 'tap', 'pani', 'paani', 'pipe', 'leak', 'leakage', 'tanki', 'tank', 'geyser', 'gizer', 'drain', 'naali', 'nali', 'toilet', 'washroom', 'basin', 'flush', 'motor', 'pump', 'tonti', 'ٹونٹی', 'نلکا', 'نل', 'پانی', 'پائپ', 'لیک', 'ٹینکی', 'ٹنکی', 'گیزر', 'نالی', 'واش روم', 'موٹر'],
  },
  ac_technician: {
    id: 'ac_technician', icon: 'snowflake', roman: 'AC Technician', urdu: 'اے سی ٹیکنیشن', en: 'AC Technician',
    price_options: [1500, 2500, 4000],
    keywords: ['ac', 'a.c', 'air conditioner', 'aircon', 'cooling', 'thandak', 'thanda', 'gas', 'compressor', 'split', 'اے سی', 'ایئر کنڈیشنر', 'ٹھنڈک', 'ٹھنڈا', 'کمپریسر', 'گیس'],
  },
  carpenter: {
    id: 'carpenter', icon: 'ruler', roman: 'Carpenter', urdu: 'کارپینٹر', en: 'Carpenter',
    price_options: [1000, 2000, 3500],
    keywords: ['darwaza', 'darwazay', 'door', 'almari', 'wardrobe', 'lakri', 'wood', 'wooden', 'furniture', 'kursi', 'mez', 'table', 'bed', 'palang', 'cabinet', 'polish', 'khirki', 'window', 'frame', 'lock', 'kunda', 'دروازہ', 'الماری', 'لکڑی', 'فرنیچر', 'کرسی', 'میز', 'پلنگ', 'کیبنٹ', 'پالش', 'کھڑکی', 'تالا'],
  },
  mechanic: {
    id: 'mechanic', icon: 'wrench', roman: 'Mechanic', urdu: 'مکینک', en: 'Mechanic',
    price_options: [1000, 2500, 5000],
    keywords: ['gaari', 'gari', 'gadi', 'car', 'engine', 'brake', 'tyre', 'tire', 'bike', 'motorcycle', 'oil', 'battery', 'clutch', 'gear', 'silencer', 'suspension', 'mechanic', 'گاڑی', 'انجن', 'بریک', 'ٹائر', 'بائیک', 'موٹر سائیکل', 'آئل', 'بیٹری', 'کلچ', 'گیئر'],
  },
};

export const TRADE_IDS = Object.keys(TRADES);

// Skill chips shown on the worker profile (Figma: "wiring", "pankhe theek karna", "solar breaker")
export const SKILLS = {
  electrician: [
    { id: 'wiring', roman: 'Wiring', urdu: 'وائرنگ', kw: ['wiring', 'wire', 'tar', 'وائرنگ'] },
    { id: 'fan_repair', roman: 'Pankhe theek karna', urdu: 'پنکھے ٹھیک کرنا', kw: ['pankha', 'pankhe', 'pankhay', 'fan', 'پنکھ'] },
    { id: 'solar_breaker', roman: 'Solar breaker', urdu: 'سولر بریکر', kw: ['solar', 'breaker', 'سولر', 'بریکر'] },
    { id: 'switch_socket', roman: 'Switch aur socket', urdu: 'سوئچ اور ساکٹ', kw: ['switch', 'socket', 'سوئچ', 'ساکٹ'] },
    { id: 'lighting', roman: 'Lights', urdu: 'لائٹس', kw: ['light', 'bulb', 'roshni', 'لائٹ', 'بلب'] },
    { id: 'ups_inverter', roman: 'UPS aur inverter', urdu: 'یو پی ایس اور انورٹر', kw: ['ups', 'inverter', 'انورٹر'] },
    { id: 'short_circuit', roman: 'Short circuit', urdu: 'شارٹ سرکٹ', kw: ['short circuit', 'shortcircuit', 'شارٹ'] },
  ],
  plumber: [
    { id: 'pipe_leak', roman: 'Pipe leakage', urdu: 'پائپ لیکیج', kw: ['pipe', 'leak', 'پائپ', 'لیک'] },
    { id: 'tap_fix', roman: 'Nalka theek karna', urdu: 'نلکا ٹھیک کرنا', kw: ['nalka', 'nal', 'tap', 'tonti', 'نل', 'ٹونٹی'] },
    { id: 'geyser', roman: 'Geyser', urdu: 'گیزر', kw: ['geyser', 'gizer', 'گیزر'] },
    { id: 'drain', roman: 'Naali khulwana', urdu: 'نالی کھلوانا', kw: ['drain', 'naali', 'nali', 'نالی'] },
    { id: 'toilet', roman: 'Washroom fittings', urdu: 'واش روم فٹنگ', kw: ['toilet', 'washroom', 'basin', 'flush', 'واش روم'] },
    { id: 'water_tank', roman: 'Pani ki tanki', urdu: 'پانی کی ٹینکی', kw: ['tanki', 'tank', 'ٹینکی', 'ٹنکی'] },
    { id: 'motor_pump', roman: 'Motor pump', urdu: 'موٹر پمپ', kw: ['motor', 'pump', 'موٹر', 'پمپ'] },
  ],
  ac_technician: [
    { id: 'ac_install', roman: 'AC lagana', urdu: 'اے سی لگانا', kw: ['install', 'lagana', 'lagani', 'لگانا'] },
    { id: 'gas_refill', roman: 'Gas bharna', urdu: 'گیس بھرنا', kw: ['gas', 'گیس'] },
    { id: 'ac_service', roman: 'AC service', urdu: 'اے سی سروس', kw: ['service', 'servicing', 'سروس'] },
    { id: 'cooling_issue', roman: 'Thandak ka masla', urdu: 'ٹھنڈک کا مسئلہ', kw: ['cooling', 'thandak', 'thanda', 'ٹھنڈ'] },
    { id: 'compressor', roman: 'Compressor', urdu: 'کمپریسر', kw: ['compressor', 'کمپریسر'] },
    { id: 'inverter_ac', roman: 'Inverter AC', urdu: 'انورٹر اے سی', kw: ['inverter', 'انورٹر'] },
  ],
  carpenter: [
    { id: 'door_fix', roman: 'Darwaza theek karna', urdu: 'دروازہ ٹھیک کرنا', kw: ['darwaza', 'door', 'دروازہ'] },
    { id: 'furniture', roman: 'Furniture banana', urdu: 'فرنیچر بنانا', kw: ['furniture', 'kursi', 'mez', 'table', 'palang', 'فرنیچر', 'کرسی', 'میز', 'پلنگ'] },
    { id: 'wardrobe', roman: 'Almari', urdu: 'الماری', kw: ['almari', 'wardrobe', 'الماری'] },
    { id: 'polish', roman: 'Polish', urdu: 'پالش', kw: ['polish', 'پالش'] },
    { id: 'kitchen_cabinet', roman: 'Kitchen cabinet', urdu: 'کچن کیبنٹ', kw: ['cabinet', 'kitchen', 'کیبنٹ', 'کچن'] },
    { id: 'window_frame', roman: 'Khirki ka frame', urdu: 'کھڑکی کا فریم', kw: ['khirki', 'window', 'frame', 'کھڑکی', 'فریم'] },
  ],
  mechanic: [
    { id: 'car_engine', roman: 'Gaari ka engine', urdu: 'گاڑی کا انجن', kw: ['engine', 'gaari', 'gari', 'car', 'انجن', 'گاڑی'] },
    { id: 'oil_change', roman: 'Oil change', urdu: 'آئل چینج', kw: ['oil', 'آئل'] },
    { id: 'brake', roman: 'Brake', urdu: 'بریک', kw: ['brake', 'بریک'] },
    { id: 'bike_repair', roman: 'Bike ki marammat', urdu: 'بائیک کی مرمت', kw: ['bike', 'motorcycle', 'بائیک', 'موٹر سائیکل'] },
    { id: 'battery', roman: 'Battery', urdu: 'بیٹری', kw: ['battery', 'بیٹری'] },
    { id: 'suspension', roman: 'Suspension', urdu: 'سسپنشن', kw: ['suspension', 'سسپنشن'] },
  ],
};

export function skillPublic(tradeId, skillId) {
  const s = (SKILLS[tradeId] || []).find((x) => x.id === skillId);
  return s ? { id: s.id, roman: s.roman, urdu: s.urdu } : null;
}

// Areas (approximate sector-centre coordinates; good enough for "nearby" ranking in a demo)
const A = (id, name, name_ur, city, lat, lng) => ({ id, name, name_ur, city, lat, lng });
const sec = (letter, ur) => (num, lat, lng) => A(`${letter.toLowerCase()}-${num}`, `${letter}-${num}`, `${ur}-${num}`, 'Islamabad', lat, lng);
const F = sec('F', 'ایف'), G = sec('G', 'جی'), H = sec('H', 'ایچ'), I = sec('I', 'آئی'), E = sec('E', 'ای');

export const AREAS = [
  F(6, 33.7294, 73.0762), F(7, 33.7213, 73.0555), F(8, 33.71, 73.039), F(10, 33.7, 73.013), F(11, 33.689, 72.989),
  G(6, 33.711, 73.078), G(7, 33.708, 73.056), G(8, 33.701, 73.04), G(9, 33.693, 73.03), G(10, 33.6785, 73.0085),
  G(11, 33.667, 72.988), G(13, 33.642, 72.953),
  H(8, 33.684, 73.062), H(9, 33.675, 73.035),
  I(8, 33.666, 73.074), I(9, 33.656, 73.056), I(10, 33.649, 73.04), I(11, 33.64, 73.025),
  E(11, 33.703, 72.981),
  A('blue-area', 'Blue Area', 'بلیو ایریا', 'Islamabad', 33.71, 73.0575),
  A('saddar', 'Saddar', 'صدر', 'Rawalpindi', 33.597, 73.048),
  A('satellite-town', 'Satellite Town', 'سیٹلائٹ ٹاؤن', 'Rawalpindi', 33.631, 73.064),
  A('commercial-market', 'Commercial Market', 'کمرشل مارکیٹ', 'Rawalpindi', 33.62, 73.063),
  A('chaklala', 'Chaklala', 'چکلالہ', 'Rawalpindi', 33.608, 73.089),
  A('bahria-town', 'Bahria Town', 'بحریہ ٹاؤن', 'Rawalpindi', 33.513, 73.101),
];
export const AREAS_BY_ID = Object.fromEntries(AREAS.map((a) => [a.id, a]));
export const DEFAULT_AREA_ID = 'g-10';

export const tradePublic = (id) => {
  const t = TRADES[id];
  return t ? { id: t.id, icon: t.icon, roman: t.roman, urdu: t.urdu, en: t.en } : null;
};
export const areaPublic = (id) => {
  const a = AREAS_BY_ID[id];
  return a ? { id: a.id, name: a.name, name_ur: a.name_ur, city: a.city, lat: a.lat, lng: a.lng } : null;
};

// Review / trust tags. "positive" tags feed the AI khulasa on a worker's profile.
export const TAGS = {
  punctual: { positive: true, s_roman: 'Waqt par aate hain', s_urdu: 'وقت پر آتے ہیں', s_en: 'arrives on time', r_roman: 'Waqt par pahunche', r_urdu: 'وقت پر پہنچے', r_en: 'Arrived on time' },
  clean: { positive: true, s_roman: 'kaam saaf', s_urdu: 'کام صاف کرتے ہیں', s_en: 'does clean work', r_roman: 'Kaam saaf kiya', r_urdu: 'کام صاف کیا', r_en: 'Clean work' },
  price_upfront: { positive: true, s_roman: 'qeemat pehle batate hain', s_urdu: 'قیمت پہلے بتاتے ہیں', s_en: 'tells the price upfront', r_roman: 'Pehle hi qeemat bata di', r_urdu: 'پہلے ہی قیمت بتا دی', r_en: 'Told the price upfront' },
  fair_price: { positive: true, s_roman: 'qeemat munasib', s_urdu: 'قیمت مناسب ہوتی ہے', s_en: 'fair prices', r_roman: 'Qeemat theek thi', r_urdu: 'قیمت ٹھیک تھی', r_en: 'Price was fair' },
  skilled: { positive: true, s_roman: 'masla jaldi samajh lete hain', s_urdu: 'مسئلہ جلدی سمجھ لیتے ہیں', s_en: 'quickly understands the problem', r_roman: 'Acha kaam kiya', r_urdu: 'اچھا کام کیا', r_en: 'Good work' },
  polite: { positive: true, s_roman: 'akhlaaq acha', s_urdu: 'اخلاق اچھا ہے', s_en: 'polite and respectful', r_roman: 'Akhlaaq acha tha', r_urdu: 'اخلاق اچھا تھا', r_en: 'Was polite' },
  late: { positive: false, s_roman: 'kabhi kabhi der se aate hain', s_urdu: 'کبھی کبھی دیر سے آتے ہیں', s_en: 'sometimes arrives late', r_roman: 'Der se aaye', r_urdu: 'دیر سے آئے', r_en: 'Arrived late' },
  overcharge: { positive: false, s_roman: 'qeemat zyada batate hain', s_urdu: 'قیمت زیادہ بتاتے ہیں', s_en: 'sometimes charges extra', r_roman: 'Qeemat zyada li', r_urdu: 'قیمت زیادہ لی', r_en: 'Charged more than agreed' },
  poor_work: { positive: false, s_roman: 'kaam par shikayat', s_urdu: 'کام پر شکایت', s_en: 'complaints about the work', r_roman: 'Kaam theek nahi hua', r_urdu: 'کام ٹھیک نہیں ہوا', r_en: 'Work was not done properly' },
};
export const TAG_IDS = Object.keys(TAGS);
export const POSITIVE_PRIORITY = ['punctual', 'clean', 'price_upfront', 'fair_price', 'skilled', 'polite'];
