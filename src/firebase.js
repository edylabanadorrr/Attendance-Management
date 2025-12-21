// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, set, onValue, remove, update, get } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyAoOTAWLN6c3r-YKAs3_uf7hgNFlTsqPWE",
    authDomain: "abc-animalbitecenter.firebaseapp.com",
    databaseURL: "https://abc-animalbitecenter-default-rtdb.asia-southeast1.firebasedatabase.app/",
    projectId: "abc-animalbitecenter",
    appId: "1:896660356702:web:fb871e6abb7d98b3663ecf"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, set, onValue, remove, update, get };
