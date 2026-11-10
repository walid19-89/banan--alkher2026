# صندوق بنان الخير للبنيان — النظام المحاسبي والإداري

نظام عربي (RTL) لإدارة صندوق خيري: الأعضاء، الاشتراكات الشهرية، سندات القبض والتبرعات،
طلبات الصرف بالاعتماد المزدوج، التقارير، الطباعة، التصدير، الإشعارات الفورية، والنسخ
الاحتياطية. يدعم أيضًا تسجيل الدخول بالبريد أو الهاتف، الحذف الجماعي، استيراد سندات
Excel، المرفقات المتعددة، التوقيع الإلكتروني والتحقق بـ QR، تذكيرات واتساب/SMS،
التنبيهات الذكية، وتقارير PDF ومؤشرات سنوية. ويدعم سند **سداد اشتراكات عدة أشهر**
(مبلغ واحد يوزَّع على أقدم المستحقات)، و**ترحيل السداد الزائد رصيداً دائناً**
للعضو يُستخدم تلقائياً في الاستحقاقات القادمة، وإدخال مبلغ السند **بالريال
السعودي** بسعر صرف يدوي من الإعدادات (مع حفظ المبلغ الأصلي والعملة وسعر الصرف
في السند للتدقيق). كما يضم **خزينة ثانية مستقلة بالريال السعودي** تُموَّل بالتحويل
من الصندوق الرئيسي وإليه فقط، برصيد وكشف وطباعة منفصلة لا تدخل في إجمالي الصندوق
الرئيسي.

**الروابط الحالية**

| الخدمة | الرابط |
|---|---|
| نسخة الويب (تعمل بدون VPN) | https://banan-fund.netlify.app/ |
| فحص الوصول المباشر | https://banan-fund.netlify.app/ping.txt |
| فحص الخادم والقاعدة | https://banan-fund.netlify.app/api/health?db=1 |
| GitHub Pages (محجوب على YemenNet — سجل تاريخي) | https://walid19-89.github.io/banan--alkher2026/ |
| نسخة احتياطية (Cloudflare Worker — محجوبة) | https://banan-fund.pool-wave.workers.dev/ |
| تطبيق الأندرويد (APK) | https://github.com/walid19-89/banan--alkher2026/releases |
| الكود | https://github.com/walid19-89/banan--alkher2026 |
| قاعدة البيانات (Neon) | https://console.neon.tech/ |
| Supabase (احتياط تاريخي) | https://supabase.com/dashboard/project/vhyckuwhuhdyvhxyqdgt |

> دليل الاستخدام خطوة بخطوة: [`docs/دليل-المستخدم.md`](docs/دليل-المستخدم.md)
>
> قائمة التحقق النهائية للإنتاج والأداء: [`docs/الإنتاج.md`](docs/الإنتاج.md)

---

## 1. المعمارية

```
المتصفح / تطبيق الأندرويد (Capacitor)
        │  JWT محلي (HS256) + REST
        ▼
Netlify Function  /api/*   (Hono + postgres.js، Node 22)
        │  SSL مباشر إلى Neon
        ▼
Neon PostgreSQL 17  ──  RLS + triggers
        │
        ├── جدول public.fund_storage: الشعار + المرفقات + النسخ الاحتياطية
        └── استقصاء /sync كل 20 ثانية بدل Realtime
```

- **الواجهة:** React 19 + Vite + TypeScript + HashRouter.
- **الاستضافة:** Netlify (الواجهة والدالة معًا، تعمل بدون VPN) وGitHub Releases (APK).
  GitHub Pages يبقى منشوراً كسجل تاريخي لكنه محجوب على YemenNet.
- **البيانات:** Neon PostgreSQL 17 (خطة مجانية، بلا إيقاف عند الخمول).
- **المصادقة:** JWT محلي فوق بصمات bcrypt الموجودة في `auth.users` (بريد أو هاتف).
- **الملفات:** داخل القاعدة في `fund_storage`.
- **التحديث شبه الفوري:** استقصاء `GET /sync` كل 20 ثانية.
- **الخادم:** دالة Netlify واحدة تحافظ على نفس واجهة REST القديمة.

---

## 2. الصلاحيات

| الدور | الصلاحيات |
|---|---|
| `admin` | كل شيء: الإعدادات، المستخدمون، الصلاحيات، النسخ الاحتياطي، الاعتماد، الصرف، التقارير، الخزينة الثانية |
| `secretary_general` | الاعتماد الأول لطلبات الصرف، الاطلاع على التقارير والبيانات والخزينة الثانية |
| `fund_manager` | الاعتماد الثاني لطلبات الصرف، الإشراف على أعمال الصندوق، الاطلاع على الخزينة الثانية |
| `accountant` | الأعضاء، الاستحقاقات، السندات، إنشاء طلبات الصرف، التقارير، عرض الخزينة الثانية |
| `treasurer` | تحصيل الأموال، السندات، صرف المبالغ المعتمدة، التقارير، إدارة الخزينة الثانية (تسجيل وحذف التحويلات) |
| `board_member` | الاطلاع والمراجعة والاعتماد حسب الصلاحية، عرض الخزينة الثانية |
| `member` | بوابة العضو: استحقاقاته وسنداته وكشف حسابه |

