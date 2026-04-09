import { GoogleTask } from '../types';

export class GoogleTasksService {
  private accessToken: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
  }

  async getTasks(): Promise<GoogleTask[]> {
    if (!this.accessToken) throw new Error('No access token');

    const response = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Google API Error: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    const data = await response.json();
    return data.items || [];
  }

  async updateTaskStatus(taskId: string, status: 'needsAction' | 'completed'): Promise<void> {
    if (!this.accessToken) throw new Error('No access token');

    const response = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/@default/tasks/${taskId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });

    if (!response.ok) throw new Error('Failed to update task');
  }

  async createTask(title: string, notes?: string): Promise<GoogleTask> {
    if (!this.accessToken) throw new Error('No access token');

    const response = await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, notes })
    });

    if (!response.ok) throw new Error('Failed to create task');
    return await response.json();
  }
}

export const googleTasksService = new GoogleTasksService();
