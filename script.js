

(function setupNetworkMonitoring() {
    // 1. إنشاء عنصر التنبيه وإضافته لمرة واحدة
    let offlineBanner = document.getElementById('offline-banner');
    if (!offlineBanner) {
        offlineBanner = document.createElement('div');
        offlineBanner.id = 'offline-banner';
        offlineBanner.innerHTML = '⚠️ أنت غير متصل بالإنترنت. لا يمكنك الحجز الآن.';
        offlineBanner.style.display = 'none';
        document.body.prepend(offlineBanner);
    }

    function updateOnlineStatus() {
        const confirmBtn = document.getElementById('submitFinalBooking');

        if (navigator.onLine) {
            offlineBanner.style.display = 'none';
            if (confirmBtn) {
                confirmBtn.classList.remove('btn-disabled');
                confirmBtn.title = ""; // إزالة أي نص توضيحي عند المنع
            }
        } else {
            offlineBanner.style.display = 'block';
            if (confirmBtn) {
                confirmBtn.classList.add('btn-disabled');
                confirmBtn.title = "لا يمكن الحجز بدون اتصال بالإنترنت";
            }
            // التنبيه يظهر فقط إذا حاول المستخدم التفاعل أو عند انقطاع مفاجئ
            console.warn("تم فقدان الاتصال بالشبكة.");
        }
    }

    // الاستماع لتغيرات الشبكة
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // الفحص عند تحميل الصفحة وعند اكتمال عناصر الـ DOM
    window.addEventListener('load', updateOnlineStatus);
    document.addEventListener('DOMContentLoaded', updateOnlineStatus);
    
    // تشغيل فوري أولي
    updateOnlineStatus();
})();

// 1. الإعدادات والروابط الأساسية
const settingsScriptURL = 'https://script.google.com/macros/s/AKfycbzp97V8vSTWtDhkiQ0NgxMzvFZ0qecuXA29fSM0ceU5LCilVQCgkK5EbAi48eBOGndoJQ/exec?key=B_Assel_Admin_2026_Sec';
const bookingScriptURL = 'https://script.google.com/macros/s/AKfycbzp97V8vSTWtDhkiQ0NgxMzvFZ0qecuXA29fSM0ceU5LCilVQCgkK5EbAi48eBOGndoJQ/exec?key=B_Assel_Admin_2026_Sec';


const urlParams = new URLSearchParams(window.location.search);
const stadiumId = urlParams.get('id'); 

// تحديث الـ ID في التخزين المحلي فوراً بمجرد الدخول من رابط يحتوي عليه
if (stadiumId) {
    localStorage.setItem('lastVisitedStadiumId', stadiumId);
}