مفتاحا الصلاحية الخاصان بالخزينة الثانية:

- `secondary_box.view` — عرض رصيد الخزينة الثانية وكشف حركاتها (افتراضياً لكل الأدوار الإدارية).
- `secondary_box.manage` — تسجيل التحويلات وحذفها (مدير النظام وأمين الصندوق افتراضياً).

قواعد الاعتماد:

- سلسلة الاعتماد: المحاسب ينشئ الطلب ← الأمين العام يعتمده أولاً ← مدير الصندوق يعتمده ثانياً ← أمين الصندوق يصرف.
- منشئ الطلب لا يعتمد طلبه، ولا يمكن للشخص نفسه اعتماد المرحلتين.
- لا يوجد تجاوز للاعتماد الذاتي من الإعدادات؛ القاعدة ثابتة في الخادم.
- الرفض نهائي.
- الصرف فقط من `admin` أو `treasurer`، وبعد التحقق من كفاية الرصيد النقدي.
- يمكن لمدير النظام تعديل/حذف قرارات الاعتماد عند الحاجة، ويُسجّل ذلك في سجل التدقيق.

---

## 3. القواعد المالية

```
الرصيد النقدي الفعلي = الرصيد الافتتاحي + المقبوضات − المصروفات المدفوعة
الملتزمات            = طلبات معتمدة لم تُصرف
الصافي المتاح        = الرصيد النقدي الفعلي − الملتزمات
```

- المتأخرات على الأعضاء **لا** تُحسب رصيداً نقدياً.
- سداد الاشتراك يكون **لكامل المتبقي من الشهر**؛ السداد الجزئي لشهر واحد مرفوض.
- **السداد الزائد مقبول:** يُوزَّع المبلغ على أقدم المستحقات، وما يتبقى يُقيَّد
  في `fund_member_credit_ledger` رصيداً دائناً للعضو، ويُستخدم تلقائياً
  (`apply_member_credits()`) عند إنشاء استحقاقات لاحقة. المبلغ المحصَّل يبقى
  داخل الرصيد النقدي، والرصيد الدائن التزام بتغطية استحقاقات قادمة وليس رصيداً
  نقدياً إضافياً.
- **عملة الإدخال:** يمكن إدخال المبلغ بالعملة الثانية (الريال السعودي) بسعر
  الصرف في الإعدادات. القيد المحاسبي يبقى بالعملة الأساسية، ويُحفظ
  `entry_currency` و`entry_amount` و`entry_rate` في السند للتدقيق والطباعة.
- المبالغ أعداد صحيحة فقط، وتُعرض بفواصل الآلاف مثل `1,000` وليس `1000.01`.
- ترقيم السندات تسلسلي: `REC-0001`، `PV-0001`، والتحويلات بين الصندوقين `TRF-0001`.
- كل عملية مالية تُسجّل في `fund_audit_logs`، والسجل غير قابل للتعديل أو الحذف.

### الخزينة الثانية (خزينة مستقلة بالريال السعودي)

```
رصيد الخزينة الثانية = الرصيد الافتتاحي للخزينة + تحويلات إليها − تحويلات منها
الرصيد النقدي للصندوق الرئيسي = الافتتاحي + المقبوضات − المصروفات ± صافي التحويلات
```

- الخزينة الثانية **حساب منفصل تماماً**: رصيدها بعملتها (الريال السعودي افتراضياً) ولا
  يُضاف إلى إجمالي الصندوق الرئيسي ولا إلى أي تقرير موحد. لها صفحة وكشف وطباعة مستقلة.
- العمليات الوحيدة عليها هي **التحويل بين الصندوقين**:
  - `to_secondary`: يخرج مبلغ من الصندوق الرئيسي بالريال اليمني ويدخل مقابلُه إلى الخزينة بالريال السعودي.
  - `to_primary`: يخرج مبلغ من الخزينة بالريال السعودي ويدخل مقابلُه إلى الصندوق الرئيسي.
- التحويل يُدخل بعملة **المصدر**، ويحسب الخادم الطرف الآخر من سعر الصرف ويحفظ
  `amount_primary` و`amount_secondary` و`rate` معاً، فلا يتأثر التحويل بتغيّر السعر لاحقاً.
- لا يُسمح بتحويل يتجاوز رصيد المصدر، ولا بحذف تحويل يجعل رصيد أي صندوق سالباً.
- الرصيد الافتتاحي للخزينة الثانية يُضبط من الإعدادات، وكل تعديل أو تحويل أو حذف يُسجَّل
  في سجل التدقيق.
- النسخ الاحتياطي والاستعادة يشملان جدول `fund_cash_transfers`.

### مزايا تشغيلية مضافة

