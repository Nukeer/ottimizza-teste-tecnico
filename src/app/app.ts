import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SyncService } from './shared/services/sync.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  isOnline = signal(true);

  constructor(private syncService: SyncService) {}

  ngOnInit() {
    this.syncService.getOnlineStatus().subscribe(status => {
      this.isOnline.set(status);
    });
  }
}
