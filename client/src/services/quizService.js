import axios from 'axios';
import { API_BASE } from '../context/AuthContext';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true
});

export const createQuiz = async (data) => {
  const res = await api.post('/admin/create-quiz', data);
  return res.data;
};

export const addQuestion = async (data) => {
  // Expected shape: { quizId, questions: [ { question, options, correct_answer, position } ] }
  const res = await api.post('/admin/add-question', data);
  return res.data;
};

export const getQuizzes = async () => {
  const res = await api.get('/admin/quizzes');
  return res.data;
};

export const getQuestions = async (quizId) => {
  const res = await api.get(`/admin/quizzes/${quizId}/questions`);
  return res.data;
};