// --- دالة المانيفست الموحدة ---
function setupFixedManifest() {
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
    
    const myFixedManifest = {
        "short_name": "ملاعب NET",
        "name": "ملاعب NET - منصة حجز الملاعب",
        "id": "stadium-platform-main-fixed", 
        "start_url": baseUrl + "index.html", // العودة دائماً للرابط الرئيسي ليقرر التوجيه
        "scope": baseUrl, 
        "display": "standalone",
        "background_color": "#ffffff",
        "theme_color": "#1e3a8a",
        "icons": [
            { "src": baseUrl + "logo_no_background.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
            { "src": baseUrl + "logo_no_background.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
        ]
    };

    try {
        const stringManifest = JSON.stringify(myFixedManifest);
        const base64Manifest = btoa(unescape(encodeURIComponent(stringManifest)));
        const manifestURL = 'data:application/json;base64,' + base64Manifest;
        
        const oldManifest = document.querySelector('link[rel="manifest"]');
        if (oldManifest) oldManifest.remove();

        let link = document.createElement('link');
        link.id = 'dynamic-manifest';
        link.rel = 'manifest';
        link.href = manifestURL;
        document.head.appendChild(link);
    } catch (e) {
        console.error("Manifest Error: ", e);
    }
}

// استدعاء المانيفست
setupFixedManifest();

// --- نظام تحديث الحالة (بدون توجيه قسري) ---
(function syncAppState() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    
    // إذا دخل المستخدم لملعب، نتأكد أن النظام "يتذكر" هذا الملعب كآخر زيارة
    if (stadiumId) {
        localStorage.setItem('lastVisitedStadiumId', stadiumId);
    }
    
    // ملاحظة: قمنا بإزالة window.location.replace من هنا 
    // لأن ملف index.html أصبح هو المسؤول عن التوجيه عند بداية التشغيل.
})();


// 6. بقية الكود الخاص بك (دوال جلب البيانات من السيرفر)
// تذكر: عند نجاح Fetch وجلب اسم الملعب الحقيقي، قم باستدعاء setupDynamicManifest(stadiumName) مرة أخرى لتحديث الاسم.


let selectedSlots = [];
let currentStartDate = getMonday(new Date());

window.stadiumData = null;







// 2. جلب تفاصيل الملعب وتحديث الواجهة
async function loadStadiumDynamicDetails() {
    if (!stadiumId) return;

    // 1. (اختياري) إظهار رسالة تحميل بسيطة في الجدول
    const tableBody = document.getElementById('tableBody');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">جاري تحميل المواعيد...</td></tr>';

    try {
        const response = await fetch(`${settingsScriptURL}&action=getStadiumDetails&id=${stadiumId}`);
        const data = await response.json();

        if (data !== "NotFound") {
            // تخزين الحالة في متغير عالمي لاستخدامه عند الضغط على زر الحجز
            window.stadiumData = data; 
            window.stadiumStatus = data.status;
            if (data.lat) {
                const latInput = document.getElementById('lat');
                if (latInput) latInput.value = data.lat;
            }
            if (data.lng) {
                const lngInput = document.getElementById('lng');
                if (lngInput) lngInput.value = data.lng;
            }

           // 1. النصوص الأساسية 
if (data.stadium_name) {
    // تحديث عنوان المتصفح فقط دون المساس بهوية التطبيق المثبت
    document.title = data.stadium_name + " - ملاعب NET"; 
    
    const nameEl = document.getElementById('displayStadiumName');
    if (nameEl) nameEl.innerText = data.stadium_name;
}

            // بقية الكود الخاص بالاسم واللوغو والأسعار يظل كما هو...
            if (data.stadium_name) {
                document.getElementById('displayStadiumName').innerText = data.stadium_name;
            }
            // ... (احذف أي كود كان يعمل InnerHTML لمسح الجدول)
            
          

            // 1. النصوص الأساسية 
            if (data.stadium_name) {
                document.title = "حجز " + data.stadium_name;
                const nameEl = document.getElementById('displayStadiumName');
                if (nameEl) nameEl.innerText = data.stadium_name;
            }

const orgEl = document.getElementById('displayOrg');
if (orgEl) orgEl.innerText = "بإشراف: " + (data.org || "");

// 2. حل مشكلة اللوغو
const logoImg = document.getElementById('displayLogo');
if (logoImg) {
    // استخدم الصورة المحلية كقيمة افتراضية صلبة
    const platformLogo = "logo_no_background.png"; 
    
    // فحص الرابط القادم من الداتا (تأكد أنه ليس نص "undefined")
    const hasRemoteLogo = data.logo_url && data.logo_url.trim() !== "" && data.logo_url !== "undefined";
    
    logoImg.src = hasRemoteLogo ? data.logo_url : platformLogo;

    // إضافة معالج خطأ: إذا فشل الرابط الخارجي، عد للصورة المحلية
    logoImg.onerror = function() {
        this.src = platformLogo;
        this.onerror = null; // لمنع الحلقة اللانهائية
    };
}
    
            // 3. تحديث الأسعار والمودال
            if (document.getElementById('modalStadiumName')) {
                document.getElementById('modalStadiumName').innerText = data.stadium_name;
            }
            document.getElementById('displayPriceDay').innerText = data.price_day;
            const nightRow = document.getElementById('nightPriceRow');
            if(data.price_night && nightRow) {
                nightRow.style.display = "block";
                document.getElementById('displayPriceNight').innerText = data.price_night;
            }

            // 4. الواتساب
            window.stadiumPhone = data.phone;
            const whatsappFloat = document.getElementById('whatsappFloat');
            if (whatsappFloat && data.phone) {
                let cleanPhone = data.phone.toString().replace(/\s+/g, '');
                if (cleanPhone.startsWith('0')) cleanPhone = '212' + cleanPhone.substring(1);
                const msg = encodeURIComponent(`السلام عليكم، استفسار عن حجز ${data.stadium_name}`);
                whatsappFloat.href = `https://wa.me/${cleanPhone}?text=${msg}`;
            }
            
            // 5. زر الموقع
         const locBtn = document.getElementById('btnLocation');
            if(locBtn) {
                if (data.location && data.location.trim() !== "" && data.location.startsWith('http')) {
                    locBtn.style.opacity = "1";
                    locBtn.onclick = (e) => {
                        e.preventDefault();
                        window.open(data.location, '_blank');
                    };
                } else if (data.lat && data.lng) { 
                    // إذا لم يوجد رابط ولكن توجد إحداثيات، نفتح الموقع بناءً عليها
                    locBtn.style.opacity = "1";
                    locBtn.onclick = (e) => {
                        e.preventDefault();
                        window.open(`https://www.google.com/maps?q=${data.lat},${data.lng}`, '_blank');
                    };
                } else {
                    locBtn.style.opacity = "0.5";
                    locBtn.onclick = (e) => {
                        e.preventDefault();
                        alert("عذراً، موقع الملعب غير متوفر حالياً.");
                    };
                }
            }

            // 6. الروابط الاجتماعية
            const handleSocialLink = (id, link) => {
                const el = document.getElementById(id);
                if (el) {
                    if (link && link.trim() !== "" && link !== "#") {
                        el.href = link;
                        el.style.display = "inline-flex";
                    } else {
                        el.style.display = "none";
                    }
                }
            };
            handleSocialLink('fbLink', data.fb);
            handleSocialLink('igLink', data.insta);

            // 7. زر الإيميل
            const emailBtn = document.getElementById('emailLink');
            if (emailBtn) {
                emailBtn.href = "mailto:3dworkben@gmail.com";
                emailBtn.onclick = (e) => {
                    e.preventDefault();
                    window.location.href = "mailto:3dworkben@gmail.com";
                };
            }

            // 9. إصلاح السلايدر
            const swiperWrapper = document.querySelector('.swiper-wrapper');
            if (swiperWrapper) {
                let images = [];
                if (data.img1 && data.img1.trim().startsWith('http')) images.push(data.img1.trim());
                if (data.img2 && data.img2.trim().startsWith('http')) images.push(data.img2.trim());
                if (data.img3 && data.img3.trim().startsWith('http')) images.push(data.img3.trim());

                const defaultImages = [
                    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800",
                    "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800",
                    "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800"
                ];

                const imagesToDisplay = images.length > 0 ? images : defaultImages;
                swiperWrapper.innerHTML = ''; 

                imagesToDisplay.forEach((imgUrl) => {
                    swiperWrapper.innerHTML += `
                        <div class="swiper-slide">
                            <img src="${imgUrl}" 
                                 onerror="this.src='${defaultImages[0]}'"
                                 style="width:100%; height:100%; object-fit:cover; display:block;">
                        </div>`;
                });

                if (window.mySwiper) window.mySwiper.destroy(true, true);
                window.mySwiper = new Swiper('.swiper-container', {
                    loop: true,
                    autoplay: { delay: 3000, disableOnInteraction: false },
                    pagination: { el: '.swiper-pagination', clickable: true },
                    navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
                });
            } // نهاية if (swiperWrapper)
      // استدعاء بناء الجدول مع تمرير البيانات الجديدة لضمان السرعة والدقة
            if (typeof initTable === "function") {
                initTable(data); 
            }

        } else {
            // في حال لم يتم العثور على الملعب
            if (tableBody) tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">عذراً، لم يتم العثور على بيانات هذا الملعب.</td></tr>';
        }
      
    } catch (error) { 
        console.error("Error loading details:", error); 
        // عرض رسالة الخطأ للمستخدم في حال فشل الاتصال بالسيرفر
        const tableBody = document.getElementById('tableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="8" style="color:red; text-align:center; padding:20px;">⚠️ فشل تحميل البيانات، يرجى التأكد من الاتصال بالإنترنت وتحديث الصفحة.</td></tr>';
        }
    }
} // نهاية الدالة loadStadiumDynamicDetails






function initTable(dataFromFetch) {
    const tableBody = document.getElementById('tableBody');
    const headerRow = document.getElementById('headerRow');
    const footerRow = document.getElementById('footerRow'); 
    const dateDisplay = document.getElementById('dateDisplay');
    
    if (!tableBody || !headerRow) return;

    // --- 1. تحديد الساعات (تعديل الأداء) ---
    const data = dataFromFetch || window.stadiumData;
    let startHour = 8; 
    let endHour = 23;

    if (data) {
        if (data.openHour !== undefined && data.openHour !== "") {
            startHour = parseInt(data.openHour);
        }
        if (data.closeHour !== undefined && data.closeHour !== "") {
            endHour = parseInt(data.closeHour);
        }
    }

    // تفريغ السطر العلوي والسفلي تمهيداً لملئهما
    headerRow.innerHTML = '<th>الساعة</th>';
    if (footerRow) footerRow.innerHTML = '<th>الساعة</th>';
    
    const daysArr = ["الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت", "الأحد"];
    
    let displayDate = new Date(currentStartDate.getTime());
    dateDisplay.innerText = displayDate.toLocaleDateString('ar-MA', { month: 'long', year: 'numeric' });

    let currentWeekDates = [];
    for (let i = 0; i < 7; i++) {
        let d = new Date(currentStartDate.getTime());
        d.setDate(d.getDate() + i); 
        
        let fullDate = getFormattedDate(d);
        currentWeekDates.push({name: daysArr[i], date: fullDate, rawDate: d}); 
        
        let cellContent = `${daysArr[i]}<br><small>${d.getDate()}</small>`;
        
        // إضافة اليوم والتاريخ للسطر العلوي والسفلي معاً
        headerRow.innerHTML += `<th>${cellContent}</th>`;
        if (footerRow) footerRow.innerHTML += `<th>${cellContent}</th>`;
    }

    const now = new Date();
    let allRowsHtml = ''; 

    // --- 2. بناء الصفوف بناءً على الساعات المحددة أعلاه ---
    for (let hour = startHour; hour <= endHour; hour++) {
        let hLabel24 = `${hour}:00`; 
        let currentH = hour > 12 ? hour - 12 : hour;
        let nextH = (hour + 1) > 12 ? (hour + 1) - 12 : (hour + 1);
        
        if (hour === 12) currentH = 12;
        if ((hour + 1) === 12) nextH = 12;
        if (hour === 0) currentH = 12;

        let suffix = (hour >= 12) ? "م" : "ص";
        let hLabelRange = `${currentH} إلى ${nextH} ${suffix}`; 

        let row = `<tr><td style="background:#f8fafc; font-weight:bold; white-space: nowrap; font-size: 0.85rem; padding: 5px; border: 1px solid #ddd;">${hLabelRange}</td>`;
        
        for (let day = 0; day < 7; day++) {
            let slotTime = new Date(currentWeekDates[day].rawDate.getTime());
            slotTime.setHours(hour, 0, 0, 0);

            if (slotTime < now) {
                row += `<td class="slot past" 
                            data-date="${currentWeekDates[day].date.trim()}" 
                            data-hour="${hLabel24}" 
                            style="background-color: #f1f5f9; color: #cbd5e1; cursor: not-allowed; pointer-events: none; font-size: 0.8rem; border: 1px solid #ddd;">منتهي</td>`;
            } else {
                row += `<td class="slot" 
                            style="background-color: #ffffff; cursor: pointer; border: 1px solid #ddd;"
                            data-date="${currentWeekDates[day].date.trim()}" 
                            data-day="${currentWeekDates[day].name}" 
                            data-hour="${hLabel24}" 
                            onclick="handleSlotSelection(this)">متاح</td>`;
            }
        }
        row += `</tr>`;
        allRowsHtml += row; 
    }
    
    tableBody.innerHTML = allRowsHtml;
    loadExistingBookings(); 
}

function getFormattedDate(date) {
    let day = String(date.getDate()).padStart(2, '0');
    let month = String(date.getMonth() + 1).padStart(2, '0');
    let year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// 4. الدوال المساعدة (يجب وجودها ليعمل الجدول)
function getMonday(d) {
    d = new Date(d);
    let day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function handleSlotSelection(element) {
    // 1. منع اختيار المربعات المحجوزة أو المنتهية
    if (element.innerText === "محجوز" || element.classList.contains("booked") || element.classList.contains("past")) return; 

    const isAlreadySelected = element.classList.contains('selected');
    const date = element.getAttribute('data-date');
    const hour = element.getAttribute('data-hour');
    const dayName = element.getAttribute('data-day');

    if (!isAlreadySelected) {
        // حماية: منع حجز أكثر من ساعتين
        if (selectedSlots.length >= 2) {
            alert("⚠️ عذراً، لا يمكن حجز أكثر من ساعتين متتاليتين.");
            return;
        }
        // حماية: التأكد أن الساعات متتالية وفي نفس اليوم
        if (selectedSlots.length === 1) {
            const firstSlot = selectedSlots[0];
            const firstHour = parseInt(firstSlot.hour.split(':')[0]);
            const currentHour = parseInt(hour.split(':')[0]);

            if (Math.abs(currentHour - firstHour) !== 1 || date !== firstSlot.date) {
                alert("⚠️ عذراً، يجب اختيار ساعات متتالية وفي نفس اليوم.");
                return;
            }
        }
    }

    // تفعيل/إلغاء اختيار المربع
    element.classList.toggle('selected');

    if (element.classList.contains('selected')) {
        selectedSlots.push({ hour, date, element, dayName }); 
        
        // --- إضافة التحديث هنا لضمان ظهور النص فوراً عند فتح النافذة ---
        updateModalDetails(); 
        
        document.getElementById('bookingModal').style.display = "flex";
        
        // --- منطق ذكاء زر الساعة الإضافية ---
        const extraBtn = document.getElementById('extraSlotContainer');
        if (selectedSlots.length === 1) {
            let nextH = (parseInt(hour.split(':')[0]) + 1) + ":00";
            let nextSlot = document.querySelector(`[data-date="${date}"][data-hour="${nextH}"]`);
            
            if (nextSlot && !nextSlot.classList.contains('booked') && !nextSlot.classList.contains('past')) {
                extraBtn.style.display = "block";
            } else {
                extraBtn.style.display = "none";
            }
        } else {
            extraBtn.style.display = "none";
        }
    } else {
        selectedSlots = selectedSlots.filter(s => s.element !== element);
        if (selectedSlots.length === 0) {
            document.getElementById('bookingModal').style.display = "none";
        } else {
            // تحديث النص في حال إلغاء ساعة واحدة وبقاء الأخرى
            updateModalDetails();
        }
    }
    // استدعاء أخير للتأكيد
    updateModalDetails(); 
}

function updateModalDetails() {
    const detailsElement = document.getElementById('selectedDetails');
    if (!detailsElement) {
        console.error("عنصر selectedDetails غير موجود في الصفحة!");
        return;
    }

    if (selectedSlots.length === 0) {
        detailsElement.style.display = 'none';
        return;
    }

    // ترتيب الساعات
    selectedSlots.sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

    const firstSlot = selectedSlots[0];
    const date = firstSlot.date;
    let text = "";

    if (selectedSlots.length === 1) {
        text = `📅 حجز يوم: ${date} | ⏰ الساعة: ${firstSlot.hour}`;
    } else {
        const lastSlot = selectedSlots[selectedSlots.length - 1];
        const nextHour = (parseInt(lastSlot.hour.split(':')[0]) + 1) + ":00";
        text = `📅 حجز يوم: ${date} | ⏰ من ${firstSlot.hour} إلى ${nextHour}`;
    }

    // التحديث الفعلي للنص والإظهار
    detailsElement.innerText = text;
    detailsElement.style.display = 'block';
    
    // تأكيد إضافي: أحياناً يكون العنصر مخفياً بسبب CSS الأب
    detailsElement.style.visibility = 'visible';
    detailsElement.style.opacity = '1';
}

async function submitFinalBooking() {
    if (window.stadiumStatus === "maintenance") {
        alert("نعتذر منك، لا يمكن إتمام الحجز حالياً لأن الملعب في حالة صيانة أو إصلاح.");
        return; // هذا السطر سيمنع الكود بالأسفل من العمل
    }
    const name = document.getElementById('userName').value;
    const phone = document.getElementById('userPhone').value;
    
    // 1. إضافة خاصية التحقق من رقم الهاتف (أرقام فقط ومن 10 إلى 13 رقماً)
    const phoneRegex = /^[0-9]{10,13}$/;
    if (!name || !phone) return alert("يرجى إدخال الاسم ورقم الهاتف.");
    
    if (!phoneRegex.test(phone)) {
        return alert("يرجى إدخال رقم هاتف صحيح (أرقام فقط بدون حروف أو رموز).");
    }

    // إظهار رسالة انتظار
    const btn = document.getElementById('finalConfirmBtn');
    const originalText = btn.innerText;
    btn.innerText = "جاري التأكد والحجز... ⏳";
    btn.disabled = true;

    try {
        // نستخدم حلقة تكرار لمعالجة الساعات واحدة تلو الأخرى للتأكد من خلوها في الشيت
        for (const slot of selectedSlots) {
            const response = await fetch(bookingScriptURL, {
                method: 'POST',
                body: JSON.stringify({
                    stadiumId: stadiumId,
                    dayName: slot.dayName,
                    date: slot.date,
                    hour: slot.hour,
                    name: name,
                    phone: phone
                })
            });

            const result = await response.json();

            // إذا كان الرد من الشيت يخبرنا بأن الساعة محجوزة بالفعل
            if (result.result === "error") {
                alert("⚠️ " + result.message);
                initTable(); 
                closeBookingModal();
                return; 
            }
        }

        // --- النجاح: تلوين الخانات في الجدول أولاً ---
        selectedSlots.forEach(slot => {
            if (slot.element) {
                slot.element.classList.remove('selected');
                slot.element.classList.add('booked');
                slot.element.innerText = "محجوز";
                slot.element.style.backgroundColor = "#ef4444"; 
                slot.element.style.color = "white";
                slot.element.style.pointerEvents = "none";
                slot.element.onclick = null;

                scheduleNotification(slot.date, slot.hour);
            }
        });

        // --- 2. بدلاً من رسالة alert، نقوم بحساب الوقت واستدعاء التذكرة ---
        selectedSlots.sort((a, b) => a.hour - b.hour);
        const firstSlot = selectedSlots[0];
        const lastSlot = selectedSlots[selectedSlots.length - 1];

        const startTime = firstSlot.hour + ":00";
        const endTime = (parseInt(lastSlot.hour) + 1) + ":00";
        const timeRange = `${startTime} إلى ${endTime}`;

        const currentStadiumName = document.title.split('-')[0] || "ملعب بوعسل";
        const stadiumUrl = window.location.href;

        // استدعاء دالة التذكرة (التي تتولى عرض التذكرة وخيار الواتساب)
        showBookingTicket(currentStadiumName, firstSlot.date, timeRange, stadiumUrl);

        // تحديث البيانات في الخلفية
        loadExistingBookings();

    } catch (error) {
        console.error("Error:", error);
        // تم إبقاء initTable لضمان تحديث الجدول في حالة وقوع خطأ تقني
        initTable();
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}
function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    const formContent = document.getElementById('bookingFormContent');
    const ticketContainer = document.getElementById('successTicketContainer');
    
    // 1. إغلاق النافذة
    if (modal) modal.style.display = "none";

    // 2. إعادة تصفير الواجهة (إظهار الفورم وإخفاء التذكرة لحجز جديد)
    if (formContent) formContent.style.display = 'block';
    if (ticketContainer) {
        ticketContainer.style.display = 'none';
        ticketContainer.innerHTML = ''; // مسح محتوى التذكرة السابقة
    }

    // 3. تنظيف الحقول
    const nameInput = document.getElementById('userName');
    const phoneInput = document.getElementById('userPhone');
    if (nameInput) nameInput.value = "";
    if (phoneInput) phoneInput.value = "";

    const checkbox = document.getElementById('confirmCheckbox');
    if (checkbox) checkbox.checked = false;

    // 4. إزالة تحديد المربعات الخضراء (فقط التي لم يتم حجزها بعد)
    selectedSlots.forEach(s => {
        if (s.element && !s.element.classList.contains('booked')) {
            s.element.classList.remove('selected');
        }
    });
    
    // 5. تصفير مصفوفة الساعات المختارة
    selectedSlots = [];
    
    // 6. تحديث حالة زر التأكيد
    if (typeof toggleSubmitButton === "function") toggleSubmitButton();
}

function toggleSubmitButton() {
    const checkbox = document.getElementById('confirmCheckbox');
    const btn = document.getElementById('finalConfirmBtn');
    if (checkbox && btn) {
        btn.disabled = !checkbox.checked;
        btn.style.opacity = checkbox.checked ? "1" : "0.5";
    }
}

function toggleRules() {
    const modal = document.getElementById('rulesModal');
    if (modal) {
        // إذا كانت مخفية، نفتحها بوضع flex لضمان التوسيط
        if (modal.style.display === 'none' || modal.style.display === '') {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // منع التمرير خلف النافذة
        } else {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }
}

function changeWeek(direction) {
    currentStartDate.setDate(currentStartDate.getDate() + (direction * 7));
    initTable();
}

function loadExistingBookings() {
    // 1. البحث عن أي سكريبت جلب بيانات قديم تم إنشاؤه سابقاً
    const oldScript = document.getElementById('dataFetchScript');
    
    // 2. إذا وجد سكريبت قديم، قم بحذفه فوراً لتنظيف الذاكرة
    if (oldScript) {
        oldScript.remove();
    }

    // 3. إنشاء عنصر سكريبت جديد
    const script = document.createElement('script');
    
    // 4. إعطاؤه معرف (ID) ثابت لكي نستطيع حذفه في المرة القادمة
    script.id = 'dataFetchScript'; 
    
    // 5. ربط المصدر بالرابط الخاص بك مع إضافة بصمة زمنية لمنع التخزين المؤقت (Cache)
    script.src = `${bookingScriptURL}&action=getBookings&id=${stadiumId}&callback=handleData&t=${new Date().getTime()}`;
    
    // 6. إضافة السكريبت إلى الصفحة لبدء جلب البيانات
    document.body.appendChild(script);
}

function handleData(bookings) {
    if (!Array.isArray(bookings)) return;
    
    bookings.forEach(b => {
        // نبحث عن المربع الذي يطابق التاريخ والساعة القادمين من الشيت
        const slot = document.querySelector(`[data-date="${b.date}"][data-hour="${b.hour}"]`);
        
        if (slot) {
            slot.innerText = "محجوز";
            slot.classList.add("booked"); // أضف كلاس للتصميم
            slot.style.backgroundColor = "#ef4444"; // لون أحمر
            slot.style.color = "white";
            slot.style.pointerEvents = "none"; // منع الضغط عليه
            slot.onclick = null; // إزالة وظيفة الضغط تماماً
        }
    });
}

// التشغيل
document.addEventListener('DOMContentLoaded', async () => {
    // 1. إخفاء حاوية المحتوى الرئيسية فوراً لضمان عدم ظهور نصوص افتراضية
    // (تأكد أن المحتوى محاط بـ div لديه كلاس container أو غيره للاسم الصحيح عندك)
    const mainContainer = document.querySelector('.container');
    if (mainContainer) mainContainer.style.opacity = '0';

    try {
        // 2. جلب تفاصيل الملعب (الاسم، اللوغو، السعر)
        await loadStadiumDynamicDetails();
        
        // 3. بناء الجدول وتحميل الحجوزات
        if (typeof initTable === "function") {
            await initTable();
        }

        // 4. إظهار المحتوى بسلاسة بعد اكتمال كل شيء
        if (mainContainer) {
            mainContainer.style.transition = 'opacity 0.4s ease-in-out';
            mainContainer.style.opacity = '1';
        }

        // 5. إخفاء شاشة التحميل (إذا كنت قد أضفت الـ Loader الذي اقترحته لك)
        const loader = document.getElementById('loadingScreen');
        if (loader) loader.style.display = 'none';

    } catch (error) {
        console.error("حدث خطأ أثناء تحميل البيانات:", error);
        // في حال حدوث خطأ، نظهر المحتوى على أي حال لكي لا تبقى الشاشة بيضاء
        if (mainContainer) mainContainer.style.opacity = '1';
    }
});

// إغلاق المودالات عند الضغط خارجها (ابقِ عليه كما هو، فهو صحيح)
window.onclick = function(event) {
    const bookingModal = document.getElementById('bookingModal');
    const rulesModal = document.getElementById('rulesModal');
    if (event.target == bookingModal) closeBookingModal();
    if (event.target == rulesModal) toggleRules();
}

function addNextSlot() {
    if (selectedSlots.length >= 1) {
        const lastSlot = selectedSlots[0];
        let nextH = (parseInt(lastSlot.hour.split(':')[0]) + 1) + ":00";
        let nextSlotElement = document.querySelector(`[data-date="${lastSlot.date}"][data-hour="${nextH}"]`);
        
        if (nextSlotElement) {
            handleSlotSelection(nextSlotElement); // اختر الساعة التالية برمجياً
            updateModalDetails();
        }
    }
}
// --- تحديث الجدول تلقائياً كل 15 ثانية ---
setInterval(() => {
    // نقوم بالتحديث فقط إذا كان المستخدم لا يملأ حالياً بيانات الحجز
    const modal = document.getElementById('bookingModal');
    if (modal && modal.style.display !== "block") {
        console.log("جاري تحديث الحجوزات تلقائياً...");
        if (typeof loadExistingBookings === "function") loadExistingBookings();
    }
}, 15000);

async function scheduleNotification(bookingDate, bookingHour) {
    if (!("Notification" in window)) {
        console.log("هذا المتصفح لا يدعم التنبيهات.");
        return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const [day, month, year] = bookingDate.split('/');
    const [hour] = bookingHour.split(':');
    const playTime = new Date(year, month - 1, day, parseInt(hour), 0, 0);
    const now = new Date();

    navigator.serviceWorker.ready.then(reg => {
        reg.showNotification("✅ تم الحجز بنجاح", {
            body: `موعدك في يوم ${bookingDate} الساعة ${bookingHour}. ننتظرك!`,
            icon: "logo_no_background.png",
            badge: "logo_no_background.png",
            vibrate: [100, 50, 100],
            tag: 'booking-confirmed'
        });
    });

    const setReminder = (hoursBefore, message, tag) => {
        const notifyTime = new Date(playTime.getTime() - (hoursBefore * 60 * 60 * 1000));
        if (notifyTime > now) {
            const delay = notifyTime.getTime() - now.getTime();
            setTimeout(() => {
                navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification("⚽ ملاعب NET", {
                        body: message,
                        icon: "logo_no_background.png",
                        badge: "logo_no_background.png",
                        vibrate: [200, 100, 200],
                        tag: tag,
                        requireInteraction: true
                    });
                });
            }, delay);
        }
    };

    setReminder(5, `تذكير: تبقى 5 ساعات على موعد مباراتك (${bookingHour}).`, 'reminder-5h');
    setReminder(1, `عجل يا بطل! تبقى ساعة واحدة فقط على انطلاق المباراة. ننتظرك!`, 'reminder-1h');
}

// --- كود PWA (يجب أن يكون مستقلاً تماماً في الخارج) ---
let deferredPrompt;
const installBanner = document.getElementById('installBanner');
const installBtn = document.getElementById('installApp');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBanner) installBanner.style.display = 'block';
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
            if (installBanner) installBanner.style.display = 'none';
        }
    });
}