- **دخول بالهاتف:** يمكن للمدير تفعيل `phone_login_enabled` لأي مستخدم. يقبل
  النظام الأرقام اليمنية بصيغ `777123456` و`0777123456` و`+967 777 123 456`
  و`00967 777 123 456`، ويرفض الرقم غير المرتبط أو المكرر أو المعطّل.
- **إنشاء حساب ببريد أو هاتف:** عند إضافة مستخدم يكفي إدخال البريد أو رقم
  الهاتف. الحساب الذي بلا بريد يحصل على بريد داخلي غير ظاهر ويُفعّل له الدخول
  بالهاتف تلقائياً، ويمكنه تغيير كلمة مروره من الملف الشخصي.
- **حذف جماعي:** تحديد عدة أعضاء أو استحقاقات وحذفها دفعة واحدة، مع منع حذف
  ما له سندات أو حركات مالية.
- **استيراد سندات Excel:** استيراد `.xlsx` أو `.csv` مع معاينة الأخطاء قبل
  الحفظ.
- **مرفقات متعددة:** حتى 10 ملفات لكل سند قبض أو طلب صرف (صور أو PDF).
- **توقيع إلكتروني وQR:** توقيع سند القبض أو سند الصرف، وإضافة QR للتحقق العام
  من صحة السند عبر `/#/verify/receipt/<token>` أو `/#/verify/expense/<token>`.
- **تذكيرات واتساب/SMS:** روابط جاهزة مع تسجيل التذكير، وتذكير تلقائي قبل
  نهاية الشهر الهجري.
- **تنبيهات ذكية:** تجاوز حد الرصيد النقدي، تجاوز نسبة الالتزامات، وتأخر
  الاعتماد.
- **مؤشرات سنوية:** مقارنة الإيرادات والمصروفات والنمو شهرياً.
- **PDF عربي:** تنزيل السند/التقرير كـ PDF من نسخة الويب، مع ترويسة وتوقيع.
- **الخزينة الثانية:** خزينة نقدية مستقلة (ريال سعودي) تُموَّل بالتحويل من الصندوق
  الرئيسي وإليه فقط، برصيد وكشف وطباعة منفصلة، وبصلاحيتي عرض وإدارة مستقلتين.

---

## 4. التشغيل المحلي

### المتطلبات

- Node.js 22.5 أو أحدث (المشروع يستخدم Node 24 محلياً).
- قاعدة Neon (أو أي PostgreSQL 17) وسلسلة اتصالها.

### الخطوات

```powershell
npm install
Copy-Item api/.env.example api/.env   # ثم ضع DATABASE_URL وAUTH_SECRET وCRON_SECRET
npm run api:dev                       # API على http://127.0.0.1:8787/api
npm run dev                           # الواجهة على http://localhost:5173
```

`vite.config.ts` يوجّه `/api` محلياً إلى `http://127.0.0.1:8787`.

متغيرات الخادم في `api/.env`:

```dotenv
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
AUTH_SECRET=<64-hex>
CRON_SECRET=<32-hex>
APP_ORIGINS=http://localhost:5173,https://banan-fund.netlify.app,https://localhost
PG_POOL_MAX=2
DB_SSL=require
```

> لا تُرفع `api/.env` إلى Git، ولا تضع أسرار قاعدة البيانات داخل أي متغير `VITE_*`
> لأنه يُحزَّم في الواجهة ويصبح مرئياً للجميع.

### أوامر مفيدة

```powershell
npm run typecheck     # فحص TypeScript
npm run build         # بناء dist
npm run preview       # معاينة بناء الإنتاج
npm run icons         # توليد أيقونات PWA
npm run native:assets # توليد أيقونات/شاشات Capacitor
npm run apk:sync      # build + npx cap sync android
```

---

## 5. قاعدة البيانات والترحيلات

الملفات في `supabase/migrations/`:

| الملف | المحتوى |
|---|---|
| `0001_init.sql` | الجداول، RLS، triggers، الإشعارات، bucket المرفقات |
| `0002_realtime_events.sql` | جدول `fund_events` و triggers النشر الفوري |
| `0003_backups.sql` | جدول `fund_backups`، bucket النسخ، صلاحياته |
| `0004_production_governance.sql` | الأدوار الجديدة، صلاحيات كل مستخدم، اعتماد الصرف بمرحلتين، التاريخ الهجري، الاستحقاق التلقائي، rate limiting |
| `0005_bulk_import_signing.sql` | استثناءات الاستحقاقات المحذوفة، المرفقات المتعددة، التوقيع وQR، سجل التذكيرات، حدود التنبيهات |
| `0006_phone_login.sql` | عمود `phone_login_enabled` وفهرس فريد للهاتف |
| `0007_keepalive.sql` | جدول `fund_keepalive` ودالة `ping_keepalive()` |
| `0008_phone_normalization.sql` | توحيد صيغ الهاتف اليمني بين الواجهة وقاعدة البيانات |
| `0009_dashboard_rpc.sql` | دالة `fund_dashboard_payload()`: توليد الاستحقاق وجلب لوحة التحكم في استدعاء واحد |
| `0010_receipt_allocations.sql` | توزيع سند الاشتراك على عدة أشهر (`fund_receipt_allocations`) |
| `0011_secondary_currency.sql` | العملة الثانية وسعر الصرف اليدوي (`secondary_currency`, `exchange_rate`, `secondary_enabled`) |
| `0012_member_credit_and_receipt_currency.sql` | الرصيد الدائن للعضو وتطبيقه التلقائي على أقدم المستحقات، وعملة إدخال السند |
| `0013_secondary_cash_box.sql` | الخزينة الثانية المستقلة، جدول `fund_cash_transfers`، وتسلسل `cash_transfer` |
| `0014_portable_auth_and_storage.sql` | جدول `fund_storage` للتخزين داخل القاعدة، وإعادة محفز ملف المستخدم، وقيمة افتراضية للمعرّف |

