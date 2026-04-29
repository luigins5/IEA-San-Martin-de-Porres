import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { readFileSync } from 'fs';

const firebaseConfig = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function checkT() {
    const snap = await getDocs(collection(db, 'teachers'));
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
        const found = all.find(a => String(a.email).trim().toLowerCase() === e);
        if (found) {
            console.log(`Found ${e} in teachers collection!`);
            console.log(`EXACT STRING IN DB: '${found.email}'`);
            console.log(`LENGTH: ${found.email.length}, expected length: ${e.length}`);
        } else {
             console.log(`${e} NOT in teachers.`);
        }
    }

    process.exit(0);
}

checkT().catch(console.error);
