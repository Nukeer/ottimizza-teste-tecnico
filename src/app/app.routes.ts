import { Routes } from '@angular/router';
import { BoardListComponent } from './pages/board-list/board-list.component';
import { KanbanBoardComponent } from './pages/kanban-board/kanban-board.component';

export const routes: Routes = [
  { path: '', component: BoardListComponent },
  { path: 'board/:id', component: KanbanBoardComponent }
];
