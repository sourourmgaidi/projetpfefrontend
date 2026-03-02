import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClientModule, HttpClient, HttpHeaders } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth';
import { UserProfile } from '../../shared/models/profile.model';
import { Role } from '../../shared/models/user.model';

interface CountryCode {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

interface ActivityOption {
  value: string;
  label: string;
  category: string;
}

// Interface pour nationalité
interface Nationality {
  code: string;
  name: string;
}

// Interface pour région (comme dans register.ts)
interface Region {
  value: string;
  label: string;
  governorate: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {
  @ViewChild('fileInput') fileInput!: ElementRef;

  Role = Role;
  profile: UserProfile | null = null;
  editData: any = {};
  loading = true;
  saving = false;
  uploadingPhoto = false;
  error = '';
  success = '';
  isEditing = false;
  isEditingEmail = false;
  userRole: string = '';
  phoneNumber: string = '';
  selectedCountryCode: string = '+216';
  phoneError: string = '';
  newEmail: string = '';
  emailError: string = '';
  
  // Propriétés pour la photo
  selectedFile: File | null = null;
  photoPreview: string | null = null;

  // Propriétés pour la suppression de compte
  showDeleteModal: boolean = false;
  deletePassword: string = '';
  deleteError: string = '';
  deleting: boolean = false;

  // Liste des codes pays
  countryCodes: CountryCode[] = [
    { code: 'TN', name: 'Tunisia', dialCode: '+216', flag: '🇹🇳' },
    { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
    { code: 'DZ', name: 'Algeria', dialCode: '+213', flag: '🇩🇿' },
    { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦' },
    { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
    { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
    { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
    { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
    { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
    { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
    { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
    { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  ];

  // Liste des pays (pour Country of Origin)
  countries: { name: string, flag: string }[] = [
    { name: 'Tunisia', flag: '🇹🇳' },
    { name: 'France', flag: '🇫🇷' },
    { name: 'Algeria', flag: '🇩🇿' },
    { name: 'Morocco', flag: '🇲🇦' },
    { name: 'United States', flag: '🇺🇸' },
    { name: 'United Kingdom', flag: '🇬🇧' },
    { name: 'Germany', flag: '🇩🇪' },
    { name: 'Italy', flag: '🇮🇹' },
    { name: 'Spain', flag: '🇪🇸' },
    { name: 'Canada', flag: '🇨🇦' },
    { name: 'Australia', flag: '🇦🇺' },
  ];

  // Liste des secteurs d'activité
  activitySectors: ActivityOption[] = [
    // Tourism
    { value: 'HOTEL', label: 'Hotel', category: 'Tourism' },
    { value: 'GUEST_HOUSE', label: 'Guest House', category: 'Tourism' },
    { value: 'TRAVEL_AGENCY', label: 'Travel Agency', category: 'Tourism' },
    { value: 'TOUR_GUIDE', label: 'Tour Guide', category: 'Tourism' },
    { value: 'TRANSPORT', label: 'Transport', category: 'Tourism' },
    { value: 'RESTAURANT', label: 'Restaurant', category: 'Tourism' },
    { value: 'CRAFTS', label: 'Crafts', category: 'Tourism' },
    
    // Investment
    { value: 'AGRICULTURE', label: 'Agriculture', category: 'Investment' },
    { value: 'AGRI_FOOD', label: 'Agri-food', category: 'Investment' },
    { value: 'INDUSTRY', label: 'Industry', category: 'Investment' },
    { value: 'MANUFACTURING', label: 'Manufacturing', category: 'Investment' },
    { value: 'TEXTILE', label: 'Textile', category: 'Investment' },
    { value: 'ENERGY', label: 'Energy', category: 'Investment' },
    { value: 'RENEWABLE_ENERGY', label: 'Renewable Energy', category: 'Investment' },
    { value: 'TECHNOLOGY', label: 'Technology', category: 'Investment' },
    { value: 'IT', label: 'IT Services', category: 'Investment' },
    { value: 'REAL_ESTATE', label: 'Real Estate', category: 'Investment' },
    { value: 'CONSTRUCTION', label: 'Construction', category: 'Investment' },
    { value: 'TRADE', label: 'Trade', category: 'Investment' },
    { value: 'SERVICES', label: 'Services', category: 'Investment' },
    
    // Other
    { value: 'OTHER', label: 'Other', category: 'Other' }
  ];

  // Liste des nationalités (comme dans register.ts)
  nationalities: Nationality[] = [
    { code: 'TN', name: 'Tunisian' },
    { code: 'FR', name: 'French' },
    { code: 'DZ', name: 'Algerian' },
    { code: 'MA', name: 'Moroccan' },
    { code: 'LY', name: 'Libyan' },
    { code: 'EG', name: 'Egyptian' },
    { code: 'SA', name: 'Saudi' },
    { code: 'AE', name: 'Emirati' },
    { code: 'QA', name: 'Qatari' },
    { code: 'KW', name: 'Kuwaiti' },
    { code: 'US', name: 'American' },
    { code: 'GB', name: 'British' },
    { code: 'DE', name: 'German' },
    { code: 'IT', name: 'Italian' },
    { code: 'ES', name: 'Spanish' },
    { code: 'BE', name: 'Belgian' },
    { code: 'CH', name: 'Swiss' },
    { code: 'NL', name: 'Dutch' },
    { code: 'SE', name: 'Swedish' },
    { code: 'NO', name: 'Norwegian' },
    { code: 'DK', name: 'Danish' },
    { code: 'FI', name: 'Finnish' },
    { code: 'RU', name: 'Russian' },
    { code: 'CN', name: 'Chinese' },
    { code: 'JP', name: 'Japanese' },
    { code: 'KR', name: 'South Korean' },
    { code: 'IN', name: 'Indian' },
    { code: 'BR', name: 'Brazilian' },
    { code: 'CA', name: 'Canadian' },
    { code: 'AU', name: 'Australian' },
  ];

  // ✅ Liste des régions de Tunisie (comme dans register.ts)
  tunisianRegions: Region[] = [
    { value: 'TUNIS', label: 'Tunis', governorate: 'Tunis' },
    { value: 'ARIANA', label: 'Ariana', governorate: 'Ariana' },
    { value: 'BEN_AROUS', label: 'Ben Arous', governorate: 'Ben Arous' },
    { value: 'MANOUBA', label: 'Manouba', governorate: 'Manouba' },
    { value: 'NABEUL', label: 'Nabeul', governorate: 'Nabeul' },
    { value: 'ZAGHOUAN', label: 'Zaghouan', governorate: 'Zaghouan' },
    { value: 'BIZERTE', label: 'Bizerte', governorate: 'Bizerte' },
    { value: 'BEJA', label: 'Béja', governorate: 'Béja' },
    { value: 'JENDOUBA', label: 'Jendouba', governorate: 'Jendouba' },
    { value: 'KEF', label: 'Le Kef', governorate: 'Le Kef' },
    { value: 'SILIANA', label: 'Siliana', governorate: 'Siliana' },
    { value: 'SOUSSE', label: 'Sousse', governorate: 'Sousse' },
    { value: 'MONASTIR', label: 'Monastir', governorate: 'Monastir' },
    { value: 'MAHDIA', label: 'Mahdia', governorate: 'Mahdia' },
    { value: 'KAIROUAN', label: 'Kairouan', governorate: 'Kairouan' },
    { value: 'KASSERINE', label: 'Kasserine', governorate: 'Kasserine' },
    { value: 'SIDI_BOUZID', label: 'Sidi Bouzid', governorate: 'Sidi Bouzid' },
    { value: 'GAFSA', label: 'Gafsa', governorate: 'Gafsa' },
    { value: 'TOZEUR', label: 'Tozeur', governorate: 'Tozeur' },
    { value: 'KEBILI', label: 'Kebili', governorate: 'Kebili' },
    { value: 'GABES', label: 'Gabès', governorate: 'Gabès' },
    { value: 'MEDENINE', label: 'Médenine', governorate: 'Médenine' },
    { value: 'TATAOUINE', label: 'Tataouine', governorate: 'Tataouine' },
    { value: 'DOUZ', label: 'Douz', governorate: 'Kebili' },
    { value: 'HAMMAMET', label: 'Hammamet', governorate: 'Nabeul' },
    { value: 'DJERBA', label: 'Djerba', governorate: 'Médenine' },
    { value: 'ZARZIS', label: 'Zarzis', governorate: 'Médenine' },
  ];

  // URLs des endpoints par rôle
  private profileEndpoints: { [key: string]: { get: string, put: string } } = {
    [Role.ADMIN]: {
      get: 'http://localhost:8089/api/admin/profile',
      put: 'http://localhost:8089/api/admin/profile'
    },
    [Role.TOURIST]: {
      get: 'http://localhost:8089/api/touristes/profile',
      put: 'http://localhost:8089/api/touristes/profile'
    },
    [Role.INVESTOR]: {
      get: 'http://localhost:8089/api/auth/me',
      put: 'http://localhost:8089/api/auth/update'
    },
    [Role.PARTNER]: {
      get: 'http://localhost:8089/api/partenaires-economiques/profile',
      put: 'http://localhost:8089/api/partenaires-economiques/profile'
    },
    [Role.LOCAL_PARTNER]: {
      get: 'http://localhost:8089/api/partenaires-locaux/profile',
      put: 'http://localhost:8089/api/partenaires-locaux/profile'
    },
    [Role.INTERNATIONAL_COMPANY]: {
      get: 'http://localhost:8089/api/international-companies/profile',
      put: 'http://localhost:8089/api/international-companies/profile'
    },
  };

  private photoUploadUrl = 'http://localhost:8089/api/upload/profile-photo';

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.userRole = this.authService.getUserRole() || '';
    console.log('🔑 User role:', this.userRole);
    this.loadProfile();
  }

  goBack(): void {
    this.router.navigate([this.getDashboardUrl()]);
  }

  private getDashboardUrl(): string {
    switch (this.userRole) {
      case Role.ADMIN: return '/admin/dashboard';
      case Role.TOURIST: return '/touriste/dashboard';
      case Role.INVESTOR: return '/investisseur/dashboard';
      case Role.PARTNER: return '/partenaire-economique/dashboard';
      case Role.LOCAL_PARTNER: return '/partenaire-local/dashboard';
      case Role.INTERNATIONAL_COMPANY: return '/societe-international/dashboard';
      default: return '/';
    }
  }

  async loadProfile() {
    this.loading = true;
    
    const token = this.authService.getToken();
    if (!token) {
      this.error = 'Not authenticated';
      this.loading = false;
      return;
    }

    try {
      const endpoint = this.getProfileEndpoint();
      const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
      
      const response: any = await lastValueFrom(
        this.http.get(endpoint, { headers })
      );

      console.log('✅ Profile data from server:', response);
      
      this.profile = this.mapResponseToProfile(response);
      console.log('✅ Mapped profile:', this.profile);
      
      if (this.profile?.phone) {
        this.phoneNumber = this.profile.phone.replace(/[^0-9]/g, '');
      }
      
      // Initialiser la prévisualisation de la photo
      if (this.profile?.photo) {
        this.photoPreview = this.profile.photo;
      }
      
    } catch (error: any) {
      console.error('❌ Error loading profile:', error);
      this.error = error.error?.message || 'Failed to load profile';
    } finally {
      this.loading = false;
    }
  }

  private getProfileEndpoint(): string {
    return this.profileEndpoints[this.userRole]?.get || '';
  }

  private getUpdateEndpoint(): string {
    return this.profileEndpoints[this.userRole]?.put || '';
  }

  private mapResponseToProfile(response: any): UserProfile {
    // Structure de base pour tous les rôles
    const base: UserProfile = {
      id: response.id || 0,
      email: response.email || '',
      firstName: response.firstName || response.prenom || '',
      lastName: response.lastName || response.nom || '',
      phone: response.phone || response.telephone || '',
     photo: response.profilePicture || response.photo || response.profilePhoto || response.photoProfil || '',
      role: this.userRole,
      registrationDate: response.registrationDate || response.dateInscription || new Date().toISOString(),
      isActive: response.active ?? true,
    };

    // Ajouter les champs spécifiques selon le rôle
    switch (this.userRole) {
      case Role.INVESTOR:
        return {
          ...base,
          companyName: response.company || response.companyName || '',
          originCountry: response.originCountry || response.paysOrigine || '',
          activitySector: response.activitySector || response.secteurActivite || '',
          website: response.website || response.siteWeb || '',
          linkedinProfile: response.linkedinProfile || '',
          nationality: response.nationality || '',
        };
        
      case Role.PARTNER:
        return {
          ...base,
          originCountry: response.countryOfOrigin || response.paysOrigine || '',
          activitySector: response.businessSector || response.secteurActivite || '',
          headquartersAddress: response.headquartersAddress || response.adresse || '',
          website: response.website || response.siteWeb || '',
          linkedinProfile: response.linkedinProfile || '',
        };
        
      case Role.LOCAL_PARTNER:
        return {
          ...base,
          // Téléphone (backend utilise "telephone")
          phone: response.telephone || response.phone || base.phone,
          
          // Site web (backend utilise "siteWeb")
          website: response.siteWeb || response.website || base.website,
          
          // Secteur d'activité (backend utilise "domaineActivite")
          activitySector: response.domaineActivite || response.activitySector || '',
          
          // ✅ Région (prendre le nom ou le label)
          region: response.region || '',
          
          // Adresse (backend utilise "adresse")
          address: response.adresse || response.address || '',
          
          // Documents
          businessRegistrationNumber: response.numeroRegistreCommerce || response.businessRegistrationNumber || '',
          professionalTaxNumber: response.taxeProfessionnelle || response.professionalTaxNumber || '',
          
          // LinkedIn
          linkedinProfile: response.linkedinProfile || '',
        };
        
      case Role.INTERNATIONAL_COMPANY:
      return {
    ...base,
    // ✅ Prénom et nom du contact (depuis contactFirstName/contactLastName)
    firstName: response.contactFirstName || response.firstName || response.prenom || base.firstName,
    lastName: response.contactLastName || response.lastName || response.nom || base.lastName,
    
    // ✅ Nom de l'entreprise
    companyName: response.companyName || '',
    
    // ✅ Pays d'origine
    originCountry: response.originCountry || response.paysOrigine || '',
    
    // ✅ Secteur d'activité (depuis activitySector)
    activitySector: response.activitySector || '',
    
    // ✅ SIRET
    siret: response.siret || '',
    
    // ✅ Site web
    website: response.website || response.siteWeb || '',
    
    // ✅ LinkedIn
    linkedinProfile: response.linkedinProfile || '',
  };
        
      case Role.TOURIST:
        return {
          ...base,
          nationality: response.nationality || response.nationalite || '',
          photo: response.profilePhoto || response.photo || response.profilePicture || base.photo,
        };
        
      default:
        return base;
    }
  }

  getInitials(): string {
    if (!this.profile) return '?';
    const first = this.profile.firstName?.charAt(0) || '';
    const last = this.profile.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || this.profile.email.charAt(0).toUpperCase();
  }

  getActivityCategories(): string[] {
    const categories = new Set(this.activitySectors.map(s => s.category));
    return Array.from(categories);
  }

  getSectorsByCategory(category: string): ActivityOption[] {
    return this.activitySectors.filter(s => s.category === category);
  }

  // ========================================
  // MÉTHODES POUR LA PHOTO
  // ========================================
  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.match(/image\/(jpeg|png|jpg|gif)/)) {
      this.error = 'Please select a valid image file (JPEG, PNG, JPG, GIF)';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.error = 'Image size should not exceed 5MB';
      return;
    }

    this.selectedFile = file;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.photoPreview = e.target.result;
    };
    reader.readAsDataURL(file);
    
    this.error = '';
  }

async uploadPhoto() {
  if (!this.selectedFile || !this.profile) return;

  this.uploadingPhoto = true;
  this.error = '';
  this.success = '';

  const token = this.authService.getToken();
  if (!token) {
    this.error = 'Non authentifié';
    this.uploadingPhoto = false;
    return;
  }

  const formData = new FormData();
  formData.append('fichier', this.selectedFile);

  try {
    const uploadEndpoint = 'http://localhost:8089/api/upload/profile-photo';
    
    console.log('📤 Upload vers:', uploadEndpoint);
    console.log('📤 Fichier:', this.selectedFile.name);

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    // 1. Upload de la photo
    const response: any = await lastValueFrom(
      this.http.post(uploadEndpoint, formData, { headers })
    );

    console.log('✅ Réponse upload:', response);
    
    // Récupérer l'URL de la photo
    const photoUrl = response.photoUrl;
    console.log('📸 URL photo reçue:', photoUrl);
    
    // 2. Mettre à jour le profil local
    if (this.profile) {
      this.profile.photo = photoUrl;
    }
    
    // 3. Mettre à jour dans AuthService
    this.authService.updateProfilePhoto(photoUrl);
    
    // 4. Mettre à jour la prévisualisation
    this.photoPreview = photoUrl;
    
    // 5. ✅ CRUCIAL: Sauvegarder la photo dans la base de données
    await this.savePhotoToDatabase(photoUrl);
    
    // 6. ✅ Forcer un rafraîchissement final
    await this.authService.refreshUserProfile();
    await this.loadProfile();
    
    this.success = 'Photo mise à jour avec succès';
    this.selectedFile = null;
    
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    
  } catch (error: any) {
    console.error('❌ Erreur upload photo:', error);
    this.error = error.error?.erreur || 'Échec de l\'upload de la photo';
  } finally {
    this.uploadingPhoto = false;
  }
}
// ========================================
// SAUVEGARDER LA PHOTO DANS LA BASE DE DONNÉES
// ========================================
async savePhotoToDatabase(photoUrl: string) {
  try {
    const token = this.authService.getToken();
    const endpoint = this.getUpdateEndpoint();
    
    const headers = new HttpHeaders()
      .set('Authorization', `Bearer ${token}`)
      .set('Content-Type', 'application/json');

    // Déterminer le nom du champ photo selon le rôle
    let photoField = '';
    let updateData: any = {};
    
    switch (this.userRole) {
      case Role.INVESTOR:
        photoField = 'profilePicture';
        break;
      case Role.PARTNER:
        photoField = 'profilePhoto';
        break;
      case Role.LOCAL_PARTNER:
        photoField = 'photoProfil';
        break;
      case Role.INTERNATIONAL_COMPANY:
        photoField = 'profilePicture';
        break;
      case Role.TOURIST:
        photoField = 'profilePhoto';
        break;
      case Role.ADMIN:
        photoField = 'profilePhoto';
        break;
      default:
        photoField = 'photo';
    }
    
    updateData[photoField] = photoUrl;
    
    console.log(`📤 Sauvegarde en base: ${photoField} = ${photoUrl}`);
    
    const response: any = await lastValueFrom(
      this.http.put(endpoint, updateData, { headers })
    );
    
    console.log('✅ Photo sauvegardée en base:', response);
    
    // Forcer le rafraîchissement du profil
    await this.forceReloadProfile();
    
    return response;
    
  } catch (error) {
    console.error('❌ Erreur sauvegarde base:', error);
    throw error;
  }
}
// ========================================
// FORCER LE RECHARGEMENT DU PROFIL
// ========================================
async forceReloadProfile() {
  console.log('🔄 Force reload profile...');
  
  const token = this.authService.getToken();
  if (!token) {
    console.error('❌ Pas de token');
    return;
  }

  try {
    const endpoint = this.getProfileEndpoint();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    const response: any = await lastValueFrom(
      this.http.get(endpoint, { headers })
    );

    console.log('✅ Force reload - Données brutes:', response);
    
    // ✅ Afficher tous les champs photo
    console.log('📸 Champs photo dans réponse:', {
      profilePicture: response.profilePicture,
      photo: response.photo,
      profilePhoto: response.profilePhoto,
      photoProfil: response.photoProfil,
      picture: response.picture
    });
    
    // ✅ Sauvegarder l'ancienne photo
    const oldPhoto = this.profile?.photo;
    
    // ✅ Mapper la réponse
    this.profile = this.mapResponseToProfile(response);
    
    console.log('📸 Ancienne photo:', oldPhoto);
    console.log('📸 Nouvelle photo:', this.profile?.photo);
    
    if (this.profile?.phone) {
      this.phoneNumber = this.profile.phone.replace(/[^0-9]/g, '');
    }
    
    // ✅ Mettre à jour la prévisualisation
    if (this.profile?.photo) {
      this.photoPreview = this.profile.photo;
    }
    
    // ✅ Mettre à jour AuthService
    this.authService.updateProfilePhoto(this.profile?.photo || '');
    this.authService.forceUpdate();
    
  } catch (error: any) {
    console.error('❌ Erreur force reload:', error);
  }
}
// Ajoutez aussi cette méthode pour tester
async testPhotoInBackend() {
  const token = this.authService.getToken();
  if (!token) return;
  
  try {
    const endpoint = this.getProfileEndpoint();
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    const response: any = await lastValueFrom(
      this.http.get(endpoint, { headers })
    );
    
    console.log('🔍 TEST - Réponse brute:', response);
    console.log('📸 Photos:', {
      profilePicture: response.profilePicture,
      photo: response.photo,
      profilePhoto: response.profilePhoto,
      photoProfil: response.photoProfil
    });
    
    alert('Vérifiez la console (F12)');
    
  } catch (error) {
    console.error('❌ Erreur test:', error);
  }
}

  removePhoto() {
    this.selectedFile = null;
    this.photoPreview = this.profile?.photo || null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // ========================================
  // GESTION DE L'EMAIL
  // ========================================
  toggleEmailEdit() {
    if (!this.isEditingEmail) {
      this.newEmail = this.profile?.email || '';
    }
    this.isEditingEmail = !this.isEditingEmail;
    this.emailError = '';
  }

  cancelEmailEdit() {
    this.isEditingEmail = false;
    this.newEmail = '';
    this.emailError = '';
  }

  validateGmail(email: string): boolean {
    if (!email) return false;
    const domain = email.substring(email.indexOf('@') + 1).toLowerCase();
    const gmailDomains = ['gmail.com', 'googlemail.com', 'gmail.fr', 'gmail.co.uk'];
    return gmailDomains.includes(domain);
  }

  validateEmail(): boolean {
    if (!this.newEmail || this.newEmail.trim() === '') {
      this.emailError = 'Email is required';
      return false;
    }
    
    if (!this.validateGmail(this.newEmail)) {
      this.emailError = 'Only Gmail addresses are allowed';
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newEmail)) {
      this.emailError = 'Invalid email format';
      return false;
    }
    
    this.emailError = '';
    return true;
  }

  async saveEmail() {
    if (!this.validateEmail()) {
      this.error = this.emailError;
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';

    const token = this.authService.getToken();
    if (!token) {
      this.error = 'Not authenticated';
      this.saving = false;
      return;
    }

    try {
      const endpoint = this.getUpdateEndpoint();
      const headers = new HttpHeaders()
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json');

      const updateData = { email: this.newEmail };

      const response: any = await lastValueFrom(
        this.http.put(endpoint, updateData, { headers })
      );

      console.log('✅ Email updated:', response);
      
      this.success = 'Email updated successfully. Please login again.';
      
      setTimeout(() => {
        this.authService.logout();
        this.router.navigate(['/login']);
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Error updating email:', error);
      this.error = error.error?.message || 'Failed to update email';
    } finally {
      this.saving = false;
      this.isEditingEmail = false;
    }
  }

  // ========================================
  // GESTION DU TÉLÉPHONE
  // ========================================
  validatePhoneNumber(): boolean {
    if (!this.phoneNumber || this.phoneNumber.trim() === '') {
      this.phoneError = 'Phone number is required';
      return false;
    }
    
    const digitsOnly = this.phoneNumber.replace(/\D/g, '');
    
    if (digitsOnly.length === 0) {
      this.phoneError = 'Phone number must contain only digits';
      return false;
    }
    
    if (digitsOnly.length < 8) {
      this.phoneError = 'Phone number must have at least 8 digits';
      return false;
    }
    
    if (digitsOnly.length > 15) {
      this.phoneError = 'Phone number must not exceed 15 digits';
      return false;
    }
    
    this.phoneError = '';
    return true;
  }

  updatePhoneNumber(): void {
    if (this.phoneNumber) {
      const digitsOnly = this.phoneNumber.replace(/\D/g, '');
      this.editData.phone = this.selectedCountryCode + digitsOnly;
      this.phoneNumber = digitsOnly;
      this.validatePhoneNumber();
    } else {
      this.editData.phone = '';
    }
  }

  onPhoneInput(event: any): void {
    const input = event.target;
    input.value = input.value.replace(/[^0-9]/g, '');
    this.phoneNumber = input.value;
    this.updatePhoneNumber();
  }

  // ========================================
  // GESTION DU PROFIL
  // ========================================
  toggleEdit() {
    if (!this.isEditing) {
      this.editData = {
        firstName: this.profile?.firstName,
        lastName: this.profile?.lastName,
        phone: this.profile?.phone,
      };

      switch (this.userRole) {
        case Role.INVESTOR:
          this.editData.companyName = this.profile?.companyName;
          this.editData.originCountry = this.profile?.originCountry;
          this.editData.activitySector = this.profile?.activitySector;
          this.editData.website = this.profile?.website;
          this.editData.linkedinProfile = this.profile?.linkedinProfile;
          this.editData.nationality = this.profile?.nationality;
          break;
        case Role.PARTNER:
          this.editData.originCountry = this.profile?.originCountry;
          this.editData.activitySector = this.profile?.activitySector;
          this.editData.headquartersAddress = this.profile?.headquartersAddress;
          this.editData.website = this.profile?.website;
          this.editData.linkedinProfile = this.profile?.linkedinProfile;
          break;
        case Role.LOCAL_PARTNER:
          this.editData.activitySector = this.profile?.activitySector;
          this.editData.region = this.profile?.region;
          this.editData.address = this.profile?.address;
          this.editData.website = this.profile?.website;
          this.editData.businessRegistrationNumber = this.profile?.businessRegistrationNumber;
          this.editData.professionalTaxNumber = this.profile?.professionalTaxNumber;
          this.editData.linkedinProfile = this.profile?.linkedinProfile;
          break;
        case Role.INTERNATIONAL_COMPANY:
          this.editData.companyName = this.profile?.companyName;
          this.editData.originCountry = this.profile?.originCountry;
          this.editData.siret = this.profile?.siret;
          this.editData.website = this.profile?.website;
          this.editData.linkedinProfile = this.profile?.linkedinProfile;
          break;
        case Role.TOURIST:
          this.editData.nationality = this.profile?.nationality;
          break;
      }
      
      if (this.editData.phone) {
        this.phoneNumber = this.editData.phone.replace(/[^0-9]/g, '');
      }
    }
    this.isEditing = !this.isEditing;
  }

  cancelEdit() {
    this.isEditing = false;
    this.editData = {};
    this.phoneNumber = '';
    this.phoneError = '';
    this.error = '';
    this.success = '';
  }

 prepareUpdateData(): any {
  const updateData: any = {};

  // ✅ CORRECTION CRUCIALE: "telephone" au lieu de "phone" pour le backend
  if (this.editData.firstName !== this.profile?.firstName) {
    updateData.firstName = this.editData.firstName;
  }
  if (this.editData.lastName !== this.profile?.lastName) {
    updateData.lastName = this.editData.lastName;
  }
  
  // ✅ MODIFICATION POUR LE TOURISTE - Gestion du téléphone selon le rôle
  if (this.editData.phone !== this.profile?.phone) {
    if (this.userRole === Role.LOCAL_PARTNER) {
      // Pour LOCAL_PARTNER seulement, le backend attend "telephone"
      updateData.telephone = this.editData.phone;
    } else {
      // Pour TOURIST et tous les autres rôles, le backend attend "phone"
      updateData.phone = this.editData.phone;
    }
  }

  switch (this.userRole) {
    case Role.INVESTOR:
      if (this.editData.companyName !== this.profile?.companyName) {
        updateData.company = this.editData.companyName;
      }
      if (this.editData.originCountry !== this.profile?.originCountry) {
        updateData.originCountry = this.editData.originCountry;
      }
      if (this.editData.activitySector !== this.profile?.activitySector) {
        updateData.activitySector = this.editData.activitySector;
      }
      if (this.editData.website !== this.profile?.website) {
        updateData.website = this.editData.website;
      }
      if (this.editData.linkedinProfile !== this.profile?.linkedinProfile) {
        updateData.linkedinProfile = this.editData.linkedinProfile;
      }
      if (this.editData.nationality !== this.profile?.nationality) {
        updateData.nationality = this.editData.nationality;
      }
      break;

    case Role.PARTNER:
      if (this.editData.originCountry !== this.profile?.originCountry) {
        updateData.countryOfOrigin = this.editData.originCountry;
      }
      if (this.editData.activitySector !== this.profile?.activitySector) {
        updateData.businessSector = this.editData.activitySector;
      }
      if (this.editData.headquartersAddress !== this.profile?.headquartersAddress) {
        updateData.headquartersAddress = this.editData.headquartersAddress;
      }
      if (this.editData.website !== this.profile?.website) {
        updateData.website = this.editData.website;
      }
      if (this.editData.linkedinProfile !== this.profile?.linkedinProfile) {
        updateData.linkedinProfile = this.editData.linkedinProfile;
      }
      break;

    case Role.LOCAL_PARTNER:
      if (this.editData.activitySector !== this.profile?.activitySector) {
        updateData.domaineActivite = this.editData.activitySector;
      }
      if (this.editData.region !== this.profile?.region) {
        // ✅ Envoyer la valeur de la région (le label ou le nom)
        updateData.region = this.editData.region;
      }
      if (this.editData.address !== this.profile?.address) {
        updateData.adresse = this.editData.address;
      }
      if (this.editData.website !== this.profile?.website) {
        updateData.siteWeb = this.editData.website;
      }
      if (this.editData.businessRegistrationNumber !== this.profile?.businessRegistrationNumber) {
        updateData.numeroRegistreCommerce = this.editData.businessRegistrationNumber;
      }
      if (this.editData.professionalTaxNumber !== this.profile?.professionalTaxNumber) {
        updateData.taxeProfessionnelle = this.editData.professionalTaxNumber;
      }
      if (this.editData.linkedinProfile !== this.profile?.linkedinProfile) {
        updateData.linkedinProfile = this.editData.linkedinProfile;
      }
      break;

    case Role.INTERNATIONAL_COMPANY:
      if (this.editData.firstName !== this.profile?.firstName) {
    updateData.contactFirstName = this.editData.firstName;
  }
  if (this.editData.lastName !== this.profile?.lastName) {
    updateData.contactLastName = this.editData.lastName;
  }
        if (this.editData.companyName !== this.profile?.companyName) {
          updateData.companyName = this.editData.companyName;
        }
        if (this.editData.originCountry !== this.profile?.originCountry) {
          updateData.originCountry = this.editData.originCountry;
        }
         if (this.editData.siret !== this.profile?.siret) {
        updateData.siret = this.editData.siret;
        console.log(' SIRET modifié - ancien:', this.profile?.siret, 'nouveau:', this.editData.siret);
      }
        if (this.editData.website !== this.profile?.website) {
          updateData.website = this.editData.website;
        }
        if (this.editData.linkedinProfile !== this.profile?.linkedinProfile) {
          updateData.linkedinProfile = this.editData.linkedinProfile;
        }
        break;

    case Role.TOURIST:
      if (this.editData.nationality !== this.profile?.nationality) {
        updateData.nationality = this.editData.nationality;
      }
      // ✅ Le téléphone est déjà géré dans la partie commune avec "phone"
      break;
  }

  return updateData;
}

  async saveProfile() {
  
    if (!this.validatePhoneNumber()) {
      this.error = this.phoneError;
      return;
    }

    this.saving = true;
    this.error = '';
    this.success = '';

    const token = this.authService.getToken();
    if (!token) {
      this.error = 'Not authenticated';
      this.saving = false;
      return;
    }

    const updateData = this.prepareUpdateData();
    
    if (Object.keys(updateData).length === 0) {
      this.isEditing = false;
      this.saving = false;
      return;
    }

    try {
      const endpoint = this.getUpdateEndpoint();
      const headers = new HttpHeaders()
        .set('Authorization', `Bearer ${token}`)
        .set('Content-Type', 'application/json');

      const response: any = await lastValueFrom(
        this.http.put(endpoint, updateData, { headers })
      );

      console.log('✅ Profile updated:', response);
      
      await this.loadProfile();
      this.success = 'Profile updated successfully';
      this.isEditing = false;
      
    } catch (error: any) {
      console.error('❌ Error updating profile:', error);
      this.error = error.error?.message || 'Failed to update profile';
    } finally {
      this.saving = false;
    }
  }

  // ========================================
  // SUPPRESSION DE COMPTE
  // ========================================
  openDeleteModal() {
    this.showDeleteModal = true;
    this.deletePassword = '';
    this.deleteError = '';
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.deletePassword = '';
    this.deleteError = '';
  }

  async confirmDelete() {
    if (!this.deletePassword) {
      this.deleteError = 'Password is required';
      return;
    }

    this.deleting = true;
    this.deleteError = '';

    try {
      const result = await this.authService.deleteOwnAccount(this.deletePassword).toPromise();
      console.log('✅ Account deleted:', result);
      
      this.success = 'Your account has been deleted. Redirecting...';
      this.closeDeleteModal();
      
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 2000);
      
    } catch (error: any) {
      console.error('❌ Error deleting account:', error);
      this.deleteError = error.message || 'Failed to delete account';
    } finally {
      this.deleting = false;
    }
  }


  // ========================================
  // CHANGEMENT DE MOT DE PASSE
  // ========================================

  showPasswordModal: boolean = false;
  oldPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  passwordError: string = '';
  changingPassword: boolean = false;

  openPasswordModal() {
    this.showPasswordModal = true;
    this.oldPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.passwordError = '';
  }

  closePasswordModal() {
    this.showPasswordModal = false;
    this.oldPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.passwordError = '';
    this.changingPassword = false;
  }

  validatePassword(): boolean {
    if (!this.oldPassword) {
      this.passwordError = 'L\'ancien mot de passe est requis';
      return false;
    }
    
    if (!this.newPassword) {
      this.passwordError = 'Le nouveau mot de passe est requis';
      return false;
    }
    
    if (this.newPassword.length < 6) {
      this.passwordError = 'Le nouveau mot de passe doit contenir au moins 6 caractères';
      return false;
    }
    
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError = 'Les mots de passe ne correspondent pas';
      return false;
    }
    
    this.passwordError = '';
    return true;
  }

  async changePassword() {
    if (!this.validatePassword()) {
      return;
    }

    this.changingPassword = true;
    this.passwordError = '';

    try {
      const response = await lastValueFrom(
        this.authService.changePassword(this.oldPassword, this.newPassword)
      );
      
      console.log('✅ Mot de passe changé:', response);
      this.success = 'Mot de passe changé avec succès';
      this.closePasswordModal();
      
    } catch (error: any) {
      console.error('❌ Erreur changement mot de passe:', error);
      this.passwordError = error.message || 'Erreur lors du changement de mot de passe';
    } finally {
      this.changingPassword = false;
    }
  }
    // ========================================
  // PROPRIÉTÉS POUR HIDE/SHOW PASSWORD
  // ========================================
  showOldPassword: boolean = false;
  showNewPassword: boolean = false;
  showConfirmPassword: boolean = false;

}