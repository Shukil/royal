// המסמכים האישיים (Documents.jsx) נשמרים רק במכשיר עצמו, ב-IndexedDB של הדפדפן:
// הם לא עולים לשרת (דרכונים וביטוח הם מידע רגיש), ונפתחים גם בלי אינטרנט.
// כל מסמך שמור עם מזהה המשתמש, כך שמי שמתחבר באותו מכשיר רואה רק את המסמכים שלו
const DB_NAME = 'royal-docs';
const STORE = 'docs';

const open = () =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('no-indexeddb'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const store = req.result.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('user', 'user');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const run = async (mode, action) => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const result = action(tx.objectStore(STORE));
    tx.oncomplete = () => {
      db.close();
      resolve(result?.result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
};

export const listDocs = async (user) => {
  const docs = (await run('readonly', (store) => store.index('user').getAll(user))) || [];
  return docs.sort((a, b) => b.addedAt - a.addedAt);
};

export const addDoc = (user, { file, kind, label }) =>
  run('readwrite', (store) =>
    store.add({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      user,
      kind,
      label,
      name: file.name,
      type: file.type,
      size: file.size,
      blob: file,
      addedAt: Date.now(),
    }),
  );

export const deleteDoc = (id) => run('readwrite', (store) => store.delete(id));

// מבקש מהדפדפן לא למחוק את המסמכים כשחסר מקום (בעיקר בטלפון). לא כל דפדפן מסכים
export const askPersistence = () => navigator.storage?.persist?.().catch(() => false);
