// Firebase 配置
const firebaseConfig = {
    apiKey: "AIzaSyAZHrVo0em_dGeF9mzxp-gbSlBAaJuK81g",
    authDomain: "verasdatabase.firebaseapp.com",
    projectId: "verasdatabase",
    storageBucket: "verasdatabase.firebasestorage.app",
    messagingSenderId: "226612231934",
    appId: "1:226612231934:web:397bce6fee32d1d6d5afaf",
    measurementId: "G-C88N1152DZ"
  };
  
  // 初始化 Firebase
  import firebase from 'firebase/app';
  import 'firebase/database';
  
  firebase.initializeApp(firebaseConfig);
  const database = firebase.database();
  const notesRef = database.ref('notes');
  
  export { database, notesRef };