import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { readFileSync } from 'fs';

const firebaseConfig = JSON.parse(readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function catchRogue() {
    const usersSnap = await getDocs(collection(db, 'users'));
    const allUsers = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const rogue = allUsers.filter(u => u.role === 'Super Administrador' && u.email !== 'ns.5.empresarial@gmail.com');
    
    console.log("Found rogue Super Admins:", rogue.length);
    for (const r of rogue) {
        console.log(`- ${r.email} (ID: ${r.id}, Name: ${r.name})`);
    }

    process.exit(0);
}

catchRogue().catch(console.error);
