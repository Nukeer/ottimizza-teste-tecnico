import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService } from '../../services/task.service';
import { Task } from '../../models/task';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { IftaLabelModule } from 'primeng/iftalabel';
import { CheckboxModule } from 'primeng/checkbox';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    InputTextModule,
    ButtonModule,
    DatePickerModule,
    AutoCompleteModule,
    IftaLabelModule,
    CheckboxModule
  ],
  templateUrl: './task-card.component.html',
  styleUrl: './task-card.component.scss'
})
export class TaskCardComponent {
  private taskService = inject(TaskService);

  @Input({ required: true }) task!: Task;
  @Output() taskUpdate = new EventEmitter<Task>();
  @Output() taskDelete = new EventEmitter<string>();

  isEditing = signal(false);
  editingName = signal('');
  editingDueDate = signal<Date | null>(null);
  editingCompleted = signal(false);
  editingTags = signal<string[]>([]);

  startEditing() {
    this.isEditing.set(true);
    this.editingName.set(this.task.name);
    this.editingDueDate.set(new Date(this.task.dueDate));
    this.editingCompleted.set(this.task.completed);
    this.editingTags.set(this.task.tags);
  }

  cancelEditing() {
    this.isEditing.set(false);
  }

  updateTask() {
    const name = this.editingName().trim();
    if (!name) return;

    const tags = this.editingTags();

    const dueDate = this.editingDueDate() ? this.editingDueDate()! : this.task.dueDate;

    this.taskService.updateTask(
      this.task.id,
      name,
      this.task.position,
      this.task.createdAt,
      dueDate,
      this.editingCompleted(),
      tags
    ).subscribe({
      next: (updatedTask) => {
        this.taskUpdate.emit(updatedTask);
        this.isEditing.set(false);
      },
      error: (error) => console.error('Error updating task:', error)
    });
  }

  toggleCompleted() {
    this.taskService.updateTask(
      this.task.id,
      this.task.name,
      this.task.position,
      this.task.createdAt,
      this.task.dueDate,
      this.task.completed,
      this.task.tags
    ).subscribe({
      next: (updatedTask) => {
        this.taskUpdate.emit(updatedTask);
      },
      error: (error) => console.error('Error toggling task:', error)
    });
  }

  deleteTask() {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

    this.taskService.deleteTask(this.task.id).subscribe({
      next: () => {
        this.taskDelete.emit(this.task.id);
      },
      error: (error) => console.error('Error deleting task:', error)
    });
  }

  formatDateForInput(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDate(date: Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  isOverdue(): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(this.task.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today && !this.task.completed;
  }
}
