import { db } from '../firebase';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import conceptsData from '../src_data_concepts.json';

export const seedConceptsIfEmpty = async () => {
    try {
        const firstDocSnap = await getDoc(doc(db, 'concepts', 'C001'));
        if (!firstDocSnap.exists()) {
            console.log('Seeding concepts...', conceptsData.length);
            
            // Firestore batches have a limit of 500 writes
            let batch = writeBatch(db);
            let count = 0;
            
            for (const item of conceptsData) {
                batch.set(doc(db, 'concepts', item.code), item);
                count++;
                if (count % 499 === 0) {
                    await batch.commit();
                    batch = writeBatch(db);
                    console.log('Committed batch', count);
                }
            }
            if (count % 499 !== 0) {
                await batch.commit();
            }
            console.log('Successfully seeded concepts.');
        }
    } catch (error) {
        console.error('Error seeding concepts:', error);
    }
};
