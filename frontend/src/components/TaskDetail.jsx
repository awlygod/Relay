import { useEffect, useState } from 'react';
import { getTaskDetail, retryTask } from '../api/client';

export default function TaskDetail({ taskId, onClose }) {
  const [data, setData] = useState(null);

  const fetchDetail = async () => {
    const res = await getTaskDetail(taskId);
    setData(res.data);
  };

  useEffect(() => {
    if (taskId) fetchDetail();
  }, [taskId]);

  if (!taskId || !data) return null;

  return (
    <div style={{ marginTop: 20, padding: 16, border: '1px solid #333', fontFamily: 'monospace' }}>
      <button onClick={onClose}>close</button>
      <h3>Task {data.task.id}</h3>
      <p>Status: <b>{data.task.status}</b></p>
      <p>Payload: {JSON.stringify(data.task.payload)}</p>

      {(data.task.status === 'dead_letter' || data.task.status === 'escalated') && (
        <button onClick={async () => { await retryTask(taskId); fetchDetail(); }}>
          Force Retry
        </button>
      )}

      <h4>History</h4>
      <ul>
        {data.history.map((h, i) => (
          <li key={i}>
            <b>{h.event}</b> — {JSON.stringify(h.detail)} 
            <span style={{ color: '#888' }}> ({new Date(h.created_at).toLocaleTimeString()})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}