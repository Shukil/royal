import { useEffect, useState } from 'react';
import api, { errorMessage } from './api';
import { getToken } from './session';

const DAY = 24 * 60 * 60 * 1000;

// "YYYY-MM-DD" של היום לפי השעון בטלפון
export const localDate = (ms = Date.now()) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / DAY);
export const shortDate = (iso) => iso.split('-').reverse().join('.');

export const dueText = (due, today) => {
  const n = daysBetween(today, due);
  if (n === 0) return 'היום';
  if (n === 1) return 'מחר';
  if (n === -1) return 'אתמול';
  if (n < 0) return `לפני ${-n} ימים`;
  return `בעוד ${n} ימים`;
};

// המשימות מהשרת, עם פעולות. משותף לעמוד המשימות ולמסך "היום"
export const useTasks = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getToken()) return;
    api.get('/tasks').then((res) => setData(res.data)).catch((err) => setError(errorMessage(err, 'לא הצלחנו לטעון את המשימות.')));
  }, []);

  const run = async (request) => {
    setError('');
    try {
      setData((await request()).data);
      return true;
    } catch (err) {
      setError(errorMessage(err, 'לא הצלחנו לשמור. צריך חיבור לאינטרנט כדי לעדכן.'));
      return false;
    }
  };

  return {
    data,
    error,
    toggle: (task) => run(() => api.put(`/tasks/${task.id}`, { done: !task.done })),
    create: (fields) => run(() => api.post('/tasks', fields)),
    update: (task, fields) => run(() => api.put(`/tasks/${task.id}`, fields)),
    remove: (task) => run(() => api.delete(`/tasks/${task.id}`)),
  };
};
