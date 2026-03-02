// src/app/core/services/auth.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap, catchError, throwError } from 'rxjs';
import { KeycloakService } from './keycloak';
import {
  Role,
  RegisterRequest,
  AuthResponse,
  CurrentUser
} from '../../shared/models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly API_URL = 'http://localhost:8089/api';

  // Endpoints d'inscription par rôle
  private readonly REGISTER_ENDPOINTS: Record<Role, string> = {
    [Role.ADMIN]: `${this.API_URL}/admin/register`,
    [Role.TOURIST]: `${this.API_URL}/touristes/register`,
    [Role.INVESTOR]: `${this.API_URL}/auth/register`,
    [Role.PARTNER]: `${this.API_URL}/partenaires-economiques/register`,
    [Role.LOCAL_PARTNER]: `${this.API_URL}/partenaires-locaux/register`,
    [Role.INTERNATIONAL_COMPANY]: `${this.API_URL}/international-companies/register`,
  };

  // ✅ Endpoints de login par rôle (AJOUTÉ)
  private readonly LOGIN_ENDPOINTS: Record<Role, string> = {
    [Role.ADMIN]: `${this.API_URL}/admin/login`,
    [Role.TOURIST]: `${this.API_URL}/touristes/login`,
    [Role.INVESTOR]: `${this.API_URL}/auth/login`,
    [Role.PARTNER]: `${this.API_URL}/partenaires-economiques/login`,
    [Role.LOCAL_PARTNER]: `${this.API_URL}/partenaires-locaux/login`,
    [Role.INTERNATIONAL_COMPANY]: `${this.API_URL}/international-companies/login`,
  };

  // Routes par rôle pour la redirection
  private readonly ROLE_ROUTES: Record<Role, string> = {
    [Role.ADMIN]: '/admin/dashboard',
    [Role.TOURIST]: '/touriste/dashboard',
    [Role.INVESTOR]: '/investisseur/dashboard',
    [Role.PARTNER]: '/partenaire-economique/dashboard',
    [Role.LOCAL_PARTNER]: '/partenaire-local/dashboard',
    [Role.INTERNATIONAL_COMPANY]: '/societe-international/dashboard',
  };

  private currentUserSubject = new BehaviorSubject<CurrentUser | null>(
    this.loadUserFromStorage()
  );
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private keycloakService: KeycloakService,
    private router: Router
  ) {}

  // ========================================
  // CONNEXION (CORRIGÉE)
  // ========================================
  login(email: string, password: string, role?: Role): Observable<AuthResponse> {
    console.log('🔑 Tentative de connexion pour:', email, 'rôle:', role);

    // Si le rôle est fourni, utiliser l'endpoint spécifique
    if (role && this.LOGIN_ENDPOINTS[role]) {
      const endpoint = this.LOGIN_ENDPOINTS[role];
      console.log(`📤 Envoi au endpoint spécifique: ${endpoint}`);
      
      return this.http.post<AuthResponse>(endpoint, { email, password }).pipe(
        tap((response) => {
          console.log('✅ Connexion réussie via endpoint spécifique');
          this.handleLoginSuccess(response, role);
        }),
        catchError((err) => this.handleLoginError(err))
      );
    } 
    // Sinon, utiliser KeycloakService par défaut
    else {
      console.log('📤 Utilisation de KeycloakService par défaut');
      return this.keycloakService.login(email, password).pipe(
        tap((response) => {
          console.log('✅ Connexion réussie via Keycloak');
          this.handleLoginSuccess(response);
        }),
        catchError((err) => this.handleLoginError(err))
      );
    }
  }

  // ========================================
  // GESTION DES ERREURS DE CONNEXION
  // ========================================
  private handleLoginError(err: any): Observable<never> {
    console.error('❌ Erreur de connexion:', err);
    
    if (err.status === 0) {
      return throwError(() => new Error('Serveur backend inaccessible'));
    } else if (err.status === 401) {
      return throwError(() => new Error('Email ou mot de passe incorrect'));
    } else if (err.status === 403) {
      return throwError(() => new Error('Accès non autorisé pour ce rôle'));
    } else {
      const errorMsg = err.error?.error || err.error?.message || 'Erreur de connexion';
      return throwError(() => new Error(errorMsg));
    }
  }

  // ========================================
  // GESTION DE LA CONNEXION RÉUSSIE (AVEC RÔLE OPTIONNEL)
  // ========================================
  private handleLoginSuccess(response: AuthResponse, providedRole?: Role): void {
    let roles: string[] = [];
    let role: Role | null = null;

    // Si un rôle est fourni, l'utiliser directement
    if (providedRole) {
      role = providedRole;
      console.log(`🎯 Rôle fourni: ${role}`);
    } else {
      // Sinon, extraire les rôles du token
      roles = this.keycloakService.extractRoles(response.access_token);
      console.log('🔑 Rôles extraits:', roles);
      role = this.determinePrimaryRole(roles);
    }

    if (!role) {
      console.error('❌ Aucun rôle valide trouvé');
      throw new Error('Rôle utilisateur non détecté');
    }

    console.log(`🎯 Rôle final: ${role}`);

    const tokenPayload = this.keycloakService.decodeToken(response.access_token);
    const email = this.keycloakService.extractEmail(response.access_token);

    // ✅ AJOUTER TOUS LES CHAMPS PHOTO (même vides au départ)
    const user: CurrentUser = {
      email: email,
      role: role,
      token: response.access_token,
      firstName: tokenPayload?.given_name || '',
      lastName: tokenPayload?.family_name || '',
      prenom: tokenPayload?.given_name || '',
      nom: tokenPayload?.family_name || '',
      
      // ✅ AJOUT CRUCIAL : Initialiser tous les champs photo
      profilePhoto: '',
      profilePicture: '',
      photo: '',
      photoProfil: '',
      picture: ''
    };

    this.saveUserSession(user, response.refresh_token);
    
    // ✅ FORCER LE RAFRAÎCHISSEMENT POUR OBTENIR LA PHOTO
    setTimeout(() => {
      this.refreshUserProfile().then(updatedUser => {
        console.log('✅ Profil rafraîchi après login:', updatedUser);
      });
    }, 500);
    
    this.redirectToDashboard(role);
  }

  // ========================================
  // SAUVEGARDE DE LA SESSION
  // ========================================
  private saveUserSession(user: CurrentUser, refreshToken?: string): void {
    localStorage.setItem('auth_token', user.token);
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    }
    
    localStorage.setItem('current_user', JSON.stringify(user));
    localStorage.setItem('user_role', user.role);
    
    const expiresIn = this.keycloakService.getTokenExpiresIn(user.token);
    const expiresAt = Date.now() + expiresIn * 1000;
    localStorage.setItem('token_expires_at', expiresAt.toString());

    this.currentUserSubject.next(user);
    console.log('✅ Session utilisateur sauvegardée');
    console.log('📦 localStorage:', {
      token: localStorage.getItem('auth_token')?.substring(0, 20) + '...',
      role: localStorage.getItem('user_role'),
      user: localStorage.getItem('current_user')
    });
  }

  // ========================================
  // REDIRECTION VERS LE DASHBOARD
  // ========================================
  private redirectToDashboard(role: Role): void {
    const route = this.ROLE_ROUTES[role];
    console.log(`🚀 Redirection vers: ${route}`);
    this.router.navigate([route]);
  }

  // ========================================
  // DÉTERMINATION DU RÔLE PRINCIPAL
  // ========================================
  private determinePrimaryRole(roles: string[]): Role | null {
    const rolePriority: Role[] = [
      Role.ADMIN,
      Role.INTERNATIONAL_COMPANY,
      Role.PARTNER,
      Role.LOCAL_PARTNER,
      Role.INVESTOR,
      Role.TOURIST
    ];

    for (const priorityRole of rolePriority) {
      if (roles.includes(priorityRole)) {
        return priorityRole;
      }
    }
    return null;
  }

  // ========================================
  // INSCRIPTION
  // ========================================
  register(data: RegisterRequest): Observable<any> {
    const endpoint = this.REGISTER_ENDPOINTS[data.role];
    
    // Construction du payload selon le rôle
    let payload: any = {};

    switch (data.role) {
      case Role.TOURIST:
        payload = {
          email: data.email,
          password: data.motDePasse,
          firstName: data.prenom,
          lastName: data.nom,
          role: data.role,
          telephone: data.telephone || '',
          nationalite: data.nationality || ''
        };
        break;

      case Role.INVESTOR:
        payload = {
          email: data.email,
          password: data.motDePasse,
          firstName: data.prenom,
          lastName: data.nom,
          role: data.role,
          telephone: data.telephone || '',
          company: data.companyName || '',
          activitySector: data.secteurActivite || ''
        };
        break;

      case Role.PARTNER:
        payload = {
          email: data.email,
          password: data.motDePasse,
          firstName: data.prenom,
          lastName: data.nom,
          role: data.role,
          telephone: data.telephone || '',
          paysOrigine: data.paysOrigine || '',
          secteurActivite: data.secteurActivite || '',
          adresseSiege: data.adresse || '',
          siteWeb: data.website || ''
        };
        break;

      case Role.LOCAL_PARTNER:
        payload = {
          email: data.email,
          password: data.motDePasse,
          firstName: data.prenom,
          lastName: data.nom,
          role: data.role,
          telephone: data.telephone || '',
          domaineActivite: data.secteurActivite || '',
          numeroRegistreCommerce: data.numeroRegistreCommerce || '',
          taxeProfessionnelle: data.taxeProfessionnelle || '',
          siteWeb: data.website || ''
        };
        break;

      case Role.INTERNATIONAL_COMPANY:
        payload = {
          email: data.email,
          password: data.motDePasse,
          firstName: data.contactFirstName || data.prenom,
          lastName: data.contactLastName || data.nom,
          role: data.role,
          phone: data.telephone || '',
          companyName: data.companyName || '',
          originCountry: data.paysOrigine || '',
          activitySector: data.secteurActivite || '',
          website: data.website || '',
          linkedinProfile: data.linkedinProfile || '',
          interetPrincipal: data.interetPrincipal || '',
          siret: data.siret || ''
        };
        break;

      case Role.ADMIN:
        payload = {
          email: data.email,
          password: data.motDePasse,
          firstName: data.prenom,
          lastName: data.nom,
          role: data.role,
          telephone: data.telephone || ''
        };
        break;
    }

    console.log('📤 Données envoyées à l\'API:', endpoint, payload);

    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post(endpoint, payload, { headers }).pipe(
      tap(response => console.log('✅ Inscription réussie:', response)),
      catchError(err => {
        console.error('❌ Erreur API:', err);
        const msg = err.error?.error || err.error?.message || 'Erreur lors de l\'inscription';
        return throwError(() => new Error(msg));
      })
    );
  }

  // ========================================
  // DÉCONNEXION
  // ========================================
  logout(): void {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (refreshToken) {
      this.keycloakService.logout(refreshToken).subscribe({
        next: () => {
          console.log('✅ Déconnexion réussie');
          this.clearSession();
        },
        error: (err) => {
          console.error('❌ Erreur lors de la déconnexion:', err);
          this.clearSession();
        }
      });
    } else {
      this.clearSession();
    }
  }

  // ========================================
  // NETTOYAGE DE LA SESSION
  // ========================================
  private clearSession(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('current_user');
    localStorage.removeItem('user_role');
    localStorage.removeItem('token_expires_at');
    
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  // ========================================
  // RAFRAÎCHISSEMENT DU TOKEN
  // ========================================
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!refreshToken) {
      return throwError(() => new Error('Aucun refresh token disponible'));
    }

    return this.keycloakService.refreshToken(refreshToken).pipe(
      tap((response) => {
        console.log(' Token rafraîchi avec succès');
        
        const currentUser = this.getCurrentUser();
        if (currentUser) {
          currentUser.token = response.access_token;
          this.saveUserSession(currentUser, response.refresh_token);
        }
      }),
      catchError((err) => {
        console.error('❌ Erreur lors du rafraîchissement du token:', err);
        this.clearSession();
        return throwError(() => new Error('Session expirée'));
      })
    );
  }

  // ========================================
  // VÉRIFICATIONS D'AUTHENTIFICATION
  // ========================================
  isLoggedIn(): boolean {
    const token = localStorage.getItem('auth_token');
    if (!token) return false;
    
    return !this.isTokenExpired();
  }

  isTokenExpired(): boolean {
    const expiresAt = localStorage.getItem('token_expires_at');
    if (!expiresAt) return true;
    
    return Date.now() > parseInt(expiresAt, 10);
  }

  // ========================================
  // GETTERS
  // ========================================
  getCurrentUser(): CurrentUser | null {
    return this.currentUserSubject.getValue();
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getUserRole(): Role | null {
    const storedRole = localStorage.getItem('user_role') as Role;
    if (storedRole && Object.values(Role).includes(storedRole)) {
      return storedRole;
    }
    return this.getCurrentUser()?.role || null;
  }

  // ========================================
  // VÉRIFICATIONS DE RÔLES
  // ========================================
  hasRole(role: Role): boolean {
    return this.getUserRole() === role;
  }

  hasAnyRole(roles: Role[]): boolean {
    const userRole = this.getUserRole();
    return userRole ? roles.includes(userRole) : false;
  }

  // ========================================
  // CHARGEMENT DE L'UTILISATEUR DEPUIS LE STOCKAGE
  // ========================================
  private loadUserFromStorage(): CurrentUser | null {
    try {
      const stored = localStorage.getItem('current_user');
      if (!stored) return null;

      const user = JSON.parse(stored) as CurrentUser;

      if (this.isTokenExpired()) {
        console.log('⚠️ Token expiré, nettoyage de la session');
        this.clearSession();
        return null;
      }

      return user;
    } catch (error) {
      console.error('❌ Erreur lors du chargement:', error);
      return null;
    }
  }

  // ========================================
  // OBTENIR LE TEMPS RESTANT AVANT EXPIRATION
  // ========================================
  getTokenExpiresIn(): number {
    const expiresAt = localStorage.getItem('token_expires_at');
    if (!expiresAt) return 0;
    
    const remaining = parseInt(expiresAt, 10) - Date.now();
    return Math.max(0, Math.floor(remaining / 1000));
  }
  // ========================================
// CHANGER LE MOT DE PASSE (UTILISATEUR CONNECTÉ)
// ========================================
changePassword(oldPassword: string, newPassword: string): Observable<any> {
  const token = this.getToken();
  const role = this.getUserRole();
  
  if (!token) {
    return throwError(() => new Error('Non authentifié'));
  }

  if (!role) {
    return throwError(() => new Error('Rôle utilisateur non trouvé'));
  }

  // Déterminer l'endpoint selon le rôle
  let endpoint = '';
  
  switch (role) {
    case Role.ADMIN:
      endpoint = `${this.API_URL}/admin/change-password`;
      break;
    case Role.TOURIST:
      endpoint = `${this.API_URL}/touristes/change-password`;
      break;
    case Role.INVESTOR:
      endpoint = `${this.API_URL}/auth/change-password`;
      break;
    case Role.PARTNER:
      endpoint = `${this.API_URL}/partenaires-economiques/change-password`;
      break;
    case Role.LOCAL_PARTNER:
      endpoint = `${this.API_URL}/partenaires-locaux/change-password`;
      break;
    case Role.INTERNATIONAL_COMPANY:
      endpoint = `${this.API_URL}/international-companies/change-password`;
      break;
    default:
      return throwError(() => new Error(`Rôle non supporté: ${role}`));
  }

  console.log(`📤 Changement mot de passe - Endpoint: ${endpoint}, Rôle: ${role}`);

  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  });

  const body = {
    oldPassword: oldPassword,
    newPassword: newPassword
  };

  return this.http.post(endpoint, body, { headers }).pipe(
    tap(response => {
      console.log('✅ Mot de passe changé avec succès:', response);
    }),
    catchError(err => {
      console.error('❌ Erreur changement mot de passe:', err);
      let errorMsg = 'Erreur lors du changement de mot de passe';
      
      if (err.error?.error) {
        errorMsg = err.error.error;
      } else if (err.error?.message) {
        errorMsg = err.error.message;
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      return throwError(() => new Error(errorMsg));
    })
  );
}

  // ========================================
  // MOT DE PASSE OUBLIÉ
  // ========================================
  // Dans auth.service.ts
