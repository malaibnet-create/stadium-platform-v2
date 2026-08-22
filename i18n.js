(function () {
  'use strict';

  const STORAGE_KEY = 'malaib_language';
  const SUPPORTED = new Set(['ar', 'en']);
  const arToEn = {
    'ملاعب NET - حجز': 'Malaib NET - Booking',
    'ملاعب NET': 'Malaib NET',
    'ملاعب': 'Malaib',
    'ملاعب.net': 'Malaib.net',
    'إنشاء حساب - منصة ملاعب': 'Create an account - Malaib NET',
    'إعدادات الملعب - لوحة التحكم': 'Stadium settings - Dashboard',
    'مرحباً بك في ملاعب NET': 'Welcome to Malaib NET',
    'مرحبًا بك في ملاعب NET': 'Welcome to Malaib NET',
    'اختر الخدمة المناسبة لك.': 'Choose the service that suits you.',
    'خدمات أصحاب الملاعب': 'Stadium owner services',
    'إنشاء واجهة ملعب': 'Create a stadium page',
    'تسجيل دخول صاحب الملعب': 'Stadium owner login',
    'دخول إلى لوحة التحكم': 'Open dashboard',
    'تسجيل دخول المسؤول': 'Administrator login',
    'للاعبين': 'For players',
    'البحث عن ملاعب قريبة': 'Find nearby stadiums',
    'تواصل للإبلاغ عن مشكلة': 'Contact us to report a problem',
    'الملعب غير موجود أو تم حذف الحساب': 'The stadium does not exist or the account was deleted',
    'هذا الملعب غير متوفر حاليًا': 'This stadium is currently unavailable',
    'العودة للواجهة': 'Back to the main page',
    'إنشاء حساب جديد': 'Create a new account',
    'إضافة ملعب جديد': 'Add a new stadium',
    'متابعة لإنشاء الحساب': 'Continue to create the account',
    'متابعة لإضافة الملعب': 'Continue to add the stadium',
    'الاسم الكامل': 'Full name',
    'أدخل اسمك': 'Enter your name',
    'مثال: محمد العلوي': 'Example: Mohamed Alaoui',
    'البريد الإلكتروني': 'Email address',
    'كلمة المرور': 'Password',
    'اسم الملعب أو الجمعية': 'Stadium or association name',
    'مثلاً: ملعب السعادة': 'Example: Happiness Stadium',
    'يمكنك تغيير هذا لاحقاً من الإعدادات': 'You can change this later from settings',
    'لديك حساب بالفعل؟': 'Already have an account?',
    'العودة إلى الصفحة الرئيسية': 'Back to the home page',
    'يرجى تذكر الرقم السري جيداً، فهو وسيلتك الوحيدة لدخول لوحة التحكم.': 'Keep your password safe. You will need it to access the dashboard.',
    'تأكيد البريد الإلكتروني': 'Verify email address',
    'لقد أرسلنا رمزاً إلى بريدك، أدخله هنا:': 'We sent a code to your email. Enter it here:',
    'تأكيد ودخول': 'Verify and continue',
    'تم إنشاء الحساب بنجاح!': 'Account created successfully!',
    'تمت إضافة الملعب بنجاح!': 'Stadium added successfully!',
    'أهلاً بك': 'Welcome',
    'في منصتنا.': 'to our platform.',
    'رابط صفحة الحجز الخاصة بملعبك:': 'Your stadium booking page link:',
    'نسخ الرابط': 'Copy link',
    'صور الشاشة أو احفظ رمز QR لوضعه في مدخل الملعب': 'Save the QR code and display it at the stadium entrance',
    'تنزيل صورة QR للملعب': 'Download stadium QR image',
    'صوّر الكود بهاتفك للحجز من تطبيق الملعب': 'Scan the code with your phone to book through the stadium app',
    'احجز ملعبك بسهولة': 'Book your stadium easily',
    'صوّر هذا الكود بهاتفك للحجز': 'Scan this code with your phone to book',
    'افتح كاميرا الهاتف وامسح الكود': 'Open your phone camera and scan the code',
    'سيتم فتح صفحة حجز هذا الملعب': 'This stadium booking page will open',
    'اضغط مطولًا على الصورة ثم اختر حفظ الصورة': 'Press and hold the image, then choose Save Image',
    'الدخول للوحة التحكم': 'Open dashboard',
    'أين توجد لوحة المسؤول؟': 'Where is the owner dashboard?',
    'تم إنشاء حساب ملعبك بنجاح. لإدارة الأسعار وساعات العمل والبيانات، اضغط على زر': 'Your stadium account was created. To manage prices, opening hours and information, press',
    'الموجود أسفل هذه الصفحة.': 'at the bottom of this page.',
    'يمكنك لاحقًا فتح لوحة التحكم من الرابط:': 'You can open the dashboard later using this link:',
    'فهمت، متابعة': 'Got it, continue',
    'مرحبًا بك في لوحة مسؤول الملعب': 'Welcome to the stadium owner dashboard',
    'من هذه الصفحة يمكنك تعديل بيانات الملعب والأسعار وساعات العمل وتحديد الموقع.': 'From this page you can edit stadium information, prices, opening hours and location.',
    'للحجوزات، استخدم صفحة الحجز المرتبطة برمز QR.': 'Use the booking page linked to the QR code to manage bookings.',
    'إعدادات ملعبك': 'Your stadium settings',
    'رمز QR الخاص بملعبك': 'Your stadium QR code',
    'حمّل الصورة وعلّقها في الملعب ليتمكن اللاعبون من الحجز.': 'Download and display this image at the stadium so players can book.',
    'اسم الملعب التجاري': 'Stadium business name',
    'نوع الملعب': 'Stadium type',
    'ملعب كرة قدم كبير': 'Full-size football stadium',
    'كرة سلة': 'Basketball',
    'كرة تنس': 'Tennis',
    'كرة طائرة': 'Volleyball',
    'كرة يد': 'Handball',
    'متعدد الرياضات': 'Multi-sport',
    'سعر حجز الملعب بالساعة': 'Hourly booking price',
    'سعر الساعة نهاراً (درهم)': 'Day price per hour (MAD)',
    'سعر الساعة ليلاً (درهم)': 'Night price per hour (MAD)',
    'رقم هاتف المشرف (المكلف بالملعب)': 'Stadium manager phone number',
    'تحديد موقع الملعب *': 'Set stadium location *',
    'تحديد موقعي الحالي': 'Use my current location',
    'تحديد الموقع / إعادة تحديد الموقع': 'Set / update location',
    'تم التقاط إحداثيات الملعب بنجاح لتفعيل خاصية "الملاعب القريبة".': 'Stadium coordinates were saved successfully for the nearby stadiums feature.',
    'هام:': 'Important:',
    'اضغط على 📍 وأنت': 'Press 📍 while you are',
    'داخل الملعب': 'inside the stadium',
    'تُستخدم الإحداثيات لخاصية الملاعب القريبة وزر الخريطة.': 'Coordinates are used for nearby stadiums and the map button.',
    'روابط التواصل الاجتماعي': 'Social media links',
    'رابط صفحة الفيسبوك': 'Facebook page link',
    'مثال: facebook.com/stadium.name': 'Example: facebook.com/stadium.name',
    'رابط حساب الإنستغرام': 'Instagram profile link',
    'مثال: instagram.com/stadium.name': 'Example: instagram.com/stadium.name',
    'نصيحة:': 'Tip:',
    'اذهب إلى صفحتك وانسخ الرابط من شريط العنوان في المتصفح لضمان عمله بشكل صحيح.': 'Open your page and copy its address from the browser address bar.',
    'حفظ التغييرات ونشر الصفحة': 'Save changes and publish page',
    'لوحة تحكم المسؤول': 'Owner dashboard',
    'الإعدادات': 'Settings',
    'الإلغاءات': 'Cancellations',
    'البيانات': 'Analytics',
    'إضافة ملعب': 'Add stadium',
    'طرق الدفع': 'Payments',
    'دخول النظام': 'Sign in',
    'يرجى إدخال رمز الوصول الخاص بملعبك': 'Enter your stadium access code',
    'نسيت كود الدخول؟': 'Forgot your access code?',
    'دخول المسؤول': 'Owner login',
    'لوحة التحكم': 'Dashboard',
    'موقع الملعب': 'Stadium location',
    'ملاعب قريبة': 'Nearby stadiums',
    'قوانين الملعب': 'Stadium rules',
    'تعليمات هامة:': 'Important instructions:',
    'سعر الساعة نهاراً': 'Day hourly rate',
    'سعر الساعة ليلاً': 'Night hourly rate',
    'يُحدَّد سعر النهار أو الليل تلقائياً حسب موسم وتاريخ الحجز.': 'The day or night rate is selected automatically based on the season and booking date.',
    'يمنع السب أو السلوك غير الرياضي نهائياً.': 'Abusive language and unsporting behavior are strictly prohibited.',
    'الحفاظ على نظافة الملعب والمرافق التابعة له.': 'Keep the stadium and its facilities clean.',
    'الحضور قبل الموعد بـ 10 دقائق لتأكيد الحجز.': 'Arrive 10 minutes before the booking time to confirm your reservation.',
    'حسناً، فهمت': 'Understood',
    'تفاصيل وقوانين الملعب': 'Stadium information and rules',
    'ألبوم صور الملعب': 'Stadium photo gallery',
    'ملعب قرب حديث': 'Modern local stadium',
    'شباك المرمى': 'Goal net',
    'حماس المباراة': 'Match atmosphere',
    'مرحباً بكم في منصة ملاعب NET': 'Welcome to Malaib NET',
    'احجز وقتك الآن واستمتع باللعب': 'Book your time now and enjoy the game',
    'أجواء كروية حماسية في انتظارك': 'An exciting football atmosphere awaits you',
    'السابق': 'Previous',
    'القادم': 'Next',
    'الشهر والسنة': 'Month and year',
    'تثبيت الحجز': 'Pin booking',
    'اليوم': 'Today',
    'الأحد': 'Sunday',
    'الإثنين': 'Monday',
    'الاثنين': 'Monday',
    'الثلاثاء': 'Tuesday',
    'الأربعاء': 'Wednesday',
    'الخميس': 'Thursday',
    'الجمعة': 'Friday',
    'السبت': 'Saturday',
    'الساعة': 'Time',
    'سعر الساعة': 'Hourly rate',
    'درهم / ساعة': 'MAD / hour',
    'د.م': 'MAD',
    'الاسم الكامل:': 'Full name:',
    'رقم الهاتف': 'Phone number',
    'رقم الهاتف (واتساب):': 'Phone number (WhatsApp):',
    'أنا أتحمل مسؤولية هذا الحجز وأتعهد بالحضور.': 'I accept responsibility for this booking and agree to attend.',
    'تأكيد الحجز': 'Confirm booking',
    'إلغاء': 'Cancel',
    'إغلاق': 'Close',
    'جاري التحميل...': 'Loading...',
    'جاري تحديد موقعك وجلب الملاعب...': 'Detecting your location and loading stadiums...',
    'ملاعب في محيط 20 كلم': 'Stadiums within 20 km',
    'اختر الملعب المفضل لبدء الحجز:': 'Choose a stadium to start booking:',
    'اتصال مباشر': 'Call',
    'إرسال رسالة واتساب': 'Send WhatsApp message',
    'التواصل مع مشرف الملعب': 'Contact stadium manager',
    'اختر طريقة التواصل المناسبة': 'Choose a contact method',
    'شروط الاستخدام': 'Terms of use',
    'سياسة الخصوصية': 'Privacy policy',
    'تواصل معنا': 'Contact us',
    'التواصل معنا': 'Contact us',
    'فيسبوك': 'Facebook',
    'إنستغرام': 'Instagram',
    'الإلغاء والاسترداد': 'Cancellation and refunds',
    'تواصل مع المطور': 'Contact the developer',
    'جميع الحقوق محفوظة': 'All rights reserved',
    'ثبت تطبيق "ملاعب NET" لحجز أسرع!': 'Install the Malaib NET app for faster booking!',
    'الخطة المجانية': 'Free plan',
    'الخطة الاحترافية': 'Premium plan',
    'شهري': 'Monthly',
    'سنوي - خصم شهرين': 'Yearly - two months free',
    'اشترك الآن': 'Subscribe now',
    'الموصى به': 'Recommended',
    'عرض خطط الترقية والمميزات': 'View upgrade plans and features',
    'اختر خطة النجاح لملعبك': 'Choose the right plan for your stadium',
    'ملعب واحد فقط': 'One stadium only',
    'إدارة وإلغاء الحجوزات': 'Manage and cancel bookings',
    'إدارة الأسعار وأوقات العمل': 'Manage prices and opening hours',
    'إحصائيات الحجوزات والأرباح': 'Booking and revenue analytics',
    'إدارة عدة ملاعب من حساب واحد': 'Manage multiple stadiums from one account',
    'لوحة تحكم موحدة لجميع الملاعب': 'One dashboard for all stadiums',
    'إضافة صور الملعب': 'Add stadium photos',
    'دعم عبر واتساب': 'WhatsApp support',
    'حذف الحساب': 'Delete account',
    'وضع الصيانة (إيقاف الحجز):': 'Maintenance mode (stop bookings):',
    'حفظ التغييرات النهائية': 'Save all changes',
    'جاري الحفظ...': 'Saving...',
    'تم نسخ الرابط!': 'Link copied!',
    'يرجى ملء جميع الخانات': 'Please complete all fields',
    'أدخل كود المسؤول هنا': 'Enter the owner access code',
    'أو': 'or',
    'أدخل البريد الإلكتروني وكلمة المرور.': 'Enter your email address and password.',
    'الرمز غير صحيح أو منتهي الصلاحية، حاول مجدداً.': 'The code is incorrect or expired. Please try again.',
    'الاتصال بطيء جدًا أو انقطع. تحقق من اتصال Wi‑Fi وحاول مرة أخرى.': 'The connection is too slow or was interrupted. Check Wi-Fi and try again.',
    'تعذر إنشاء الحساب بسبب بطء الاتصال. تحقق من Wi‑Fi وحاول مرة أخرى.': 'Could not create the account because the connection is slow. Check Wi-Fi and try again.',
    'تعذر الاتصال بخادم التحقق. حاول مرة أخرى.': 'Could not reach the verification server. Please try again.',
    'استجابة غير صالحة من خادم التحقق': 'Invalid response from the verification server',
    'انتهت جلسة التحقق. اطلب رمزًا جديدًا ثم حاول مرة أخرى.': 'The verification session expired. Request a new code and try again.',
    'الخدمة غير موجودة حالياً (HTTP 404). يجب نشر نسخة Worker التي تحتوي على verifyOTP.': 'The service is currently unavailable (HTTP 404). Deploy the Worker version that includes verifyOTP.',
    'تعذر الاتصال بالخادم. تحقق من اتصال Wi‑Fi وحاول مرة أخرى.': 'Could not connect to the server. Check Wi-Fi and try again.',
    'فشل تحميل البيانات، يرجى التأكد من الاتصال بالإنترنت وتحديث الصفحة.': 'Could not load data. Check your internet connection and refresh the page.',
    'جاري إرسال الرمز...': 'Sending code...',
    'جاري التحقق...': 'Verifying...',
    'جاري الحفظ النهائي...': 'Finalizing...',
    'جاري الحفظ والتحميل...': 'Saving and loading...',
    'تم تحديد إحداثيات ملعبك بدقة عالية!': 'Your stadium location was detected successfully!',
    'تم تحديد إحداثيات ملعبك بدقة عالية.': 'Your stadium location was detected successfully.',
    'فشل الحصول على الموقع.': 'Could not get your location.',
    'متصفحك لا يدعم تحديد الموقع.': 'Your browser does not support location services.',
    'يرجى السماح للمتصفح بالوصول إلى موقعك.': 'Allow the browser to access your location.',
    'يرجى السماح للمتصفح بالوصول للموقع (Permission Denied).': 'Allow browser location access (permission denied).',
    'متصفحك لا يدعم خاصية تحديد الموقع.': 'Your browser does not support location services.',
    'حدث خطأ في قاعدة البيانات:': 'Database error:',
    'تعذر حذف الحساب:': 'Could not delete the account:',
    'تعذر تنفيذ الطلب': 'Could not complete the request',
    'خطأ غير معروف': 'Unknown error',
    'تم حذف الحساب بنجاح.': 'Account deleted successfully.',
    'تم إلغاء عملية الحذف.': 'Account deletion was cancelled.',

    // المرحلة الثانية: لوحة المسؤول والنوافذ الديناميكية
    'جاري تحميل الإعدادات الحالية...': 'Loading current settings...',
    'تعذر العثور على بيانات الملعب': 'Stadium information could not be found',
    'إعدادات الملعب': 'Stadium settings',
    'اسم الملعب:': 'Stadium name:',
    'نوع الملعب:': 'Stadium type:',
    'سعر حجز الملعب للساعة': 'Hourly stadium booking price',
    'تحديد موقع الملعب:': 'Set stadium location:',
    'تم حفظ إحداثيات الملعب.': 'Stadium coordinates were saved.',
    'اضغط الزر وأنت داخل الملعب. سيستخدم اللاعبون هذه الإحداثيات لفتح الخريطة.': 'Press the button while inside the stadium. Players will use these coordinates to open the map.',
    'روابط الصور (الشعار والسلايدر):': 'Image links (logo and slider):',
    'ارفع الصور على': 'Upload the images to',
    'ثم اختر الرابط الثاني في قائمة الاختيارات:': 'then choose the second link in the list:',
    'رابط اللوجو:': 'Logo link:',
    'ضع الرابط الثاني من القائمة: Direct link': 'Paste the second link from the list: Direct link',
    'صور السلايدر (1، 2، 3):': 'Slider images (1, 2, 3):',
    'صورة 1: الرابط الثاني Direct link': 'Image 1: second Direct link',
    'صورة 2: الرابط الثاني Direct link': 'Image 2: second Direct link',
    'صورة 3: الرابط الثاني Direct link': 'Image 3: second Direct link',
    'فيسبوك:': 'Facebook:',
    'إنستغرام:': 'Instagram:',
    'كلمة مرور جديدة:': 'New password:',
    'اتركه فارغاً للحفاظ على الحالية': 'Leave blank to keep the current password',
    'تأكد من حفظها جيداً، فهي مفتاح دخولك للوحة التحكم.': 'Keep it safe; it is your dashboard access key.',
    'ساعات عمل الملعب:': 'Stadium opening hours:',
    'وقت الافتتاح': 'Opening time',
    'وقت الإغلاق': 'Closing time',
    'عند التفعيل، سيظهر تنبيه للمستخدمين وسيتم قفل جدول المواعيد بالكامل.': 'When enabled, users will see a notice and the entire booking schedule will be locked.',
    'سيتم حذف بيانات الملعب من المنصة. لا تقم بهذا الإجراء إلا إذا كنت متأكدًا.': 'The stadium data will be removed from the platform. Only continue if you are certain.',
    'يجب إدخال ثمن النهار وثمن الليل قبل الحفظ.': 'Day and night prices are required before saving.',
    'تم تحديث كلمة المرور. سجّل الدخول مرة أخرى.': 'Password updated. Please sign in again.',
    'تم تحديث بيانات الملعب بنجاح!': 'Stadium information updated successfully!',
    'تم فقدان الاتصال بالشبكة.': 'The network connection was lost.',
    'حدث خطأ في السكريبت:': 'Script error:',
    'تعذر حفظ إعدادات الملعب.': 'Could not save stadium settings.',
    'حفظ التغييرات': 'Save changes',
    'خطأ في الاتصال بالسيرفر': 'Server connection error',
    'كيفية رفع الصور والحصول على رابط:': 'How to upload images and get a link:',
    'ادخل لموقع Postimages.org.': 'Open Postimages.org.',
    'ارفع صورتك.': 'Upload your image.',
    'بعد الرفع، اختر الرابط الثاني في قائمة الاختيارات: Direct link.': 'After upload, choose the second option: Direct link.',
    'انسخ الرابط والصقه في الخانة المناسبة.': 'Copy the link and paste it into the appropriate field.',
    'اضغط زر 📍 لتحديد إحداثيات الملعب قبل الحفظ.': 'Press 📍 to set the stadium coordinates before saving.',

    // الحجوزات والإلغاءات
    'جاري جلب الحجوزات...': 'Loading bookings...',
    'لا توجد حجوزات مسجلة حالياً.': 'There are currently no bookings.',
    'إلغاء الحجوزات': 'Cancel bookings',
    'اسحب الجدول يمينًا ويسارًا لرؤية جميع الخانات': 'Swipe the table horizontally to view all columns',
    'التاريخ': 'Date',
    'الاسم': 'Name',
    'الهاتف': 'Phone',
    'إجراء': 'Action',
    'هل أنت متأكد من إلغاء هذا الحجز نهائياً؟': 'Are you sure you want to cancel this booking permanently?',
    'تم إلغاء الحجز بنجاح': 'Booking cancelled successfully',
    'غير مصرح لك: الكود السري غير صحيح.': 'Unauthorized: the access code is incorrect.',
    'فشل الإلغاء:': 'Cancellation failed:',
    'خطأ في جلب البيانات، تأكد من اتصال الإنترنت.': 'Could not load data. Check your internet connection.',
    'محجوز': 'Booked',
    'مفتوح الآن': 'Open now',
    'نعتذر منك، لا يمكن إتمام الحجز حالياً لأن الملعب في حالة صيانة أو إصلاح.': 'Booking is currently unavailable because the stadium is under maintenance.',
    'الملعب في حالة صيانة ولا يمكن الحجز حالياً.': 'The stadium is under maintenance and cannot be booked now.',
    'لا يمكن الحجز بدون اتصال بالإنترنت': 'Booking requires an internet connection',
    'أنت غير متصل بالإنترنت. لا يمكنك الحجز الآن.': 'You are offline. Booking is currently unavailable.',
    'يرجى إدخال الاسم ورقم الهاتف والموعد.': 'Enter your name, phone number and booking time.',
    'يرجى إدخال رقم هاتف صحيح بالأرقام فقط.': 'Enter a valid phone number using digits only.',
    'يرجى إدخال رقم هاتف صحيح (أرقام فقط بدون حروف أو رموز).': 'Enter a valid phone number using digits only, without letters or symbols.',
    'يرجى تأكيد التعهد بالحضور.': 'Please confirm your attendance commitment.',
    'عذراً، يجب اختيار ساعات متتالية وفي نفس اليوم.': 'Please select consecutive hours on the same day.',
    'جاري التحقق من المواعيد...': 'Checking availability...',
    'جاري التأكد والحجز...': 'Confirming your booking...',
    'تم الحجز بنجاح!': 'Booking completed successfully!',
    'تعذر إتمام الحجز. حاول مرة أخرى.': 'Could not complete the booking. Please try again.',
    'الموعد المحدد': 'Selected appointment',
    'تذكرة حجز مباراة': 'Match booking ticket',
    'الملعب:': 'Stadium:',
    'الوقت:': 'Time:',
    'السعر الإجمالي:': 'Total price:',
    'تم عبر ملاعب NET': 'Booked through Malaib NET',
    'ساعتان': 'Two hours',
    'ساعة': 'hour',
    'نهاري': 'Daytime',
    'ليلي': 'Nighttime',

    // الإحصائيات والأرشيف
    'جاري تحليل البيانات المالية والزمنية...': 'Analyzing financial and booking data...',
    'تقرير السنة المالية': 'Financial year report',
    'تحديث تلقائي': 'Automatic update',
    'معلومة:': 'Note:',
    'يتم تحديث الإحصائيات وأرشفة الحجوزات': 'Statistics and bookings are archived',
    'كل بداية أسبوع جديد': 'at the beginning of each new week',
    'الحجوزات الجارية ستظهر هنا فور ترحيلها للأرشيف.': 'Current bookings will appear here once they are archived.',
    'الشهر': 'Month',
    'عدد الساعات': 'Hours',
    'المداخيل (د.م)': 'Revenue (MAD)',
    'المجموع السنوي': 'Annual total',
    'يتم احتساب المداخيل بناءً على أسعار النهار والليل المحددة في الإعدادات.': 'Revenue is calculated using the day and night prices configured in settings.',
    'فشل في تحليل البيانات المالية.': 'Could not analyze financial data.',
    'جاري تحميل الأرشيف والإحصائيات...': 'Loading archive and analytics...',
    'تعذر تحميل الإحصائيات': 'Could not load analytics',
    'تعذر تحميل الأرشيف': 'Could not load booking archive',
    'إجمالي الحجوزات': 'Total bookings',
    'إجمالي الساعات': 'Total hours',
    'إجمالي المداخيل': 'Total revenue',
    'الإحصائيات الشهرية': 'Monthly analytics',
    'الحجوزات': 'Bookings',
    'الساعات': 'Hours',
    'الدخل': 'Revenue',
    'لا توجد إحصائيات مؤرشفة بعد.': 'No archived analytics yet.',
    'أرشيف الحجوزات': 'Booking archive',
    'العميل': 'Customer',
    'السعر وقت الحجز': 'Price at booking time',
    'لا توجد حجوزات مؤرشفة بعد.': 'No archived bookings yet.',
    'السعر المعروض هو السعر المحفوظ لحظة إنشاء الحجز، وليس السعر الحالي.': 'The displayed price is the price saved when the booking was created, not the current price.',

    // تسجيل دخول المسؤول واستعادة كلمة المرور
    'من فضلك أدخل الكود أولاً': 'Enter the access code first',
    'استجابة غير صالحة من الخادم.': 'Invalid server response.',
    'إعداد PASSWORD_PEPPER أو SESSIONS غير مكتمل في Cloudflare Worker.': 'PASSWORD_PEPPER or SESSIONS is not configured in Cloudflare Worker.',
    'فشل اتصال Worker بـGoogle Apps Script. تأكد من نشر Code.gs في نفس المشروع المرتبط بـAPPS_SCRIPT_URL.': 'The Worker could not reach Google Apps Script. Make sure Code.gs is deployed in the project linked to APPS_SCRIPT_URL.',
    'كلمة السر غير صحيحة، حاول مرة أخرى.': 'Incorrect password. Please try again.',
    'خطأ في الاتصال بالسيرفر.': 'Server connection error.',
    'أدخل بريدك الإلكتروني المسجل لإرسال الكود إليه:': 'Enter your registered email address to receive the code:',
    'يرجى إدخال بريد إلكتروني صحيح': 'Enter a valid email address',
    'جاري إرسال الكود إلى بريدك... يرجى الانتظار': 'Sending the code to your email. Please wait...',
    'تم إرسال كود الدخول إلى بريدك الإلكتروني بنجاح.': 'The access code was sent to your email successfully.',
    'هذا البريد غير مطابق للبريد المسجل لهذا الملعب.': 'This email does not match the email registered for this stadium.',
    'حدث خطأ، تأكد من إعدادات البريد في سكريبت جوجل.': 'An error occurred. Check the email settings in Google Apps Script.',
    'فشل الاتصال بالسيرفر لإرسال الإيميل.': 'Could not contact the server to send the email.',
    'فشل إرسال الإيميل. تأكد من صحة البريد أو صلاحيات الوصول.': 'Could not send the email. Check the address and access permissions.',
    'لا توجد بيانات سابقة أو حدث خطأ في الجلب.': 'No previous data is available, or loading failed.',
    'بيانات الدخول غير صحيحة.': 'Incorrect login details.',
    'تعذر تسجيل الدخول حالياً.': 'Could not sign in at this time.',
    'جاري تسجيل الدخول...': 'Signing in...',
    'جلسة لوحة التحكم غير صالحة': 'The dashboard session is invalid',

    // إضافة ملعب وإدارة الحساب
    'أدخل معلومات الملعب كما تظهر في صفحة إعدادات الداشبورد.': 'Enter the stadium information as it should appear in dashboard settings.',
    'مثلاً: ملعب نجوم بوعسل': 'Example: Stars Stadium',
    'رقم هاتف المشرف أو المكلف بالملعب': 'Stadium manager phone number',
    'حدد إحداثيات موقعك الحالي': 'Detect your current coordinates',
    'تم التقاط إحداثيات الملعب بنجاح.': 'Stadium coordinates detected successfully.',
    'اضغط 📍 وأنت داخل الملعب. سيُستخدم الموقع لخاصية الملاعب القريبة وزر الخريطة.': 'Press 📍 while inside the stadium. The location is used for nearby stadiums and the map button.',
    'رابط صفحة فيسبوك': 'Facebook page link',
    'رابط حساب إنستغرام': 'Instagram account link',
    'إنشاء ملعب جديد': 'Create new stadium',
    'أدخل اسم الملعب أولاً.': 'Enter the stadium name first.',
    'اضغط زر 📍 لتحديد إحداثيات الملعب قبل الإنشاء.': 'Press 📍 to set the stadium coordinates before creating it.',
    'إنشاء الملعب': 'Create stadium',
    'جاري الإنشاء...': 'Creating...',
    'تعذر إنشاء الملعب': 'Could not create the stadium',
    'لم يُرجع الخادم معرف الملعب الجديد': 'The server did not return the new stadium identifier',
    'تم إنشاء الملعب وفتحه بنجاح.': 'The stadium was created and opened successfully.',
    'تعذر معرفة الملعب الحالي.': 'Could not identify the current stadium.',
    'تعذر فتح إعدادات الملعب المختار.': 'Could not open settings for the selected stadium.',
    'ملاعب هذا الحساب': 'Stadiums in this account',
    'ملاعب حسابك': 'Your stadiums',
    'اضغط على أي ملعب للانتقال إليه': 'Select a stadium to open it',
    'الملعب الحالي': 'Current stadium',
    'جاري تحميل ملاعب الحساب...': 'Loading account stadiums...',
    'تعذر تحميل ملاعب الحساب': 'Could not load account stadiums',
    'تعذر تحديد حساب الملعب.': 'Could not identify the stadium account.',
    'للتأكيد النهائي اكتب: حذف': 'For final confirmation, type: DELETE',
    'الرقم السري غير صحيح.': 'The access code is incorrect.',
    'حدث خطأ أثناء الحذف:': 'An error occurred while deleting:',
    'تحقق من جلسة الدخول واتصال الإنترنت.': 'Check your login session and internet connection.',
    'يرجى الانتظار حتى يظهر رمز QR ثم حاول مرة أخرى.': 'Wait for the QR code to appear, then try again.',
    'تعذر تجهيز الصورة. حاول مرة أخرى.': 'Could not prepare the image. Please try again.',
    'إذا لم يبدأ التنزيل، اسمح بالنوافذ المنبثقة ثم حاول مرة أخرى.': 'If the download does not start, allow pop-ups and try again.',

    // Premium والدفع
    'حساب احترافي (Premium)': 'Premium account',
    'حساب مجاني (Limited)': 'Free account (limited)',
    'جاري التحقق من حالة الاشتراك...': 'Checking subscription status...',
    'جميع ملاعب حسابك مشتركة بالفعل في Premium.': 'All stadiums in your account already have Premium.',
    'يرجى اختيار ملعب واحد على الأقل.': 'Select at least one stadium.',
    'حدد الملاعب أولاً': 'Select stadiums first',
    'اختر عددًا من 1 إلى 52 أسبوعًا.': 'Choose between 1 and 52 weeks.',
    'إعدادات طرق الدفع': 'Payment settings',
    'حدد كيف ترغب في استلام مستحقات الحجز من اللاعبين.': 'Choose how you want to receive booking payments from players.',
    'الدفع نقداً (في الملعب)': 'Cash payment at the stadium',
    'مفعّل حالياً': 'Currently enabled',
    'الدفع عبر البطاقة البنكية': 'Bank card payment',
    'قيد التطوير (قريباً)': 'In development (coming soon)',
    'عذراً، خدمة الدفع المباشر بالبطاقة البنكية قيد التطوير حالياً.': 'Direct bank card payment is currently under development.',
    'سيتم الآن توجيهك إلى واتساب.': 'You will now be redirected to WhatsApp.',
    'مؤقتاً لتفعيل حسابك فوراً.': 'temporarily to activate your account immediately.',
    'طلب تفعيل': 'Request activation',
    'هذه الخاصية قيد التطوير حالياً.': 'This feature is currently under development.',
    'سيتم تفعيل الدفع بالبطاقة البنكية فور انتهاء الإجراءات القانونية والتقنية.': 'Bank card payments will be enabled after the legal and technical setup is complete.',
    'تفعيل الدفع الإلكتروني يتطلب التوفر على "مقاول ذاتي" أو "شركة". نحن نعمل على تسهيل هذه العملية لكم.': 'Online payments require self-employed or company status. We are working to simplify this process.',
    'بطاقة بنكية': 'Bank card',
    'تحويل بنكي': 'Bank transfer',
    'صوّر الوصل للإدلاء به في الملعب أو عند المشرف على الملعب.': 'Keep a photo of the receipt to show at the stadium or to the stadium manager.',
    'يرجى إرفاق صورة وصل التحويل في المحادثة.': 'Attach a photo of the transfer receipt in the conversation.',
    'ارسل التفاصيل للفريق (واتساب)': 'Send details to the team (WhatsApp)',
    'سنوي': 'Yearly',
    'أسبوعًا': 'weeks',

    // الملاعب القريبة والحالات
    'لا توجد ملاعب في محيط 20 كلم حالياً.': 'There are currently no stadiums within 20 km.',
    'نوع غير محدد': 'Type not specified',
    'نوع الملعب غير محدد': 'Stadium type not specified',
    'ملعب تابع': 'Related stadium',
    'صورة الملعب': 'Stadium image',
    'يبعد': 'is',
    'كلم عنك': 'km away',
    'الخريطة': 'Map',
    'حجز الآن': 'Book now',
    'فشل في جلب الملاعب، تأكد من اتصال الإنترنت.': 'Could not load stadiums. Check your internet connection.',
    'يرجى تفعيل الموقع (GPS) للبحث عن الملاعب.': 'Enable location services (GPS) to find stadiums.',
    'يجب السماح للمتصفح بالوصول لموقعك لرؤية الملاعب القريبة.': 'Allow browser location access to view nearby stadiums.',
    'استغرق تحديد الموقع وقتًا طويلًا. حاول مرة أخرى.': 'Location detection took too long. Please try again.',
    'تعذر تحديد الموقع الحالي. حاول في مكان مفتوح.': 'Could not detect your location. Try again in an open area.',

    // الأشهر والأنواع والحالات
    'يناير': 'January',
    'فبراير': 'February',
    'مارس': 'March',
    'أبريل': 'April',
    'مايو': 'May',
    'يونيو': 'June',
    'يوليو': 'July',
    'أغسطس': 'August',
    'سبتمبر': 'September',
    'أكتوبر': 'October',
    'نوفمبر': 'November',
    'ديسمبر': 'December',
    'كرة قدم مصغرة': 'Mini-football',
    'كرة قدم': 'Football',
    'بادل': 'Padel',

    // الصفحات القانونية
    'آخر تحديث:': 'Last updated:',
    'من نحن': 'Who we are',
    'المعلومات التي نجمعها': 'Information we collect',
    'كيفية استخدام المعلومات': 'How we use information',
    'مشاركة المعلومات': 'Sharing information',
    'الدفع الإلكتروني': 'Online payments',
    'حقوق المستخدمين': 'User rights',
    'استخدام المنصة': 'Using the platform',
    'الحجز والدفع': 'Booking and payment',
    'مسؤولية اللاعب': 'Player responsibilities',
    'مسؤولية صاحب الملعب': 'Stadium owner responsibilities',
    'الملكية الفكرية': 'Intellectual property',
    'القانون المعمول به': 'Applicable law',
    'سياسة الإلغاء والاسترداد': 'Cancellation and refund policy',
    'إلغاء الحجز من طرف اللاعب': 'Cancellation by the player',
    'الدفع عند الوصول': 'Payment on arrival',
    'إلغاء الحجز من طرف صاحب الملعب': 'Cancellation by the stadium owner',
    'طلب الاسترداد': 'Requesting a refund',
    'مرحبًا بكم في': 'Welcome to',
    'نحن نلتزم بحماية خصوصية مستخدمينا واحترام بياناتهم الشخصية. توضح هذه السياسة كيفية جمع المعلومات واستخدامها وحمايتها عند استخدام منصة MalaibNet لحجز ملاعب القرب.': 'We protect user privacy and personal data. This policy explains how information is collected, used and protected when using MalaibNet to book local stadiums.',
    'MalaibNet منصة إلكترونية مغربية تتيح للاعبين حجز ملاعب القرب بسهولة، كما توفر لأصحاب الملاعب أدوات لإدارة الحجوزات ومتابعة نشاط ملاعبهم.': 'MalaibNet is a Moroccan online platform that helps players book local stadiums and gives owners tools to manage bookings and monitor activity.',
    'الاسم الكامل.': 'Full name.',
    'رقم الهاتف.': 'Phone number.',
    'تاريخ ووقت الحجز.': 'Booking date and time.',
    'اسم الملعب وقيمة الحجز وطريقة الدفع.': 'Stadium name, booking amount and payment method.',
    'معلومات تقنية مثل نوع المتصفح والجهاز وعنوان IP لتحسين الأداء والأمان.': 'Technical information such as browser, device and IP address to improve performance and security.',
    'تستخدم المعلومات لإنشاء الحجوزات وإدارتها، تأكيد الحجز، التواصل عند الحاجة، تمكين صاحب الملعب من إدارة الحجوزات، تحسين الخدمة، إعداد الإحصاءات، وحماية المنصة.': 'Information is used to create and manage bookings, confirm reservations, communicate when needed, help owners manage bookings, improve the service, produce analytics and protect the platform.',
    'لا تبيع MalaibNet البيانات الشخصية ولا تؤجرها. يتم فقط مشاركة بيانات الحجز الضرورية مع صاحب الملعب لإدارة الحجز.': 'MalaibNet does not sell or rent personal data. Only the booking details needed to manage a reservation are shared with the stadium owner.',
    'تتم معالجة الدفع الإلكتروني بواسطة PayZone، ولا تحتفظ MalaibNet بأرقام البطاقات البنكية أو بياناتها السرية.': 'Online payments are processed by PayZone. MalaibNet does not store bank card numbers or confidential card details.',
    'معرفة البيانات المحفوظة عنه.': 'Access the data stored about them.',
    'طلب تصحيح البيانات.': 'Request correction of their data.',
    'طلب حذف البيانات عند عدم وجود مانع قانوني.': 'Request deletion where no legal restriction applies.',
    'الاستفسار عن طريقة استخدام البيانات.': 'Ask how their data is used.',
    'يمكن التواصل مع إدارة منصة MalaibNet عبر وسائل الاتصال المتوفرة على الموقع.': 'You can contact the MalaibNet team using the contact methods available on the website.',
    'تنظم هذه الشروط استخدام منصة': 'These terms govern the use of',
    'الخاصة بحجز وإدارة ملاعب القرب.': 'for booking and managing local stadiums.',
    'تقديم معلومات صحيحة عند الحجز.': 'Provide accurate information when booking.',
    'استخدام المنصة بطريقة قانونية.': 'Use the platform lawfully.',
    'عدم استخدام بيانات شخص آخر دون إذنه.': 'Do not use another person data without permission.',
    'عدم محاولة تعطيل المنصة أو اختراقها.': 'Do not attempt to disrupt or compromise the platform.',
    'يجب على المستخدم إدخال الاسم الصحيح، رقم هاتف صحيح، اختيار التاريخ والوقت، واختيار طريقة الدفع.': 'Users must provide a correct name and phone number, select the date and time, and choose a payment method.',
    'توفر MalaibNet الدفع الإلكتروني أو الدفع عند الوصول.': 'MalaibNet supports online payment or payment on arrival.',
    'احترام موعد الحجز.': 'Respect the booking time.',
    'الحضور في الوقت المحدد.': 'Arrive at the scheduled time.',
    'المحافظة على مرافق الملعب.': 'Take care of stadium facilities.',
    'عدم إجراء حجوزات وهمية.': 'Do not create fraudulent bookings.',
    'يلتزم صاحب الملعب بتحديث أوقات العمل، إدارة الحجوزات، احترام الحجوزات المؤكدة، واستخدام بيانات اللاعبين فقط لإدارة الحجز.': 'The stadium owner must keep opening hours updated, manage bookings, honor confirmed reservations and use player data only to manage bookings.',
    'جميع عناصر المنصة من تصميم وشعارات وصور ونصوص وبرمجيات وقاعدة بيانات هي ملك لـ MalaibNet أو لأصحاب الحقوق.': 'All platform designs, logos, images, text, software and databases belong to MalaibNet or their respective rights holders.',
    'تخضع هذه الشروط للقوانين المعمول بها في المملكة المغربية.': 'These terms are governed by the laws of the Kingdom of Morocco.',
    'تنظم هذه السياسة قواعد إلغاء الحجوزات واسترداد المبالغ في منصة': 'This policy explains booking cancellation and refund rules on',
    'الدفع الإلكتروني عبر PayZone.': 'Online payment through PayZone.',
    'الدفع عند الوصول إلى الملعب.': 'Payment upon arrival at the stadium.',
    'يجوز للاعب إلغاء الحجز قبل موعده وفق الشروط التي يحددها صاحب الملعب أو السياسة العامة للمنصة.': 'A player may cancel before the booking time according to the stadium owner terms or the platform general policy.',
    'إذا اختار اللاعب الدفع عند الوصول، لا يترتب على MalaibNet أي التزام مالي تجاه اللاعب أو صاحب الملعب.': 'When payment on arrival is selected, MalaibNet has no financial obligation to the player or stadium owner.',
    'إذا تم الدفع إلكترونيًا عبر PayZone، فإن أي استرداد مستحق يتم وفق إجراءات المنصة ومزود خدمة الدفع، وقد يستغرق عدة أيام عمل.': 'For online payments through PayZone, eligible refunds follow platform and payment-provider procedures and may take several business days.',
    'يجوز لصاحب الملعب إلغاء الحجز بسبب ظروف طارئة، سوء الأحوال الجوية، الصيانة، عطل فني، أو أي ظرف يمنع تقديم الخدمة.': 'A stadium owner may cancel due to emergencies, weather, maintenance, technical failure or another condition preventing the service.',
    'يمكن للمستخدم التواصل مع إدارة MalaibNet عبر وسائل الاتصال الرسمية مع تزويدها بمعلومات الحجز اللازمة لدراسة الطلب.': 'Users can contact MalaibNet through official channels and provide the booking details needed to review a refund request.'
  };

  const phraseEntries = Object.entries(arToEn)
    .sort((a, b) => b[0].length - a[0].length)
    .map(([arabic, english]) => {
      const escaped = arabic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const startsArabic = /^[\u0600-\u06ff]/u.test(arabic);
      const endsArabic = /[\u0600-\u06ff]$/u.test(arabic);
      const source = `${startsArabic ? '(?<![\\u0600-\\u06ff])' : ''}${escaped}${endsArabic ? '(?![\\u0600-\\u06ff])' : ''}`;
      return [arabic, english, new RegExp(source, 'gu')];
    });
  const originalText = new WeakMap();
  const originalAttributes = new WeakMap();

  function getLanguage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return SUPPORTED.has(saved) ? saved : 'ar';
  }

  function translate(value, language = getLanguage()) {
    if (language === 'ar' || value == null) return String(value ?? '');
    let result = String(value);
    for (const [arabic, english, pattern] of phraseEntries) {
      if (result.includes(arabic)) result = result.replace(pattern, english);
    }
    return result;
  }

  function applyDirection(language) {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dataset.language = language;
  }

  function translateTextNode(node, language) {
    if (!originalText.has(node)) originalText.set(node, node.nodeValue);
    const source = originalText.get(node);
    const nextValue = language === 'ar' ? source : translate(source, language);
    if (node.nodeValue !== nextValue) node.nodeValue = nextValue;
  }

  function translateElementAttributes(element, language) {
    const names = ['placeholder', 'title', 'aria-label', 'alt'];
    if (!originalAttributes.has(element)) originalAttributes.set(element, {});
    const saved = originalAttributes.get(element);
    for (const name of names) {
      if (!element.hasAttribute(name)) continue;
      if (!(name in saved)) saved[name] = element.getAttribute(name);
      const nextValue = language === 'ar' ? saved[name] : translate(saved[name], language);
      if (element.getAttribute(name) !== nextValue) element.setAttribute(name, nextValue);
    }
    if (element.matches('input[type="button"], input[type="submit"]')) {
      if (!('value' in saved)) saved.value = element.value;
      const nextValue = language === 'ar' ? saved.value : translate(saved.value, language);
      if (element.value !== nextValue) element.value = nextValue;
    }
  }

  function translateTree(root = document, language = getLanguage()) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root, language);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;
    if (root.nodeType === Node.ELEMENT_NODE) translateElementAttributes(root, language);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (parent && !parent.closest('script,style,textarea,code,[data-no-translate]')) translateTextNode(node, language);
      } else {
        translateElementAttributes(node, language);
      }
    }
  }

  function createSwitcher() {
    if (document.getElementById('malaibLanguageSwitcher')) return;
    const wrapper = document.createElement('div');
    wrapper.id = 'malaibLanguageSwitcher';
    wrapper.setAttribute('data-no-translate', 'true');
    wrapper.innerHTML = '<span aria-hidden="true">🌐</span><select id="malaibLanguageSelect" aria-label="Language"><option value="ar">العربية</option><option value="en">English</option></select>';
    const style = document.createElement('style');
    style.textContent = '#malaibLanguageSwitcher{position:fixed;top:12px;left:12px;z-index:1000002;display:flex;align-items:center;gap:6px;background:#fff;border:1px solid #dbe3f0;border-radius:999px;padding:5px 9px;box-shadow:0 4px 14px #0f172a24;font-family:Arial,sans-serif}#malaibLanguageSwitcher select{border:0;outline:0;background:transparent;color:#173b82;font-weight:700;font-size:13px;cursor:pointer;padding:3px}html[dir="ltr"] body{direction:ltr}html[dir="rtl"] body{direction:rtl}html[dir="ltr"] [dir="rtl"],html[dir="ltr"] [style*="direction:rtl"],html[dir="ltr"] [style*="direction: rtl"]{direction:ltr!important}html[dir="ltr"] [style*="text-align:right"],html[dir="ltr"] [style*="text-align: right"],html[dir="ltr"] .owner-dashboard-form,html[dir="ltr"] .owner-form-section,html[dir="ltr"] #adminSectionContent,html[dir="ltr"] #bookingFormContent,html[dir="ltr"] #paymentOptions{text-align:left!important}html[dir="ltr"] #adminSectionContent{direction:ltr!important}html[dir="ltr"] #malaibLanguageSwitcher{left:auto;right:12px}@media(max-width:480px){#malaibLanguageSwitcher{top:8px;left:8px;padding:4px 7px}html[dir="ltr"] #malaibLanguageSwitcher{left:auto;right:8px}#malaibLanguageSwitcher select{font-size:12px}}';
    document.head.appendChild(style);
    document.body.appendChild(wrapper);
    const select = wrapper.querySelector('select');
    select.value = getLanguage();
    select.addEventListener('change', () => {
      localStorage.setItem(STORAGE_KEY, select.value);
      location.reload();
    });
  }

  const nativeAlert = window.alert.bind(window);
  const nativeConfirm = window.confirm.bind(window);
  const nativePrompt = window.prompt.bind(window);
  window.alert = message => nativeAlert(translate(message));
  window.confirm = message => nativeConfirm(translate(message));
  window.prompt = (message, defaultValue) => {
    const source = String(message ?? '');
    if (getLanguage() === 'en' && source.includes('اكتب: حذف')) {
      const answer = nativePrompt('For final confirmation, type: DELETE', defaultValue);
      return String(answer || '').trim().toUpperCase() === 'DELETE' ? 'حذف' : answer;
    }
    return nativePrompt(translate(source), defaultValue);
  };

  function initialize() {
    const language = getLanguage();
    applyDirection(language);
    if (language === 'en') document.title = translate(document.title, language);
    createSwitcher();
    translateTree(document.body, language);
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) translateTree(node, language);
        if (mutation.type === 'characterData') translateTree(mutation.target, language);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  applyDirection(getLanguage());
  window.MalaibI18n = { getLanguage, translate, translateTree, setLanguage(language) {
    if (!SUPPORTED.has(language)) return;
    localStorage.setItem(STORAGE_KEY, language);
    location.reload();
  }};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
