import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from './api';
import { PlanItemView } from './Plan';
import { TaskRow } from './Tasks';
import { planDays } from './planChecks';
import { useTasks } from './tasksApi';

// התוכנית של היום (מדף "תוכנית הטיול"), עם הבדיקות מול שעות הספינה
export const TodayPlan = ({ day }) => {
  const [items, setItems] = useState(null);
  const isPlanDay = planDays.some((d) => d.date === day.date);

  useEffect(() => {
    if (!isPlanDay) return undefined;
    let alive = true;
    api.get(`/plan/${day.date}`).then((res) => alive && setItems(res.data.items)).catch(() => {});
    return () => {
      alive = false;
    };
  }, [day.date, isPlanDay]);

  if (!isPlanDay || items === null) return null;

  return (
    <section className="today__section" aria-labelledby="today-plan">
      <h2 id="today-plan" className="today__subtitle">📋 התוכנית להיום</h2>
      {items.length ? (
        <ol className="plan-list">
          {items.map((item) => <PlanItemView key={item.id} item={item} day={day} />)}
        </ol>
      ) : (
        <p className="today__empty">אין תוכנית להיום.</p>
      )}
      <p className="today__empty"><Link to={`/plan?day=${day.date}`}>לעריכת התוכנית</Link></p>
    </section>
  );
};

// משימות שתאריך היעד שלהן היום, ומשימות פתוחות שכבר עבר זמנן
export const TodayTasks = ({ day, preview }) => {
  const { data, toggle } = useTasks();
  if (!data) return null;
  const tasks = data.tasks.filter((t) => t.due === day.date || (!t.done && t.due < day.date));
  if (!tasks.length) return null;

  return (
    <section className="today__section" aria-labelledby="today-tasks">
      <h2 id="today-tasks" className="today__subtitle">✅ משימות להיום</h2>
      <ul className="task-list">
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} people={data.people} today={day.date} onToggle={preview ? () => {} : toggle} />
        ))}
      </ul>
      <p className="today__empty"><Link to="/tasks">לכל המשימות</Link></p>
    </section>
  );
};
