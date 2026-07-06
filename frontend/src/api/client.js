import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'X-API-Key': import.meta.env.VITE_API_KEY },
});

export const getTasks = (limit = 20) => client.get(`/tasks?limit=${limit}`);
export const getTaskDetail = (id) => client.get(`/tasks/${id}`);
export const retryTask = (id) => client.post(`/tasks/${id}/retry`);

export default client;