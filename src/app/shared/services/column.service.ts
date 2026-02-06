import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, from, of } from "rxjs";
import { catchError, switchMap } from "rxjs/operators";
import { Column } from "../models/column";
import { StorageService } from "./storage.service";
import { SyncService } from "./sync.service";

@Injectable({
  providedIn: 'root'
})
export class ColumnService {
  apiUrl = '/api/v1/column';

  constructor(
    private readonly httpClient: HttpClient,
    private readonly storageService: StorageService,
    private readonly syncService: SyncService
  ) {
  }

  getColumnsByBoardId(boardId: string): Observable<Column[]> {
    return from(this.storageService.getColumnsByBoardId(boardId)).pipe(
      switchMap(localColumns => {
        if (this.syncService.isOnline()) {
          return this.httpClient.get<Column[]>(`${this.apiUrl}/from/${boardId}`).pipe(
            switchMap(async serverColumns => {
              for (const column of serverColumns) {
                await this.storageService.saveColumn(column);
              }
              return serverColumns;
            }),
            catchError(() => {
              return of(localColumns);
            })
          );
        }
        return of(localColumns);
      })
    );
  }

  createColumn(boardId: string, columnName: string, position: number): Observable<Column> {
    const newColumn: Column = {
      id: this.generateTempId(),
      name: columnName,
      position: position,
      boardId: boardId
    };

    return from(this.storageService.saveColumn(newColumn)).pipe(
      switchMap(async () => {
        if (this.syncService.isOnline()) {
          try {
            const serverColumn = await this.httpClient.post<Column>(
              `${this.apiUrl}`,
              {
                name: columnName,
                position: position,
                boardId: boardId
              }
            ).toPromise();

            if (serverColumn) {
              await this.storageService.saveColumn(serverColumn);
              return serverColumn;
            }
            return newColumn;
          } catch (error) {
            await this.syncService.addToSyncQueue({
              type: 'create',
              entity: 'column',
              data: newColumn
            });
            return newColumn;
          }
        } else {
          await this.syncService.addToSyncQueue({
            type: 'create',
            entity: 'column',
            data: newColumn
          });
          return newColumn;
        }
      })
    );
  }

  updateColumn(columnId: string, columnName: string, position: number, boardId: string): Observable<Column> {
    const updatedColumn: any = {
      id: columnId,
      name: columnName,
      position: position,
      boardId: boardId
    };

    return from(this.storageService.saveColumn(updatedColumn as Column)).pipe(
      switchMap(async () => {
        if (this.syncService.isOnline()) {
          try {
            const serverColumn = await this.httpClient.put<Column>(
              `${this.apiUrl}/${columnId}`,
              {
                name: columnName,
                position: position,
                boardId: boardId
              }
            ).toPromise();

            return serverColumn || updatedColumn;
          } catch (error) {
            await this.syncService.addToSyncQueue({
              type: 'update',
              entity: 'column',
              data: updatedColumn
            });
            return updatedColumn;
          }
        } else {
          await this.syncService.addToSyncQueue({
            type: 'update',
            entity: 'column',
            data: updatedColumn
          });
          return updatedColumn;
        }
      })
    );
  }

  deleteColumn(columnId: string): Observable<void> {
    return from(this.storageService.deleteColumn(columnId)).pipe(
      switchMap(async () => {
        if (this.syncService.isOnline()) {
          try {
            await this.httpClient.delete<void>(`${this.apiUrl}/${columnId}`).toPromise();
          } catch (error) {
            await this.syncService.addToSyncQueue({
              type: 'delete',
              entity: 'column',
              data: { id: columnId }
            });
          }
        } else {
          await this.syncService.addToSyncQueue({
            type: 'delete',
            entity: 'column',
            data: { id: columnId }
          });
        }
      })
    );
  }

  private generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