window.addEventListener('appinstalled', () => {
    if (installBanner) installBanner.style.display = 'none';
    deferredPrompt = null;
    console.log('PWA was installed');
});
// --- 1. إعدادات المسؤول وحفظ التغييرات ---
async function saveAdminSettings(event) {
    const btn = event ? (event.target || event.currentTarget) : null;
    if (btn) {
        btn.disabled = true;
        btn.innerText = "جاري الحفظ... ⏳";
    }

    try {
        // 1. جلب كلمة المرور وتشفيرها
        const rawPass = document.getElementById('upd_pass')?.value || "";
        let finalPass = "";
        
        if (rawPass) {
            finalPass = await hashString(rawPass);
        }

        // 2. تجميع البيانات في كائن (Object) عادي أولاً لسهولة المعالجة
        const dataToSave = {
            action: "adminUpdateSettings",
            id: stadiumId,
            pass: finalPass,
            stadiumName: document.getElementById('upd_name')?.value || "",
            pDay: document.getElementById('upd_price_day')?.value || "",
            pNight: document.getElementById('upd_price_night')?.value || "",
            logo: document.getElementById('upd_logo')?.value || "",
            phone: document.getElementById('upd_phone')?.value || "",
            org: document.getElementById('upd_org')?.value || "",
            loc: document.getElementById('upd_loc')?.value || "",
            fb: document.getElementById('upd_fb')?.value || "",
            insta: document.getElementById('upd_insta')?.value || "",
            openHour: document.getElementById('openHourInput')?.value || "8",
            closeHour: document.getElementById('closeHourInput')?.value || "23",
            img1: document.getElementById('upd_img1')?.value || "",
            img2: document.getElementById('upd_img2')?.value || "",
            img3: document.getElementById('upd_img3')?.value || "",
            status: document.getElementById('upd_maintenance')?.checked ? "maintenance" : "open"
        };

        // 3. بناء الرابط النهائي بذكاء
        // نأخذ الرابط الأساسي (الذي يحتوي أصلاً على المفتاح السري)
        const finalUrl = new URL(settingsScriptURL);
        
        // إضافة كل البيانات من dataToSave إلى المعلمات الموجودة في الرابط
        Object.keys(dataToSave).forEach(key => {
            finalUrl.searchParams.set(key, dataToSave[key]);
        });

        // 4. إرسال الطلب
        const response = await fetch(finalUrl.toString());
        const result = await response.text();

        if (result.trim() === "Success") {
            alert("✅ تم تحديث بيانات الملعب بنجاح!");
            location.reload(); 
        } else {
            alert("⚠️ حدث خطأ في السكريبت: " + result);
        }
    } catch (e) {
        console.error("Save Error:", e);
        alert("❌ فشل الاتصال بالسيرفر.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = "حفظ التغييرات";
        }
    }
}
// --- دالة عرض واجهة الإعدادات ---
async function loadActualSettings() {
    const content = document.getElementById('adminSectionContent');
    content.innerHTML = "<p style='text-align:center;'>جاري تحميل الإعدادات الحالية...</p>";

    try {
        // جلب البيانات الحالية للملعب لملء الحقول تلقائياً
        const response = await fetch(`${settingsScriptURL}&action=getStadiumDetails&id=${stadiumId}`);
        const data = await response.json();

        if (data === "NotFound") {
            content.innerHTML = "<p style='color:red;'>تعذر العثور على بيانات الملعب</p>";
            return;
        }

      let html = `
    <h3 style="text-align: center; color: #1e3a8a; font-family: 'Cairo', sans-serif;">⚙️ إعدادات الملعب</h3>
    <div style="display: flex; flex-direction: column; gap: 15px; font-family: 'Cairo', sans-serif; text-align: right; direction: rtl;">
        
        <label><b>اسم الملعب:</b></label>
        <input type="text" id="upd_name" class="admin-input" value="${data.stadium_name}">
        
        <label><b>اسم المؤسسة/المسؤول:</b></label>
        <input type="text" id="upd_org" class="admin-input" value="${data.org || ''}">

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
                <label><b>سعر النهار:</b></label>
                <input type="number" id="upd_price_day" class="admin-input" value="${data.price_day}">
            </div>
            <div>
                <label><b>سعر الليل:</b></label>
                <input type="number" id="upd_price_night" class="admin-input" value="${data.price_night}">
            </div>
        </div>

        <label><b>رقم الهاتف (واتساب):</b></label>
        <input type="text" id="upd_phone" class="admin-input" value="${data.phone}">

        <div class="admin-field">
            <label style="display: flex; align-items: center; gap: 8px;">
                <b>موقع الملعب (Google Maps):</b>
                <span onclick="showMapHelp()" style="cursor: pointer; background: #1e3a8a; color: white; width: 18px; height: 18px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px;" title="كيف أحصل على الرابط؟">؟</span>
            </label>
            <input type="text" id="upd_loc" class="admin-input" value="${data.location || ''}" placeholder="ضع رابط الخريطة هنا">
        </div>

        <div style="background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0;">
            <label style="display: flex; align-items: center; gap: 8px; color: #2563eb;">
                <b>روابط الصور (الشعار والسلايدر):</b>
                <span onclick="showImageHelp()" style="cursor: pointer; background: #2563eb; color: white; width: 18px; height: 18px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px;">؟</span>
            </label>
            <p style="font-size: 11px; color: #64748b; margin: 5px 0;">ارفع الصور على <a href="https://postimages.org/" target="_blank" style="color:#22c55e; font-weight:bold; text-decoration:none;">Postimages.org</a> وانسخ "الرابط المباشر".</p>
            
            <label style="font-size: 12px; display:block; margin-top:10px;">رابط اللوجو:</label>
            <input type="text" id="upd_logo" class="admin-input" value="${data.logo_url || ''}" placeholder="رابط اللوجو المباشر (Direct Link)" style="margin-bottom:8px;">
            
            <label style="font-size: 12px; display:block;">صور السلايدر (1، 2، 3):</label>
            <input type="text" id="upd_img1" class="admin-input" value="${data.img1 || ''}" placeholder="رابط صورة السلايدر 1" style="margin-bottom:5px;">
            <input type="text" id="upd_img2" class="admin-input" value="${data.img2 || ''}" placeholder="رابط صورة السلايدر 2" style="margin-bottom:5px;">
            <input type="text" id="upd_img3" class="admin-input" value="${data.img3 || ''}" placeholder="رابط صورة السلايدر 3">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
                <label><b>فيسبوك:</b></label>
                <input type="text" id="upd_fb" class="admin-input" value="${data.fb || ''}" placeholder="facebook.com/page">
            </div>
            <div>
                <label><b>إنستغرام:</b></label>
                <input type="text" id="upd_insta" class="admin-input" value="${data.insta || ''}" placeholder="instagram.com/user">
            </div>
        </div>

        <div>
            <label><b>كلمة مرور جديدة:</b></label>
            <input type="password" id="upd_pass" class="admin-input" placeholder="اتركه فارغاً للحفاظ على الحالية">
            <small style="display:block; color:#ef4444; font-size:11px; margin-top:3px;">⚠️ تأكد من حفظها جيداً، فهي مفتاح دخولك للوحة التحكم.</small>
        </div>

        <div class="setting-item">
    <label><i class="fas fa-clock"></i> ساعات عمل الملعب:</label>
    <div style="display: flex; gap: 10px; margin-top: 5px;">
        <div style="flex: 1;">
            <small>وقت الافتتاح</small>
            <select id="openHourInput" class="admin-input">
                </select>
        </div>
        <div style="flex: 1;">
            <small>وقت الإغلاق</small>
            <select id="closeHourInput" class="admin-input">
                </select>
        </div>
    </div>
</div>


<div style="background: #fff5f5; padding: 15px; border-radius: 12px; border: 1px solid #feb2b2; margin-bottom: 15px;">
            <label style="display: flex; align-items: center; justify-content: space-between; cursor: pointer;">
                <b style="color: #c53030;">🛑 وضع الصيانة (إيقاف الحجز):</b>
                <input type="checkbox" id="upd_maintenance" style="width: 20px; height: 20px;" ${data.status === 'maintenance' ? 'checked' : ''}>
            </label>
            <p style="font-size: 11px; color: #744; margin-top: 5px;">عند التفعيل، سيظهر تنبيه للمستخدمين وسيتم قفل جدول المواعيد بالكامل.</p>
        </div>

        <button onclick="saveAdminSettings(event)" id="saveBtn" style="background:#22c55e; color:white; border:none; padding:15px; border-radius:8px; cursor:pointer; font-weight:bold; margin-top:10px; font-size:1.1em; transition: 0.3s;">
            💾 حفظ التغييرات النهائية
        </button>
    </div>
    `;
content.innerHTML = html;

// --- أضف الكود هنا لملء الخيارات فور ظهورها في الصفحة ---
    const openSelect = document.getElementById('openHourInput');
    const closeSelect = document.getElementById('closeHourInput');

    if (openSelect && closeSelect) {
        for (let i = 0; i <= 23; i++) {
            let label = i < 10 ? '0' + i + ':00' : i + ':00';
            openSelect.add(new Option(label, i));
            closeSelect.add(new Option(label, i));
        }

        // تحديد القيم الحالية التي جلبناها من السيرفر (data)
        // لاحظ أننا نستخدم data هنا لأنها تحتوي على أحدث القيم من السيرفر
        openSelect.value = data.openHour || 8;
        closeSelect.value = data.closeHour || 23;
    } 
    } catch (e) {
        content.innerHTML = "<p style='color:red;'>خطأ في الاتصال بالسيرفر</p>";
    }
}

