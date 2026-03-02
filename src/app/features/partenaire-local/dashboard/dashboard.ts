import { Component } from '@angular/core';
import { NavbarComponent } from '../../../shared/navbar/navbar';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
   imports: [NavbarComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css']
})
export class DashboardComponent {
  // Le composant est vide car pas de logique nécessaire pour l'instant
}