// ربط موقعك بفايربيس
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// كود التكوين الخاص بمشروعك
const firebaseConfig = {
  apiKey: "AIzaSyDgxnMz1IyXQ9hn9VXKJpPGLf75JUNeIYs",
  authDomain: "doctor-booking-system-336f6.firebaseapp.com",
  projectId: "doctor-booking-system-336f6",
  storageBucket: "doctor-booking-system-336f6.firebasestorage.app",
  messagingSenderId: "996057125969",
  appId: "1:996057125969:web:332550171352c0950ad470",
  measurementId: "G-KPV38B57Y3"
};

// تشغيل فايربيس
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// قراءة بيانات الأطباء من قاعدة البيانات
async function loadDoctors() {
  const querySnapshot = await getDocs(collection(db, "doctors"));
  querySnapshot.forEach((doc) => {
    console.log(doc.id, " => ", doc.data());
  });
}

loadDoctors();