// دالات المساعدة (يجب وضعها خارج دالة الإعدادات لتعمل عند الضغط)
window.showMapHelp = function() {
    alert("📍 للحصول على الرابط الصحيح:\n1. افتح Google Maps وابحث عن ملعبك.\n2. اضغط على زر 'مشاركة' ثم اختر 'نسخ الرابط'.\n3. الصق الرابط هنا.");
};

window.showImageHelp = function() {
    alert("🖼️ كيفية رفع الصور والحصول على رابط:\n1. ادخل لموقع Postimages.org.\n2. ارفع صورتك.\n3. بعد الرفع، انسخ الرابط المكتوب بجانبه 'Direct Link' (الرابط المباشر).\n4. الرابط الصحيح يجب أن ينتهي بـ .jpg أو .png");
}; 


async function loadActualCancellations() {
    const content = document.getElementById('adminSectionContent');
    content.innerHTML = `
        <div style="text-align:center; padding:20px;">
            <p>جاري جلب الحجوزات...</p>
            <div class="loader"></div> </div>`;

    try {
        const response = await fetch(`${settingsScriptURL}&action=getAdminBookings&id=${stadiumId}`);
        const bookings = await response.json();

        if (bookings.length === 0) {
            content.innerHTML = `
                <div style="text-align:center; padding:30px; color:#64748b;">
                    <p>📅 لا توجد حجوزات مسجلة حالياً.</p>
                </div>`;
            return;
        }

        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="margin:0; color:#1e293b; font-size:1.1rem;">❌ إلغاء الحجوزات</h3>
                <span style="background:#f1f5f9; padding:2px 10px; border-radius:12px; font-size:0.8rem;">${bookings.length} حجز</span>
            </div>
            
            <div style="overflow-y:auto; max-height:450px; border:1px solid #e2e8f0; border-radius:8px;">
                <table style="width:100%; border-collapse: collapse; font-size: 0.85rem; background:white;">
                    <thead style="position: sticky; top: 0; background:#f8fafc; z-index:10;">
                        <tr>
                            <th style="padding:12px 8px; border-bottom:2px solid #e2e8f0; text-align:right;">اليوم</th>
                            <th style="padding:12px 8px; border-bottom:2px solid #e2e8f0; text-align:center;">التاريخ</th>
                            <th style="padding:12px 8px; border-bottom:2px solid #e2e8f0; text-align:center;">الساعة</th>
                            <th style="padding:12px 8px; border-bottom:2px solid #e2e8f0; text-align:right;">الاسم</th>
                            <th style="padding:12px 8px; border-bottom:2px solid #e2e8f0; text-align:center;">الهاتف</th>
                            <th style="padding:12px 8px; border-bottom:2px solid #e2e8f0; text-align:center;">إجراء</th>
                        </tr>
                    </thead>
                    <tbody>`;

        bookings.forEach(bk => {
            // تحويل التاريخ (dd/MM/yyyy) لاسم اليوم
            const dateParts = bk.date.split("/");
            const dateObj = new Date(+dateParts[2], dateParts[1] - 1, +dateParts[0]);
            const dayName = dateObj.toLocaleDateString('ar-MA', { weekday: 'long' });

            html += `
                <tr style="border-bottom:1px solid #f1f5f9; transition:0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="padding:10px 8px; font-weight:bold; color:#1e3a8a;">${dayName}</td>
                    <td style="padding:10px 8px; text-align:center; color:#64748b;">${bk.date}</td>
                    <td style="padding:10px 8px; text-align:center; direction:ltr;">${bk.hour}</td>
                    <td style="padding:10px 8px; font-weight:500;">${bk.name}</td>
                    <td style="padding:10px 8px; text-align:center;">
                        <a href="tel:${bk.phone}" style="text-decoration:none; color:#16a34a; font-weight:bold;">
                            ${bk.phone} 📞
                        </a>
                    </td>
                    <td style="padding:10px 8px; text-align:center;">
                        <button onclick="cancelBooking(${bk.row}, this)" 
                                style="background:#fee2e2; color:#ef4444; border:none; padding:6px 12px; border-radius:6px; cursor:pointer; font-size:0.75rem; font-weight:bold; transition:0.3s;">
                            إلغاء
                        </button>
                    </td>
                </tr>`;
        });

        html += `</tbody></table></div>`;
        content.innerHTML = html;

    } catch (e) {
        content.innerHTML = `
            <div style="text-align:center; padding:20px; color:#ef4444;">
                <p>⚠️ خطأ في جلب البيانات، تأكد من اتصال الإنترنت.</p>
            </div>`;
        console.error("Fetch Error:", e);
    }
}

async function cancelBooking(rowNumber, btn) {
    if (!confirm("هل أنت متأكد من إلغاء هذا الحجز نهائياً؟")) return;

    // 1. جلب الكود السري من حقل تسجيل الدخول الموجود في الصفحة
    const passwordInput = document.getElementById('adminPassInput');
    const password = passwordInput ? passwordInput.value.trim() : "";

    if (!password) {
        alert("⚠️ خطأ: لم يتم العثور على كود التحقق. يرجى إعادة تسجيل الدخول.");
        return;
    }

    // تعطيل الزر مؤقتاً
    const originalText = btn ? btn.innerText : "إلغاء";
    if (btn) {
        btn.disabled = true;
        btn.innerText = "...";
    }

    try {
        // 2. تشفير الكود السري قبل إرساله
        const hashedPass = await hashString(password);

        // 3. إرسال الطلب مع إضافة id و pass (الهاش)
        // أضفنا Timestamp (&_t=...) لضمان جلب بيانات طازجة
        const url = `${settingsScriptURL}&action=cancelBooking&row=${rowNumber}&id=${stadiumId}&pass=${encodeURIComponent(hashedPass)}&_t=${new Date().getTime()}`;
        
        const response = await fetch(url);
        const result = await response.text();
        
        if (result.trim() === "CancelSuccess") {
            alert("✅ تم إلغاء الحجز بنجاح");
            
            // تحديث قائمة الإلغاء في لوحة التحكم
            showCancellations(); 

            // --- التعديل المطلوب: تحديث المربعات الملونة في الموقع فوراً ---
            if (typeof loadExistingBookings === "function") {
                console.log("جاري تحديث مربعات الحجز...");
                loadExistingBookings(); 
            }

        } else if (result.trim() === "Unauthorized") {
            alert("❌ غير مصرح لك: الكود السري غير صحيح.");
            if (btn) {
                btn.disabled = false;
                btn.innerText = originalText;
            }
        } else {
            alert("⚠️ فشل الإلغاء: " + result);
            if (btn) {
                btn.disabled = false;
                btn.innerText = originalText;
            }
        }
    } catch (e) {
        console.error("Cancel Error:", e);
        alert("❌ خطأ في الاتصال بالسيرفر");
        if (btn) {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    }
}
// --- 3. عرض البيانات والإحصائيات ---
async function loadActualStats() {
    const content = document.getElementById('adminSectionContent');
    content.innerHTML = `
        <div style="text-align:center; padding:20px;">
            <p>جاري تحليل البيانات المالية والزمنية...</p>
            <div class="loader"></div> 
        </div>`;

    try {
        const response = await fetch(`${settingsScriptURL}&action=getStats&id=${stadiumId}`);
        const data = await response.json();
        
        const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
        
        let totalHours = 0;
        let totalIncome = 0;

        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h3 style="margin:0; color:#1e293b; font-size:1.1rem;">📊 تقرير السنة المالية ${data.year}</h3>
                <span style="background:#e0f2fe; color:#0369a1; padding:2px 10px; border-radius:12px; font-size:0.8rem; font-weight:bold;">تحديث تلقائي</span>
            </div>

            <div style="background: #fff7ed; border-right: 4px solid #f97316; padding: 10px; margin-bottom: 15px; border-radius: 4px;">
                <p style="margin:0; font-size:0.75rem; color: #9a3412; line-height:1.4;">
                    <strong>💡 معلومة:</strong> يتم تحديث الإحصائيات وأرشفة الحجوزات <b>كل بداية أسبوع جديد</b>. الحجوزات الجارية ستظهر هنا فور ترحيلها للأرشيف.
                </p>
            </div>
            
            <div style="overflow-y:auto; max-height:450px; border:1px solid #e2e8f0; border-radius:8px;">
                <table style="width:100%; border-collapse: collapse; font-size: 0.85rem; background:white;">
                    <thead style="position: sticky; top: 0; background:#f8fafc; z-index:10;">
                        <tr>
                            <th style="padding:12px 8px; border-bottom:2px solid #e2e8f0; text-align:right;">الشهر</th>
                            <th style="padding:12px 8px; border-bottom:2px solid #e2e8f0; text-align:center;">عدد الساعات</th>
                            <th style="padding:12px 8px; border-bottom:2px solid #e2e8f0; text-align:center;">المداخيل (د.م)</th>
                        </tr>
                    </thead>
                    <tbody>`;

        // تعديل مشكل الأشهر: نستخدم m.month لضمان الدقة
        data.monthlyStats.forEach((m) => {
            totalHours += m.hours;
            totalIncome += m.income;
            
            // التأكد من جلب اسم الشهر الصحيح (m.month يبدأ من 1 لذا نطرح 1)
            const currentMonthName = monthNames[m.month - 1];
            
            html += `
                <tr style="border-bottom:1px solid #f1f5f9; transition:0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="padding:10px 8px; font-weight:bold; color:#475569;">${currentMonthName}</td>
                    <td style="padding:10px 8px; text-align:center;">${m.hours} ساعة</td>
                    <td style="padding:10px 8px; text-align:center; color:#16a34a; font-weight:bold;">${m.income.toLocaleString()}</td>
                </tr>`;
        });

        html += `
                    </tbody>
                    <tfoot style="position: sticky; bottom: 0; background:#1e3a8a; color:white; font-weight:bold;">
                        <tr>
                            <td style="padding:12px 8px;">المجموع السنوي</td>
                            <td style="padding:12px 8px; text-align:center;">${totalHours} ساعة</td>
                            <td style="padding:12px 8px; text-align:center; font-size:1rem;">${totalIncome.toLocaleString()} د.م</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <p style="font-size:0.7rem; color:#94a3b8; margin-top:10px; text-align:center;">* يتم احتساب المداخيل بناءً على أسعار النهار والليل المحددة في الإعدادات.</p>`;

        content.innerHTML = html;

    } catch (e) {
        content.innerHTML = `
            <div style="text-align:center; padding:20px; color:#ef4444;">
                <p>⚠️ فشل في تحليل البيانات المالية.</p>
            </div>`;
        console.error("Stats Error:", e);
    }
}

