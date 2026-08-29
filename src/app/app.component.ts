import { Component } from '@angular/core';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  protected readonly appPages = [
    { title: 'Iniciar Sesión', url: '/login', icon: 'log-in' },
    { title: 'Productos', url: '/productos', icon: 'cube' }
  ];
  protected readonly labels = [];
  constructor() {}
}
