

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
// Cloudflare Worker
const APPS_SCRIPT_BASE_URL = 'https://api.malaibnet.com';

// جميع الطلبات تمر عبر Cloudflare Worker
const settingsScriptURL = APPS_SCRIPT_BASE_URL;
const bookingScriptURL = APPS_SCRIPT_BASE_URL;
const STADIUM_TYPES = ["Mini-foot", "كرة قدم", "كرة سلة", "كرة تنس", "كرة طائرة", "كرة يد", "بادل", "متعدد الرياضات"];

function stadiumTypeOptions(selectedType) {
    const normalizedType = selectedType === "كرة قدم مصغرة" ? "Mini-foot" : selectedType;
    const selected = STADIUM_TYPES.includes(normalizedType) ? normalizedType : "Mini-foot";
    return STADIUM_TYPES.map(type =>
        `<option value="${type}"${type === selected ? " selected" : ""}>${type}</option>`
    ).join("");
}

(function clearLegacyAdminCredentials() {
    for (let index = sessionStorage.length - 1; index >= 0; index--) {
        const key = sessionStorage.key(index);
        if (key && key.startsWith('adminPassHash_')) {
            sessionStorage.removeItem(key);
        }
    }
})();

function escapeHTML(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function safeHttpUrl(value, allowedHosts = []) {
    try {
        const url = new URL(String(value || '').trim());
        if (url.protocol !== 'https:') return '';
        if (allowedHosts.length && !allowedHosts.includes(url.hostname)) return '';
        return url.href;
    } catch {
        return '';
    }
}

function safeExternalHref(value, allowedHosts = []) {
    return safeHttpUrl(value, allowedHosts);
}

function adminAuthHeaders() {
    return {};
}

async function adminGet(action, params = {}) {
    const url = new URL(settingsScriptURL);
    url.searchParams.set('action', action);
    url.searchParams.set('id', stadiumId);
    Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
    });

    return fetch(url.toString(), {
        headers: { ...adminAuthHeaders(), 'Accept': 'application/json' },
        credentials: 'include',
        cache: 'no-store'
    });
}

let ownerStadiums = [];

