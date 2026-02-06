import { Component, EventEmitter, inject, Input, OnDestroy, OnInit, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ColumnService } from '../../services/column.service';
import { TaskService } from '../../services/task.service';
import { DragDropService } from '../../services/drag-drop.service';
import { Column } from '../../models/column';
import { Task } from '../../models/task';
import { TaskCardComponent } from '../task-card/task-card.component';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { IftaLabelModule } from 'primeng/iftalabel';

@Component({
  selector: 'app-kanban-column',
  standalone: true,
  imports: [CommonModule, FormsModule, TaskCardComponent, InputTextModule, ButtonModule, DatePickerModule, IftaLabelModule],
  templateUrl: './kanban-column.component.html',
  styleUrl: './kanban-column.component.scss'
})
export class KanbanColumnComponent implements OnInit, OnDestroy {
  private columnService = inject(ColumnService);
  private taskService = inject(TaskService);
  private dragDropService = inject(DragDropService);

  @Input({ required: true }) column!: Column;
  @Output() columnUpdate = new EventEmitter<Column>();
  @Output() columnDelete = new EventEmitter<string>();

  tasks = signal<Task[]>([]);
  isEditingColumn = signal(false);
  editingColumnName = signal('');
  isCreatingTask = signal(false);
  newTaskName = signal('');
  newTaskDueDate = signal('');
  draggedTaskId = signal<string | null>(null);

  private taskMovedSubscription?: Subscription;

  ngOnInit() {
    this.loadTasks();
    this.subscribeToTaskMoves();
  }

  ngOnDestroy() {
    if (this.taskMovedSubscription) {
      this.taskMovedSubscription.unsubscribe();
    }
  }

  private subscribeToTaskMoves() {
    this.taskMovedSubscription = this.dragDropService.getTaskMovedEvents().subscribe(event => {
      if (event.sourceColumnId === this.column.id && event.targetColumnId !== this.column.id) {
        // Remove task from this column
        this.tasks.update(tasks => tasks.filter(t => t.id !== event.task.id));
      } else if (event.targetColumnId === this.column.id && event.sourceColumnId !== this.column.id) {
        // Add task to this column
        const updatedTask = { ...event.task, columnId: this.column.id, position: event.targetPosition };
        this.tasks.update(tasks => {
          const newTasks = [...tasks];
          newTasks.splice(event.targetPosition, 0, updatedTask);
          // Reindex positions
          newTasks.forEach((t, idx) => t.position = idx);
          return newTasks;
        });
      }
    });
  }

  loadTasks() {
    this.taskService.getTasksByColumnId(this.column.id).subscribe({
      next: (tasks) => {
        const sortedTasks = tasks.sort((a, b) => a.position - b.position);
        this.tasks.set(sortedTasks);
      },
      error: (error) => console.error('Error loading tasks:', error)
    });
  }

  startEditingColumn() {
    this.isEditingColumn.set(true);
    this.editingColumnName.set(this.column.name);
  }

  cancelEditingColumn() {
    this.isEditingColumn.set(false);
    this.editingColumnName.set('');
  }

  updateColumn() {
    const name = this.editingColumnName().trim();
    if (!name) return;

    this.columnService.updateColumn(this.column.id, name, this.column.position, this.column.boardId).subscribe({
      next: (updatedColumn) => {
        this.columnUpdate.emit(updatedColumn);
        this.isEditingColumn.set(false);
        this.editingColumnName.set('');
      },
      error: (error) => console.error('Error updating column:', error)
    });
  }

  deleteColumn() {
    if (!confirm('Tem certeza que deseja excluir esta coluna e todas as suas tarefas?')) return;

    this.columnService.deleteColumn(this.column.id).subscribe({
      next: () => {
        this.columnDelete.emit(this.column.id);
      },
      error: (error) => console.error('Error deleting column:', error)
    });
  }

  startCreatingTask() {
    this.isCreatingTask.set(true);
    this.newTaskName.set('');
    this.newTaskDueDate.set('');
  }

  cancelCreatingTask() {
    this.isCreatingTask.set(false);
    this.newTaskName.set('');
    this.newTaskDueDate.set('');
  }

