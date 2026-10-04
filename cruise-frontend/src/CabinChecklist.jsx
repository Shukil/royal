import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';
import { useUser } from './session';

const CabinChecklist = () => {
  const [tasks, setTasks] = useState([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [assignee, setAssignee] = useState('');

  // פרטי המשתמש המחובר (השרת עצמו קובע את החדר והשם לפי ההתחברות)
  const user = useUser();
  const cabinNumber = user?.cabinNumber;

  // טעינת המשימות של החדר מהשרת
  const fetchTasks = useCallback(() => {
    if (!cabinNumber) return;
    api.get(`/cabin-tasks/${cabinNumber}`)
      .then((response) => setTasks(response.data))
      .catch((error) => console.error('שגיאה בטעינת משימות', error));
  }, [cabinNumber]);

  useEffect(fetchTasks, [fetchTasks]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
  
    try {
      await api.post('/cabin-tasks', { text: newTaskText, assignedTo: assignee });
      setNewTaskText('');
      setAssignee('');
      fetchTasks(); // רענון הרשימה (כולל משימות ששותפים לחדר הוסיפו בינתיים)
    } catch (error) {
      console.error('שגיאה בהוספת משימה', error);
    }
  };

  // מחיקת משימה (למשל עם טעות כתיב). הרשימה משותפת, אז מוחקים רק אחרי אישור
  const deleteTask = async (task) => {
    if (!window.confirm(`למחוק את המשימה "${task.text}"? היא תימחק גם לשותפים לחדר.`)) return;
    try {
      await api.delete(`/cabin-tasks/${task._id}`);
      fetchTasks();
    } catch (error) {
      console.error('שגיאה במחיקת משימה', error);
    }
  };

  // סימון כבוצע או ביטול הסימון. השרת רושם מי סימן
  const toggleTaskCompletion = async (task) => {
    try {
      await api.put(`/cabin-tasks/${task._id}`, { isCompleted: !task.isCompleted });
      fetchTasks();
    } catch (error) {
      console.error('שגיאה בעדכון משימה', error);
    }
  };

  if (!user) {
    return (
      <div className="page">
        <div className="empty">
          <p>כדי לראות את הצ'ק ליסט של החדר צריך להתחבר.</p>
          <Link to="/login" className="btn btn--primary">להתחברות</Link>
        </div>
      </div>
    );
  }

  const doneCount = tasks.filter((t) => t.isCompleted).length;

  return (
    <div className="page">
      <article className="card">
        <header className="card__header">
          <h1 className="card__title">צ'ק ליסט חדר {user.cabinNumber}</h1>
          <p className="card__lead">שלום {user.name}! כאן מנהלים את המשימות המשותפות לחדר.</p>
        </header>

        <div className="card__body">
          {/* טופס הוספת משימה */}
          <form onSubmit={handleAddTask} className="task-form">
            <div className="field">
              <label className="field__label" htmlFor="task-text">משימה חדשה</label>
              <input
                id="task-text"
                className="input"
                type="text"
                placeholder="מה צריך להביא/לעשות?"
                maxLength={300}
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="task-assignee">באחריות מי?</label>
              <input
                id="task-assignee"
                className="input"
                type="text"
                placeholder="למשל: דניאל"
                maxLength={60}
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn--gold">הוסף משימה</button>
          </form>

          {tasks.length > 0 && (
            <div className="progress">
              <div className="progress__text">
                <span id="cabin-progress-label">התקדמות החדר</span>
                <span>{doneCount} מתוך {tasks.length} בוצעו</span>
              </div>
              <div
                className="progress__bar"
                role="progressbar"
                aria-labelledby="cabin-progress-label"
                aria-valuemin={0}
                aria-valuemax={tasks.length}
                aria-valuenow={doneCount}
              >
                <div className="progress__fill" style={{ width: `${(doneCount / tasks.length) * 100}%` }} />
              </div>
            </div>
          )}

          {/* רשימת המשימות */}
          {tasks.length === 0 ? (
            <p className="empty">אין עדיין משימות לחדר זה. אתם מוכנים להפלגה!</p>
          ) : (
            <ul className="tasks">
              {tasks.map(task => (
                <li key={task._id} className={`task${task.isCompleted ? ' is-done' : ''}`}>
                  <input
                    id={`task-${task._id}`}
                    className="task__check"
                    type="checkbox"
                    checked={task.isCompleted}
                    onChange={() => toggleTaskCompletion(task)}
                  />
                  <label htmlFor={`task-${task._id}`} className="task__label">
                    <span className="task__text">{task.text}</span>
                    <span className="task__meta">
                      <span>נוצר ע"י {task.createdBy}</span>
                      {task.assignedTo && (
                        <span className="task__assignee">באחריות: {task.assignedTo}</span>
                      )}
                      {task.isCompleted && (
                        <span className="task__done-by">✓ בוצע ע"י {task.completedBy}</span>
                      )}
                    </span>
                  </label>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    aria-label={`מחיקת המשימה: ${task.text}`}
                    title="מחיקת המשימה"
                    onClick={() => deleteTask(task)}
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </article>
    </div>
  );
};

export default CabinChecklist;
