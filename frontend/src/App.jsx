import { useState } from 'react';
import TaskList from './components/TaskList';
import TaskDetail from './components/TaskDetail';

function App() {
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  return (
    <div style={{ padding: 24, background: '#0f0f0f', color: '#eee', minHeight: '100vh' }}>
      <TaskList onSelect={setSelectedTaskId} />
      <TaskDetail taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />
    </div>
  );
}

export default App;