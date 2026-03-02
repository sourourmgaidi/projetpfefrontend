import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { Role } from '../../../shared/models/user.model';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent implements OnDestroy {
  email = '';
  loading = false;
  errorMsg = '';
  successMsg = '';
  emailSent = false;
  
  // Pour la sélection du rôle (utilisateur non connecté)
  selectedRole: Role | null = null;
  roles = [
    { value: Role.TOURIST, label: 'Touriste' },
    { value: Role.INVESTOR, label: 'Investisseur' },
    { value: Role.PARTNER, label: 'Partenaire Économique' },
    { value: Role.LOCAL_PARTNER, label: 'Partenaire Local' },
    { value: Role.INTERNATIONAL_COMPANY, label: 'Société Internationale' },
    { value: Role.ADMIN, label: 'Administrateur' }
  ];
  
  // Resend timer
  resendDisabled = false;
  resendTimer = 30;
  private timerInterval: any;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onSubmitEmail() {
    // Validation email
    if (!this.email) {
      this.errorMsg = 'Email est requis';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.email)) {
      this.errorMsg = 'Veuillez entrer un email valide';
      return;
    }

    // Validation du rôle
    if (!this.selectedRole) {
      this.errorMsg = 'Veuillez sélectionner votre type de compte';
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    console.log(`📧 Demande pour: ${this.email}, rôle: ${this.selectedRole}`);

    // Appel au service avec le rôle sélectionné
    this.authService.forgotPassword(this.email, this.selectedRole).subscribe({
      next: (response) => {
        this.loading = false;
        this.emailSent = true;
        this.successMsg = 'Instructions de réinitialisation envoyées à votre email';
        console.log('✅ Succès:', response);
        
        // Démarrer le timer pour "Resend"
        this.startResendTimer();
      },
      error: (err) => {
        this.loading = false;
        // Message générique pour sécurité (ne pas révéler si l'email existe)
        this.successMsg = 'Si votre email existe, vous recevrez les instructions';
        this.emailSent = true;
        console.log('📧 Traitement terminé (mode sécurité)');
      }
    });
  }

  resendEmail() {
    if (this.resendDisabled || !this.selectedRole) return;
    
    this.loading = true;
    this.errorMsg = '';

    this.authService.forgotPassword(this.email, this.selectedRole).subscribe({
      next: (response) => {
        this.loading = false;
        this.successMsg = 'Instructions renvoyées à votre email';
        console.log('✅ Renvoi réussi');
        this.startResendTimer();
      },
      error: (err) => {
        this.loading = false;
        this.successMsg = 'Si votre email existe, vous recevrez les instructions';
        this.startResendTimer();
        console.log('📧 Renvoi traité');
      }
    });
  }

  private startResendTimer() {
    this.resendDisabled = true;
    this.resendTimer = 30;
    
    this.timerInterval = setInterval(() => {
      this.resendTimer--;
      
      if (this.resendTimer <= 0) {
        this.resendDisabled = false;
        clearInterval(this.timerInterval);
      }
    }, 1000);
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  ngOnDestroy() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }
}