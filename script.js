// ✅ حذف البيانات القديمة من التخزين المحلي عند تحديث الموقع
const siteVersion = "v2.0"; // عدّلي هُنا لو عملتِ تحديث جديد لاحقًا
if (localStorage.getItem("siteVersion") !== siteVersion) {
  localStorage.clear();
  localStorage.setItem("siteVersion", siteVersion);
  console.log("تم مسح البيانات القديمة ✅");
}
// script.js — works for both pages (index & admin)
(() => {
  const isAdminPage = location.pathname.endsWith('admin.html') || location.search.includes('admin=true');

  /* -------------------------
     Storage helpers & seed
     -------------------------*/
  const LS_KEYS = { DOCTORS: 'by_doctors_v1', BOOKS: 'by_bookings_v1' };

  function read(key){ try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch(e){ return null; } }
  function write(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

  function seedIfEmpty(){
    let docs = read(LS_KEYS.DOCTORS);
    if(!docs){
      docs = [
        {id:1,name:"د. أحمد سعيد / Dr. Ahmed Said",specialty:"قلب / Cardiology",address:"6 أكتوبر",schedule:["09:00","10:00","11:00"],price:500,img:"https://via.placeholder.com/800x600?text=Dr+Ahmed",bio:"استشاري قلب."},
        {id:2,name:"د. منى محمد / Dr. Mona Mohamed",specialty:"أسنان / Dentistry",address:"الهرم",schedule:["09:30","10:30"],price:300,img:"https://via.placeholder.com/800x600?text=Dr+Mona",bio:"دكتورة أسنان."},
        {id:3,name:"د. علي محمود / Dr. Ali Mahmoud",specialty:"باطنة / Internal Medicine",address:"مدينة نصر",schedule:["11:00","12:00"],price:400,img:"https://via.placeholder.com/800x600?text=Dr+Ali",bio:"استشاري باطنة."}
      ];
      write(LS_KEYS.DOCTORS, docs);
      write(LS_KEYS.BOOKS, []);
    }
  }
  seedIfEmpty();

  /* -------------------------
     Utilities
     -------------------------*/
  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  function uid(){ return Date.now() + Math.floor(Math.random()*999); }
  function createICS(booking){
    const [y,m,d] = booking.date.split('-');
    const [hh,mm] = booking.time.split(':');
    const dtStart = new Date(y, m-1, d, parseInt(hh), parseInt(mm));
    const dtEnd = new Date(dtStart.getTime() + 30*60000);
    function toICS(dt){
      const z = new Date(dt.getTime() - dt.getTimezoneOffset()*60000);
      return z.getUTCFullYear().toString().padStart(4,'0') +
        (z.getUTCMonth()+1).toString().padStart(2,'0') +
        z.getUTCDate().toString().padStart(2,'0') + 'T' +
        z.getUTCHours().toString().padStart(2,'0') +
        z.getUTCMinutes().toString().padStart(2,'0') +
        z.getUTCSeconds().toString().padStart(2,'0') + 'Z';
    }
    const ics = [
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//BookYourDoctor//EN',
      'BEGIN:VEVENT',
      `UID:${booking.id}@bookyourdoctor.local`,
      `DTSTAMP:${toICS(new Date())}`,
      `DTSTART:${toICS(dtStart)}`,
      `DTEND:${toICS(dtEnd)}`,
      `SUMMARY:Appointment with ${booking.doctorName}`,
      `DESCRIPTION:Booked by ${booking.name} - phone: ${booking.phone}`,
      'END:VEVENT','END:VCALENDAR'
    ].join('\r\n');
    const blob = new Blob([ics], {type:'text/calendar'});
    return URL.createObjectURL(blob);
  }

  /* helper to normalize schedule stored value
     - can be Array of times (["09:00","10:00"])
     - or free text string ("الأحد والثلاثاء من 5 لـ9")
  */
  function getTimesFromSchedule(sched){
    if(!sched) return [];
    if(Array.isArray(sched)) return sched.slice();
    // try extract HH:MM patterns
    const matches = String(sched).match(/\b\d{1,2}:\d{2}\b/g);
    if(matches && matches.length) return matches;
    return [];
  }

  /* -------------------------
     Index page logic
     -------------------------*/
  if(!isAdminPage){
    const doctorGrid = $('#doctorGrid');
    const searchInput = $('#searchInput');
    const specialtyFilter = $('#specialtyFilter');
    const areaFilter = $('#areaFilter');
    const bookingModal = $('#bookingModal');
    const closeBooking = $('#closeBooking');
    const appointmentDate = $('#appointmentDate');
    const appointmentTime = $('#appointmentTime');
    const bookingTitle = $('#bookingTitle');
    const patientName = $('#patientName');
    const patientPhone = $('#patientPhone');
    const confirmBookingBtn = $('#confirmBookingBtn');
    const cancelBooking = $('#cancelBooking');
    const bookingNotice = $('#bookingNotice');
    const addDemo = $('#addDemo');
    const yearEl = $('#year');
    const langSwitch = $('#langSwitch'); // optional element

    if(yearEl) yearEl.textContent = new Date().getFullYear();

    function loadDoctors(){ return read(LS_KEYS.DOCTORS) || []; }
    function loadBookings(){ return read(LS_KEYS.BOOKS) || []; }

    function populateFilters(){
      const docs = loadDoctors();
      const specs = Array.from(new Set(docs.map(d => (d.specialty||'').split('/')[0].trim()))).sort();
      const areas = Array.from(new Set(docs.map(d => d.address||''))).sort();
      specialtyFilter.innerHTML = '<option value="">كل التخصصات</option>';
      areaFilter.innerHTML = '<option value="">كل المناطق</option>';
      specs.forEach(s => specialtyFilter.appendChild(new Option(s, s)));
      areas.forEach(a => areaFilter.appendChild(new Option(a, a)));
    }

    function renderDoctors(list){
      doctorGrid.innerHTML = '';
      if(!list.length){ doctorGrid.innerHTML = `<div class="card muted">لا توجد نتائج</div>`; return; }
      list.forEach(d => {
        const card = document.createElement('div'); card.className = 'card';
        const scheduleDisplay = Array.isArray(d.schedule) ? (d.schedule.join(' ، ')) : (d.schedule || 'غير محددة');
        card.innerHTML = `
          <img class="doc-img" src="${d.img || 'https://via.placeholder.com/800x600?text=Doctor'}" alt="${d.name}">
          <div class="doc-name">${d.name}</div>
          <div class="muted">${d.specialty} — ${d.address}</div>
          <div class="muted">سعر الكشف: ${d.price} جنيه</div>
          <div class="muted"><strong>المواعيد:</strong> ${scheduleDisplay}</div>
          <div class="meta">
            <div>
              <button class="btn bookBtn" data-id="${d.id}">احجز / Book</button>
              <button class="ghost viewBtn" data-id="${d.id}">عرض</button>
            </div>
            <div><button class="ghost contactBtn" data-id="${d.id}">اتصال</button></div>
          </div>
        `;
        doctorGrid.appendChild(card);
      });
    }

    function applyFilters(){
      const q = (searchInput.value||'').trim().toLowerCase();
      const s = specialtyFilter.value;
      const a = areaFilter.value;
      const docs = loadDoctors();
      const res = docs.filter(d => {
        const inQ = (d.name||'').toLowerCase().includes(q) || (d.specialty||'').toLowerCase().includes(q) || (d.address||'').toLowerCase().includes(q);
        return inQ && (!s || (d.specialty||'').includes(s)) && (!a || d.address === a);
      });
      renderDoctors(res);
    }

    // init
    populateFilters(); renderDoctors(loadDoctors());
    searchInput.addEventListener('input', debounce(applyFilters,200));
    specialtyFilter.addEventListener('change', applyFilters);
    areaFilter.addEventListener('change', applyFilters);

    // delegated clicks
    doctorGrid.addEventListener('click', e => {
      const b = e.target;
      if(b.matches('button.bookBtn')) openBooking(parseInt(b.dataset.id));
      if(b.matches('button.viewBtn')) viewDoctor(parseInt(b.dataset.id));
      if(b.matches('button.contactBtn')) {
        const id = parseInt(b.dataset.id);
        const doc = loadDoctors().find(dd => dd.id === id);
        if(doc) alert('اتصل على: 01061751605'); // keep simple — customize if needed
      }
    });

    // booking flow
    function openBooking(id){
      const d = loadDoctors().find(x => x.id === id);
      if(!d) return;
      bookingModal.classList.add('show');
      bookingModal.setAttribute('aria-hidden','false');
      bookingTitle.textContent = `احجز عند ${d.name}`;

      // populate times: first try structured times (array or extracted), else fallback to default
      appointmentTime.innerHTML = '';
      let times = getTimesFromSchedule(d.schedule);
      if(!times.length && Array.isArray(d.schedule)) times = d.schedule.slice();
      if(!times.length) times = ["09:00","10:00","11:00"]; // fallback
      times.forEach(t => {
        const o = document.createElement('option'); o.value = t; o.textContent = t; appointmentTime.appendChild(o);
      });

      appointmentDate.value = new Date().toISOString().slice(0,10);
      bookingNotice.textContent = '';
      bookingModal.dataset.did = id;
    }
    function closeBookingModal(){ bookingModal.classList.remove('show'); bookingModal.setAttribute('aria-hidden','true'); bookingModal.dataset.did=''; }

    const closeBtn = $('#closeBooking');
    if(closeBtn) closeBtn.addEventListener('click', closeBookingModal);
    if(cancelBooking) cancelBooking.addEventListener('click', closeBookingModal);

    confirmBookingBtn.addEventListener('click', () => {
      const did = parseInt(bookingModal.dataset.did);
      const d = loadDoctors().find(x => x.id === did);
      const name = patientName.value.trim(), phone = patientPhone.value.trim();
      const date = appointmentDate.value, time = appointmentTime.value;
      if(!d || !name || !phone || !date || !time){ bookingNotice.textContent = 'املأ كل الحقول'; return; }
      const booking = { id: uid(), doctorId: d.id, doctorName: d.name, name, phone, date, time, createdAt: new Date().toISOString() };
      const books = loadBookings();
      books.unshift(booking);
      write(LS_KEYS.BOOKS, books);
      localStorage.setItem('by_last_booking_event', JSON.stringify({ts:Date.now(),bookingId:booking.id}));
      const url = createICS({...booking});
      const a = document.createElement('a'); a.href = url; a.download = `booking_${booking.id}.ics`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      bookingNotice.textContent = `تم الحجز ${time} — تم تنزيل ملف التقويم`;
      patientName.value=''; patientPhone.value='';
      closeBookingModal();
    });

    // view doctor (avoid showing bio that mentions "خبرة")
    function viewDoctor(id){
      const d = loadDoctors().find(x=>x.id===id);
      if(!d) return alert('Not found');
      // do NOT show bio which may contain "بخبرة 10 سنوات"
      alert(`${d.name}\n${d.specialty}\n${d.address}\nسعر: ${d.price} جنيه`);
    }

    // demo add
    addDemo.addEventListener('click', ()=>{
      const docs = loadDoctors();
      docs.push({id:uid(),name:"د. جديد / New Doc",specialty:"جلدية / Dermatology",address:"المعادي",schedule:["09:00","10:00"],price:250,img:"https://via.placeholder.com/800x600?text=New+Doc",bio:"طبيب تجريبي."});
      write(LS_KEYS.DOCTORS, docs); populateFilters(); renderDoctors(docs);
    });

    // simple debounce util
    function debounce(fn, wait=300){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn.apply(this,a), wait); }; }

  } // end index logic

  /* -------------------------
     Admin page logic
     -------------------------*/
  if(isAdminPage){
    const docName = $('#docName'),
          docSpecialty = $('#docSpecialty'),
          docArea = $('#docArea'),
          docPrice = $('#docPrice'),
          docImg = $('#docImg'),
          docSchedule = $('#docSchedule'),
          saveDoctor = $('#saveDoctor'),
          clearForm = $('#clearForm'),
          doctorsList = $('#doctorsList'),
          bookingsList = $('#bookingsList');

    function loadDoctors(){ return read(LS_KEYS.DOCTORS) || []; }
    function loadBookings(){ return read(LS_KEYS.BOOKS) || []; }

    function renderDoctorsList(){
      const docs = loadDoctors();
      doctorsList.innerHTML = '';
      if(!docs.length) doctorsList.innerHTML = '<div class="muted">لا يوجد دكاترة.</div>';
      docs.forEach(d => {
        const node = document.createElement('div'); node.className = 'item';
        const scheduleDisplay = Array.isArray(d.schedule) ? (d.schedule.join(' ، ')) : (d.schedule || 'غير محددة');
        node.innerHTML = `
          <div class="left" style="display:flex;gap:8px;align-items:center">
            <img src="${d.img||'https://via.placeholder.com/160x120?text=Dr'}" alt="" style="width:54px;height:44px;object-fit:cover;border-radius:8px">
            <div style="text-align:right">
              <div style="font-weight:700">${d.name}</div>
              <div class="muted">${d.specialty} — ${d.address}</div>
              <div class="muted" style="font-size:13px">المواعيد: ${scheduleDisplay}</div>
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <button class="btn editBtn" data-id="${d.id}">تعديل</button>
            <button class="ghost delBtn" data-id="${d.id}">حذف</button>
          </div>
        `;
        doctorsList.appendChild(node);
      });
    }

    function renderBookings(){
      const books = loadBookings();
      bookingsList.innerHTML = '';
      if(!books.length) bookingsList.innerHTML = '<div class="muted">لا توجد حجوزات حتى الآن.</div>';
      books.forEach(b => {
        const n = document.createElement('div'); n.className = 'item';
        n.innerHTML = `
          <div style="text-align:right">
            <div style="font-weight:700">${b.name} — ${b.phone}</div>
            <div class="muted">${b.doctorName} — ${b.date} ${b.time}</div>
            <div class="muted" style="font-size:12px">${new Date(b.createdAt).toLocaleString()}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
            <button class="btn saveToCal" data-id="${b.id}">ICS</button>
            <button class="ghost removeBooking" data-id="${b.id}">حذف</button>
          </div>
        `;
        bookingsList.appendChild(n);
      });
    }

    // save / edit doctor
    let editingId = null;
    saveDoctor.addEventListener('click', () => {
      const name = (docName && docName.value.trim()) || '';
      const specialty = (docSpecialty && docSpecialty.value.trim()) || '';
      const area = (docArea && docArea.value.trim()) || '';
      const price = parseInt((docPrice && docPrice.value)) || 0;
      const img = (docImg && docImg.value.trim()) || '';
      const schedRaw = (docSchedule && docSchedule.value.trim()) || '';

      if(!name || !specialty){ alert('ادخل الاسم والتخصص'); return; }
      const docs = loadDoctors();

      // If schedule looks like times "09:00,10:00" convert to array, else keep string
      let scheduleValue = schedRaw;
      const timesExtract = schedRaw.match(/\b\d{1,2}:\d{2}\b/g);
      if(timesExtract && timesExtract.length) scheduleValue = timesExtract.map(s => s.trim());

      if(editingId){
        const idx = docs.findIndex(d => d.id === editingId);
        if(idx>=0){ docs[idx] = {...docs[idx], name, specialty, address:area, price, img, schedule: scheduleValue}; }
        editingId = null;
      } else {
        docs.push({id:uid(), name, specialty, address:area, price, img, schedule: scheduleValue, bio:""});
      }
      write(LS_KEYS.DOCTORS, docs);
      // clear form
      if(docName) docName.value=''; if(docSpecialty) docSpecialty.value=''; if(docArea) docArea.value='';
      if(docPrice) docPrice.value=''; if(docImg) docImg.value=''; if(docSchedule) docSchedule.value='';
      renderDoctorsList();
      alert('تم الحفظ');
    });

    clearForm.addEventListener('click', ()=>{ editingId=null; if(docName) docName.value=''; if(docSpecialty) docSpecialty.value=''; if(docArea) docArea.value=''; if(docPrice) docPrice.value=''; if(docImg) docImg.value=''; if(docSchedule) docSchedule.value=''; });

    // delegate list clicks
    doctorsList.addEventListener('click', e => {
      const b = e.target;
      if(b.matches('.delBtn')) {
        const id = parseInt(b.dataset.id);
        if(!confirm('هل متأكد أنك تريد الحذف؟')) return;
        const docs = loadDoctors().filter(d=>d.id!==id);
        write(LS_KEYS.DOCTORS, docs); renderDoctorsList();
      }
      if(b.matches('.editBtn')){
        const id = parseInt(b.dataset.id); const d = loadDoctors().find(x=>x.id===id);
        if(!d) return;
        editingId = d.id;
        if(docName) docName.value = d.name;
        if(docSpecialty) docSpecialty.value = d.specialty;
        if(docArea) docArea.value = d.address;
        if(docPrice) docPrice.value = d.price || '';
        if(docImg) docImg.value = d.img || '';
        if(docSchedule) docSchedule.value = Array.isArray(d.schedule) ? d.schedule.join(',') : (d.schedule || '');
        window.scrollTo({top:0,behavior:'smooth'});
      }
    });

    // bookings actions
    bookingsList.addEventListener('click', e => {
      const b = e.target;
      if(b.matches('.removeBooking')){
        const id = b.dataset.id;
        if(!confirm('حذف الحجز؟')) return;
        const bs = loadBookings().filter(x=>String(x.id)!==String(id));
        write(LS_KEYS.BOOKS, bs); renderBookings();
      }
      if(b.matches('.saveToCal')){
        const id = b.dataset.id; const booking = loadBookings().find(x=>String(x.id)===String(id));
        if(!booking) return;
        const url = createICS({...booking});
        const a = document.createElement('a'); a.href = url; a.download = `booking_${booking.id}.ics`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
      }
    });

    // listen to storage events to show new bookings in real-time (other tab)
    window.addEventListener('storage', (ev) => {
      if(ev.key === 'by_last_booking_event') renderBookings();
    });

    // initial render
    renderDoctorsList(); renderBookings();

    // small utility
    function uid(){ return Date.now() + Math.floor(Math.random()*999); }
  }


})();
