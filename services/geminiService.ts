import { apiRequest } from './apiClient';

export const querySchoolDataWithAI = async (query: string): Promise<string> => {
  const response = await apiRequest<{ answer: string }>('/api/ai/query', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
  return response.answer;
};
