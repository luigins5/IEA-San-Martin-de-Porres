import React, { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const Fix: React.FC = () => {
    const [status, setStatus] = useState('Starting...');

    const processDuplicates = async () => {
        setStatus('Cleaning duplicated admins...');
        try {
            await cleanCollection('admins');
            setStatus('Cleaning duplicated teachers...');
            await cleanCollection('teachers');
            setStatus('Cleaning duplicated students...');
            await cleanCollection('students');
            setStatus('Done! All duplicates removed.');
        } catch (e: any) {
            setStatus('Error: ' + e.message);
        }
    };

    const cleanCollection = async (collName: string) => {
        const snap = await getDocs(collection(db, collName));
        const byEmail = new Map<string, any[]>();
        
        snap.docs.forEach(d => {
            const data = d.data();
            const e = data.email?.toLowerCase().trim();
            if (e) {
                if (!byEmail.has(e)) byEmail.set(e, []);
                byEmail.get(e)!.push({ id: d.id, ...data });
            }
        });

        for (const [email, docs] of byEmail.entries()) {
            if (docs.length > 1) {
                // keep the first one
                const keep = docs[0];
                const remove = docs.slice(1);
                
                // If it's admins, we should merge campusIds
                if (collName === 'admins') {
                     const allCampusIds = new Set<string>();
                     docs.forEach(dr => {
                          if (dr.campusId) allCampusIds.add(dr.campusId);
                          if (dr.campusIds) dr.campusIds.forEach((c: string) => allCampusIds.add(c));
                     });
                     await updateDoc(doc(db, collName, keep.id), { campusIds: Array.from(allCampusIds) });
                }

                for (const r of remove) {
                    setStatus(`Removing duplicate ${collName}: ${email} (${r.id})`);
                    await deleteDoc(doc(db, collName, r.id));
                }
            }
        }
    };

    useEffect(() => {
        processDuplicates();
    }, []);

    return <div style={{ padding: 40, fontFamily: 'monospace' }}>{status}</div>;
}

export default Fix;
