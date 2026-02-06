import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BoardService } from '../../shared/services/board.service';
import { ColumnService } from '../../shared/services/column.service';
import { Board } from '../../shared/models/board';
import { Column } from '../../shared/models/column';
import { KanbanColumnComponent } from '../../shared/components/kanban-column/kanban-column.component';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, FormsModule, KanbanColumnComponent, InputTextModule, ButtonModule],
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.scss'
})
export class KanbanBoardComponent implements OnInit {
  private boardService = inject(BoardService);
  private columnService = inject(ColumnService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  board = signal<Board | null>(null);
  columns = signal<Column[]>([]);
  isCreatingColumn = signal(false);
  newColumnName = signal('');
  draggedColumnId = signal<string | null>(null);

  ngOnInit() {
    const boardId = this.route.snapshot.paramMap.get('id');
    if (boardId) {
      this.loadBoard(boardId);
      this.loadColumns(boardId);
    }
  }

  loadBoard(boardId: string) {
    this.boardService.getBoards().subscribe({
      next: (boards) => {
        const board = boards.find(b => b.id === boardId);
        if (board) {
          this.board.set(board);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (error) => console.error('Error loading board:', error)
    });
  }

  loadColumns(boardId: string) {
    this.columnService.getColumnsByBoardId(boardId).subscribe({
      next: (columns) => {
        const sortedColumns = columns.sort((a, b) => a.position - b.position);
        this.columns.set(sortedColumns);
      },
      error: (error) => console.error('Error loading columns:', error)
    });
  }

  startCreatingColumn() {
    this.isCreatingColumn.set(true);
    this.newColumnName.set('');
  }

  cancelCreatingColumn() {
    this.isCreatingColumn.set(false);
    this.newColumnName.set('');
  }

  createColumn() {
    const name = this.newColumnName().trim();
    const board = this.board();
    if (!name || !board) return;

    const position = this.columns().length;

    this.columnService.createColumn(board.id, name, position).subscribe({
      next: (column) => {
        this.columns.update(cols => [...cols, column]);
        this.isCreatingColumn.set(false);
        this.newColumnName.set('');
      },
      error: (error) => console.error('Error creating column:', error)
    });
  }

  onColumnUpdate(column: Column) {
    this.columns.update(cols =>
      cols.map(c => c.id === column.id ? column : c)
    );
  }

  onColumnDelete(columnId: string) {
    this.columns.update(cols => cols.filter(c => c.id !== columnId));
  }

  goBack() {
    this.router.navigate(['/']);
  }

  // Drag and drop for columns
  onColumnDragStart(columnId: string) {
    this.draggedColumnId.set(columnId);
  }

  onColumnDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onColumnDrop(targetColumnId: string) {
    const draggedId = this.draggedColumnId();
    if (!draggedId || draggedId === targetColumnId) {
      this.draggedColumnId.set(null);
      return;
    }

    const columns = [...this.columns()];
    const draggedIndex = columns.findIndex(c => c.id === draggedId);
    const targetIndex = columns.findIndex(c => c.id === targetColumnId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Reorder columns
    const [draggedColumn] = columns.splice(draggedIndex, 1);
    columns.splice(targetIndex, 0, draggedColumn);

    // Update positions
    columns.forEach((col, index) => {
      col.position = index;
    });

    this.columns.set(columns);

    // Update positions in backend
    const draggedCol = columns[targetIndex];
    this.columnService.updateColumn(draggedCol.id, draggedCol.name, draggedCol.position, draggedCol.boardId).subscribe({
      error: (error) => console.error('Error updating column position:', error)
    });

    const originalCol = columns[draggedIndex];
    this.columnService.updateColumn(originalCol.id, originalCol.name, originalCol.position, originalCol.boardId).subscribe({
      error: (error) => console.error('Error updating column position:', error)
    });

    this.draggedColumnId.set(null);
  }

  onColumnDragEnd() {
    this.draggedColumnId.set(null);
  }
}
