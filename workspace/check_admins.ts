import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, query, where, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'fs';

const firebaseConfig = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkAdmins() {
    const snap = await getDocs(collection(db, 'admins'));
    const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    const problemEmails = [
        'csanova96@gmail.com',
        'jailench97@gmail.com',
        'annaeduvinaalvarez@gmail.com',
        'auranellysol740@gmail.com',
        'jamestaco@hotmail.com',
        'ceciliallano68@gmail.com',
        'zamadi68@gmail.com'
    ];
    
    for (const e of problemEmails) {
        const found = all.find(a => a.email === e);
        if (found) {
            console.log(`Found ${e} in admins collection! Role: ${found.role}`);
        } else {
             console.log(`${e} NOT in admins.`);
        }
    }

    process.exit(0);
}

checkAdmins().catch(console.error);
