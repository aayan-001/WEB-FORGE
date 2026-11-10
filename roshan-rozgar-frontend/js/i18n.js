// UI strings in the three languages the backend supports: [Roman Urdu, Urdu script, English].
// Backend content (trades, summaries, reviews...) already arrives as {roman, urdu, en}; use pick() for it.

const IDX = { roman_urdu: 0, urdu: 1, english: 2 };
export const LANG_IDS = ['roman_urdu', 'urdu', 'english'];
let current = 'roman_urdu';

export const D = {
  brand: ['Roshan Rozgar', 'روشن روزگار', 'Roshan Rozgar'],
  tagline: ['Apne ilaqay ke maahir karigar, bol kar dhoondain', 'اپنے علاقے کے ماہر کاریگر، بول کر ڈھونڈیں', 'Find skilled workers nearby, just by speaking'],
  choose_lang: ['Apni zubaan chunain', 'اپنی زبان چنیں', 'Choose your language'],
  continue: ['Aage barhain', 'آگے بڑھیں', 'Continue'],
  who_are_you: ['Aap kaun hain?', 'آپ کون ہیں؟', 'Who are you?'],
  need_worker: ['Mujhe karigar chahiye', 'مجھے کاریگر چاہیے', 'I need a worker'],
  need_worker_sub: ['Ghar ka masla bol kar batayen', 'گھر کا مسئلہ بول کر بتائیں', 'Describe your home problem by voice'],
  i_am_worker: ['Main karigar hoon', 'میں کاریگر ہوں', 'I am a worker'],
  i_am_worker_sub: ['Bol kar apna profile banayen', 'بول کر اپنا پروفائل بنائیں', 'Build your profile by speaking'],
  nav_home: ['Shuru', 'شروع', 'Home'],
  home_title: ['Kya masla hai?', 'کیا مسئلہ ہے؟', 'What is the problem?'],
  home_sub: ['Mic dabayen aur apni zubaan mein bolain', 'مائیک دبائیں اور اپنی زبان میں بولیں', 'Tap the mic and speak in your language'],
  tap_to_speak: ['Dabayen aur bolain', 'دبائیں اور بولیں', 'Tap and speak'],
  listening: ['Sun raha hoon… (rokne ke liye dabayen)', 'سن رہا ہوں… (روکنے کے لیے دبائیں)', 'Listening… (tap to stop)'],
  or_choose: ['Ya kaam chunain', 'یا کام چنیں', 'Or pick a trade'],
  or_type: ['Ya yahan likhain', 'یا یہاں لکھیں', 'Or type here'],
  type_ph: ['Masalan: pankha nahi chal raha', 'مثلاً: پنکھا نہیں چل رہا', 'e.g. the fan is not working'],
  find_workers: ['Karigar dhoondain', 'کاریگر ڈھونڈیں', 'Find workers'],
  understanding: ['Samajh raha hoon…', 'سمجھ رہا ہوں…', 'Understanding…'],
  ai_understood: ['AI ne samjha', 'اے آئی نے سمجھا', 'AI understood'],
  src_ai: ['Gemini AI', 'جیمنائی اے آئی', 'Gemini AI'],
  src_fallback: ['Sada tareeqa', 'سادہ طریقہ', 'Basic mode'],
  problem: ['Masla', 'مسئلہ', 'Problem'],
  trade_needed: ['Kaun sa karigar?', 'کون سا کاریگر؟', 'Which worker?'],
  pick_trade_hint: ['Samajh nahi aaya - kaam neeche se chunain', 'سمجھ نہیں آیا - کام نیچے سے چنیں', "Couldn't tell - pick the trade below"],
  speak_again: ['Dobara bolain', 'دوبارہ بولیں', 'Speak again'],
  nearby_workers: ['Qareebi karigar', 'قریبی کاریگر', 'Nearby workers'],
  count_workers: ['karigar', 'کاریگر', 'workers'],
  count_free: ['dastiyab', 'دستیاب', 'available'],
  filter_available: ['Dastiyab', 'دستیاب', 'Available'],
  filter_nearest: ['Sab se qareeb', 'سب سے قریب', 'Nearest'],
  filter_rating: ['4+ rating', '4+ ریٹنگ', '4+ rating'],
  available: ['Dastiyab', 'دستیاب', 'Available'],
  busy: ['Masroof', 'مصروف', 'Busy'],
  verified: ['Tasdeeq shuda', 'تصدیق شدہ', 'Verified'],
  km: ['km', 'کلومیٹر', 'km'],
  years: ['saal', 'سال', 'yrs'],
  jobs: ['kaam', 'کام', 'jobs'],
  rating: ['Rating', 'ریٹنگ', 'Rating'],
  experience: ['Tajurba', 'تجربہ', 'Experience'],
  distance: ['Fasla', 'فاصلہ', 'Distance'],
  no_workers: ['Is ilaqay mein koi karigar nahi mila', 'اس علاقے میں کوئی کاریگر نہیں ملا', 'No workers found nearby'],
  no_workers_hint: ['Filter hata kar dekhain', 'فلٹر ہٹا کر دیکھیں', 'Try removing a filter'],
  talk: ['Baat karain', 'بات کریں', 'Talk'],
  busy_btn: ['Abhi masroof hain', 'ابھی مصروف ہیں', 'Currently busy'],
  ai_summary: ['AI khulasa', 'اے آئی خلاصہ', 'AI summary'],
  voice_intro: ['Awaaz mein ta aruf', 'آواز میں تعارف', 'Voice introduction'],
  skills: ['Maharat', 'مہارت', 'Skills'],
  areas: ['Ilaqay', 'علاقے', 'Areas'],
  reviews: ['Gahakon ki raaye', 'گاہکوں کی رائے', 'Customer reviews'],
  no_reviews: ['Abhi koi review nahi', 'ابھی کوئی ریویو نہیں', 'No reviews yet'],
  need_problem: ['Pehle masla batayen', 'پہلے مسئلہ بتائیں', 'First describe the problem'],
  send: ['Bhejain', 'بھیجیں', 'Send'],
  type_msg: ['Paigham likhain ya bolain', 'پیغام لکھیں یا بولیں', 'Type or speak a message'],
  chat_empty: ['Karigar ka jawab ka intezar hai…', 'کاریگر کے جواب کا انتظار ہے…', 'Waiting for the worker to reply…'],
  deal_title: ['AI ne tay shuda baat likhi', 'اے آئی نے طے شدہ بات لکھی', 'AI noted what was agreed'],
  deal_job: ['Kaam', 'کام', 'Job'],
  deal_time: ['Waqt', 'وقت', 'Time'],
  deal_price: ['Qeemat', 'قیمت', 'Price'],
  deal_pending: ['Abhi qeemat tay nahi hui. Karigar se baat karain.', 'ابھی قیمت طے نہیں ہوئی۔ کاریگر سے بات کریں۔', 'No price agreed yet. Chat with the worker.'],
  rs: ['Rs', 'روپے', 'Rs'],
  book: ['Book karain', 'بک کریں', 'Book now'],
  worker_gone: ['Doosra karigar chunain', 'دوسرا کاریگر چنیں', 'Choose another worker'],
  booked_title: ['Booking pakki!', 'بکنگ پکی!', 'Booking confirmed!'],
  booked_sub: ['Karigar aap ke paas aa rahe hain', 'کاریگر آپ کے پاس آ رہے ہیں', 'Your worker is on the way'],
  phone: ['Phone number', 'فون نمبر', 'Phone number'],
  call: ['Call karain', 'کال کریں', 'Call'],
  worker_hidden: ['Karigar ab masroof hain - doosray gahakon ko nazar nahi aayenge', 'کاریگر اب مصروف ہیں - دوسرے گاہکوں کو نظر نہیں آئیں گے', 'Worker is now busy - hidden from other customers'],
  job_done: ['Kaam ho gaya', 'کام ہو گیا', 'Job done'],
  cancel: ['Mansookh karain', 'منسوخ کریں', 'Cancel'],
  cancel_ask: ['Kya aap yeh kaam mansookh karna chahte hain?', 'کیا آپ یہ کام منسوخ کرنا چاہتے ہیں؟', 'Cancel this job?'],
  yes: ['Haan', 'ہاں', 'Yes'],
  no: ['Nahi', 'نہیں', 'No'],
  how_was: ['Kaam kaisa raha?', 'کام کیسا رہا؟', 'How was the job?'],
  good: ['Acha', 'اچھا', 'Good'],
  bad: ['Theek nahi', 'ٹھیک نہیں', 'Not good'],
  speak_review: ['Bol kar batayen (zaroori nahi)', 'بول کر بتائیں (ضروری نہیں)', 'Tell us by voice (optional)'],
  submit: ['Bhejain', 'بھیجیں', 'Submit'],
  thanks: ['Shukriya!', 'شکریہ!', 'Thank you!'],
  review_saved: ['Aap ka review likh liya gaya', 'آپ کا ریویو لکھ لیا گیا', 'Your review was written'],
  review_written: ['AI ne likha', 'اے آئی نے لکھا', 'Written by AI'],
  back_home: ['Wapis shuru mein', 'واپس شروع میں', 'Back to start'],
  my_jobs: ['Mere kaam', 'میرے کام', 'My jobs'],
  no_my_jobs: ['Abhi koi kaam nahi', 'ابھی کوئی کام نہیں', 'No jobs yet'],
  st_negotiating: ['Baat-cheet jaari', 'بات چیت جاری', 'In talks'],
  st_booked: ['Pakki booking', 'پکی بکنگ', 'Booked'],
  st_completed: ['Mukammal', 'مکمل', 'Completed'],
  st_declined: ['Karigar ne maazrat ki', 'کاریگر نے معذرت کی', 'Declined'],
  st_cancelled: ['Mansookh', 'منسوخ', 'Cancelled'],
  declined_note: ['Karigar ne maazrat ki. Doosra karigar chunain.', 'کاریگر نے معذرت کی۔ دوسرا کاریگر چنیں۔', 'The worker declined. Choose another worker.'],
  taken_note: ['Karigar doosray kaam mein masroof ho gaye', 'کاریگر دوسرے کام میں مصروف ہو گئے', 'The worker was booked for another job'],
  // location
  my_location: ['Meri jagah', 'میری جگہ', 'My location'],
  change_area: ['Ilaqa badlain', 'علاقہ بدلیں', 'Change area'],
  pick_area: ['Apna ilaqa chunain', 'اپنا علاقہ چنیں', 'Pick your area'],
  near: ['ke qareeb', 'کے قریب', 'Near'],
  locating: ['Jagah dhoondi ja rahi hai…', 'جگہ ڈھونڈی جا رہی ہے…', 'Finding your location…'],
  geo_denied: ['Jagah ki ijazat nahi mili. Ilaqa chunain.', 'جگہ کی اجازت نہیں ملی۔ علاقہ چنیں۔', 'Location not allowed. Pick an area.'],
  // worker side
  w_onboard_title: ['Apne baray mein bolain', 'اپنے بارے میں بولیں', 'Tell us about yourself'],
  w_onboard_hint: ['Naam, kaam, tajurba aur ilaqay batayen. Likhna nahi parega.', 'نام، کام، تجربہ اور علاقے بتائیں۔ لکھنا نہیں پڑے گا۔', 'Say your name, trade, experience and areas. No typing needed.'],
  w_example: ['Misaal: "Mera naam Ahmed hai, main electrician hoon, 10 saal ka tajurba, G-10 mein kaam karta hoon"', 'مثال: "میرا نام احمد ہے، میں الیکٹریشن ہوں، 10 سال کا تجربہ، جی ٹین میں کام کرتا ہوں"', 'Example: "My name is Ahmed, I am an electrician with 10 years experience, working in G-10"'],
  pick_trade: ['Aap kya kaam karte hain?', 'آپ کیا کام کرتے ہیں؟', 'What work do you do?'],
  make_profile: ['Profile banayen', 'پروفائل بنائیں', 'Create my profile'],
  w_confirm_title: ['Aap ka profile', 'آپ کا پروفائل', 'Your profile'],
  w_confirm_hint: ['Kya yeh sahi hai?', 'کیا یہ صحیح ہے؟', 'Is this correct?'],
  ok_btn: ['Theek hai', 'ٹھیک ہے', 'Looks good'],
  name_label: ['Naam', 'نام', 'Name'],
  years_label: ['Tajurba (saal)', 'تجربہ (سال)', 'Experience (years)'],
  save: ['Mehfooz karain', 'محفوظ کریں', 'Save'],
  missing_years: ['Tajurba nahi mila - saal likhain', 'تجربہ نہیں ملا - سال لکھیں', 'Experience missing - add years'],
  demo_login: ['Pehle se bane karigar se dekhein (demo)', 'پہلے سے بنے کاریگر سے دیکھیں (ڈیمو)', 'Try as an existing worker (demo)'],
  or: ['ya', 'یا', 'or'],
  available_today: ['Main aaj dastiyab hoon', 'میں آج دستیاب ہوں', 'I am available today'],
  off_today: ['Aap aaj band hain - naye kaam nahi aayenge', 'آپ آج بند ہیں - نئے کام نہیں آئیں گے', 'You are off today - no new jobs'],
  new_jobs: ['Naya kaam', 'نیا کام', 'New jobs'],
  no_jobs: ['Abhi koi naya kaam nahi', 'ابھی کوئی نیا کام نہیں', 'No new jobs right now'],
  hear_customer: ['Customer ka paigham sunain', 'کسٹمر کا پیغام سنیں', 'Hear the customer message'],
  accept: ['Qabool hai', 'قبول ہے', 'Accept'],
  decline: ['Maazrat', 'معذرت', 'Decline'],
  pick_price: ['Qeemat chunain', 'قیمت چنیں', 'Choose a price'],
  say_price: ['Apni qeemat bolain', 'اپنی قیمت بولیں', 'Say your own price'],
  time_ph: ['Waqt (jaise: aaj shaam 5 baje)', 'وقت (جیسے: آج شام 5 بجے)', 'Time (e.g. today 5 pm)'],
  open: ['Kholain', 'کھولیں', 'Open'],
  waiting_book: ['Customer ke book karne ka intezar hai', 'کسٹمر کے بک کرنے کا انتظار ہے', 'Waiting for the customer to book'],
  worker_booked: ['Booking pakki. Customer ka kaam kar ke "Kaam ho gaya" dabayen.', 'بکنگ پکی۔ کام کر کے "کام ہو گیا" دبائیں۔', 'Booked. Finish the work, then tap "Job done".'],
  logout: ['Bahar niklain', 'باہر نکلیں', 'Log out'],
  loading: ['Intezar karain…', 'انتظار کریں…', 'Loading…'],
  retry: ['Dobara koshish karain', 'دوبارہ کوشش کریں', 'Try again'],
  close: ['Band karain', 'بند کریں', 'Close'],
  // errors
  err_network: ['Server se rabta nahi ho raha. Internet check karain.', 'سرور سے رابطہ نہیں ہو رہا۔ انٹرنیٹ چیک کریں۔', 'Cannot reach the server. Check your connection.'],
  err_generic: ['Kuch ghalat ho gaya, dobara koshish karain', 'کچھ غلط ہو گیا، دوبارہ کوشش کریں', 'Something went wrong, please try again'],
  mic_denied: ['Mic ki ijazat nahi mili. Browser settings mein ijazat dein ya likh kar batayen.', 'مائیک کی اجازت نہیں ملی۔ براؤزر سیٹنگز میں اجازت دیں یا لکھ کر بتائیں۔', 'Microphone access was blocked. Allow it in browser settings or type instead.'],
  mic_unsupported: ['Is browser mein bolna dastiyab nahi. Chrome istemal karain ya likh kar batayen.', 'اس براؤزر میں بولنا دستیاب نہیں۔ کروم استعمال کریں یا لکھ کر بتائیں۔', 'Speech is not supported in this browser. Use Chrome or type instead.'],
  mic_nospeech: ['Awaaz nahi aayi, dobara bolain', 'آواز نہیں آئی، دوبارہ بولیں', "Didn't hear anything, please try again"],
  mic_network: ['Awaaz ki service se rabta nahi hua. Likh kar batayen.', 'آواز کی سروس سے رابطہ نہیں ہوا۔ لکھ کر بتائیں۔', 'Speech service unreachable. Please type instead.'],
  mic_secure: ['Mic ke liye HTTPS ya localhost zaroori hai', 'مائیک کے لیے HTTPS یا لوکل ہوسٹ ضروری ہے', 'The microphone needs HTTPS or localhost'],
  heard: ['Suna gaya', 'سنا گیا', 'Heard'],
  transcribing: ['Awaaz likhi ja rahi hai…', 'آواز لکھی جا رہی ہے…', 'Transcribing…'],
};

export function setLang(l) {
  current = LANG_IDS.includes(l) ? l : 'roman_urdu';
  const el = document.documentElement;
  el.lang = current === 'english' ? 'en' : current === 'urdu' ? 'ur' : 'ur-Latn';
  el.dir = current === 'urdu' ? 'rtl' : 'ltr';
  el.dataset.lang = current;
}
export const getLang = () => current;
export const tx = (k) => (D[k] || [k, k, k])[IDX[current]];

// {roman, urdu, en} -> string in the current language (with graceful fallbacks)
export function pick(o) {
  if (!o) return '';
  if (typeof o === 'string') return o;
  const v = current === 'urdu' ? (o.urdu || o.ur || o.roman || o.en)
    : current === 'english' ? (o.en || o.roman || o.urdu)
      : (o.roman || o.en || o.urdu);
  return v || '';
}
export const wname = (w) => (current === 'urdu' ? (w.name?.ur || w.name?.en) : w.name?.en) || '';
export const areaName = (a) => (a ? (current === 'urdu' ? a.name_ur || a.name : a.name) : '');
export const num = (n) => Number(n).toLocaleString('en-US');
