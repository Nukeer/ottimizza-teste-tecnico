import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable, from, of } from "rxjs";
import { catchError, switchMap } from "rxjs/operators";
import { Board } from "../models/board";
import { StorageService } from "./storage.service";
import { SyncService } from "./sync.service";

@Injectable({
  providedIn: 'root'
})
export class BoardService {
  apiUrl = '/api/v1/board';

  constructor(
    private readonly httpClient: HttpClient,
    private readonly storageService: StorageService,
    private readonly syncService: SyncService
  ) {
  }

  getBoards(): Observable<Board[]> {
    return from(this.storageService.getBoards()).pipe(
      switchMap(localBoards => {
        if (this.syncService.isOnline()) {
          return this.httpClient.get<Board[]>(`${this.apiUrl}`).pipe(
            switchMap(async serverBoards => {
              for (const board of serverBoards) {
                await this.storageService.saveBoard(board);
              }
              return serverBoards;
            }),
            catchError(() => {
              return of(localBoards);
            })
          );
        }
        return of(localBoards);
      })
    );
  }

  createBoard(boardName: string): Observable<Board> {
    const newBoard: Board = {
      id: this.generateTempId(),
      name: boardName
    };

    return from(this.storageService.saveBoard(newBoard)).pipe(
      switchMap(async () => {
        if (this.syncService.isOnline()) {
          try {
            const serverBoard = await this.httpClient.post<Board>(
              `${this.apiUrl}`,
              { name: boardName }
            ).toPromise();

            if (serverBoard) {
              await this.storageService.saveBoard(serverBoard);
              return serverBoard;
            }
            return newBoard;
          } catch (error) {
            await this.syncService.addToSyncQueue({
              type: 'create',
              entity: 'board',
              data: newBoard
            });
            return newBoard;
          }
        } else {
          await this.syncService.addToSyncQueue({
            type: 'create',
            entity: 'board',
            data: newBoard
          });
          return newBoard;
        }
      })
    );
  }

  updateBoard(boardId: string, boardName: string): Observable<Board> {
    const updatedBoard: Board = {
      id: boardId,
      name: boardName
    };

    return from(this.storageService.saveBoard(updatedBoard)).pipe(
      switchMap(async () => {
        if (this.syncService.isOnline()) {
          try {
            const serverBoard = await this.httpClient.put<Board>(
              `${this.apiUrl}/${boardId}`,
              { name: boardName }
            ).toPromise();

            return serverBoard || updatedBoard;
          } catch (error) {
            await this.syncService.addToSyncQueue({
              type: 'update',
              entity: 'board',
              data: updatedBoard
            });
            return updatedBoard;
          }
        } else {
          await this.syncService.addToSyncQueue({
            type: 'update',
            entity: 'board',
            data: updatedBoard
          });
          return updatedBoard;
        }
      })
    );
  }

  deleteBoard(boardId: string): Observable<void> {
    return from(this.storageService.deleteBoard(boardId)).pipe(
      switchMap(async () => {
        if (this.syncService.isOnline()) {
          try {
            await this.httpClient.delete<void>(`${this.apiUrl}/${boardId}`).toPromise();
          } catch (error) {
            await this.syncService.addToSyncQueue({
              type: 'delete',
              entity: 'board',
              data: { id: boardId }
            });
          }
        } else {
          await this.syncService.addToSyncQueue({
            type: 'delete',
            entity: 'board',
            data: { id: boardId }
          });
        }
      })
    );
  }

  private generateTempId(): string {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
