import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Task } from '../models/task';

export interface TaskMoveEvent {
  task: Task;
  sourceColumnId: string;
  targetColumnId: string;
  targetPosition: number;
}

@Injectable({
  providedIn: 'root'
})
export class DragDropService {
  private taskMoved$ = new Subject<TaskMoveEvent>();
  private draggedTask: Task | null = null;

  getTaskMovedEvents() {
    return this.taskMoved$.asObservable();
  }

  setDraggedTask(task: Task | null) {
    this.draggedTask = task;
  }

  getDraggedTask(): Task | null {
    return this.draggedTask;
  }

  notifyTaskMoved(event: TaskMoveEvent) {
    this.taskMoved$.next(event);
  }

  clearDraggedTask() {
    this.draggedTask = null;
  }
}