  createTask() {
    const name = this.newTaskName().trim();
    if (!name) return;

    const dueDate = this.newTaskDueDate() ? new Date(this.newTaskDueDate()) : new Date();

    this.taskService.createTask(this.column.id, name, dueDate).subscribe({
      next: (task) => {
        this.tasks.update(tasks => [...tasks, task]);
        this.isCreatingTask.set(false);
        this.newTaskName.set('');
        this.newTaskDueDate.set('');
      },
      error: (error) => console.error('Error creating task:', error)
    });
  }

  onTaskUpdate(task: Task) {
    this.tasks.update(tasks =>
      tasks.map(t => t.id === task.id ? task : t)
    );
  }

  onTaskDelete(taskId: string) {
    this.tasks.update(tasks => tasks.filter(t => t.id !== taskId));
  }

  // Drag and drop for tasks
  onTaskDragStart(taskId: string, event: DragEvent) {
    const task = this.tasks().find(t => t.id === taskId);
    if (task) {
      this.dragDropService.setDraggedTask(task);
    }
    this.draggedTaskId.set(taskId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('taskId', taskId);
      event.dataTransfer.setData('sourceColumnId', this.column.id);
    }
  }

  onTaskDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onTaskDrop(targetTaskId: string | null, event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (!event.dataTransfer) return;

    const draggedTaskId = event.dataTransfer.getData('taskId');
    const sourceColumnId = event.dataTransfer.getData('sourceColumnId');

    if (!draggedTaskId) return;

    // Moving within the same column
    if (sourceColumnId === this.column.id) {
      this.reorderTasksInColumn(draggedTaskId, targetTaskId);
    } else {
      // Moving from another column
      this.moveTaskToColumn(draggedTaskId, sourceColumnId, targetTaskId);
    }

    this.draggedTaskId.set(null);
  }

  onColumnDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (!event.dataTransfer) return;

    const draggedTaskId = event.dataTransfer.getData('taskId');
    const sourceColumnId = event.dataTransfer.getData('sourceColumnId');

    if (!draggedTaskId || sourceColumnId === this.column.id) return;

    // Moving task to end of this column
    this.moveTaskToColumn(draggedTaskId, sourceColumnId, null);
    this.draggedTaskId.set(null);
  }

  private reorderTasksInColumn(draggedTaskId: string, targetTaskId: string | null) {
    const tasks = [...this.tasks()];
    const draggedIndex = tasks.findIndex(t => t.id === draggedTaskId);

    if (draggedIndex === -1) return;

    const [draggedTask] = tasks.splice(draggedIndex, 1);

    if (targetTaskId) {
      const targetIndex = tasks.findIndex(t => t.id === targetTaskId);
      if (targetIndex !== -1) {
        tasks.splice(targetIndex, 0, draggedTask);
      }
    } else {
      tasks.push(draggedTask);
    }

    // Update positions
    tasks.forEach((task, index) => {
      task.position = index;
    });

    this.tasks.set(tasks);

    // Update in backend
    draggedTask.position = tasks.findIndex(t => t.id === draggedTask.id);
    this.taskService.updateTask(
      draggedTask.id,
      draggedTask.name,
      draggedTask.position,
      draggedTask.createdAt,
      draggedTask.dueDate,
      draggedTask.completed,
      draggedTask.tags
    ).subscribe({
      error: (error) => console.error('Error updating task position:', error)
    });
  }

  private moveTaskToColumn(draggedTaskId: string, sourceColumnId: string, targetTaskId: string | null) {
    const draggedTask = this.dragDropService.getDraggedTask();
    if (!draggedTask) return;

    const tasks = [...this.tasks()];
    let newPosition = tasks.length;

    if (targetTaskId) {
      const targetIndex = tasks.findIndex(t => t.id === targetTaskId);
      if (targetIndex !== -1) {
        newPosition = targetIndex;
      }
    }

    // Update task's columnId and position
    this.taskService.updateTask(
      draggedTask.id,
      draggedTask.name,
      newPosition,
      draggedTask.createdAt,
      draggedTask.dueDate,
      draggedTask.completed,
      draggedTask.tags,
      this.column.id
    ).subscribe({
      next: () => {
        // Notify other columns about the move
        this.dragDropService.notifyTaskMoved({
          task: draggedTask,
          sourceColumnId: sourceColumnId,
          targetColumnId: this.column.id,
          targetPosition: newPosition
        });
      },
      error: (error) => console.error('Error moving task:', error)
    });
  }

  onTaskDragEnd() {
    this.draggedTaskId.set(null);
    this.dragDropService.clearDraggedTask();
  }
}