forgotPassword(email: string, role: Role): Observable<any> {
  let endpoint = '';
  
  switch (role) {
    case Role.ADMIN:
      endpoint = `${this.API_URL}/admin/forgot-password`;
      break;
    case Role.TOURIST:
      endpoint = `${this.API_URL}/touristes/forgot-password`;
      break;
    case Role.INVESTOR:
      endpoint = `${this.API_URL}/auth/forgot-password`;
      break;
    case Role.PARTNER:
      endpoint = `${this.API_URL}/partenaires-economiques/forgot-password`;
      break;
    case Role.LOCAL_PARTNER:
      endpoint = `${this.API_URL}/partenaires-locaux/forgot-password`;
      break;
    case Role.INTERNATIONAL_COMPANY:
      endpoint = `${this.API_URL}/international-companies/forgot-password`;
      break;
    default:
      endpoint = `${this.API_URL}/auth/forgot-password`;
  }

  return this.http.post(endpoint, { email }).pipe(
    catchError(err => {
      console.error('Erreur forgot password:', err);
      return throwError(() => new Error('Erreur lors de l\'envoi'));
    })
  );
}

 
  

  /**
   * Mettre à jour la photo de profil de l'utilisateur courant
   */
  updateProfilePhoto(photoUrl: string): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      // Mettre à jour tous les champs possibles
      (currentUser as any).profilePhoto = photoUrl;
      (currentUser as any).profilePicture = photoUrl;
      (currentUser as any).photo = photoUrl;
      (currentUser as any).photoProfil = photoUrl;
      (currentUser as any).picture = photoUrl;
      
      // Sauvegarder dans localStorage
      localStorage.setItem('current_user', JSON.stringify(currentUser));
      
      // Mettre à jour le BehaviorSubject
      this.currentUserSubject.next(currentUser);
      
      console.log('✅ Photo mise à jour dans AuthService:', photoUrl);
    }
  }

  /**
   * Rafraîchir le profil depuis le serveur
   */
  async refreshUserProfile(): Promise<CurrentUser | null> {
    const token = this.getToken();
    const role = this.getUserRole();
    
    if (!token || !role) {
      return null;
    }

    // Déterminer l'endpoint selon le rôle
    let endpoint = '';
    switch (role) {
      case Role.ADMIN:
        endpoint = `${this.API_URL}/admin/profile`;
        break;
      case Role.TOURIST:
        endpoint = `${this.API_URL}/touristes/profile`;
        break;
      case Role.INVESTOR:
        endpoint = `${this.API_URL}/auth/me`;
        break;
      case Role.PARTNER:
        endpoint = `${this.API_URL}/partenaires-economiques/profile`;
        break;
      case Role.LOCAL_PARTNER:
        endpoint = `${this.API_URL}/partenaires-locaux/profile`;
        break;
      case Role.INTERNATIONAL_COMPANY:
        endpoint = `${this.API_URL}/international-companies/profile`;
        break;
      default:
        return null;
    }

    try {
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      const userData = await this.http.get<any>(endpoint, { headers }).toPromise();
      
      console.log('📦 Données reçues du backend pour rôle', role, ':', userData);
      
      // Récupérer l'utilisateur actuel
      const currentUser = this.getCurrentUser();
      if (!currentUser) return null;
      
      // ✅ Déterminer le champ photo selon le rôle
      let photoField = '';
      switch (role) {
        case Role.ADMIN:
        case Role.TOURIST:
        case Role.PARTNER:
          photoField = 'profilePhoto';
          break;
        case Role.INVESTOR:
        case Role.INTERNATIONAL_COMPANY:
          photoField = 'profilePicture';
          break;
        case Role.LOCAL_PARTNER:
          photoField = 'photoProfil';
          break;
      }
      
      const photoValue = userData[photoField] || userData.photo || userData.picture || '';
      console.log(`📸 Photo trouvée pour ${role}:`, photoValue);
      
      // Mettre à jour l'utilisateur avec les nouvelles données
      const updatedUser = { 
        ...currentUser, 
        ...userData,
        // S'assurer que tous les champs photo sont copiés
        profilePhoto: (role === Role.ADMIN || role === Role.TOURIST || role === Role.PARTNER) ? photoValue : userData.profilePhoto || (currentUser as any).profilePhoto,
        profilePicture: (role === Role.INVESTOR || role === Role.INTERNATIONAL_COMPANY) ? photoValue : userData.profilePicture || (currentUser as any).profilePicture,
        photoProfil: role === Role.LOCAL_PARTNER ? photoValue : userData.photoProfil || (currentUser as any).photoProfil,
        photo: photoValue || userData.photo || (currentUser as any).photo,
        picture: photoValue || userData.picture || (currentUser as any).picture
      };
      
      // Sauvegarder
      localStorage.setItem('current_user', JSON.stringify(updatedUser));
      this.currentUserSubject.next(updatedUser);
      
      console.log('✅ Profil rafraîchi - photo:', photoValue);
      return updatedUser;
    } catch (error) {
      console.error('❌ Erreur refresh profil:', error);
      return null;
    }
  }

  /**
   * Obtenir l'URL de la photo de profil
   */
  getProfilePhotoUrl(): string | null {
    const user = this.getCurrentUser();
    if (!user) return null;
    
    // Essayer tous les champs possibles
    return (user as any).profilePhoto || 
           (user as any).profilePicture || 
           (user as any).photo || 
           (user as any).photoProfil || 
           (user as any).picture || 
           null;
  }

  /**
   * Forcer la mise à jour de l'utilisateur courant
   */
  forceUpdate(): void {
    const user = this.getCurrentUser();
    if (user) {
      this.currentUserSubject.next({...user});
      console.log('✅ Mise à jour forcée de l\'utilisateur');
    }
  }

  // ========================================
  // ✅ MÉTHODES POUR LA SUPPRESSION DE COMPTE
  // ========================================

  /**
   * Supprimer son propre compte (pour tous les utilisateurs)
   * @param password Mot de passe pour confirmation
   */
  deleteOwnAccount(password: string): Observable<any> {
    const token = this.getToken();
    const role = this.getUserRole();
    
    if (!token || !role) {
      return throwError(() => new Error('Non authentifié'));
    }

    // Déterminer l'endpoint selon le rôle
    let endpoint = '';
    switch (role) {
      case Role.ADMIN:
        endpoint = `${this.API_URL}/admin/delete-account`;
        break;
      case Role.TOURIST:
        endpoint = `${this.API_URL}/touristes/delete-account`;
        break;
      case Role.INVESTOR:
        endpoint = `${this.API_URL}/auth/delete-account`;
        break;
      case Role.PARTNER:
        endpoint = `${this.API_URL}/partenaires-economiques/delete-account`;
        break;
      case Role.LOCAL_PARTNER:
        endpoint = `${this.API_URL}/partenaires-locaux/delete-account`;
        break;
      case Role.INTERNATIONAL_COMPANY:
        endpoint = `${this.API_URL}/international-companies/delete-account`;
        break;
      default:
        return throwError(() => new Error('Rôle non supporté'));
    }

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json');

    return this.http.delete(endpoint, {
      headers,
      body: { password }
    }).pipe(
      tap(response => {
        console.log('✅ Compte supprimé avec succès', response);
        // Déconnecter l'utilisateur après suppression
        this.clearSession();
      }),
      catchError(err => {
        console.error('❌ Erreur suppression compte:', err);
        const msg = err.error?.error || err.error?.message || 'Erreur lors de la suppression';
        return throwError(() => new Error(msg));
      })
    );
  }

  /**
   * Supprimer un compte utilisateur (par l'admin uniquement)
   * @param userEmail Email de l'utilisateur à supprimer
   * @param userType Type d'utilisateur (optionnel)
   */
  deleteUserByAdmin(userEmail: string, userType?: string): Observable<any> {
    const token = this.getToken();
    
    if (!token) {
      return throwError(() => new Error('Non authentifié'));
    }

    // Vérifier que l'utilisateur connecté est admin
    const userRole = this.getUserRole();
    if (userRole !== Role.ADMIN) {
      return throwError(() => new Error('Accès non autorisé. Seul un admin peut supprimer des comptes.'));
    }

    // Construire l'endpoint avec ou sans type
    let endpoint = '';
    if (userType) {
      endpoint = `${this.API_URL}/admin/delete-user/${userType}/${userEmail}`;
    } else {
      endpoint = `${this.API_URL}/admin/delete-user/${userEmail}`;
    }

    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json');

    return this.http.delete(endpoint, { headers }).pipe(
      tap(response => {
        console.log('✅ Compte utilisateur supprimé par admin:', response);
      }),
      catchError(err => {
        console.error('❌ Erreur suppression par admin:', err);
        const msg = err.error?.error || err.error?.message || 'Erreur lors de la suppression';
        return throwError(() => new Error(msg));
      })
    );
  }

  /**
   * Récupérer la liste des utilisateurs (pour l'admin)
   */
  getAllUsers(): Observable<any[]> {
    const token = this.getToken();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    // Vérifier que l'utilisateur connecté est admin
    const userRole = this.getUserRole();
    if (userRole !== Role.ADMIN) {
      return throwError(() => new Error('Accès non autorisé'));
    }
    
    // Note: Vous devrez implémenter cet endpoint dans votre backend
    return this.http.get<any[]>(`${this.API_URL}/admin/users`, { headers }).pipe(
      tap(users => console.log('✅ Utilisateurs chargés:', users.length)),
      catchError(err => {
        console.error('❌ Erreur chargement utilisateurs:', err);
        // En attendant l'implémentation backend, retourner un tableau vide
        return throwError(() => new Error('Erreur chargement utilisateurs'));
      })
    );
  }
}