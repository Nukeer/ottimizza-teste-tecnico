import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BoardService } from '../../shared/services/board.service';
import { Board } from '../../shared/models/board';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-board-list',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, ButtonModule],
  templateUrl: './board-list.component.html',
  styleUrl: './board-list.component.scss'
})
export class BoardListComponent implements OnInit {
  private boardService = inject(BoardService);
  private router = inject(Router);

  boards = signal<Board[]>([]);
  isCreating = signal(false);
  newBoardName = signal('');
  editingBoardId = signal<string | null>(null);
  editingBoardName = signal('');

  ngOnInit() {
    this.loadBoards();
  }

  loadBoards() {
    this.boardService.getBoards().subscribe({
      next: (boards) => this.boards.set(boards),
      error: (error) => console.error('Error loading boards:', error)
    });
  }

  startCreating() {
    this.isCreating.set(true);
    this.newBoardName.set('');
  }

  cancelCreating() {
    this.isCreating.set(false);
    this.newBoardName.set('');
  }

  createBoard() {
    const name = this.newBoardName().trim();
    if (!name) return;

    this.boardService.createBoard(name).subscribe({
      next: (board) => {
        this.boards.update(boards => [...boards, board]);
        this.isCreating.set(false);
        this.newBoardName.set('');
      },
      error: (error) => console.error('Error creating board:', error)
    });
  }

  startEditing(board: Board) {
    this.editingBoardId.set(board.id);
    this.editingBoardName.set(board.name);
  }

  cancelEditing() {
    this.editingBoardId.set(null);
    this.editingBoardName.set('');
  }

  updateBoard(boardId: string) {
    const name = this.editingBoardName().trim();
    if (!name) return;

    this.boardService.updateBoard(boardId, name).subscribe({
      next: (updatedBoard) => {
        this.boards.update(boards =>
          boards.map(b => b.id === boardId ? updatedBoard : b)
        );
        this.editingBoardId.set(null);
        this.editingBoardName.set('');
      },
      error: (error) => console.error('Error updating board:', error)
    });
  }

  deleteBoard(boardId: string) {
    if (!confirm('Tem certeza que deseja excluir este quadro?')) return;

    this.boardService.deleteBoard(boardId).subscribe({
      next: () => {
        this.boards.update(boards => boards.filter(b => b.id !== boardId));
      },
      error: (error) => console.error('Error deleting board:', error)
    });
  }

  openBoard(boardId: string) {
    this.router.navigate(['/board', boardId]);
  }
}
