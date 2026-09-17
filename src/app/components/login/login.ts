import { CommonModule } from '@angular/common';
import {
  ChangeDetectorRef,
  Component
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import {
  Router,
  RouterLink
} from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  // =========================================================
  // LOGIN STATE
  // =========================================================

  username = 'Midrand Lutheran Church';
  password = '';

  loading = false;
  errorMessage = '';

  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  // =========================================================
  // LOGIN
  // =========================================================

  async login(): Promise<void> {

    // Clear any previous error
    this.errorMessage = '';

    if (
      !this.username.trim() ||
      !this.password
    ) {

      this.errorMessage =
        'Please enter your username and password.';

      this.cdr.detectChanges();

      return;
    }

    // Show loading state immediately
    this.loading = true;

    this.cdr.detectChanges();

    try {

      await this.authService.login(
        this.username,
        this.password
      );

      // Successful login
      await this.router.navigate([
        '/'
      ]);

    } catch (error) {

      console.error(
        'Login failed:',
        error
      );

      this.errorMessage =
        error instanceof Error
          ? error.message
          : 'Login failed.';

      // Firebase authentication completed outside
      // Angular's normal change-detection cycle.
      //
      // Immediately display the error message.
      this.cdr.detectChanges();

    } finally {

      this.loading = false;

      // Immediately update the button from
      // "Signing in..." back to "Login".
      this.cdr.detectChanges();
    }
  }
}