تطبيق ملف SQL على قاعدة Neon:

```powershell
node scripts/apply-sql.mjs supabase/migrations/0014_portable_auth_and_storage.sql backups/neon-unclaimed-new.json
```

استرجاع كامل (المخطط + البيانات + الترحيل + التحقق من الأعداد):

```powershell
node scripts/restore-neon.mjs backups/neon-unclaimed-new.json
```

### الجداول الأساسية

`fund_settings`، `fund_user_profiles`، `fund_members`، `fund_subscriptions`،
`fund_subscription_exclusions`، `fund_receipts`، `fund_receipt_allocations`،
`fund_member_credit_ledger`، `fund_expense_requests`، `fund_expense_approvals`،
`fund_cash_transfers`، `fund_attachments`، `fund_reminder_logs`،
`fund_audit_logs`، `fund_notifications`، `fund_events`، `fund_backups`،
`fund_device_tokens`، `fund_keepalive`، `fund_storage`، `sequences`، و`auth.users` للمصادقة.

---

## 6. نشر الدالة على Netlify

الدالة موجودة في `api/app.ts` (كود Hono الكامل) ويغلّفها `netlify/functions/api.ts`،
وإعداد `netlify.toml` يوجّه `/api/*` إليها.

```powershell
# نشر الواجهة والدالة معاً إلى موقع banan-fund
npx netlify deploy --prod --site 1254f590-3ab4-4e51-8333-b2ace0534c08 `
  --no-build --dir dist --functions netlify/functions
