import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js";
import { getDatabase, ref, set, get, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ⚙️ کۆنفیکی Firebase بۆ پڕۆژەی promohouse-44d4e
const firebaseConfig = {
  apiKey: "AIzaSyA9x8ZmJe2DHQ2IkbienVM3nLn8tcs9Fg4",
  authDomain: "promohouse-44d4e.firebaseapp.com",
  databaseURL: "https://promohouse-44d4e-default-rtdb.firebaseio.com",
  projectId: "promohouse-44d4e",
  storageBucket: "promohouse-44d4e.firebasestorage.app",
  messagingSenderId: "112580649658",
  appId: "1:112580649658:web:a06896319a3821c8c91883",
  measurementId: "G-2J4BM11KPR"
};

// 🚀 دەستپێکردنی Firebase
window.firebaseApp = initializeApp(firebaseConfig);
window.firebaseAnalytics = getAnalytics(window.firebaseApp);
window.firebaseDatabase = getDatabase(window.firebaseApp);
window.firebaseStorage = getStorage(window.firebaseApp);
window.firebaseAuth = getAuth(window.firebaseApp);

// 📦 دروستکردنی Global Object بۆ دەستگەیشتنی ئاسان
window.firebase = {
    db: window.firebaseDatabase,
    storage: window.firebaseStorage,
    auth: window.firebaseAuth,
    ref: ref,
    push: push,
    set: set,
    get: get,
    remove: remove,
    onValue: onValue,
    update: update,
    storageRef: storageRef,
    uploadBytes: uploadBytes,
    getDownloadURL: getDownloadURL,
    deleteObject: deleteObject,
    signInWithEmailAndPassword: signInWithEmailAndPassword,
    onAuthStateChanged: onAuthStateChanged
};

console.log("✅ Firebase سەرکەوتووانە دەستپێکرا!");

// 🔐 زانیاری بەڕێوەبەر
const ADMIN_CONFIG = {
    email: "paywastwork@gmail.com",
    password: "majidmajid0101",
    uid: "3l1jy3cEF6OcVilOd5FXQFb68cs1"
};

// 🔒 خۆکار Login وەک بەڕێوەبەر
function autoLoginAdmin() {
    signInWithEmailAndPassword(
        window.firebaseAuth, 
        ADMIN_CONFIG.email, 
        ADMIN_CONFIG.password
    )
    .then((userCredential) => {
        const user = userCredential.user;
        
        console.log("✅ داخڵبوون سەرکەوتووبوو!");
        console.log("📧 ئیمەیڵ:", user.email);
        console.log("🆔 UID:", user.uid);
        
        // پشتڕاستکردنەوەی UID
        if(user.uid === ADMIN_CONFIG.uid) {
            console.log("✅ مافی بەڕێوەبەر پشتڕاستکرایەوە");
            
            // ناردنی ڕووداو بۆ پەڕەکە کە Login تەواو بووە
            window.dispatchEvent(new CustomEvent('adminLoggedIn', { 
                detail: { 
                    user,
                    timestamp: new Date().toISOString()
                } 
            }));
        } else {
            console.warn("⚠️ هۆشدار: UID جیاوازە!");
            console.warn("   چاوەڕوانکراو:", ADMIN_CONFIG.uid);
            console.warn("   بەدەستهات:", user.uid);
            console.warn("💡 تکایە یاساکانی Database و Storage نوێ بکەرەوە بە UID ی نوێ");
        }
    })
    .catch((error) => {
        console.error("❌ هەڵە لە Login:", error.code);
        
        // لیستی هەڵەکانی باو و پەیامەکانیان بە کوردی
        const errorMessages = {
            'auth/user-not-found': '❌ بەکارهێنەر نەدۆزرایەوە - تکایە لە Firebase Console دروستی بکە',
            'auth/wrong-password': '❌ پاسوۆرد هەڵەیە',
            'auth/invalid-email': '❌ فۆرماتی ئیمەیڵ نادروستە',
            'auth/network-request-failed': '🌐 کێشەی هێڵی ئینتەرنێت',
            'auth/too-many-requests': '⏸️ زۆر هەوڵی هەڵە - تکایە چەند خولەکێک چاوەڕێ بکە',
            'auth/user-disabled': '🚫 ئەم بەکارهێنەرە ناچالاک کراوە',
            'auth/invalid-credential': '❌ زانیاریەکانی چوونەژوورەوە نادروستن'
        };
        
        const message = errorMessages[error.code] || `❌ هەڵە: ${error.message}`;
        console.error(message);
        
        // ناردنی ڕووداوی هەڵە
        window.dispatchEvent(new CustomEvent('adminLoginError', { 
            detail: { 
                errorCode: error.code,
                errorMessage: message
            } 
        }));
    });
}

// 👤 چاودێری دۆخی چوونەژوورەوە
onAuthStateChanged(window.firebaseAuth, (user) => {
    if (user) {
        console.log("👤 چوویتە ژوورەوە وەک:", user.email);
        console.log("🆔 UID:", user.uid);
        
        // پشتڕاستکردنەوە کە ئایا بەڕێوەبەرە
        if(user.uid === ADMIN_CONFIG.uid) {
            console.log("✅ دەسەڵاتی بەڕێوەبەر هەیە");
        }
    } else {
        console.log("👤 چوونەژوورەوەت نییە، تاقیکردنەوەی خۆکار login...");
        autoLoginAdmin();
    }
});

// 🛠️ Utility Functions بۆ کارکردن لەگەڵ Firebase

// گەڕان بە داتا لە Database
window.getFirebaseData = async (path) => {
    try {
        const snapshot = await get(ref(window.firebaseDatabase, path));
        if (snapshot.exists()) {
            return snapshot.val();
        } else {
            console.log(`📭 هیچ داتایەک نییە لە: ${path}`);
            return null;
        }
    } catch (error) {
        console.error(`❌ هەڵە لە خوێندنەوەی ${path}:`, error);
        throw error;
    }
};

// نووسینی داتا بۆ Database
window.setFirebaseData = async (path, data) => {
    try {
        await set(ref(window.firebaseDatabase, path), data);
        console.log(`✅ داتا هەڵگیرا لە: ${path}`);
        return true;
    } catch (error) {
        console.error(`❌ هەڵە لە نووسینی ${path}:`, error);
        throw error;
    }
};

// سڕینەوەی داتا لە Database
window.deleteFirebaseData = async (path) => {
    try {
        await remove(ref(window.firebaseDatabase, path));
        console.log(`🗑️ داتا سڕایەوە لە: ${path}`);
        return true;
    } catch (error) {
        console.error(`❌ هەڵە لە سڕینەوەی ${path}:`, error);
        throw error;
    }
};

// بەرزکردنەوەی وێنە بۆ Storage
window.uploadImage = async (path, file) => {
    try {
        const imageRef = storageRef(window.firebaseStorage, path);
        const snapshot = await uploadBytes(imageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        console.log(`✅ وێنە بەرزکرایەوە: ${path}`);
        return downloadURL;
    } catch (error) {
        console.error(`❌ هەڵە لە بەرزکردنەوەی وێنە:`, error);
        throw error;
    }
};

// سڕینەوەی وێنە لە Storage
window.deleteImage = async (path) => {
    try {
        const imageRef = storageRef(window.firebaseStorage, path);
        await deleteObject(imageRef);
        console.log(`🗑️ وێنە سڕایەوە: ${path}`);
        return true;
    } catch (error) {
        console.error(`❌ هەڵە لە سڕینەوەی وێنە:`, error);
        throw error;
    }
};

console.log("🎉 هەموو فەنکشنەکانی Firebase ئامادەن!");
