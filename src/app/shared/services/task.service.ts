import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, from, of } from "rxjs";
import { catchError, switchMap } from "rxjs/operators";
import { Task } from "../models/task";
import { StorageService } from "./storage.service";
import { SyncService } from "./sync.service";

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  apiUrl = '/api/v1/task';

  constructor(
    private readonly httpClient: HttpClient,
    private readonly storageService: StorageService,
    private readonly syncService: SyncService
  ) {
  }

  getTasksByColumnId(columnId: string): Observable<Task[]> {
    return from(this.storageService.getTasksByColumnId(columnId)).pipe(
      switchMap(localTasks => {
        if (this.syncService.isOnline()) {
          return this.httpClient.get<Task[]>(`${this.apiUrl}/from/${columnId}`).pipe(
            switchMap(async serverTasks => {
              for (const task of serverTasks) {
                await this.storageService.saveTask(task);
              }
              return serverTasks;
            }),
            catchError(() => {
              return of(localTasks);
            })
          );
        }
        return of(localTasks);
      })
    );
  }

  createTask(columnId: string, taskName: string, dueDate: Date): Observable<Task> {
    const newTask: Task = {
      id: this.generateTempId(),
      name: taskName,
      position: 0,
      createdAt: new Date(),
      dueDate: dueDate,
      completed: false,
      tags: [],
      columnId: columnId
    };

    return from(this.storageService.saveTask(newTask)).pipe(
      switchMap(async () => {
        if (this.syncService.isOnline()) {
          try {
            const serverTask = await this.httpClient.post<Task>(
              `${this.apiUrl}/from/${columnId}`,
              {
                name: taskName,
                position: 0,
                createdAt: new Date(),
                dueDate: dueDate,
                completed: false,
                tags: [],
                columnId: columnId
              }
            ).toPromise();

            if (serverTask) {
              await this.storageService.saveTask(serverTask);
              return serverTask;
            }
            return newTask;
          } catch (error) {
            await this.syncService.addToSyncQueue({
              type: 'create',
              entity: 'task',
              data: newTask
            });
            return newTask;
          }
        } else {
          await this.syncService.addToSyncQueue({
            type: 'create',
            entity: 'task',
            data: newTask
          });
          return newTask;
        }
      })
    );
  }

  updateTask(taskId: string, taskName: string, position: number, createdAt: Date, dueDate: Date, completed: boolean, tags: string[], columnId?: string): Observable<Task> {
    return from(this.storageService.getTaskById(taskId)).pipe(
      switchMap(async (existingTask) => {
        const updatedTask: Task = {
          id: taskId,
          name: taskName,
          position,
          createdAt,
          dueDate,
          completed,
          tags,
          columnId: columnId || (existingTask?.columnId || ''),
        };

        await this.storageService.saveTask(updatedTask);

        if (this.syncService.isOnline()) {
          try {
            const { id, ...body } = updatedTask;

            const serverTask = await this.httpClient.put<Task>(
              `${this.apiUrl}/${taskId}`,
              body
            ).toPromise();

            if (serverTask) {
              await this.storageService.saveTask(serverTask);
              return serverTask;
            }
            return updatedTask;
          } catch (error) {
            await this.syncService.addToSyncQueue({
              type: 'update',
              entity: 'task',
              data: updatedTask
            });
            return updatedTask;
          }
        } else {
          await this.syncService.addToSyncQueue({
            type: 'update',
            entity: 'task',
            data: updatedTask
          });
          return updatedTask;
        }
      })
    );
  }

  deleteTask(taskId: string): Observable<void> {
    return from(this.storageService.deleteTask(taskId)).pipe(
      switchMap(async () => {
        if (this.syncService.isOnline()) {
          try {
            await this.httpClient.delete<void>(`${this.apiUrl}/${taskId}`).toPromise();
          } catch (error) {
            await this.syncService.addToSyncQueue({
              type: 'delete',
              entity: 'task',
              data: { id: taskId }
            });
          }
        } else {
          await this.syncService.addToSyncQueue({
            type: 'delete',
            entity: 'task',
            data: { id: taskId }
          });
        }
      })
    );
  }

  private generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