async function adminPost(action, extra = {}) {
    if (!stadiumId) throw new Error('جلسة لوحة التحكم غير صالحة');

    const response = await fetch(`${bookingScriptURL}?action=${encodeURIComponent(action)}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...adminAuthHeaders()
        },
        credentials: 'include',
        body: JSON.stringify({
            action,
            id: stadiumId,
            ...extra
        })
    });

    const text = await response.text();
    let result = text;
    try { result = JSON.parse(text); } catch (_) { /* Apps Script may return plain text. */ }

    if (!response.ok) {
        const message = typeof result === 'object' && result?.message ? result.message : text;
        throw new Error(message || `HTTP ${response.status}`);
    }
    if (result && typeof result === 'object' && result.result === 'error') {
        throw new Error(result.message || 'تعذر تنفيذ الطلب');
    }
    return result;
}

function renderOwnerStadiumSwitcher() {
    const container = document.getElementById('ownerStadiumSwitcher');
    if (!container) return;

    if (!ownerStadiums.length) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="owner-stadium-switcher-title">ملاعب حسابك</div>
        <div class="owner-stadium-list">
            ${ownerStadiums.map(stadium => `
                <button type="button" class="owner-stadium-option ${stadium.slug === stadiumId ? 'active' : ''}" data-owner-stadium="${escapeHTML(stadium.slug)}">
                    <span class="owner-stadium-option-name">${escapeHTML(stadium.stadium_name)}</span>
                    <small>${stadium.slug === stadiumId ? 'مفتوح الآن' : 'فتح الإعدادات'}</small>
                </button>
            `).join('')}
        </div>
    `;

    container.querySelectorAll('[data-owner-stadium]').forEach(button => {
        button.addEventListener('click', () => switchAdminStadium(button.dataset.ownerStadium));
    });
}

async function loadOwnerStadiums() {
    const container = document.getElementById('ownerStadiumSwitcher');
    if (container) container.innerHTML = '<div class="owner-stadium-loading">جاري تحميل ملاعب الحساب...</div>';

    try {
        const result = await adminPost('getOwnerStadiums');
        ownerStadiums = Array.isArray(result?.stadiums) ? result.stadiums : [];
        renderOwnerStadiumSwitcher();
    } catch (error) {
        console.error('Owner stadiums load failed:', error);
        if (container) container.innerHTML = '<div class="owner-stadium-error">تعذر تحميل ملاعب الحساب</div>';
    }
}

async function switchAdminStadium(newSlug) {
    if (!newSlug || newSlug === stadiumId) return;

    stadiumId = newSlug;
    // لا نسمح ببقاء إعدادات الملعب السابق ظاهرة أثناء تحميل الملعب الجديد.
    currentAccountStatus = "Free";
    const section = document.getElementById('adminSectionContent');
    if (section) section.innerHTML = '';
    const statusDisplay = document.getElementById('accountStatusDisplay');
    if (statusDisplay) statusDisplay.innerHTML = '';
    const upgradeOptions = document.getElementById('upgradeOptions');
    if (upgradeOptions) upgradeOptions.style.display = 'none';

    localStorage.setItem('lastVisitedStadiumId', stadiumId);

    const url = new URL(window.location.href);
    url.searchParams.set('id', stadiumId);
    window.history.replaceState({}, '', url.toString());

    renderOwnerStadiumSwitcher();
    document.querySelectorAll('.admin-nav-item').forEach(item => item.classList.remove('active-tab'));
    document.querySelector('.admin-nav-item[onclick*="settings"]')?.classList.add('active-tab');
    try {
        await loadStadiumDynamicDetails();
        await checkSubscriptionStatus();
        showSettings();
    } catch (error) {
        console.error('Stadium switch failed:', error);
        alert('تعذر فتح إعدادات الملعب المختار.');
    }
}


const urlParams = new URLSearchParams(window.location.search);
let stadiumId = urlParams.get('id'); 

// تحديث الـ ID في التخزين المحلي فوراً بمجرد الدخول من رابط يحتوي عليه
if (stadiumId) {
    localStorage.setItem('lastVisitedStadiumId', stadiumId);
}

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
    if (!stadiumId) {
    showMissingStadiumLanding();
    return false;
}

    // 1. (اختياري) إظهار رسالة تحميل بسيطة في الجدول
    const tableBody = document.getElementById('tableBody');
    if (tableBody) tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:20px;">جاري تحميل المواعيد...</td></tr>';

    try {
        const response = await fetch(`${settingsScriptURL}?action=getStadiumDetails&id=${encodeURIComponent(stadiumId)}`);
const responseText = await response.text();

if (responseText.trim() === "NotFound") {
    showMissingStadiumLanding();
    return false;
}

const data = JSON.parse(responseText);

if (data) {
            // تخزين الحالة في متغير عالمي لاستخدامه عند الضغط على زر الحجز
            window.stadiumData = data; 
            renderRelatedStadiums(data);
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
if (orgEl) orgEl.innerText = data.stadium_type || "نوع الملعب غير محدد";

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
setupSupervisorContact(data.phone, data.stadium_name);
            
            // 5. زر الموقع
         const locBtn = document.getElementById('btnLocation');
            if(locBtn) {
                if (data.lat && data.lng) {
                    locBtn.style.opacity = "1";
                    locBtn.onclick = (e) => {
                        e.preventDefault();
                        const mapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(data.lat)},${encodeURIComponent(data.lng)}`;
                        window.open(mapsUrl, '_blank', 'noopener,noreferrer');
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
                        const safeLink = safeExternalHref(link);
                        if (!safeLink) {
                            el.style.display = "none";
                            return;
                        }
                        el.href = safeLink;
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
                    const safeImageUrl = safeHttpUrl(imgUrl);
                    if (!safeImageUrl) return;
                    const slide = document.createElement('div');
                    slide.className = 'swiper-slide';
                    const image = document.createElement('img');
                    image.src = safeImageUrl;
                    image.alt = 'صورة الملعب';
                    image.style.cssText = 'width:100%; height:100%; object-fit:cover; display:block;';
                    image.addEventListener('error', () => {
                        image.onerror = null;
                        image.src = defaultImages[0];
                    }, { once: true });
                    slide.appendChild(image);
                    swiperWrapper.appendChild(slide);
                });

                if (typeof window.Swiper === 'function') {
                    if (window.mySwiper) window.mySwiper.destroy(true, true);
                    window.mySwiper = new Swiper('.swiper-container', {
                        loop: true,
                        autoplay: { delay: 3000, disableOnInteraction: false },
                        pagination: { el: '.swiper-pagination', clickable: true },
                        navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
                    });
                } else {
                    console.warn('Swiper is unavailable; continuing without the image carousel.');
                }
            } // نهاية if (swiperWrapper)
      // استدعاء بناء الجدول مع تمرير البيانات الجديدة لضمان السرعة والدقة
            if (typeof initTable === "function") {
                initTable(data); 
            }

return true;
           } else {
    showMissingStadiumLanding();
    return false;
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


function renderRelatedStadiums(data) {
    const bar = document.getElementById('relatedStadiumsBar');

    if (!bar || !data || !Array.isArray(data.related_stadiums) || data.related_stadiums.length <= 1) {
        if (bar) bar.style.display = 'none';
        return;
    }

    const links = data.related_stadiums.map(stadium => {
        const isActive = String(stadium.slug) === String(stadiumId);

        return `
            <a class="related-stadium-link ${isActive ? 'active' : ''}"
               href="booking.html?id=${encodeURIComponent(stadium.slug)}">
                <span class="related-stadium-heading">
                    <span class="stadium-card-icon">⚽</span>
                    <span class="stadium-card-name">${escapeHTML(stadium.stadium_name)}</span>
                </span>
                <small class="related-stadium-type">${escapeHTML(stadium.stadium_type || "Mini-foot")}</small>
                ${isActive ? '<small class="related-stadium-current">الملعب الحالي</small>' : ''}
            </a>
        `;
    }).join('');

    bar.innerHTML = `
        <div class="related-stadiums-title">
            🏟️ ملاعب هذا الحساب
        </div>
        <div class="related-stadiums-list">
            ${links}
        </div>
        <div class="related-stadiums-hint">
            اضغط على أي ملعب للانتقال إليه
        </div>
    `;

    bar.style.display = 'block';
}


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
   const lastHour = Math.min(endHour, 24);

for (let hour = startHour; hour < lastHour; hour++) {
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

    let notificationsAllowed = false;
    try {
        notificationsAllowed = await requestNotificationPermission_();
    } catch (error) {
        console.warn("Could not enable notifications:", error);
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
                headers: { 'Content-Type': 'application/json' },
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

        if (notificationsAllowed) {
            selectedSlots.forEach(slot => {
                scheduleNotification(slot.date, slot.hour, currentStadiumName);
            });
        }

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

let bookingsRequestInFlight = false;

async function loadExistingBookings() {
    if (bookingsRequestInFlight) return;
    bookingsRequestInFlight = true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20000);

    try {
        const response = await fetch(
            `${bookingScriptURL}?action=getBookings&id=${encodeURIComponent(stadiumId)}&t=${Date.now()}`,
            { cache: 'no-store', signal: controller.signal }
        );
        if (!response.ok) {
            throw new Error(`Booking request failed with status ${response.status}`);
        }

        const bookings = await response.json();
        if (!Array.isArray(bookings)) {
            throw new Error("Invalid bookings response");
        }
        handleData(bookings);
    } catch (error) {
        console.error('Bookings load failed:', error);
    } finally {
        window.clearTimeout(timeoutId);
        bookingsRequestInFlight = false;
    }
    return;
    /* Legacy JSONP code retained only for reference; backend now returns JSON.
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
    script.src = `${bookingScriptURL}?action=getBookings&id=${encodeURIComponent(stadiumId)}&callback=handleData&t=${new Date().getTime()}`;
    
    // 6. إضافة السكريبت إلى الصفحة لبدء جلب البيانات
    document.body.appendChild(script);
    */
}

function handleData(bookings) {
    if (!Array.isArray(bookings)) return;
    
    bookings.forEach(b => {
        // نبحث عن المربع الذي يطابق التاريخ والساعة القادمين من الشيت
        const slot = Array.from(document.querySelectorAll('.slot')).find(el =>
            el.dataset.date === String(b.date) && el.dataset.hour === String(b.hour)
        );
        
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
      const stadiumLoaded = await loadStadiumDynamicDetails();

if (!stadiumLoaded) {
    return;
}

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
// --- تحديث الجدول تلقائياً كل دقيقة عندما تكون الصفحة مرئية ولا توجد نافذة حجز مفتوحة ---
setInterval(() => {
    const modal = document.getElementById('bookingModal');
    const bookingModalClosed = !modal || modal.style.display === '' || modal.style.display === 'none';
    if (document.visibilityState === 'visible' && bookingModalClosed) {
        if (typeof loadExistingBookings === "function") loadExistingBookings();
    }
}, 60000);

const LOCAL_REMINDERS_KEY = "malaeb-local-reminders-v1";
let localReminderTimerId = null;

async function requestNotificationPermission_() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        return false;
    }

    if (Notification.permission === "granted") {
        await navigator.serviceWorker.register("./sw.js");
        return true;
    }

    if (Notification.permission !== "default") {
        return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
        return false;
    }

    await navigator.serviceWorker.register("./sw.js");
    return true;
}

function parseBookingDateTime_(bookingDate, bookingHour) {
    const dateParts = String(bookingDate).split("/").map(Number);
    const timeParts = String(bookingHour).split(":").map(Number);

    if (dateParts.length !== 3 || timeParts.length !== 2) {
        return null;
    }

    const [day, month, year] = dateParts;
    const [hour, minute] = timeParts;
    const value = new Date(year, month - 1, day, hour, minute, 0, 0);

    return value.getFullYear() === year &&
        value.getMonth() === month - 1 &&
        value.getDate() === day &&
        value.getHours() === hour &&
        value.getMinutes() === minute
        ? value
        : null;
}

function loadLocalReminders_() {
    try {
        const reminders = JSON.parse(localStorage.getItem(LOCAL_REMINDERS_KEY) || "[]");
        return Array.isArray(reminders) ? reminders : [];
    } catch (error) {
        console.warn("Could not load local reminders:", error);
        return [];
    }
}

function saveLocalReminders_(reminders) {
    localStorage.setItem(LOCAL_REMINDERS_KEY, JSON.stringify(reminders));
}

function scheduleNotification(bookingDate, bookingHour, stadiumName) {
    const playTime = parseBookingDateTime_(bookingDate, bookingHour);
    if (!playTime || playTime <= new Date()) {
        return;
    }

    const id = `${stadiumId}|${playTime.toISOString()}`;
    const reminders = loadLocalReminders_().filter(reminder => reminder.id !== id);
    reminders.push({
        id,
        stadiumName,
        bookingDate,
        bookingHour,
        playTime: playTime.getTime(),
        sentFiveHours: false,
        sentOneHour: false
    });
    saveLocalReminders_(reminders);
    processLocalReminders_();
}

async function processLocalReminders_() {
    if (Notification.permission !== "granted") {
        return;
    }

    const now = Date.now();
    const reminders = loadLocalReminders_();
    const activeReminders = [];
    const registration = await navigator.serviceWorker.ready;

    for (const reminder of reminders) {
        if (reminder.playTime <= now) {
            continue;
        }

        const fiveHoursBefore = reminder.playTime - 5 * 60 * 60 * 1000;
        const oneHourBefore = reminder.playTime - 60 * 60 * 1000;

        if (!reminder.sentFiveHours && now >= fiveHoursBefore && now < oneHourBefore) {
            await registration.showNotification("⚽ ملاعب NET", {
                body: `تذكير: تبقى 5 ساعات على موعدك في ${reminder.stadiumName} الساعة ${reminder.bookingHour}.`,
                icon: "logo_no_background.png",
                badge: "logo_no_background.png",
                tag: `${reminder.id}-5h`,
                requireInteraction: true
            });
            reminder.sentFiveHours = true;
        }

        if (!reminder.sentOneHour && now >= oneHourBefore) {
            await registration.showNotification("⚽ ملاعب NET", {
                body: `تذكير: تبقى ساعة واحدة على موعدك في ${reminder.stadiumName} الساعة ${reminder.bookingHour}.`,
                icon: "logo_no_background.png",
                badge: "logo_no_background.png",
                tag: `${reminder.id}-1h`,
                requireInteraction: true
            });
            reminder.sentOneHour = true;
        }

        activeReminders.push(reminder);
    }

    saveLocalReminders_(activeReminders);
}

function initializeLocalReminders_() {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
        return;
    }

    navigator.serviceWorker.register("./sw.js")
        .then(() => {
            processLocalReminders_().catch(error => {
                console.warn("Could not process local reminders:", error);
            });
        })
        .catch(error => {
            console.warn("Could not register service worker:", error);
        });

    if (localReminderTimerId === null) {
        localReminderTimerId = window.setInterval(() => {
            processLocalReminders_().catch(error => {
                console.warn("Could not process local reminders:", error);
            });
        }, 60 * 1000);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeLocalReminders_);
} else {
    initializeLocalReminders_();
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
        // يجب أن يطابق الكود الذي يدخله المستخدم لاحقًا في تسجيل الدخول.
        const rawPass = document.getElementById('upd_pass')?.value.trim() || "";
        if (rawPass && rawPass.length < 10) {
            alert("⚠️ لم يتم تغيير كلمة المرور: يجب أن تتكون من 10 أحرف على الأقل.");
            return;
        }
        // 2. تجميع البيانات في كائن (Object) عادي أولاً لسهولة المعالجة
        const dataToSave = {
            newPassword: rawPass,
            stadiumName: document.getElementById('upd_name')?.value || "",
            pDay: document.getElementById('upd_price_day')?.value || "",
            pNight: document.getElementById('upd_price_night')?.value || "",
            logo: document.getElementById('upd_logo')?.value || "",
            phone: document.getElementById('upd_phone')?.value || "",
            stadiumType: document.getElementById('upd_type')?.value || "",
            lat: document.getElementById('upd_lat')?.value || "",
            lng: document.getElementById('upd_lng')?.value || "",
            fb: document.getElementById('upd_fb')?.value || "",
            insta: document.getElementById('upd_insta')?.value || "",
            openHour: document.getElementById('openHourInput')?.value || "8",
            closeHour: document.getElementById('closeHourInput')?.value || "23",
            img1: document.getElementById('upd_img1')?.value || "",
            img2: document.getElementById('upd_img2')?.value || "",
            img3: document.getElementById('upd_img3')?.value || "",
            status: document.getElementById('upd_maintenance')?.checked ? "maintenance" : "open"
        };

        const result = await adminPost("adminUpdateSettings", dataToSave);

        if (String(result).trim() === "Success") {
            if (rawPass) {
                await fetch(`${settingsScriptURL}?action=logout`, {
                    method: 'POST',
                    credentials: 'include'
                });
                alert("✅ تم تحديث كلمة المرور. سجّل الدخول مرة أخرى.");
            } else {
                alert("✅ تم تحديث بيانات الملعب بنجاح!");
            }
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
        const response = await fetch(`${settingsScriptURL}?action=getStadiumDetails&id=${encodeURIComponent(stadiumId)}`);
        const data = await response.json();

        if (data === "NotFound") {
            content.innerHTML = "<p style='color:red;'>تعذر العثور على بيانات الملعب</p>";
            return;
        }

      let html = `
    <h3 style="text-align: center; color: #1e3a8a; font-family: 'Cairo', sans-serif;">⚙️ إعدادات الملعب</h3>
    <div style="display: flex; flex-direction: column; gap: 15px; font-family: 'Cairo', sans-serif; text-align: right; direction: rtl;">
        
        <label><b>اسم الملعب:</b></label>
        <input type="text" id="upd_name" class="admin-input" value="${escapeHTML(data.stadium_name)}">
        
        <label><b>نوع الملعب:</b></label>
        <select id="upd_type" class="admin-input">${stadiumTypeOptions(data.stadium_type)}</select>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
                <label><b>سعر النهار:</b></label>
                <input type="number" id="upd_price_day" class="admin-input" value="${escapeHTML(data.price_day)}">
            </div>
            <div>
                <label><b>سعر الليل:</b></label>
                <input type="number" id="upd_price_night" class="admin-input" value="${escapeHTML(data.price_night)}">
            </div>
        </div>

        <label><b>رقم الهاتف (واتساب):</b></label>
        <input type="text" id="upd_phone" class="admin-input" value="${escapeHTML(data.phone)}">

        <div class="admin-field">
            <label><b>تحديد موقع الملعب:</b></label>
            <button type="button" data-detect-coordinates onclick="detectCoordinates()" class="btn-secondary">📍 تحديد موقعي الحالي</button>
            <input type="hidden" id="upd_lat" value="${escapeHTML(data.lat || '')}">
            <input type="hidden" id="upd_lng" value="${escapeHTML(data.lng || '')}">
            <div id="upd_coordSuccess" class="owner-coord-success" style="${data.lat && data.lng ? '' : 'display:none;'}">✅ تم حفظ إحداثيات الملعب.</div>
            <small>اضغط الزر وأنت داخل الملعب. سيستخدم اللاعبون هذه الإحداثيات لفتح الخريطة.</small>
        </div>

        <div style="background: #f8fafc; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0;">
            <label style="display: flex; align-items: center; gap: 8px; color: #2563eb;">
                <b>روابط الصور (الشعار والسلايدر):</b>
                <span onclick="showImageHelp()" style="cursor: pointer; background: #2563eb; color: white; width: 18px; height: 18px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 12px;">؟</span>
            </label>
            <p style="font-size: 11px; color: #64748b; margin: 5px 0;">ارفع الصور على <a href="https://postimages.org/" target="_blank" rel="noopener noreferrer" style="color:#22c55e; font-weight:bold; text-decoration:none;">Postimages.org</a> وانسخ "الرابط المباشر".</p>
            
            <label style="font-size: 12px; display:block; margin-top:10px;">رابط اللوجو:</label>
            <input type="text" id="upd_logo" class="admin-input" value="${escapeHTML(data.logo_url || '')}" placeholder="رابط اللوجو المباشر (Direct Link)" style="margin-bottom:8px;">
            
            <label style="font-size: 12px; display:block;">صور السلايدر (1، 2، 3):</label>
            <input type="text" id="upd_img1" class="admin-input" value="${escapeHTML(data.img1 || '')}" placeholder="رابط صورة السلايدر 1" style="margin-bottom:5px;">
            <input type="text" id="upd_img2" class="admin-input" value="${escapeHTML(data.img2 || '')}" placeholder="رابط صورة السلايدر 2" style="margin-bottom:5px;">
            <input type="text" id="upd_img3" class="admin-input" value="${escapeHTML(data.img3 || '')}" placeholder="رابط صورة السلايدر 3">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
            <div>
                <label><b>فيسبوك:</b></label>
                <input type="text" id="upd_fb" class="admin-input" value="${escapeHTML(data.fb || '')}" placeholder="facebook.com/page">
            </div>
            <div>
                <label><b>إنستغرام:</b></label>
                <input type="text" id="upd_insta" class="admin-input" value="${escapeHTML(data.insta || '')}" placeholder="instagram.com/user">
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
    <div class="danger-zone">
    <h4>حذف الحساب</h4>
    <p>سيتم حذف بيانات الملعب من المنصة. لا تقم بهذا الإجراء إلا إذا كنت متأكدًا.</p>
    <button type="button" onclick="confirmDeleteAccount()" class="delete-account-btn">
        حذف الحساب
    </button>
</div>
    `;
     
content.innerHTML = html;

// --- أضف الكود هنا لملء الخيارات فور ظهورها في الصفحة ---
    const openSelect = document.getElementById('openHourInput');
    const closeSelect = document.getElementById('closeHourInput');

    if (openSelect && closeSelect) {
        for (let i = 0; i <= 24; i++) {
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
        const response = await adminGet("getAdminBookings");
        if (!response.ok) {
            throw new Error(`Admin bookings request failed with status ${response.status}`);
        }

        const bookings = await response.json();
        if (!Array.isArray(bookings)) {
            throw new Error("Invalid admin bookings response");
        }

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
            <div class="cancellation-table-wrap">
    <div class="cancellation-scroll-hint">
        اسحب الجدول يمينًا ويسارًا لرؤية جميع الخانات
    </div>
              <table class="cancellation-table">
                    <thead style="position: sticky; top: 0; background:#f8fafc; z-index:10;">
                        <tr>
                            <th style="padding:12px 8px; border-bottom:2px solid #e2e8f0; text-align:right;">اليوم</th>
                            <th style="padding:12px 8px; border-bottom:2px solid #e2e8f0; text-align:center;">التاريخ</th>
                            <th style="padding:12px 8px; border-bottom:2px solid #e2e8f0; text-align:center;">الساعة</th>
                            <th style="padding:12px 8px; border-bottom:2px solid #e2e8f0; text-align:right;">الاسم</th>
                            <th style="padding:12px 8px; border-bottom:2px solid #e2e8f0; text-align:center;">الهاتف</th>
                           <th class="cancel-action-cell" style="padding:12px 8px; border-bottom:2px solid #e2e8f0; text-align:center;">
    إجراء
</th>
                        </tr>
                    </thead>
                    <tbody>`;

        bookings.forEach(bk => {
            const dayName = bk.dayName || "—";

            html += `
                <tr style="border-bottom:1px solid #f1f5f9; transition:0.2s;" onmouseover="this.style.background='#f8fafc'" onmouseout="this.style.background='transparent'">
                    <td style="padding:10px 8px; font-weight:bold; color:#1e3a8a;">${escapeHTML(dayName)}</td>
                    <td style="padding:10px 8px; text-align:center; color:#64748b;">${escapeHTML(bk.date)}</td>
                    <td style="padding:10px 8px; text-align:center; direction:ltr;">${escapeHTML(bk.hour)}</td>
                    <td style="padding:10px 8px; font-weight:500;">${escapeHTML(bk.name)}</td>
                   <td class="cancel-action-cell" style="padding:10px 8px; text-align:center;">
                        <a href="tel:${encodeURIComponent(String(bk.phone || ''))}" style="text-decoration:none; color:#16a34a; font-weight:bold;">
                            ${escapeHTML(bk.phone || "—")} 📞
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
    // تعطيل الزر مؤقتاً
    const originalText = btn ? btn.innerText : "إلغاء";
    if (btn) {
        btn.disabled = true;
        btn.innerText = "...";
    }

    try {
        const response = await adminGet("cancelBooking", { row: rowNumber, _t: Date.now() });
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
        const response = await adminGet("getStats");
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
        const response = await fetch(`${settingsScriptURL}?action=adminAuth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ action: 'adminAuth', id: stadiumId, password }),
            credentials: 'include',
            cache: 'no-store'
        });
        const responseText = await response.text();
        let result;
        try {
            result = JSON.parse(responseText);
        } catch {
            throw new Error("استجابة غير صالحة من الخادم.");
        }

        if (response.ok && result.result === "success") {
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
                await checkSubscriptionStatus();
            }

            // 3. إظهار أي أيقونات إدارية متفرقة في الصفحة
            document.querySelectorAll('.admin-only, .admin-icon').forEach(el => {
                el.style.setProperty('display', 'block', 'important');
            });
            
            // 4. تشغيل دالة عرض الإعدادات
           if (typeof showSettings === "function") {
    const settingsTab = document.querySelector(
        '.admin-nav-item[onclick*="settings"]'
    );

    if (settingsTab) {
        settingsTab.classList.add('active-tab');
    }

    showSettings();
    await loadOwnerStadiums();
}

        } else {
            const message = result.error === "Worker configuration is incomplete"
                ? "إعداد PASSWORD_PEPPER أو SESSIONS غير مكتمل في Cloudflare Worker."
                : result.error === "Upstream request failed"
                    ? "فشل اتصال Worker بـGoogle Apps Script. تأكد من نشر Code.gs في نفس المشروع المرتبط بـAPPS_SCRIPT_URL."
                    : "كلمة السر غير صحيحة، حاول مرة أخرى.";
            alert("❌ " + message);
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
        const response = await fetch(`${settingsScriptURL}?action=forgotPassword&id=${encodeURIComponent(stadiumId)}&email=${encodeURIComponent(email)}&_t=${Date.now()}`, {
            cache: 'no-store'
        });
        const result = await response.text();

        if (result.trim() === "Sent") {
            // منع استخدام جلسة قديمة بعد طلب إعادة التعيين.
            await fetch(`${settingsScriptURL}?action=logout`, {
                method: 'POST',
                credentials: 'include'
            });
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
    const panel = document.getElementById('adminPanel');
    if (panel) panel.style.display = 'none';

    // بعد اختيار ملعب من لوحة التحكم، أعد فتح الواجهة العامة للملعب المختار.
    const target = stadiumId;
    if (target) {
        const url = new URL('booking.html', window.location.href);
        url.searchParams.set('id', target);
        window.location.href = url.toString();
    }
}
function showBookingTicket(stadiumName, date, time, stadiumUrl) {
    const days = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
    const parts = String(date).split('/');
    const formattedDate = parts.length === 3 ? new Date(parts[2], parts[1] - 1, parts[0]) : new Date(date);
    const dayName = days[formattedDate.getDay()] || "الموعد المحدد";
    const shareText = `⚽ *تذكرة حجز مباراة*\n\n📍 الملعب: ${stadiumName}\n📅 اليوم: ${dayName}\n📆 التاريخ: ${date}\n⏰ الوقت: ${time}\n\n🔗 الرابط:\n${stadiumUrl}\n\nتم عبر ملاعب NET 🏟️`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    const formContent = document.getElementById('bookingFormContent');
    const ticketContainer = document.getElementById('successTicketContainer');

    if (ticketContainer && formContent) {
        const ticket = document.createElement('div');
        ticket.className = 'ticket-container';
        ticket.style.cssText = "text-align:center; font-family:'Cairo', sans-serif;";
        const header = document.createElement('div');
        header.className = 'ticket-header';
        header.style.cssText = "background:#1e3a8a; color:white; padding:10px; border-radius:10px 10px 0 0;";
        const title = document.createElement('h3');
        title.style.margin = '0';
        title.textContent = 'تم الحجز بنجاح! ✅';
        header.appendChild(title);

        const body = document.createElement('div');
        body.className = 'ticket-body';
        body.style.cssText = "padding:15px; border:1px solid #e2e8f0; border-top:none; background:#fff;";
        const stadiumLine = document.createElement('p');
        stadiumLine.style.margin = '5px 0';
        const stadiumLabel = document.createElement('strong');
        stadiumLabel.textContent = String(stadiumName);
        stadiumLine.appendChild(stadiumLabel);
        const dateLine = document.createElement('p');
        dateLine.style.cssText = 'margin:5px 0; color:#475569;';
        dateLine.textContent = `${dayName} | ${date}`;
        const timeLine = document.createElement('p');
        timeLine.style.cssText = 'margin:5px 0; font-size:1.2rem; color:#1e3a8a; font-weight:bold;';
        timeLine.textContent = String(time);
        body.append(stadiumLine, dateLine, timeLine);

        const footer = document.createElement('div');
        footer.className = 'ticket-footer';
        footer.style.marginTop = '15px';
        const shareButton = document.createElement('button');
        shareButton.type = 'button';
        shareButton.style.cssText = "background:#22c55e; color:white; border:none; padding:12px 20px; border-radius:8px; cursor:pointer; font-weight:bold; width:100%; font-family:'Cairo';";
        shareButton.textContent = 'ارسل التفاصيل للفريق (واتساب) 💬';
        shareButton.addEventListener('click', () => {
            window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
        });
        const hint = document.createElement('p');
        hint.style.cssText = 'font-size:0.7rem; color:#64748b; margin-top:10px;';
        hint.textContent = 'يفضل عمل لقطة شاشة للتذكرة 📸';
        footer.append(shareButton, hint);
        ticket.append(header, body, footer);

        formContent.style.display = 'none';
        ticketContainer.style.display = 'block';
        ticketContainer.replaceChildren(ticket);
    } else {
        alert(`✅ تم الحجز!\nالملعب: ${stadiumName}\nالوقت: ${time}`);
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
}

// --- المتغيرات العالمية ---
let currentAccountStatus = "Free"; 

// --- 1. دالة فحص حالة الاشتراك (هذه كانت ناقصة في قائمتك) ---
async function checkSubscriptionStatus() {
    const statusDisplay = document.getElementById('accountStatusDisplay');
    const upgradeOptions = document.getElementById('upgradeOptions');

    try {
        const response = await fetch(`${settingsScriptURL}?action=getStadiumDetails&id=${encodeURIComponent(stadiumId)}`);
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

// نفس آلية تحديد الموقع الموجودة في dashboard.html، وتعمل أيضًا مع نموذج الإضافة الديناميكي.
function detectCoordinates() {
    const latInput = document.getElementById('add_stadium_lat') || document.getElementById('upd_lat') || document.getElementById('lat');
    const lngInput = document.getElementById('add_stadium_lng') || document.getElementById('upd_lng') || document.getElementById('lng');
    const successMessage = document.getElementById('add_stadium_coordSuccess') || document.getElementById('upd_coordSuccess') || document.getElementById('coordSuccess');
    const button = document.querySelector('[data-detect-coordinates]') ||
        document.querySelector('button[onclick="detectCoordinates()"]');

    if (!navigator.geolocation) {
        alert('متصفحك لا يدعم تحديد الموقع.');
        return;
    }

    if (!latInput || !lngInput) {
        alert('تعذر العثور على حقول الإحداثيات. افتح نموذج إضافة الملعب من جديد.');
        return;
    }

    const originalText = button?.innerHTML || '📍';
    if (button) {
        button.disabled = true;
        button.innerHTML = '⏳';
    }

    navigator.geolocation.getCurrentPosition(
        position => {
            latInput.value = position.coords.latitude;
            lngInput.value = position.coords.longitude;
            if (successMessage) successMessage.style.display = 'block';
            if (button) {
                button.disabled = false;
                button.style.background = '#059669';
                button.innerHTML = '✅';
            }
            alert('تم تحديد إحداثيات ملعبك بدقة عالية.');
        },
        error => {
            if (button) {
                button.disabled = false;
                button.style.background = '#10b981';
                button.innerHTML = originalText;
            }
            let message = 'فشل الحصول على الموقع.';
            if (error.code === 1) message = 'يرجى السماح للمتصفح بالوصول إلى موقعك.';
            if (error.code === 2) message = 'تعذر تحديد الموقع الحالي. حاول في مكان مفتوح.';
            if (error.code === 3) message = 'استغرق تحديد الموقع وقتًا طويلًا. حاول مرة أخرى.';
            alert(message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

// تعديل دوال الأزرار
function showSettings() {
    if (currentAccountStatus !== "Premium") {
        const content = document.getElementById('adminSectionContent');
        if (content) content.innerHTML = '';
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
    renderUpgradeStadiums();
}

function toggleTransferDetails() {
    const method = document.getElementById('payMethod');
    const instructions = document.getElementById('transferInstructions');

    if (!method || !instructions) return;

    instructions.style.display =
        method.value === 'Transfer' ? 'block' : 'none';
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

function isPremiumStadium(stadium) {
    return String(stadium?.accountType || '').trim().toLowerCase() === 'premium';
}

async function getUpgradeStadiums() {
    const related = Array.isArray(window.stadiumData?.related_stadiums)
        ? window.stadiumData.related_stadiums
        : [];

    const candidates = related.length ? related : [{
        slug: stadiumId,
        stadium_name: window.stadiumData?.stadium_name || document.title.split('-')[0].trim(),
        accountType: window.stadiumData?.accountType || 'Free'
    }];

    // related_stadiums في بعض إصدارات الـ API تحتوي الاسم والمعرّف فقط،
    // لذلك نجلب حالة الاشتراك لكل ملعب قبل عرض خيارات الدفع.
    const enriched = await Promise.all(candidates.map(async stadium => {
        if (String(stadium.slug) === String(stadiumId) && window.stadiumData) {
            return { ...stadium, accountType: window.stadiumData.accountType || stadium.accountType || 'Free' };
        }

        try {
            const response = await fetch(
                `${settingsScriptURL}?action=getStadiumDetails&id=${encodeURIComponent(stadium.slug)}&_t=${Date.now()}`
            );
            const details = await response.json();
            return { ...stadium, accountType: details?.accountType || stadium.accountType || 'Free' };
        } catch (error) {
            console.warn('تعذر قراءة حالة اشتراك الملعب:', stadium.slug, error);
            return stadium;
        }
    }));

    return enriched.filter(stadium => !isPremiumStadium(stadium));
}

async function renderUpgradeStadiums() {
    const list = document.getElementById('upgradeStadiumList');
    if (!list) return;

    list.innerHTML = '<p class="upgrade-helper-text">جاري التحقق من حالة الاشتراك...</p>';
    const availableStadiums = await getUpgradeStadiums();

    if (!availableStadiums.length) {
        list.innerHTML = '<p class="upgrade-helper-text">جميع ملاعب حسابك مشتركة بالفعل في Premium.</p>';
        updateUpgradeTotal();
        return;
    }

    list.innerHTML = availableStadiums.map((stadium, index) => `
        <label class="upgrade-stadium-option">
            <input
                type="checkbox"
                class="upgrade-stadium-checkbox"
                value="${stadium.slug}"
                data-name="${stadium.stadium_name}"
                ${String(stadium.slug) === String(stadiumId) || index === 0 ? 'checked' : ''}
                onchange="updateUpgradeTotal()">

            <span>${stadium.stadium_name}</span>
            <small>
                ${String(stadium.slug) === String(stadiumId) ? 'الملعب الحالي' : 'ملعب تابع'}
            </small>
        </label>
    `).join('');

    updateUpgradeTotal();
}

function updateUpgradeTotal() {
    const count = document.querySelectorAll(
        '.upgrade-stadium-checkbox:checked'
    ).length;

    const monthly = count > 0 ? 200 + ((count - 1) * 100) : 0;
    const annual = monthly * 10;
    const type = document.getElementById('planType')?.value || 'monthly';
    const total = type === 'annual' ? annual : monthly;

    document.getElementById('upgradeTotalAmount').textContent =
        `${total.toLocaleString('ar-MA')} د.م`;

    document.getElementById('upgradeTotalDetails').textContent =
        count
            ? `${count} ملعب · ${type === 'annual' ? 'سنوي' : 'شهري'}`
            : 'حدد الملاعب أولاً';
}


function confirmFinalPayment() {
    const selected = Array.from(
        document.querySelectorAll('.upgrade-stadium-checkbox:checked')
    );

    if (!selected.length) {
        alert('يرجى اختيار ملعب واحد على الأقل.');
        return;
    }

    const count = selected.length;
    const monthly = 200 + ((count - 1) * 100);
    const type = document.getElementById('planType').value;
    const total = type === 'annual' ? monthly * 10 : monthly;

    const plan = type === 'annual'
        ? `سنوي (${total} د.م)`
        : `شهري (${total} د.م)`;

    const method = document.getElementById('payMethod').value;
    const stadiumNames = selected
        .map(item => item.dataset.name)
        .join('، ');
    
    // 1. التعامل مع البطاقة البنكية (غير جاهزة)
    if (method === "Card") {
        alert("⚠️ عذراً، خدمة الدفع المباشر بالبطاقة البنكية قيد التطوير حالياً.\n\nيرجى استخدام خيار 'التحويل البنكي' مؤقتاً لتفعيل حسابك فوراً.");
        return; // توقف هنا ولا تفتح واتساب
    }

    // 2. التعامل مع التحويل البنكي
    let methodText = "تحويل بنكي";
    
  const msg = `مرحباً ملاعب NET، أريد ترقية حسابي:
🏟️ الملاعب: ${stadiumNames}
📊 عدد الملاعب: ${count}
💳 الخطة: ${plan}
💰 وسيلة الدفع: ${method === 'Transfer' ? 'تحويل بنكي' : 'بطاقة بنكية'}
--- سأرسل صورة الوصل الآن`;
    
   const whatsappUrl =
    `https://api.whatsapp.com/send?phone=212779634434&text=${encodeURIComponent(msg)}`;

alert(
    "سيتم الآن توجيهك إلى واتساب.\n\n" +
    "يرجى إرفاق صورة وصل التحويل في المحادثة."
);

window.location.href = whatsappUrl;
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
            <p>يجوز للاعب إلغاء الحجز قبل موعده على الأقل قبل 12 ساعة ذلك عبر الاتصال بمشرف الملعب .</p>

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
           const response = await fetch(`${bookingScriptURL}?action=getAllStadiums`);
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
                            <h4 style="margin-bottom:2px;">${escapeHTML(stadium.stadium_name)}</h4>
                            <p style="margin:0 0 6px; color:#475569; font-size:.85rem;">${escapeHTML(stadium.stadium_type || "نوع غير محدد")}</p>
                            <span class="distance-tag" style="background:#e0f2fe; color:#0369a1;">
                                🚗 يبعد ${stadium.distance.toFixed(1)} كلم عنك
                            </span>
                        </div>
                        <div class="btn-group" style="margin-top:12px; display:flex; gap:8px;">
                            <a href="https://www.google.com/maps?q=${encodeURIComponent(stadium.lat)},${encodeURIComponent(stadium.lng)}"
                               target="_blank" rel="noopener noreferrer" class="btn-action btn-map" style="background:#10b981; flex:1; text-align:center; padding:10px; border-radius:8px; color:white; text-decoration:none; font-size:0.85rem;">
                               🗺️ الخريطة
                            </a>
                            <a href="booking.html?id=${encodeURIComponent(stadium.slug)}" 
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
    if (tab !== 'addStadium' && currentAccountStatus !== 'Premium') {
        shakeUpgradeButton();
        document.querySelector('.admin-nav-item[onclick*="settings"]')?.classList.add('active-tab');
        const lockedContent = document.getElementById('adminSectionContent');
        if (lockedContent) lockedContent.innerHTML = '';
        return;
    }

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
    } else if (tab === 'addStadium') {
        openAddStadiumRegistration();
    }
}


async function legacyAddStadiumRegistration() {
    if (!stadiumId) {
        alert("تعذر معرفة الملعب الحالي.");
        return;
    }

    const registerUrl = new URL("register.html", window.location.href);
    registerUrl.searchParams.set("mode", "addSubStadium");
    registerUrl.searchParams.set("parent", stadiumId);
    registerUrl.searchParams.set("_", Date.now());

    window.location.href = registerUrl.toString();
}




// لوحة إنشاء ملعب جديد ضمن حساب المالك نفسه.
async function openAddStadiumRegistration() {
    if (!stadiumId) return;

    const content = document.getElementById('adminSectionContent');
    if (!content) return;

    content.innerHTML = `
        <section class="owner-add-stadium-form owner-dashboard-form" dir="rtl">
            <div class="owner-form-heading">
                <h3>إضافة ملعب جديد</h3>
                <p>أدخل معلومات الملعب كما تظهر في صفحة إعدادات الداشبورد.</p>
            </div>

            <div class="owner-form-section">
                <label>اسم الملعب التجاري *<input id="add_stadium_name" maxlength="120" required placeholder="مثلاً: ملعب نجوم بوعسل"></label>
            </div>
            <div class="owner-form-section">
                <label>نوع الملعب
                    <select id="add_stadium_type">${stadiumTypeOptions("Mini-foot")}</select>
                </label>
            </div>
            <div class="owner-form-section">
                <label>ثمن الحجز بالساعة</label>
                <div class="owner-form-grid owner-price-grid">
                    <input id="add_stadium_pday" type="number" min="0" step="0.01" placeholder="نهاراً (درهم)">
                    <input id="add_stadium_pnight" type="number" min="0" step="0.01" placeholder="ليلاً - مع الأضواء (درهم)">
                </div>
            </div>
            <div class="owner-form-section">
                <label>رقم هاتف المشرف أو المكلف بالملعب<input id="add_stadium_phone" type="tel" maxlength="30" placeholder="06xxxxxxxx"></label>
            </div>
            <div class="owner-form-section">
                <label>تحديد موقع الملعب *</label>
                <div class="owner-location-row">
                    <button type="button" data-detect-coordinates onclick="detectCoordinates()" title="حدد إحداثيات موقعك الحالي">📍</button>
                </div>
                <input type="hidden" id="add_stadium_lat">
                <input type="hidden" id="add_stadium_lng">
                <div id="add_stadium_coordSuccess" class="owner-coord-success" style="display:none;">✅ تم التقاط إحداثيات الملعب بنجاح.</div>
                <small>اضغط 📍 وأنت داخل الملعب. سيُستخدم الموقع لخاصية الملاعب القريبة وزر الخريطة.</small>
            </div>
            <div class="owner-form-section">
                <label>روابط التواصل الاجتماعي</label>
                <div class="owner-form-grid owner-social-grid">
                    <input id="add_stadium_fb" type="url" placeholder="رابط صفحة فيسبوك">
                    <input id="add_stadium_insta" type="url" placeholder="رابط حساب إنستغرام">
                </div>
            </div>
            <div class="owner-form-actions">
                <button type="button" class="btn-primary" onclick="createStadiumFromDashboard(this)">إنشاء ملعب جديد</button>
                <button type="button" class="btn-secondary" onclick="showSettings()">إلغاء</button>
            </div>
        </section>
    `;
}

async function createStadiumFromDashboard(button) {
    const name = document.getElementById('add_stadium_name')?.value.trim();
    if (!name) {
        alert('أدخل اسم الملعب أولاً.');
        return;
    }
    const latitude = document.getElementById('add_stadium_lat')?.value.trim();
    const longitude = document.getElementById('add_stadium_lng')?.value.trim();
    if (!latitude || !longitude) {
        alert('اضغط زر 📍 لتحديد إحداثيات الملعب قبل الإنشاء.');
        return;
    }

    const originalText = button?.innerText || 'إنشاء الملعب';
    if (button) {
        button.disabled = true;
        button.innerText = 'جاري الإنشاء...';
    }

    const field = id => document.getElementById(id)?.value.trim() || '';
    try {
        const result = await adminPost('createStadium', {
            stadiumName: name,
            stadiumType: field('add_stadium_type'),
            phone: field('add_stadium_phone'),
            pDay: field('add_stadium_pday'),
            pNight: field('add_stadium_pnight'),
            lat: latitude,
            lng: longitude,
            fb: field('add_stadium_fb'),
            insta: field('add_stadium_insta')
        });

        const responseText = String(result || '');
        if (!responseText.startsWith('Success:')) {
            throw new Error(responseText || 'تعذر إنشاء الملعب');
        }

        const newSlug = responseText.substring('Success:'.length).trim();
        if (!newSlug) throw new Error('لم يُرجع الخادم معرف الملعب الجديد');

        await switchAdminStadium(newSlug);
        await loadOwnerStadiums();
        alert('تم إنشاء الملعب وفتحه بنجاح.');
    } catch (error) {
        console.error('Create stadium failed:', error);
        alert('تعذر إنشاء الملعب: ' + (error.message || 'خطأ غير معروف'));
    } finally {
        if (button) {
            button.disabled = false;
            button.innerText = originalText;
        }
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

async function confirmDeleteAccount() {
    const confirmText = prompt('للتأكيد النهائي اكتب: حذف');

    if (confirmText !== "حذف") {
        alert("تم إلغاء عملية الحذف.");
        return;
    }

    try {
        // نحفظ أول ملعب متبقٍ في الحساب قبل حذف الملعب الحالي.
        // ترتيب getOwnerStadiums هو ترتيب الصفوف، وبالتالي يبقى الملعب الأساسي
        // (الأول إنشاءً) هو الوجهة بعد حذف ملعب آخر.
        let fallbackStadiumId = '';
        try {
            const ownerResponse = await adminGet("getOwnerStadiums", { _t: Date.now() });
            const ownerResult = await ownerResponse.json();
            const remaining = Array.isArray(ownerResult?.stadiums)
                ? ownerResult.stadiums.filter(item => String(item.slug) !== String(stadiumId))
                : [];
            fallbackStadiumId = remaining[0]?.slug || '';
        } catch (ownerError) {
            console.warn('تعذر تحديد الملعب البديل قبل الحذف:', ownerError);
        }

        const response = await adminGet("deleteStadiumAccount");
        const result = await response.text();

        if (result.trim() === "DeleteSuccess") {
            alert("تم حذف الحساب بنجاح.");
            if (fallbackStadiumId) {
                localStorage.setItem('lastVisitedStadiumId', fallbackStadiumId);
                window.location.href = "booking.html?id=" + encodeURIComponent(fallbackStadiumId);
            } else {
                localStorage.removeItem('lastVisitedStadiumId');
                window.location.href = "register.html";
            }
        } else if (result.trim() === "Unauthorized") {
            alert("الرقم السري غير صحيح.");
        } else {
            alert("حدث خطأ أثناء الحذف: " + result);
        }
    } catch (error) {
        alert("فشل الاتصال بالسيرفر.");
    }


    
}

function showMissingStadiumLanding() {
    window.stadiumMissing = true;
    document.body.classList.add('missing-stadium-page');

    const tableWrap = document.querySelector(".booking-table-scroll");
    const weekNav = document.querySelector(".week-navigation");
    const actionButtons = document.querySelector(".action-buttons");
    const footer = document.querySelector(".site-footer");
    const supervisorButton = document.getElementById('supervisorFloatBtn');
    const relatedBar = document.getElementById('relatedStadiumsBar');
    const mainContainer = document.querySelector('.container');
    const title = document.getElementById("displayStadiumName");
    const org = document.getElementById("displayOrg");
    const location = document.getElementById("displayLocation");

    if (tableWrap) tableWrap.style.display = "none";
    if (weekNav) weekNav.style.display = "none";
    if (actionButtons) actionButtons.style.display = "none";
    if (footer) footer.style.display = "none";
    if (supervisorButton) supervisorButton.style.display = "none";
    if (relatedBar) relatedBar.style.display = "none";
    if (mainContainer) {
        mainContainer.style.opacity = '1';
        mainContainer.style.transition = 'none';
    }

    if (title) title.innerText = "هذا الملعب غير متوفر حاليًا";
    if (org) org.innerText = "";
    if (location) location.innerText = "";
    if (stadiumId && localStorage.getItem('lastVisitedStadiumId') === stadiumId) {
        localStorage.removeItem('lastVisitedStadiumId');
    }

    const oldLanding = document.getElementById("missingStadiumLanding");
    if (oldLanding) oldLanding.remove();

    const app = document.querySelector(".app-container") || document.body;

    const landing = document.createElement("div");
    landing.id = "missingStadiumLanding";
    landing.className = "missing-stadium-landing";
    landing.innerHTML = `
        <div class="missing-stadium-card">
            <img src="logo_no_background.png" alt="MalaibNet" class="missing-stadium-logo">
            <h2>${stadiumId ? 'الملعب غير موجود أو تم حذف الحساب' : 'مرحباً بك في ملاعب NET'}</h2>
            <p>اختر الخدمة المناسبة لك.</p>

            <div class="missing-stadium-actions">
                <div class="missing-actions-heading">
                    خدمات أصحاب الملاعب
                </div>
                <a href="register.html" class="missing-primary-btn">إنشاء واجهة ملعب</a>
                <button type="button" onclick="toggleOwnerLandingLogin()" class="missing-login-btn">
                    تسجيل دخول صاحب الملعب
                </button>
                <form id="ownerLandingLogin" class="owner-landing-login" style="display:none;" onsubmit="submitOwnerLandingLogin(event)">
                    <label for="ownerLandingEmail">البريد الإلكتروني</label>
                    <input id="ownerLandingEmail" type="email" required autocomplete="username" placeholder="name@example.com" style="width:100%; box-sizing:border-box; margin:6px 0 10px; padding:10px; border:1px solid #cbd5e1; border-radius:8px;">
                    <label for="ownerLandingPassword">كلمة المرور</label>
                    <input id="ownerLandingPassword" type="password" required autocomplete="current-password" style="width:100%; box-sizing:border-box; margin:6px 0 10px; padding:10px; border:1px solid #cbd5e1; border-radius:8px;">
                    <button type="submit" class="missing-primary-btn" style="width:100%;">دخول إلى لوحة التحكم</button>
                </form>
                <div class="missing-actions-heading missing-player-heading">للاعبين</div>
                <button type="button" onclick="openNearbyModal()" class="missing-secondary-btn">
                    البحث عن ملاعب قريبة
                </button>
                <a href="mailto:malaib.net@gmail.com?subject=بلاغ%20عن%20مشكلة%20في%20ملاعب%20NET" class="missing-contact-link">
                    تواصل للإبلاغ عن مشكلة
                </a>
            </div>
        </div>
    `;

    app.appendChild(landing);
}

function toggleOwnerLandingLogin() {
    const form = document.getElementById('ownerLandingLogin');
    if (!form) return;
    const isHidden = form.style.display === 'none';
    form.style.display = isHidden ? 'block' : 'none';
    if (isHidden) document.getElementById('ownerLandingEmail')?.focus();
}

async function submitOwnerLandingLogin(event) {
    event.preventDefault();
    const emailInput = document.getElementById('ownerLandingEmail');
    const passwordInput = document.getElementById('ownerLandingPassword');
    const submitButton = event.currentTarget.querySelector('button[type="submit"]');
    const email = emailInput?.value.trim().toLowerCase() || '';
    const password = passwordInput?.value || '';

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !password) {
        alert('أدخل البريد الإلكتروني وكلمة المرور.');
        return;
    }

    const originalText = submitButton?.innerText;
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerText = 'جاري تسجيل الدخول...';
    }
    try {
        const response = await fetch(`${settingsScriptURL}?action=adminAuth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ action: 'adminAuth', email, password }),
            credentials: 'include',
            cache: 'no-store'
        });
        const result = await response.json().catch(() => null);
        if (!response.ok || result?.result !== 'success') {
            throw new Error('بيانات الدخول غير صحيحة.');
        }
        const ownerStadiumId = String(result.stadiumId || '').trim();
        if (!/^[a-zA-Z0-9_-]{3,80}$/.test(ownerStadiumId)) {
            throw new Error('تعذر تحديد حساب الملعب.');
        }
        localStorage.setItem('lastVisitedStadiumId', ownerStadiumId);
        window.location.assign(`booking.html?id=${encodeURIComponent(ownerStadiumId)}`);
    } catch (error) {
        alert(error.message || 'تعذر تسجيل الدخول حالياً.');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerText = originalText;
        }
    }
}




function normalizeMoroccanPhone(phone) {
    let cleanPhone = String(phone || "").replace(/\s+/g, "").replace(/[^\d+]/g, "");

    if (cleanPhone.startsWith("+")) {
        cleanPhone = cleanPhone.substring(1);
    }

    if (cleanPhone.startsWith("0")) {
        cleanPhone = "212" + cleanPhone.substring(1);
    }

    return cleanPhone;
}

function setupSupervisorContact(phone, stadiumName) {
    const floatBtn = document.getElementById("supervisorFloatBtn");
    const whatsappBtn = document.getElementById("supervisorWhatsappBtn");
    const callBtn = document.getElementById("supervisorCallBtn");

    if (!floatBtn || !whatsappBtn || !callBtn || !phone) return;

    const cleanPhone = normalizeMoroccanPhone(phone);
    const msg = encodeURIComponent(`السلام عليكم، أريد الاستفسار عن حجز ${stadiumName || "الملعب"}`);

    whatsappBtn.href = `https://wa.me/${cleanPhone}?text=${msg}`;
    callBtn.href = `tel:+${cleanPhone}`;
    floatBtn.style.display = "flex";
    floatBtn.style.alignItems = "center";
    floatBtn.style.justifyContent = "center";
}

function openSupervisorContact() {
    const modal = document.getElementById("supervisorContactModal");
    if (modal) modal.style.display = "flex";
}

function closeSupervisorContact() {
    const modal = document.getElementById("supervisorContactModal");
    if (modal) modal.style.display = "none";
}






function openRecurringModal() {
    if (window.stadiumStatus === "maintenance") {
        alert("الملعب في حالة صيانة ولا يمكن الحجز حالياً.");
        return;
    }

    const hourSelect = document.getElementById("recurringHour");
    const startHour = parseInt(window.stadiumData?.openHour ?? 8);
    const endHour = parseInt(window.stadiumData?.closeHour ?? 23);

    hourSelect.innerHTML = "";
    for (let hour = startHour; hour < endHour; hour++) {
        const option = document.createElement("option");
        option.value = `${hour}:00`;
        option.textContent = `من ${hour}:00 إلى ${hour + 1}:00`;
        hourSelect.appendChild(option);
    }

    document.getElementById("recurringDay").value = new Date().getDay();
    document.getElementById("recurringModal").style.display = "block";
}

function closeRecurringModal() {
    document.getElementById("recurringModal").style.display = "none";
}

function getFirstRecurringDate(dayIndex, hour) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    let daysUntil = (dayIndex - date.getDay() + 7) % 7;
    const currentHour = new Date().getHours();

    // إذا اختار اللاعب يوم اليوم ووقتًا منتهيًا، يبدأ الحجز من الأسبوع القادم.
    if (daysUntil === 0 && parseInt(hour) <= currentHour) {
        daysUntil = 7;
    }

    date.setDate(date.getDate() + daysUntil);
    return date;
}

async function submitRecurringBooking() {
    const dayIndex = parseInt(document.getElementById("recurringDay").value);
    const hour = document.getElementById("recurringHour").value;
    const weeks = parseInt(document.getElementById("recurringWeeks").value);
    const name = document.getElementById("recurringName").value.trim();
    const phone = document.getElementById("recurringPhone").value.trim();
    const confirmed = document.getElementById("recurringConfirm").checked;
    const button = document.getElementById("recurringSubmitBtn");
    const phoneRegex = /^[0-9]{10,13}$/;

    if (!name || !phone || !hour) {
        return alert("يرجى إدخال الاسم ورقم الهاتف والموعد.");
    }

    if (!phoneRegex.test(phone)) {
        return alert("يرجى إدخال رقم هاتف صحيح بالأرقام فقط.");
    }

    if (!weeks || weeks < 1 || weeks > 52) {
        return alert("اختر عددًا من 1 إلى 52 أسبوعًا.");
    }

    if (!confirmed) {
        return alert("يرجى تأكيد التعهد بالحضور.");
    }

    const dayNames = [
        "الأحد", "الإثنين", "الثلاثاء", "الأربعاء",
        "الخميس", "الجمعة", "السبت"
    ];

    const firstDate = getFirstRecurringDate(dayIndex, hour);
    const bookings = [];

    for (let week = 0; week < weeks; week++) {
        const date = new Date(firstDate);
        date.setDate(firstDate.getDate() + (week * 7));

        bookings.push({
            dayName: dayNames[dayIndex],
            date: getFormattedDate(date),
            hour: hour
        });
    }

    const originalText = button.innerText;
    button.disabled = true;
    button.innerText = "جاري التحقق من المواعيد...";

    try {
        const response = await fetch(`${bookingScriptURL}?action=createBooking`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({
                stadiumId: stadiumId,
                name: name,
                phone: phone,
                bookings: bookings
            })
        });

        const result = await response.json();

        if (result.result !== "success") {
            return alert("⚠️ " + result.message);
        }

        closeRecurringModal();
        initTable();
        alert(`✅ تم تثبيت ${bookings.length} حجزًا أسبوعيًا بنجاح.`);
    } catch (error) {
        console.error(error);
        alert("تعذر إرسال الحجوزات. يرجى المحاولة مرة أخرى.");
    } finally {
        button.disabled = false;
        button.innerText = originalText;
    }
}
