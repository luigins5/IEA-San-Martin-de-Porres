import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { readFileSync } from 'fs';

const firebaseConfig = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function findEverywhere() {
    const collections = ['users', 'teachers', 'admins', 'students'];
    const target = 'csanova96@gmail.com';

    for (const c of collections) {
        const snap = await getDocs(collection(db, c));
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const found = all.filter(doc => String(doc.email).toLowerCase().trim() === target);
        console.log(`Collection ${c}: found ${found.length} matches.`);
        if (found.length > 0) {
            console.log(JSON.stringify(found, null, 2));
        }
    }
    process.exit(0);
}

findEverywhere().catch(console.error);