```

### متغيرات بيئة الموقع في Netlify

| المتغير | القيمة |
|---|---|
| `DATABASE_URL` | سلسلة اتصال Neon |
| `AUTH_SECRET` | مفتاح توقيع الجلسات (64 hex) |
| `CRON_SECRET` | سر نقاط `/cron/*` |
| `APP_ORIGINS` | نطاقات الويب والتطبيق المسموح بها |
| `VITE_API_BASE_URL` | `/api` للويب |
| `PG_POOL_MAX` | `2` |
| `DB_SSL` | `require` |

يمكن ضبطها كلها دفعة واحدة:

```powershell
node scripts/setup-preview-site.mjs banan-fund backups/neon-unclaimed-new.json
```

### اختبار سريع

```powershell
curl "https://banan-fund.netlify.app/api/health?db=1"
```

يجب أن يعيد `{"ok":true,"db":true,...}`. ولاختبار شامل من 11 نقطة:

```powershell
$env:API_BASE = "https://banan-fund.netlify.app/api"
node scripts/test-api.mjs backups/neon-unclaimed-new.json
```

---

## 7. نسخة الويب والنشر

### الرابط العام المعتمد: Netlify (يعمل بدون VPN)

1. `npm run build` (مع `VITE_API_BASE_URL=/api` و`VITE_PUBLIC_APP_URL=https://banan-fund.netlify.app`).
2. `npx netlify deploy --prod --site 1254f590-3ab4-4e51-8333-b2ace0534c08 --no-build --dir dist --functions netlify/functions`.
3. الرابط: `https://banan-fund.netlify.app/` — والـ API على نفس النطاق تحت `/api`.

### GitHub Pages (سجل تاريخي — محجوب على YemenNet)

1. اذهب إلى **Settings → Pages** في المستودع.
2. اختر **Source: GitHub Actions**.
3. ارفع التغييرات إلى الفرع `main`.
4. سيعمل workflow `.github/workflows/deploy-pages.yml` تلقائياً.
5. الرابط: `https://walid19-89.github.io/banan--alkher2026/`.

الأسرار المطلوبة في **Settings → Secrets and variables → Actions**:

| السر | القيمة |
|---|---|
| `VITE_API_BASE_URL` | `https://banan-fund.netlify.app/api` (مطلق للـ APK وGitHub Pages) |
| `CRON_SECRET` | نفس سر `/cron/*` في Netlify |
| `VITE_PUBLIC_APP_URL` | رابط الويب النهائي (يُستخدم في QR والتحقق) |

> `VITE_SUPABASE_URL` و`VITE_SUPABASE_ANON_KEY` لم يعد لهما استخدام بعد التحويل،
> ويمكن حذفهما من الأسرار. لا تضع سلسلة اتصال قاعدة البيانات في أي سر يبدأ بـ`VITE_`.

### ملاحظات

- التطبيق يستخدم `HashRouter` و`base: './'` ليعمل على GitHub Pages وعلى مسار فرعي
  وداخل APK.
- الخطوط والأيقونات بمسارات نسبية.
- Service Worker يحدّث نفسه تلقائياً. بعد نشر جديد، حدّث الصفحة مرة واحدة إن ظهرت
  نسخة قديمة.

### الاستضافة الأساسية — Netlify (تعمل بدون VPN)

الرابط المعتمد حالياً هو:

**<https://banan-fund.netlify.app/>**

- موقع Netlify واحد يستضيف الواجهة الثابتة (مجلد `dist`) والدالة (`netlify/functions`)، والإعدادات في `netlify.toml`.
- `public/_redirects` يعيد كل المسارات إلى `index.html` (التطبيق يستخدم
  `HashRouter`)، و`/api/*` تُوجَّه للدالة قبل ذلك.
- للنشر من جهازك:

  ```powershell
  npm run build
  npx netlify deploy --prod --site 1254f590-3ab4-4e51-8333-b2ace0534c08 `
    --no-build --dir dist --functions netlify/functions
  ```

- متغيرات الموقع المطلوبة: `DATABASE_URL`, `AUTH_SECRET`, `CRON_SECRET`,
  `APP_ORIGINS`, `VITE_API_BASE_URL=/api`, `PG_POOL_MAX=2`, `DB_SSL=require`.
- بعد أي تغيير في متغيرات البيئة يجب إعادة النشر.
- للتحقق من وصول الشبكة: افتح
  <https://banan-fund.netlify.app/ping.txt> — يجب أن يظهر `banan-fund-ok`.
- فحص الخادم والقاعدة من نفس الشبكة:
  <https://banan-fund.netlify.app/api/health?db=1> — يجب أن يظهر JSON فيه `"ok":true`.

> `APP_ORIGINS` يجب أن يشمل `https://banan-fund.netlify.app` و`https://localhost`
> (أصل تطبيق Capacitor). راجع [`docs/التشغيل-الدائم.md`](docs/التشغيل-الدائم.md) للأوامر.

### GitHub Pages (محجوب على YemenNet)

الرابط <https://walid19-89.github.io/banan--alkher2026/> يبقى منشوراً
ومحدّثاً عبر `.github/workflows/deploy-pages.yml`، لكنه **لا يفتح بدون VPN**
على شبكة YemenNet، فلا تعطه للمستخدمين كرابط رئيسي.

### Cloudflare Worker (نسخة احتياطية — محجوبة)

الرابط `https://banan-fund.pool-wave.workers.dev/` ما زال منشوراً، لكنه **محجوب
من شبكة YemenNet بدون VPN**، لذلك لا تعتمد عليه كرابط رئيسي.

- يُنشر عبر `.github/workflows/deploy-worker.yml`.
- يحتاج `CLOUDFLARE_API_TOKEN` و`CLOUDFLARE_ACCOUNT_ID` في GitHub.
- ملف الإعداد: `wrangler.toml` — الاسم `banan-fund`، والمجلد `dist`.

#### Cloudflare Pages (اختياري — غير مطلوب)

`https://banan-fund.pages.dev` غير منشور، ويحتاج صلاحية **Cloudflare Pages:
Edit** في التوكن. لا حاجة إليه ما دام GitHub Pages يعمل.

> لا تضع `service_role` أو كلمة مرور قاعدة البيانات في Cloudflare أو Vite.
> الـ workflow يبني الموقع فقط، ولا يحتاج أي صلاحية على قاعدة البيانات.

### حل بديل: Netlify أو Vercel

نفس الفكرة: Build command `npm run build`، Output `dist`، ونفس متغيرات Vite.
أضف رابط الموقع إلى `APP_ORIGINS`. استخدم أياً من هذه المنصات إذا تعطّل
GitHub Pages في شبكة معينة.

---

## 8. بناء APK وتوقيعه

المشروع يستخدم Capacitor 8 وAndroid SDK 36.

- الحزمة: `org.banan.fund`
- الاسم: `صندوق بنان الخير`
- الحد الأدنى: أندرويد 7.0 (API 24)
- workflow: `.github/workflows/build-apk.yml`

### الأسرار المطلوبة

| السر | الوصف |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | ملف keystore مشفّر Base64 |
| `ANDROID_KEYSTORE_PASSWORD` | كلمة مرور الـ keystore |
| `ANDROID_KEY_ALIAS` | اسم المفتاح (`banan`) |
| `ANDROID_KEY_PASSWORD` | كلمة مرور المفتاح |

### توليد keystore (مرة واحدة)

```powershell
keytool -genkeypair -v `
  -keystore android/banan-release.keystore `
  -storetype JKS -alias banan -keyalg RSA -keysize 2048 -validity 10000 `
  -storepass "<password>" -keypass "<password>" `
  -dname "CN=Banan Charity Fund, OU=Charity, O=Banan, L=Taiz, ST=Taiz, C=YE"
```

- احتفظ بنسخة آمنة من `android/banan-release.keystore` و`ANDROID_KEYS.txt`.
- **لا ترفعهما إلى GitHub.** كلاهما في `.gitignore`.
- فقدان الـ keystore يعني أن التحديثات المستقبلية ستحتاج حذف التطبيق وإعادة تثبيته.

### البناء

```powershell
npm run build
npx cap sync android
cd android
./gradlew assembleRelease `
  -PbananVersionCode=27 `
  -PbananVersionName=1.0.27
```

أو اترك GitHub Actions يبني وينشر تلقائياً عند الدفع إلى `main`. يظهر الإصدار في
**Releases** باسم `apk-1.0.<رقم التشغيل>`.

> الإصدار `1.0.27` هو أول إصدار يعمل على Neon بالكامل، وموقّع بنفس keystore
> السابق (SHA-256 للشهادة: `e31be2e5…f49d1f24`) لذلك يُثبّت فوق النسخة القديمة
> دون حذف البيانات. يشير إلى `https://banan-fund.netlify.app/api`.
> الإصدارات الأقدم تبقى تعمل على Supabase حتى تحديث التطبيق.
>
> - الرابط المباشر: <https://github.com/walid19-89/banan--alkher2026/releases/download/apk-1.0.27/banan-fund-1.0.27.apk>
> - SHA-256 للملف: `611cf97a98033c8b25ca46bac95a88c366603306013cd1baf286fee62b86959f`

> الطباعة تعمل بشكل أفضل في نسخة الويب. تصدير CSV في APK يستخدم قائمة المشاركة
> (Filesystem + Share).

---

## 9. النسخ الاحتياطي والاستعادة

### النسخ

- من **الإعدادات → النسخ الاحتياطية → إنشاء نسخة الآن** (مدير النظام فقط).
- تُحفظ النسخة داخل القاعدة في `fund_storage` (bucket منطقي `fund-backups`)، وتُسجّل في `fund_backups`.
- يحتفظ النظام بآخر 30 نسخة ويحذف الأقدم.
- `.github/workflows/daily-backup.yml` ينشئ نسخة تلقائية يومياً 02:23 UTC عبر `GET /cron/backup` بسر `CRON_SECRET`.
- يمكن تنزيل أي نسخة من زر **تنزيل** (رابط موقّع HMAC صالح ساعة واحدة).

محتوى الملف:

```json
{
  "format": "banan-fund-backup",
  "version": 1,
  "generated_at": "...",
  "generated_by": { "id": "...", "full_name": "...", "role": "admin" },
  "counts": { "fund_members": 0, "...": 0 },
  "data": {
    "fund_settings": [],
    "fund_user_profiles": [],
    "fund_members": [],
    "fund_subscriptions": [],
    "fund_subscription_exclusions": [],
    "fund_receipts": [],
    "fund_expense_requests": [],
    "fund_expense_approvals": [],
    "fund_attachments": [],
    "fund_reminder_logs": [],
    "fund_audit_logs": [],
    "sequences": []
  }
}
```

لا تشمل النسخة `auth.users` أو كلمات المرور.

### الاستعادة من داخل النظام

1. خذ نسخة جديدة من الوضع الحالي أولاً.
2. أوقف العمل على النظام مؤقتاً.
3. من **الإعدادات → النسخ الاحتياطية** اختر **استعادة نسخة موجودة** أو **استعادة من ملف JSON**.
4. اكتب كلمة `RESTORE` في حقل التأكيد ثم اضغط **استعادة**.
5. ينشئ النظام تلقائياً نسخة **قبل الاستعادة**، ثم يستعيد البيانات.
6. سجّل الدخول وتحقّق من لوحة التحكم والتقارير، ثم خذ نسخة جديدة.

> الاستعادة تستبدل البيانات المالية الحالية. لا تستعد نسخة قديمة فوق بيانات جديدة دون نسخة احتياطية من الوضع الحالي.

### سكربت الاستعادة المتقدم

للمسؤول التقني فقط، يوجد `scripts/restore-backup.mjs` مع خيار `--dry-run` لاختبار الاستعادة دون تثبيت التغييرات. راجع `docs/استعادة-النسخة.md`.

---

## 10. الأمان

- RLS مفعّل على جداول الصندوق داخل Neon، والدالة تتحقق من JWT والصلاحية في كل مسار.
- صلاحيات دقيقة لكل مستخدم (عرض/إضافة/تعديل/حذف/طباعة/تصدير/استيراد) من صفحة **المستخدمون والصلاحيات**.
- التسجيل الذاتي لا يمنح وصولاً: يُنشئ طلباً معلقاً وإشعاراً للمدير، ولا يستطيع المستخدم الدخول حتى الموافقة.
- الاعتماد المزدوج إلزامي، ولا يوجد تجاوز للاعتماد الذاتي.
- سلسلة اتصال قاعدة البيانات وأسرار التوقيع تبقى داخل متغيرات Netlify فقط، ولا تصل للواجهة.
- سجل التدقيق غير قابل للتعديل أو الحذف (`trg_audit_no_change`).
- رفع الملفات يتحقق من البصمة الفعلية (magic bytes) لا من الامتداد فقط.
- دخول الهاتف يتم في الخادم فقط: يبحث عن البريد المرتبط سراً ثم يعيد جلسة،
  ولا يكشف البريد للمتصفح. الأرقام المكررة/المعطلة/غير المرتبطة مرفوضة.
- التحقق العام بـ QR يعرض بيانات السند الأساسية فقط عبر رمز عشوائي غير قابل
  للتخمين، ولا يسمح بأي تعديل.
- طلبات الكتابة محدودة بـ 600 طلب/دقيقة/IP، وCORS مقصور على نطاقات التطبيق.
- الجلسات: JWT HS256 موقّع بـ`AUTH_SECRET` فوق بصمات bcrypt في `auth.users`.
- ملفات المفاتيح المحلية:
  - `api/.env` (سلسلة اتصال Neon، `AUTH_SECRET`، `CRON_SECRET`).
  - `ANDROID_KEYS.txt` (كلمة مرور keystore).
  - كلها في `.gitignore`.
- لا تنشر `api/.env` أو `ANDROID_KEYS.txt` في أي مكان.
- يُنصح بتدوير كلمة مرور قاعدة البيانات من لوحة Neon دورياً ثم تحديث `api/.env` ومتغير Netlify.

---

## 11. حالة التشغيل والحسابات

انتقلت البيانات الحقيقية كاملة (35 عضوًا، 175 اشتراكًا، 38 إيصالًا، 13 حسابًا) إلى
قاعدة Neon، وبقيت كلمات المرور كما هي لأن بصمات bcrypt نُسخت دون تغيير. مشروع
Supabase القديم يبقى كنسخة احتياطية، والإصدارات القديمة من APK تستمر بالعمل عليه.

الحساب الموجود حالياً:

| البريد | الدور | ملاحظة |
|---|---|---|
| `wabdo7646@gmail.com` | مدير النظام | كلمة المرور في `SUPABASE_KEYS.txt` تحت `ADMIN_PASSWORD` |

الحسابات القديمة (`admin@banan.org`، `abduh772022@gmail.com`، `geekm2025@gmail.com`)
لم تُنقل إلى المشروع الجديد. أنشئ الحسابات الحقيقية من صفحة **المستخدمين** عند الحاجة.

بعد أول دخول:

1. غيّر كلمة مرور المدير من قائمة المستخدم.
2. أنشئ حسابات الأمين العام ومدير الصندوق والمحاسب وأمين الصندوق الحقيقيين.
3. وزّع الصلاحيات من مصفوفة الصلاحيات.
4. راجع **السماح بالتسجيل الذاتي** من الإعدادات: أبقِه مفتوحاً لاستقبال طلبات معلقة، أو أغلقه بعد إنشاء الحسابات.
5. ابدأ بإضافة الأعضاء؛ الاستحقاقات الشهرية تُنشأ تلقائياً.

أنشئ الحسابات من صفحة **المستخدمون** داخل التطبيق بدل سكربتات البذر القديمة.

---

## 12. هيكل المشروع

```
api/
  app.ts                     واجهة REST كاملة (Hono + postgres.js)
  server.mjs                 خادم تطوير محلي على 8787
  .env                       أسرار محلية (غير مرفوعة)
netlify/functions/api.ts     غلاف Netlify Function لـ /api/*
src/
  components/      الواجهات المشتركة (Layout, MultiFileUpload, SignaturePad, PrintSheet, ...)
  lib/             api, auth, session, realtime, toast, format, pdf, public
  pages/           Dashboard, Members, Subscriptions, Receipts, Expenses, Reports,
                   SecondaryBox, Users, Audit, Settings, Verify
  types.ts
supabase/
  functions/api/index.ts     Edge Function القديمة (احتياط تاريخي)
  migrations/                0001 … 0014
scripts/
  create-neon-db.mjs         إنشاء قاعدة Neon قابلة للمطالبة
  restore-neon.mjs           استرجاع كامل + تحقق من الأعداد
  migrate-storage.mjs        نسخ كائنات التخزين إلى fund_storage
  apply-sql.mjs              تطبيق ملف SQL على قاعدة محددة
  setup-preview-site.mjs     إنشاء/تحديث موقع Netlify ومتغيراته
  test-api.mjs               اختبار شامل من 11 نقطة
  restore-backup.mjs         استعادة متقدمة للمسؤول التقني
  generate-icons.mjs         أيقونات PWA
  generate-native-assets.mjs أيقونات/شاشات Capacitor
android/                     مشروع Capacitor Android
.github/workflows/           deploy-pages.yml + build-apk.yml + keep-alive.yml
                             + uptime.yml + daily-backup.yml
docs/ترحيل-قاعدة-البيانات.md
docs/دليل-المستخدم.md
docs/استعادة-النسخة.md
docs/التشغيل-الدائم.md
docs/الإنتاج.md
```

---

## 13. الاستحقاق التلقائي وإبقاء قاعدة البيانات نشطة

- عند أول دخول كل شهر هجري جديد، ينشئ النظام استحقاقاً بقيمة الاشتراك الشهري لكل عضو نشط.
- زر **توليد استحقاقات فترة** مخصص للفترات السابقة أو التوليد الجماعي ضمن نطاق أشهر وأعضاء محددين.
- workflow `.github/workflows/keep-alive.yml` يعمل **كل 6 ساعات** (4 مرات يومياً):
  - يطلب `/health?db=1` للتأكد من عمل الدالة والقاعدة.
  - يطلب `/cron/dues` بالسر `CRON_SECRET` لإنشاء استحقاق الشهر الحالي
    وتشغيل تذكير نهاية الشهر الهجري.
- `.github/workflows/uptime.yml` يفحص الصحة **كل 15 دقيقة**، ويفتح Issue عند
  الفشل ويغلقه بعد التعافي.
- `.github/workflows/daily-backup.yml` ينشئ **نسخة احتياطية يومية** ويحتفظ
  بآخر 30 نسخة.
- يمكن تشغيل أي workflow يدوياً من تبويب **Actions → Run workflow**.
- GitHub قد يؤخر المهام المجدولة أو يوقفها بعد خمول طويل؛ لذلك أضف مراقباً
  خارجياً (UptimeRobot أو cron-job.org) كل 5 دقائق.
- التفاصيل الكاملة: [`docs/التشغيل-الدائم.md`](docs/التشغيل-الدائم.md).
- خطة Neon المجانية لا توقف المشروع عند الخمول؛ تنام الحوسبة وتستيقظ تلقائياً.

---

## 14. استكشاف الأخطاء

| المشكلة | الحل |
|---|---|
| صفحة بيضاء بعد النشر | حدّث الصفحة بقوة (Ctrl+F5) أو ألغِ تسجيل Service Worker من إعدادات المتصفح |
| خطأ 401 | انتهت الجلسة. سجّل الدخول من جديد |
| خطأ 403 | دور الحساب لا يملك الصلاحية |
| بطء أول طلب | Cold start لدالة Netlify (2–4 ثوانٍ). الطلبات التالية أسرع |
| فشل رفع ملف | تحقق من الحجم والنوع، ومن تسجيل الدخول |
| فشل بناء APK | راجع سجل GitHub Actions؛ تأكد من أسرار keystore وAndroid SDK 36 |
| فشل نشر Pages | تأكد أن الدفع إلى `main` وأن Pages Source = GitHub Actions |
| الموقع/التطبيق لا يفتح إلا مع VPN | `github.io` و`*.workers.dev` و`*.pages.dev` محجوبة على YemenNet، و`netlify.app` تعمل. استخدم `https://banan-fund.netlify.app/`. راجع `docs/التشغيل-الدائم.md` |
| توقف الدالة عن العمل | افحص `/api/health?db=1` وسجلات Netlify Functions، وتأكد من `DATABASE_URL` و`PG_POOL_MAX=2` |

---

## 15. ملاحظات الخطة المجانية

- Neon Free: 100 مشروع، 100 ساعة-حوسبة لكل مشروع شهريًا، 1 GB تخزين، 5 GB نقل.
- Netlify Free: استضافة الواجهة والدوال ضمن الحدود المجانية.
- GitHub Pages مجاني للمستودعات العامة (سجل تاريخي فقط).
- GitHub Actions مجاني ضمن دقائق الحساب.
- لا حاجة لخادم شخصي يعمل دائماً.
- راقب حدود Neon (حجم القاعدة والعمليات) من لوحة المشروع؛ الحجم الحالي نحو 10 MB.
- خطة Neon المجانية لا توقف المشروع عند الخمول، بل تُنيم الحوسبة وتستيقظ تلقائياً.
- إذا كان `github.io` محجوباً في شبكتك، استخدم Netlify (المعتمد) أو Vercel أو
  Firebase Hosting أو نطاقاً مخصصاً؛ لا تعتمد على VPN للتشغيل الدائم.

---

## 16. النسخة القديمة (SQLite/Express)

النسخة الأولى (Express + SQLite) محفوظة في الوسم:

```powershell
git checkout sqlite-reference
```

الفرع `main` مخصص الآن لنسخة Neon + Netlify. لا تستخدم خادم Express في الإنتاج.
