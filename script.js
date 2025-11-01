// ✅ الاتصال بـ Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getDatabase, ref, set, push, onValue, remove } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDgxnMz1IyXQ9hn9VXKJpPGLf75JUNeIYs",
  authDomain: "doctor-booking-system-336f6.firebaseapp.com",
  projectId: "doctor-booking-system-336f6",
  storageBucket: "doctor-booking-system-336f6.firebasestorage.app",
  messagingSenderId: "996057125969",
  appId: "1:996057125969:web:332550171352c0950ad470"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 🩺 عناصر HTML
const saveBtn = document.getElementById("saveDoctor");
const clearBtn = document.getElementById("clearForm");
const nameInput = document.getElementById("docName");
const specialtyInput = document.getElementById("docSpecialty");
const areaInput = document.getElementById("docArea");
const priceInput = document.getElementById("docPrice");
const phoneInput = document.getElementById("docPhone");
const bioInput = document.getElementById("docBio");
const scheduleInput = document.getElementById("docSchedule");
const doctorsList = document.getElementById("doctorsList");

// 🩺 حفظ الطبيب في قاعدة البيانات
saveBtn.addEventListener("click", () => {
  const doctorData = {
    name: nameInput.value,
    specialty: specialtyInput.value,
    area: areaInput.value,
    price: priceInput.value,
    phone: phoneInput.value,
    bio: bioInput.value,
    schedule: scheduleInput.value
  };

  if (!doctorData.name || !doctorData.specialty) {
    alert("❌ الرجاء إدخال اسم الطبيب والتخصص!");
    return;
  }

  const doctorsRef = ref(db, "doctors");
  const newDoctorRef = push(doctorsRef);
  set(newDoctorRef, doctorData)
    .then(() => {
      alert("✅ تم حفظ الطبيب بنجاح!");
      clearForm();
    })
    .catch((error) => {
      console.error("❌ خطأ:", error);
    });
});

// 🧹 تنظيف الحقول
clearBtn.addEventListener("click", clearForm);
function clearForm() {
  nameInput.value = "";
  specialtyInput.value = "";
  areaInput.value = "";
  priceInput.value = "";
  phoneInput.value = "";
  bioInput.value = "";
  scheduleInput.value = "";
}

// 📋 عرض الأطباء
onValue(ref(db, "doctors"), (snapshot) => {
  doctorsList.innerHTML = "";
  snapshot.forEach((childSnapshot) => {
    const doctor = childSnapshot.val();
    const key = childSnapshot.key;
    const div = document.createElement("div");
    div.classList.add("doctor-item");
    div.innerHTML = `
      <strong>${doctor.name}</strong> — ${doctor.specialty} <br>
      📍 ${doctor.area} | 💰 ${doctor.price} جنيه <br>
      ☎️ ${doctor.phone || "—"} <br>
      🧾 ${doctor.bio || "لا توجد نبذة"} <br>
      ⏰ ${doctor.schedule || "غير محدد"} <br>
      <button data-id="${key}" class="deleteDoctor">❌ حذف</button>
      <hr>
    `;
    doctorsList.appendChild(div);
  });

  // 🔥 زر الحذف
  document.querySelectorAll(".deleteDoctor").forEach(btn => {
    btn.addEventListener("click", () => {
      const doctorId = btn.getAttribute("data-id");
      remove(ref(db, "doctors/" + doctorId));
    });
  });
});
