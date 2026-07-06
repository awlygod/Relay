import { useEffect, useState } from 'react';
import { getTasks } from '../api/client';

const statusColors = {
  pending: '#94a3b8',
  running: '#3b82f6',
  succeeded: '#22c55e',
  failed: '#f97316',
  retrying: '#eab308',
  escalated: '#ef4444',
  dead_letter: '#7f1d1d',
  skipped: '#64748b',
};

const cellStyle = { padding: '10px 12px', textAlign: 'left' };

export default function TaskList({ onSelect }) {
  const [tasks, setTasks] = useState([]);

  const fetchTasks = async () => {
    const res = await getTasks(30);
    setTasks(res.data);
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ fontFamily: 'monospace', maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center' }}>Monitor</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup>
          <col style={{ width: '30%' }} />
          <col style={{ width: '25%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '25%' }} />
        </colgroup>
        <thead>
          <tr style={{ borderBottom: '1px solid #333' }}>
            <th style={cellStyle}>Type</th>
            <th style={cellStyle}>Status</th>
            <th style={cellStyle}>Attempts</th>
            <th style={cellStyle}>Updated</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr
              key={t.id}
              onClick={() => onSelect(t.id)}
              style={{ cursor: 'pointer', borderBottom: '1px solid #222' }}
            >
              <td style={cellStyle}>{t.type}</td>
              <td style={{ ...cellStyle, color: statusColors[t.status] || '#fff' }}>{t.status}</td>
              <td style={cellStyle}>{t.attempt_count} / {t.max_attempts}</td>
              <td style={cellStyle}>{new Date(t.updated_at).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}