// دالة فتح النافذة - تأكد أن اسمها مطابق لما هو مكتوب في onclick بالـ HTML

// --- 1. دالة فتح نافذة المسؤول ---
function openAdminAuth() {
    const modal = document.getElementById('adminAuthModal');
    if (modal) {
        modal.style.display = 'flex';
        // تجهيز الحقل للكتابة
        const input = document.getElementById('adminPassInput');
        if(input) {
            input.value = '';
            input.focus();
        }
    }
}

// --- 2. دالة إغلاق النافذة ---
function closeAdminAuth() {
    const modal = document.getElementById('adminAuthModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// --- 3. دالة تسجيل الدخول ومعالجة كلمة السر ---

// --- 3. دالة تسجيل الدخول ومعالجة كلمة السر ---
async function hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
// --- 3. دالة تسجيل الدخول ومعالجة كلمة السر ---
async function handleAdminAuth(btn) {
    const passwordInput = document.getElementById('adminPassInput');
    const password = passwordInput ? passwordInput.value.trim() : "";
    
    if (!password) {
        alert("⚠️ من فضلك أدخل الكود أولاً");
        if(passwordInput) passwordInput.focus();
        return;
    }

    // إشارة الانتظار على الزر
    const originalText = btn.innerText;
    btn.disabled = true;
    btn.innerText = "جاري التحقق... ⏳";

    try {
        // --- التعديل الأمني الجديد هنا ---
        // نقوم بتشفير كلمة المرور قبل إرسالها للسيرفر
        const hashedPassword = await hashString(password);
        
        // نرسل hashedPassword بدلاً من password
        const response = await fetch(`${settingsScriptURL}&action=adminAuth&id=${stadiumId}&pass=${encodeURIComponent(hashedPassword)}`);
        const result = await response.text();

        console.log("استجابة السيرفر:", result);

        if (result.trim() === "Success") {
            // 1. إغلاق نافذة طلب الكود الصغيرة
            closeAdminAuth(); 
            
            // 2. إظهار لوحة تحكم المسؤول الكبيرة (adminPanel)
            const panel = document.getElementById('adminPanel');
            if (panel) {
                panel.style.setProperty('display', 'flex', 'important'); 
                panel.scrollTop = 0; 
                console.log("اللوحة ظهرت وتم ضبط التمرير للأعلى");
            }

            // التحقق من حالة الاشتراك
            if (typeof checkSubscriptionStatus === "function") {
                checkSubscriptionStatus();
            }

            // 3. إظهار أي أيقونات إدارية متفرقة في الصفحة
            document.querySelectorAll('.admin-only, .admin-icon').forEach(el => {
                el.style.setProperty('display', 'block', 'important');
            });
            
            // 4. تشغيل دالة عرض الإعدادات
            if (typeof showSettings === "function") {
                showSettings(); 
            }

        } else {
            alert("❌ كلمة السر غير صحيحة، حاول مرة أخرى.");
            if(passwordInput) {
                passwordInput.value = "";
                passwordInput.focus();
            }
        }
    } catch (e) {
        console.error("Auth Error:", e);
        alert("⚠️ خطأ في الاتصال بالسيرفر.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerText = originalText;
        }
    }
}


// --- 4. دالة نسيت كلمة المرور ---
async function handleForgotPassword() {
    const email = prompt("أدخل بريدك الإلكتروني المسجل لإرسال الكود إليه:");
    
    if (!email) return;

    if (!email.includes("@")) {
        alert("يرجى إدخال بريد إلكتروني صحيح");
        return;
    }

    alert("جاري إرسال الكود إلى بريدك... يرجى الانتظار");

    try {
        const response = await fetch(`${settingsScriptURL}&action=forgotPassword&id=${stadiumId}&email=${email}`);
        const result = await response.text();

        if (result.trim() === "Sent") {
            alert("✅ تم إرسال كود الدخول إلى بريدك الإلكتروني بنجاح.");
        } else if (result.trim() === "EmailMismatch") {
            alert("❌ هذا البريد غير مطابق للبريد المسجل لهذا الملعب.");
        } else {
            alert("⚠️ حدث خطأ، تأكد من إعدادات البريد في سكريبت جوجل.");
        }
    } catch (e) {
        console.error("Forgot Pass Error:", e);
        alert("❌ فشل الاتصال بالسيرفر لإرسال الإيميل.");
    }
} // هذا القوس ضروري جداً لإغلاق الدالة
function closeAdminPanel() {
    document.getElementById('adminPanel').style.display = 'none';
}
function showBookingTicket(stadiumName, date, time, stadiumUrl) {
    // 1. استخراج اسم اليوم بطريقة آمنة
    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    
    // تحويل التاريخ من DD/MM/YYYY إلى تنسيق يفهمه JavaScript (اختياري حسب تنسيق مدخلاتك)
    let parts = date.split('/');
    let formattedDate = parts.length === 3 ? new Date(parts[2], parts[1] - 1, parts[0]) : new Date(date);
    
    const dayName = days[formattedDate.getDay()] || "الموعد المحدد";

    // 2. نص الواتساب (مختصر وأنيق)
    const shareText = `⚽ *تذكرة حجز مباراة*\n\n📍 الملعب: ${stadiumName}\n📅 اليوم: ${dayName}\n📆 التاريخ: ${date}\n⏰ الوقت: ${time}\n\n🔗 الرابط:\n${stadiumUrl}\n\nتم عبر ملاعب NET 🏟️`;

    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

    // 3. بناء التذكرة (تبسيط الـ HTML لضمان التوافق)
    const ticketHtml = `
    <div class="ticket-container" style="text-align:center; font-family:'Cairo', sans-serif;">
        <div class="ticket-header" style="background:#1e3a8a; color:white; padding:10px; border-radius:10px 10px 0 0;">
            <h3 style="margin:0;">تم الحجز بنجاح! ✅</h3>
        </div>
        <div class="ticket-body" style="padding:15px; border:1px solid #e2e8f0; border-top:none; background:#fff;">
            <p style="margin:5px 0;"><strong>${stadiumName}</strong></p>
            <p style="margin:5px 0; color:#475569;">${dayName} | ${date}</p>
            <p style="margin:5px 0; font-size:1.2rem; color:#1e3a8a; font-weight:bold;">${time}</p>
        </div>
        <div class="ticket-footer" style="margin-top:15px;">
            <button onclick="window.open('${whatsappUrl}', '_blank')" 
                    style="background:#22c55e; color:white; border:none; padding:12px 20px; border-radius:8px; cursor:pointer; font-weight:bold; width:100%; font-family:'Cairo';">
                ارسل التفاصيل للفريق (واتساب) 💬
            </button>
            <p style="font-size:0.7rem; color:#64748b; margin-top:10px;">يفضل عمل لقطة شاشة للتذكرة 📸</p>
        </div>
    </div>`;

    // 4. عرض التذكرة في الحاوية المخصصة
    const formContent = document.getElementById('bookingFormContent');
    const ticketContainer = document.getElementById('successTicketContainer');

    if (ticketContainer && formContent) {
        formContent.style.display = 'none';
        ticketContainer.style.display = 'block';
        ticketContainer.innerHTML = ticketHtml;
    } else {
        // إذا لم يجد الحاويات، يفتح الواتساب مباشرة كحل احتياطي
        alert(`✅ تم الحجز!\nالملعب: ${stadiumName}\nالوقت: ${time}`);
        window.open(whatsappUrl, '_blank');
    }
}

// --- المتغيرات العالمية ---
let currentAccountStatus = "Free"; 

// --- 1. دالة فحص حالة الاشتراك (هذه كانت ناقصة في قائمتك) ---
async function checkSubscriptionStatus() {
    const statusDisplay = document.getElementById('accountStatusDisplay');
    const upgradeOptions = document.getElementById('upgradeOptions');

    try {
        const response = await fetch(`${settingsScriptURL}&action=getStadiumDetails&id=${stadiumId}`);
        const data = await response.json();
        
        // التعديل هنا: نستخدم accountType بدلاً من status
        currentAccountStatus = data.accountType || "Free"; 

        if (currentAccountStatus === "Premium") {
            if(statusDisplay) statusDisplay.innerHTML = `
                <div style="color: #166534; background: #dcfce7; padding: 10px; border-radius: 8px; display: inline-block;">
                    <i class="fas fa-check-circle"></i> حساب احترافي (Premium)
                </div>
            `;
            if(upgradeOptions) upgradeOptions.style.display = 'none';
        } else {
            if(statusDisplay) statusDisplay.innerHTML = `
                <div style="color: #991b1b; background: #fee2e2; padding: 10px; border-radius: 8px; display: inline-block;">
                    <i class="fas fa-info-circle"></i> حساب مجاني (Limited)
                </div>
            `;
            if(upgradeOptions) upgradeOptions.style.display = 'block';
        }
    } catch (e) {
        console.error("خطأ في فحص الاشتراك:", e);
    }
}
// دالة لتشغيل الاهتزاز على زر الترقية
function shakeUpgradeButton() {
    const btn = document.getElementById('mainUpgradeBtn');
    if (btn) {
        // إزالة الكلاس أولاً (في حال كان موجوداً من ضغطة سابقة)
        btn.classList.remove('shake-animation');
        
        // إجبار المتصفح على إعادة الحساب (Reflow) لكي يتقبل الحركة مرة أخرى
        void btn.offsetWidth; 
        
        // إضافة الكلاس
        btn.classList.add('shake-animation');
        
        // التمرير للزر ليشاهده المستخدم
        btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        // إزالة الكلاس بعد انتهاء الحركة (نصف ثانية)
        setTimeout(() => {
            btn.classList.remove('shake-animation');
        }, 500);
    } else {
        console.error("لم يتم العثور على زر mainUpgradeBtn");
    }
}

// تعديل دوال الأزرار
function showSettings() {
    if (currentAccountStatus !== "Premium") {
        shakeUpgradeButton(); // هز زر الاشتراك بدلاً من فتح الإعدادات
        return;
    }
    loadActualSettings(); 
}

function showCancellations() {
    if (currentAccountStatus !== "Premium") {
        shakeUpgradeButton();
        return;
    }
    loadActualCancellations();
}

function showStats() {
    if (currentAccountStatus !== "Premium") {
        shakeUpgradeButton();
        return;
    }
    loadActualStats();
}
function openPricingModal() {
    // 1. إظهار نافذة الأسعار (المهمة الأساسية)
    const modal = document.getElementById('pricingModal');
    if (modal) {
        modal.style.display = 'flex';
        modal.style.zIndex = "20000"; // التأكد من أنها فوق كل شيء
    }

    // 2. التحقق: إذا كانت لوحة التحكم مفتوحة، نقوم بإغلاقها
    const adminPanel = document.getElementById('adminPanel');
    if (adminPanel && adminPanel.style.display !== 'none') {
        adminPanel.style.display = 'none';
    }
}

// دالة لإغلاق النافذة
function closePricingModal() {
    const modal = document.getElementById('pricingModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// إظهار خيارات الدفع عند اختيار الخطة المدفوعة
function showPaymentOptions() {
    document.getElementById('paymentSelection').style.display = 'none';
    document.getElementById('paymentOptions').style.display = 'block';
}

// معالجة الدفع النهائي (التواصل عبر واتساب للتأكيد)
// أضف هذا الجزء أولاً لمراقبة اختيار وسيلة الدفع وإظهار التعليمات تلقائياً
document.getElementById('payMethod').addEventListener('change', function() {
    const instructions = document.getElementById('transferInstructions');
    if (this.value === "Transfer") {
        instructions.style.display = 'block';
    } else {
        instructions.style.display = 'none';
    }
});

function confirmFinalPayment() {
    const plan = document.getElementById('planType').value == "1500" ? "سنوي (1500 د.م)" : "شهري (200 د.م)";
    const method = document.getElementById('payMethod').value;
    const stadiumName = document.title.split('-')[0].trim();
    
    // 1. التعامل مع البطاقة البنكية (غير جاهزة)
    if (method === "Card") {
        alert("⚠️ عذراً، خدمة الدفع المباشر بالبطاقة البنكية قيد التطوير حالياً.\n\nيرجى استخدام خيار 'التحويل البنكي' مؤقتاً لتفعيل حسابك فوراً.");
        return; // توقف هنا ولا تفتح واتساب
    }

    // 2. التعامل مع التحويل البنكي
    let methodText = "تحويل بنكي";
    
    const msg = `مرحباً ملاعب NET، أريد ترقية حسابي:\n🏟️ الملعب: ${stadiumName}\n💳 الخطة: ${plan}\n💰 وسيلة الدفع: ${methodText}\n--- (سأقوم بإرسال صورة الوصل الآن)`;
    
    const whatsappUrl = `https://wa.me/2126XXXXXXXX?text=${encodeURIComponent(msg)}`; // ضع رقمك هنا
    
    // تنبيه بسيط قبل الانتقال لواتساب
    alert("سيتم الآن توجيهك إلى واتساب.\n\nيرجى إرفاق صورة وصل التحويل في المحادثة لضمان تفعيل الحساب في أقل من ساعة.");
    
    window.open(whatsappUrl, '_blank');
}


function showPaymentMethods() {
    const content = document.getElementById('adminSectionContent');
    content.innerHTML = `
        <div style="text-align: right; animation: fadeIn 0.5s;">
            <h3 style="color: #1e3a8a; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">💳 إعدادات طرق الدفع</h3>
            <p style="font-size: 0.9rem; color: #64748b; margin-bottom: 20px;">حدد كيف ترغب في استلام مستحقات الحجز من اللاعبين.</p>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h4 style="margin: 0; color: #1e293b;">الدفع نقداً (في الملعب)</h4>
                    <small style="color: #22c55e;">● مفعّل حالياً</small>
                </div>
                <div style="color: #22c55e; font-size: 1.5rem;">✅</div>
            </div>

            <div onclick="alert('🚀 هذه الخاصية قيد التطوير حالياً.\nسيتم تفعيل الدفع بالبطاقة البنكية فور انتهاء الإجراءات القانونية والتقنية.')" 
                 style="background: #ffffff; border: 1px dashed #cbd5e1; padding: 15px; border-radius: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: 0.3s;">
                <div>
                    <h4 style="margin: 0; color: #94a3b8;">الدفع عبر البطاقة البنكية</h4>
                    <small style="color: #ef4444;">🔒 قيد التطوير (قريباً)</small>
                </div>
                <div style="background: #f1f5f9; color: #94a3b8; padding: 5px 10px; border-radius: 8px; font-size: 0.7rem; font-weight: bold;">طلب تفعيل</div>
            </div>

            <div style="margin-top: 30px; padding: 15px; background: #fffbeb; border-right: 4px solid #f59e0b; border-radius: 4px;">
                <p style="font-size: 0.8rem; color: #92400e; margin: 0;">
                    <strong>ملاحظة:</strong> تفعيل الدفع الإلكتروني يتطلب التوفر على "مقاول ذاتي" أو "شركة". نحن نعمل على تسهيل هذه العملية لكم.
                </p>
            </div>
        </div>
    `;
}

const legalPages = {
    privacy: {
        title: "سياسة الخصوصية",
        content: `
            <h2>سياسة الخصوصية</h2>
            <p><strong>آخر تحديث:</strong> 11 يوليو 2026</p>
            <p>مرحبًا بكم في <strong>MalaibNet</strong>.</p>
            <p>نحن نلتزم بحماية خصوصية مستخدمينا واحترام بياناتهم الشخصية. توضح هذه السياسة كيفية جمع المعلومات واستخدامها وحمايتها عند استخدام منصة MalaibNet لحجز ملاعب القرب.</p>

            <h3>1. من نحن</h3>
            <p>MalaibNet منصة إلكترونية مغربية تتيح للاعبين حجز ملاعب القرب بسهولة، كما توفر لأصحاب الملاعب أدوات لإدارة الحجوزات ومتابعة نشاط ملاعبهم.</p>

            <h3>2. المعلومات التي نجمعها</h3>
            <ul>
                <li>الاسم الكامل.</li>
                <li>رقم الهاتف.</li>
                <li>تاريخ ووقت الحجز.</li>
                <li>اسم الملعب وقيمة الحجز وطريقة الدفع.</li>
                <li>معلومات تقنية مثل نوع المتصفح والجهاز وعنوان IP لتحسين الأداء والأمان.</li>
            </ul>

            <h3>3. كيفية استخدام المعلومات</h3>
            <p>تستخدم المعلومات لإنشاء الحجوزات وإدارتها، تأكيد الحجز، التواصل عند الحاجة، تمكين صاحب الملعب من إدارة الحجوزات، تحسين الخدمة، إعداد الإحصاءات، وحماية المنصة.</p>

            <h3>4. مشاركة المعلومات</h3>
            <p>لا تبيع MalaibNet البيانات الشخصية ولا تؤجرها. يتم فقط مشاركة بيانات الحجز الضرورية مع صاحب الملعب لإدارة الحجز.</p>

            <h3>5. الدفع الإلكتروني</h3>
            <p>تتم معالجة الدفع الإلكتروني بواسطة PayZone، ولا تحتفظ MalaibNet بأرقام البطاقات البنكية أو بياناتها السرية.</p>

            <h3>6. حقوق المستخدمين</h3>
            <ul>
                <li>معرفة البيانات المحفوظة عنه.</li>
                <li>طلب تصحيح البيانات.</li>
                <li>طلب حذف البيانات عند عدم وجود مانع قانوني.</li>
                <li>الاستفسار عن طريقة استخدام البيانات.</li>
            </ul>

            <h3>7. التواصل معنا</h3>
            <p>يمكن التواصل مع إدارة منصة MalaibNet عبر وسائل الاتصال المتوفرة على الموقع.</p>
        `
    },

    terms: {
        title: "شروط الاستخدام",
        content: `
            <h2>شروط الاستخدام</h2>
            <p><strong>آخر تحديث:</strong> 11 يوليو 2026</p>
            <p>تنظم هذه الشروط استخدام منصة <strong>MalaibNet</strong> الخاصة بحجز وإدارة ملاعب القرب.</p>

            <h3>1. استخدام المنصة</h3>
            <ul>
                <li>تقديم معلومات صحيحة عند الحجز.</li>
                <li>استخدام المنصة بطريقة قانونية.</li>
                <li>عدم استخدام بيانات شخص آخر دون إذنه.</li>
                <li>عدم محاولة تعطيل المنصة أو اختراقها.</li>
            </ul>

            <h3>2. الحجز والدفع</h3>
            <p>يجب على المستخدم إدخال الاسم الصحيح، رقم هاتف صحيح، اختيار التاريخ والوقت، واختيار طريقة الدفع.</p>
            <p>توفر MalaibNet الدفع الإلكتروني أو الدفع عند الوصول.</p>

            <h3>3. مسؤولية اللاعب</h3>
            <ul>
                <li>احترام موعد الحجز.</li>
                <li>الحضور في الوقت المحدد.</li>
                <li>المحافظة على مرافق الملعب.</li>
                <li>عدم إجراء حجوزات وهمية.</li>
            </ul>

            <h3>4. مسؤولية صاحب الملعب</h3>
            <p>يلتزم صاحب الملعب بتحديث أوقات العمل، إدارة الحجوزات، احترام الحجوزات المؤكدة، واستخدام بيانات اللاعبين فقط لإدارة الحجز.</p>

            <h3>5. الملكية الفكرية</h3>
            <p>جميع عناصر المنصة من تصميم وشعارات وصور ونصوص وبرمجيات وقاعدة بيانات هي ملك لـ MalaibNet أو لأصحاب الحقوق.</p>

            <h3>6. القانون المعمول به</h3>
            <p>تخضع هذه الشروط للقوانين المعمول بها في المملكة المغربية.</p>
        `
    },

    refund: {
        title: "سياسة الإلغاء والاسترداد",
        content: `
            <h2>سياسة الإلغاء والاسترداد</h2>
            <p><strong>آخر تحديث:</strong> 11 يوليو 2026</p>
            <p>تنظم هذه السياسة قواعد إلغاء الحجوزات واسترداد المبالغ في منصة <strong>MalaibNet</strong>.</p>

            <h3>1. طرق الدفع</h3>
            <ul>
                <li>الدفع الإلكتروني عبر PayZone.</li>
                <li>الدفع عند الوصول إلى الملعب.</li>
            </ul>

            <h3>2. إلغاء الحجز من طرف اللاعب</h3>
            <p>يجوز للاعب إلغاء الحجز قبل موعده وفق الشروط التي يحددها صاحب الملعب أو السياسة العامة للمنصة.</p>

            <h3>3. الدفع عند الوصول</h3>
            <p>إذا اختار اللاعب الدفع عند الوصول، لا يترتب على MalaibNet أي التزام مالي تجاه اللاعب أو صاحب الملعب.</p>

            <h3>4. الدفع الإلكتروني</h3>
            <p>إذا تم الدفع إلكترونيًا عبر PayZone، فإن أي استرداد مستحق يتم وفق إجراءات المنصة ومزود خدمة الدفع، وقد يستغرق عدة أيام عمل.</p>

            <h3>5. إلغاء الحجز من طرف صاحب الملعب</h3>
            <p>يجوز لصاحب الملعب إلغاء الحجز بسبب ظروف طارئة، سوء الأحوال الجوية، الصيانة، عطل فني، أو أي ظرف يمنع تقديم الخدمة.</p>

            <h3>6. طلب الاسترداد</h3>
            <p>يمكن للمستخدم التواصل مع إدارة MalaibNet عبر وسائل الاتصال الرسمية مع تزويدها بمعلومات الحجز اللازمة لدراسة الطلب.</p>
        `
    }
};

function openLegalModal(page) {
    switchLegalTab(page || "privacy");
    const modal = document.getElementById("legalModal");
    if (modal) {
        modal.style.display = "flex";
    }
}

function closeLegalModal() {
    const modal = document.getElementById("legalModal");
    if (modal) {
        modal.style.display = "none";
    }

    document.body.classList.remove("modal-open");
    document.body.style.overflow = "auto";
}

function switchLegalTab(page) {
    const data = legalPages[page] || legalPages.privacy;

    document.getElementById("legalModalTitle").innerText = data.title;
    document.getElementById("legalModalBody").innerHTML = data.content;

    document.querySelectorAll(".legal-tabs button").forEach(btn => {
        btn.classList.remove("active");
    });

    const activeTab = document.getElementById("tab-" + page);
    if (activeTab) activeTab.classList.add("active");
}

function openPrivacy() {
    openLegalModal("privacy");
}

// دالة إغلاق أي نافذة منبثقة (عامة)
function closeAnyModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}



// دالة حساب المسافة بين نقطتين بالكيلومتر
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
}

async function findNearbyStadiums() {
    const listContainer = document.getElementById('stadiumsList');
    
    // استخدام الدقة العالية لضمان أفضل نتيجة على الهاتف
    const geoOptions = {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(async function(position) {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        try {
            // جلب البيانات من السيرفر
           const response = await fetch(`${bookingScriptURL}&action=getAllStadiums`);
            const allStadiums = await response.json();

            // 1. حساب المسافة لكل ملعب وتخزينها في المصفوفة
            const processedStadiums = allStadiums
                .filter(s => s.lat && s.lng) // استبعاد الملاعب بدون إحداثيات
                .map(stadium => {
                    return {
                        ...stadium,
                        distance: calculateDistance(userLat, userLng, stadium.lat, stadium.lng)
                    };
                })
                .filter(stadium => stadium.distance <= 20) // تصفية الملاعب (أقل من 20 كلم)
                .sort((a, b) => a.distance - b.distance); // 2. الترتيب من الأقرب للأبعد

            listContainer.innerHTML = ""; 

            if (processedStadiums.length === 0) {
                listContainer.innerHTML = `
                    <div style="text-align:center; padding:30px;">
                        <p style="font-size:3rem;">📍</p>
                        <p>لا توجد ملاعب في محيط 20 كلم حالياً.</p>
                    </div>`;
                return;
            }

            // 3. عرض الملاعب المرتبة في النافذة
            processedStadiums.forEach(stadium => {
                const card = `
                    <div class="stadium-card">
                        <div class="stadium-info">
                            <h4 style="margin-bottom:2px;">${stadium.stadium_name}</h4>
                            <span class="distance-tag" style="background:#e0f2fe; color:#0369a1;">
                                🚗 يبعد ${stadium.distance.toFixed(1)} كلم عنك
                            </span>
                        </div>
                        <div class="btn-group" style="margin-top:12px; display:flex; gap:8px;">
                            <a href="https://www.google.com/maps?q=${stadium.lat},${stadium.lng}"
                               target="_blank" class="btn-action btn-map" style="background:#10b981; flex:1; text-align:center; padding:10px; border-radius:8px; color:white; text-decoration:none; font-size:0.85rem;">
                               🗺️ الخريطة
                            </a>
                            <a href="booking.html?id=${stadium.slug}" 
                               class="btn-action btn-book" style="background:#2563eb; flex:1; text-align:center; padding:10px; border-radius:8px; color:white; text-decoration:none; font-size:0.85rem;">
                               📅 حجز الآن
                            </a>
                        </div>
                    </div>
                `;
                listContainer.innerHTML += card;
            });

        } catch (error) {
            listContainer.innerHTML = "<p style='text-align:center; color:red; padding:20px;'>❌ فشل في جلب الملاعب، تأكد من اتصال الإنترنت.</p>";
        }
    }, function(error) {
        let errorMsg = "يرجى تفعيل الموقع (GPS) للبحث عن الملاعب.";
        if(error.code === 1) errorMsg = "يجب السماح للمتصفح بالوصول لموقعك لرؤية الملاعب القريبة.";
        listContainer.innerHTML = `<p style='text-align:center; padding:20px;'>❌ ${errorMsg}</p>`;
    }, geoOptions);
}

// دالة الإغلاق الآمنة
function closeNearbyModal() {
    const modal = document.getElementById('nearbyModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// دالة الفتح الذكية المتوافقة مع التوسيط العالمي الـ Flex
function openNearbyModal() {
    const modal = document.getElementById('nearbyModal');
    const stadiumsList = document.getElementById('stadiumsList');

    // 1. التحقق من وجود النافذة المنبثقة أولاً لمنع توقف السكريبت
    if (!modal) {
        console.warn("تنبيه: عنصر 'nearbyModal' غير موجود في هذه الصفحة.");
        return; // الخروج من الدالة بأمان دون إفساد بقية العمليات
    }

    // 2. إظهار النافذة بنظام flex لضمان التوسيط المطلق على الموبايل والكمبيوتر
    modal.style.display = 'flex';

    // 3. التحقق من وجود حاوية القائمة قبل كتابة هيكل التحميل بداخلها
    if (stadiumsList) {
        stadiumsList.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>جاري تحديد موقعك وجلب الملاعب...</p>
            </div>`;
    }

    // 4. استدعاء دالة جلب الملاعب الخاصة بك
    if (typeof findNearbyStadiums === "function") {
        findNearbyStadiums();
    }
}


function switchAdminTab(tab, evt) {
    document.querySelectorAll('.admin-nav-item').forEach(item => {
        item.classList.remove('active-tab');
    });

    const clickedItem = evt?.currentTarget || window.event?.currentTarget;
    if (clickedItem) clickedItem.classList.add('active-tab');

    const content = document.getElementById('adminSectionContent');
    if (!content) {
        console.error('adminSectionContent غير موجود داخل لوحة التحكم');
        return;
    }

    if (tab === 'settings') {
        showSettings();
    } else if (tab === 'cancellations') {
        showCancellations();
    } else if (tab === 'stats') {
        showStats();
    } else if (tab === 'payments') {
        showPaymentMethods();
    }
}

function showCourtsManagement() {
    const content = document.getElementById('adminSectionContent');
    const courtsSection = document.getElementById('courtsManagementSection');

    if (content && courtsSection) {
        content.innerHTML = courtsSection.outerHTML;
    }
}
(function setupMobileOverlayLock() {
    const openDisplays = new Set(['block', 'flex', 'grid']);

    function anyOverlayOpen() {
        return Array.from(document.querySelectorAll('.modal, .modal-overlay, .custom-modal, .admin-modal, #pricingModal, #adminAuthModal'))
            .some(el => openDisplays.has(getComputedStyle(el).display));
    }

    window.lockPageBehindOverlay = function lockPageBehindOverlay(isAdminPanel) {
        document.body.classList.toggle('admin-panel-open', !!isAdminPanel);
        document.body.classList.toggle('modal-open', !isAdminPanel && anyOverlayOpen());
        document.documentElement.style.overflowX = 'hidden';
        document.body.style.overflowX = 'hidden';
    };

    window.unlockPageBehindOverlay = function unlockPageBehindOverlay() {
        if (!anyOverlayOpen()) {
            document.body.classList.remove('modal-open');
        }
        const adminPanel = document.getElementById('adminPanel');
        if (!adminPanel || getComputedStyle(adminPanel).display === 'none') {
            document.body.classList.remove('admin-panel-open');
        }
    };
     const observer = new MutationObserver(() => {
        const adminPanel = document.getElementById('adminPanel');
        const adminOpen = adminPanel && getComputedStyle(adminPanel).display !== 'none';
        document.body.classList.toggle('admin-panel-open', !!adminOpen);
        document.body.classList.toggle('modal-open', !adminOpen && anyOverlayOpen());
    });

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.modal, .modal-overlay, .custom-modal, .admin-modal, #pricingModal, #adminAuthModal, #adminPanel')
            .forEach(el => observer.observe(el, { attributes: true, attributeFilter: ['style', 'class'] }));
    });
    
})();
