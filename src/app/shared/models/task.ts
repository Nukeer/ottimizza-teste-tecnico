export interface Task {
  id: string;
  name: string;
  position: number;
  createdAt: Date;
  dueDate: Date;
  completed: boolean;
  tags: string[];
  columnId: string;
}