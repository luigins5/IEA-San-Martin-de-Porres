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
        const found = all.find(a => a.email === e);
        if (found) {
            console.log(`Found ${e} in teachers collection! Role is: '${found.role}'`);
        } else {
             console.log(`${e} NOT in teachers.`);
        }
    }

    process.exit(0);
}

checkT().catch(console.error);
