import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, fromEvent, merge, of } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { StorageService } from './storage.service';

export interface SyncOperation {
  id?: number;
  type: 'create' | 'update' | 'delete';
  entity: 'board' | 'column' | 'task';
  data: any;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class SyncService {
  private onlineStatus$ = new BehaviorSubject<boolean>(navigator.onLine);
  private isSyncing = false;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly storageService: StorageService
  ) {
    this.initOnlineStatusListener();
    this.setupAutoSync();
  }

  private initOnlineStatusListener(): void {
    merge(
      of(navigator.onLine),
      fromEvent(window, 'online').pipe(map(() => true)),
      fromEvent(window, 'offline').pipe(map(() => false))
    )
      .pipe(distinctUntilChanged())
      .subscribe(isOnline => {
        this.onlineStatus$.next(isOnline);
        if (isOnline) {
          this.syncPendingOperations();
        }
      });
  }

  private setupAutoSync(): void {
    setInterval(() => {
      if (this.isOnline() && !this.isSyncing) {
        this.syncPendingOperations();
      }
    }, 30000);
  }

  isOnline(): boolean {
    return this.onlineStatus$.value;
  }

  getOnlineStatus(): Observable<boolean> {
    return this.onlineStatus$.asObservable();
  }

  async addToSyncQueue(operation: Omit<SyncOperation, 'timestamp'>): Promise<void> {
    const syncOp: SyncOperation = {
      ...operation,
      timestamp: Date.now()
    };
    await this.storageService.addPendingSync(syncOp);
  }

  async syncPendingOperations(): Promise<void> {
    if (this.isSyncing || !this.isOnline()) {
      return;
    }

    this.isSyncing = true;

    try {
      const pendingOps = await this.storageService.getPendingSync();

      pendingOps.sort((a, b) => a.timestamp - b.timestamp);

      for (const op of pendingOps) {
        try {
          await this.executeSyncOperation(op);
          if (op.id) {
            await this.storageService.deletePendingSync(op.id);
          }
        } catch (error) {
          console.error('Failed to sync operation:', op, error);
          break;
        }
      }
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async executeSyncOperation(op: SyncOperation): Promise<void> {
    const baseUrl = `/api/v1/${op.entity}`;

    switch (op.type) {
      case 'create':
        if (op.entity === 'task') {
          await this.httpClient.post(`${baseUrl}/from/${op.data.columnId}`, op.data).toPromise();
        } else {
          await this.httpClient.post(baseUrl, op.data).toPromise();
        }
        break;

      case 'update':
        await this.httpClient.put(`${baseUrl}/${op.data.id}`, op.data).toPromise();
        break;

      case 'delete':
        await this.httpClient.delete(`${baseUrl}/${op.data.id}`).toPromise();
        break;
    }
  }

  async loadDataFromServer(): Promise<void> {
    if (!this.isOnline()) {
      return;
    }

    try {
      const boards = await this.httpClient.get<any[]>('/api/v1/board').toPromise();
      if (boards) {
        for (const board of boards) {
          await this.storageService.saveBoard(board);
        }

        for (const board of boards) {
          const columns = await this.httpClient.get<any[]>(`/api/v1/column/from/${board.id}`).toPromise();
          if (columns) {
            for (const column of columns) {
              await this.storageService.saveColumn(column);

              const tasks = await this.httpClient.get<any[]>(`/api/v1/task/from/${column.id}`).toPromise();
              if (tasks) {
                for (const task of tasks) {
                  await this.storageService.saveTask(task);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading data from server:', error);
      throw error;
    }
  }

  async clearLocalData(): Promise<void> {
    await this.storageService.clearAllData();
  }
}
