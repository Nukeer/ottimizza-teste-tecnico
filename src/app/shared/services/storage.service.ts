import { Injectable } from '@angular/core';
import { Board } from '../models/board';
import { Column } from '../models/column';
import { Task } from '../models/task';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private dbName = 'KanbanDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('boards')) {
          db.createObjectStore('boards', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('columns')) {
          const columnStore = db.createObjectStore('columns', { keyPath: 'id' });
          columnStore.createIndex('boardId', 'boardId', { unique: false });
        }
        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('columnId', 'columnId', { unique: false });
        }
        if (!db.objectStoreNames.contains('pendingSync')) {
          db.createObjectStore('pendingSync', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB();
    }
    return this.db!;
  }

  async getBoards(): Promise<Board[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['boards'], 'readonly');
      const store = transaction.objectStore('boards');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveBoard(board: Board): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['boards'], 'readwrite');
      const store = transaction.objectStore('boards');
      const request = store.put(board);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteBoard(boardId: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['boards'], 'readwrite');
      const store = transaction.objectStore('boards');
      const request = store.delete(boardId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Column operations
  async getColumnsByBoardId(boardId: string): Promise<Column[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['columns'], 'readonly');
      const store = transaction.objectStore('columns');
      const index = store.index('boardId');
      const request = index.getAll(boardId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveColumn(column: Column): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['columns'], 'readwrite');
      const store = transaction.objectStore('columns');
      const request = store.put(column);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteColumn(columnId: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['columns'], 'readwrite');
      const store = transaction.objectStore('columns');
      const request = store.delete(columnId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Task operations
  async getTasksByColumnId(columnId: string): Promise<Task[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['tasks'], 'readonly');
      const store = transaction.objectStore('tasks');
      const index = store.index('columnId');
      const request = index.getAll(columnId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getTaskById(taskId: string): Promise<Task | null> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['tasks'], 'readonly');
      const store = transaction.objectStore('tasks');
      const request = store.get(taskId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllTasks(): Promise<Task[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['tasks'], 'readonly');
      const store = transaction.objectStore('tasks');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async saveTask(task: Task): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['tasks'], 'readwrite');
      const store = transaction.objectStore('tasks');
      const request = store.put(task);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTask(taskId: string): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['tasks'], 'readwrite');
      const store = transaction.objectStore('tasks');
      const request = store.delete(taskId);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Pending sync operations
  async addPendingSync(operation: any): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pendingSync'], 'readwrite');
      const store = transaction.objectStore('pendingSync');
      const request = store.add(operation);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSync(): Promise<any[]> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pendingSync'], 'readonly');
      const store = transaction.objectStore('pendingSync');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async deletePendingSync(id: number): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['pendingSync'], 'readwrite');
      const store = transaction.objectStore('pendingSync');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllData(): Promise<void> {
    const db = await this.ensureDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['boards', 'columns', 'tasks'], 'readwrite');

      transaction.objectStore('boards').clear();
      transaction.objectStore('columns').clear();
      transaction.objectStore('tasks').clear();

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }
}
