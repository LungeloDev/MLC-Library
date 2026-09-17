import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { User } from '@angular/fire/auth';

import { Book } from '../../core/models/books.model';
import { Borrowing } from '../../core/models/borrowings.model';
import { LibraryDataService } from '../../core/services/library-data.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {

  // =========================================================
  // AUTHENTICATION
  // =========================================================

  currentUser: User | null = null;

  // =========================================================
  // DASHBOARD STATE
  // =========================================================

  searchTerm = '';

  showBookDialog = false;
  showLendDialog = false;
  isEditingBook = false;

  selectedBook: Book | null = null;

  books: Book[] = [];
  borrowings: Borrowing[] = [];

  // =========================================================
  // FORMS
  // =========================================================

  bookForm: Omit<Book, 'id'> = {
    number: '',
    title: '',
    author: '',
    genre: '',
    quantity: 1,
    availableQuantity: 1
  };

  lendForm = {
    borrowerName: '',
    borrowerPhone: '',
    borrowerEmail: '',
    issueDate: this.getToday(),
    dueDate: this.getDateAfterDays(14)
  };

  // =========================================================
  // CONSTRUCTOR
  // =========================================================

  constructor(
    private libraryDataService: LibraryDataService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  // =========================================================
  // INITIALISATION
  // =========================================================

  ngOnInit(): void {

    // -------------------------------------------------------
    // BOOKS - FIRESTORE REAL-TIME LISTENER
    // -------------------------------------------------------

    this.libraryDataService
      .getBooks()
      .subscribe({
        next: (books) => {

          this.books = books;

          // Firebase may emit outside Angular's
          // change-detection cycle.
          //
          // Force the UI to immediately reflect
          // the new Firestore state.
          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            'Error loading books:',
            error
          );
        }
      });

    // -------------------------------------------------------
    // BORROWINGS - FIRESTORE REAL-TIME LISTENER
    // -------------------------------------------------------

    this.libraryDataService
      .getBorrowings()
      .subscribe({
        next: (borrowings) => {

          this.borrowings = borrowings;

          // Immediately update:
          // - Active Borrowings
          // - Lent Out
          // - Overdue count
          // - Availability related UI
          this.cdr.detectChanges();
        },

        error: (error) => {

          console.error(
            'Error loading borrowings:',
            error
          );
        }
      });

    // -------------------------------------------------------
    // FIREBASE AUTHENTICATION STATE
    // -------------------------------------------------------

    this.authService
      .user$
      .subscribe((user) => {

        this.currentUser = user;

        // Immediately switch the UI between:
        //
        // Public catalogue
        //       ↕
        // Administrator dashboard
        this.cdr.detectChanges();
      });
  }

  // =========================================================
  // AUTHENTICATION
  // =========================================================

  get isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  goToLogin(): void {

    this.router.navigate([
      '/login'
    ]);
  }

  async logout(): Promise<void> {

    try {

      await this.authService.logout();

      this.currentUser = null;

      this.cdr.detectChanges();

    } catch (error) {

      console.error(
        'Logout failed:',
        error
      );

      alert(
        'Could not log out. Please try again.'
      );
    }
  }

  // =========================================================
  // SEARCH
  // =========================================================

  get filteredBooks(): Book[] {

    const term =
      this.searchTerm
        .trim()
        .toLowerCase();

    if (!term) {
      return this.books;
    }

    return this.books.filter(
      (book) =>
        book.number
          .toLowerCase()
          .includes(term) ||

        book.title
          .toLowerCase()
          .includes(term) ||

        book.author
          .toLowerCase()
          .includes(term) ||

        book.genre
          .toLowerCase()
          .includes(term)
    );
  }

  // =========================================================
  // DASHBOARD STATISTICS
  // =========================================================

  get activeBorrowings(): Borrowing[] {

    return this.borrowings.filter(
      (borrowing) =>
        !borrowing.returned
    );
  }

  get totalTitles(): number {
    return this.books.length;
  }

  get totalCopies(): number {

    return this.books.reduce(
      (sum, book) =>
        sum +
        Number(
          book.quantity || 0
        ),
      0
    );
  }

  get availableCopies(): number {

    return this.books.reduce(
      (sum, book) =>
        sum +
        Number(
          book.availableQuantity || 0
        ),
      0
    );
  }

  get lentOutCount(): number {

    return this.books.reduce(
      (sum, book) =>
        sum +
        (
          Number(
            book.quantity || 0
          ) -
          Number(
            book.availableQuantity || 0
          )
        ),
      0
    );
  }

  get overdueCount(): number {

    return this.activeBorrowings.filter(
      (borrowing) =>
        this.isOverdue(
          borrowing.dueDate
        )
    ).length;
  }

  // =========================================================
  // ADD BOOK
  // =========================================================

  openAddBookDialog(): void {

    if (!this.isLoggedIn) {

      this.goToLogin();

      return;
    }

    this.isEditingBook = false;
    this.selectedBook = null;

    this.bookForm = {
      number: '',
      title: '',
      author: '',
      genre: '',
      quantity: 1,
      availableQuantity: 1
    };

    this.showBookDialog = true;
  }

  // =========================================================
  // EDIT BOOK
  // =========================================================

  openEditBookDialog(
    book: Book
  ): void {

    if (!this.isLoggedIn) {
      return;
    }

    this.isEditingBook = true;
    this.selectedBook = book;

    this.bookForm = {

      number:
        book.number,

      title:
        book.title,

      author:
        book.author,

      genre:
        book.genre,

      quantity:
        book.quantity,

      availableQuantity:
        book.availableQuantity
    };

    this.showBookDialog = true;
  }

  closeBookDialog(): void {

    this.showBookDialog = false;
    this.selectedBook = null;
  }

  // =========================================================
  // SAVE BOOK
  // =========================================================

  async saveBook(): Promise<void> {

    if (!this.isLoggedIn) {
      return;
    }

    const cleanedBook = {

      number:
        this.bookForm
          .number
          .trim(),

      title:
        this.bookForm
          .title
          .trim(),

      author:
        this.bookForm
          .author
          .trim(),

      genre:
        this.bookForm
          .genre
          .trim(),

      quantity:
        Number(
          this.bookForm.quantity
        ),

      availableQuantity:
        Number(
          this.bookForm.availableQuantity
        )
    };

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (
      !cleanedBook.number ||
      !cleanedBook.title ||
      !cleanedBook.author ||
      !cleanedBook.genre
    ) {

      alert(
        'Please complete all required book fields.'
      );

      return;
    }

    if (
      cleanedBook.quantity < 1
    ) {

      alert(
        'Quantity must be at least 1.'
      );

      return;
    }

    if (
      cleanedBook.availableQuantity < 0
    ) {

      alert(
        'Available quantity cannot be less than 0.'
      );

      return;
    }

    if (
      cleanedBook.availableQuantity >
      cleanedBook.quantity
    ) {

      cleanedBook.availableQuantity =
        cleanedBook.quantity;
    }

    // -------------------------------------------------------
    // SAVE TO FIRESTORE
    // -------------------------------------------------------

    try {

      if (
        this.isEditingBook &&
        this.selectedBook
      ) {

        await this.libraryDataService
          .updateBook({
            id: this.selectedBook.id,
            ...cleanedBook
          });

      } else {

        await this.libraryDataService
          .addBook(
            cleanedBook
          );
      }

      // No manual refresh required.
      //
      // Firestore listener receives the new state,
      // updates this.books and calls detectChanges().

      this.closeBookDialog();

    } catch (error) {

      console.error(
        'Error saving book:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Could not save this book.'
      );
    }
  }

  // =========================================================
  // DELETE BOOK
  // =========================================================

  async deleteBook(
    book: Book
  ): Promise<void> {

    if (!this.isLoggedIn) {
      return;
    }

    const confirmed =
      confirm(
        `Delete "${book.title}" from the library catalogue?`
      );

    if (!confirmed) {
      return;
    }

    try {

      await this.libraryDataService
        .deleteBook(
          book.id
        );

      // Firestore listener receives the deletion
      // and immediately updates the UI.

    } catch (error) {

      console.error(
        'Error deleting book:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Could not delete this book.'
      );
    }
  }

  // =========================================================
  // LEND BOOK
  // =========================================================

  openLendDialog(
    book: Book
  ): void {

    if (!this.isLoggedIn) {
      return;
    }

    if (
      book.availableQuantity <= 0
    ) {

      alert(
        'This book is currently out of stock.'
      );

      return;
    }

    this.selectedBook = book;

    this.lendForm = {

      borrowerName: '',

      borrowerPhone: '',

      borrowerEmail: '',

      issueDate:
        this.getToday(),

      dueDate:
        this.getDateAfterDays(14)
    };

    this.showLendDialog = true;
  }

  closeLendDialog(): void {

    this.showLendDialog = false;
    this.selectedBook = null;
  }

  async lendBook(): Promise<void> {

    if (!this.isLoggedIn) {
      return;
    }

    if (!this.selectedBook) {
      return;
    }

    const cleanedLendForm = {

      borrowerName:
        this.lendForm
          .borrowerName
          .trim(),

      borrowerPhone:
        this.lendForm
          .borrowerPhone
          .trim(),

      borrowerEmail:
        this.lendForm
          .borrowerEmail
          .trim(),

      issueDate:
        this.lendForm.issueDate,

      dueDate:
        this.lendForm.dueDate
    };

    // -------------------------------------------------------
    // VALIDATION
    // -------------------------------------------------------

    if (
      !cleanedLendForm.borrowerName ||
      !cleanedLendForm.issueDate ||
      !cleanedLendForm.dueDate
    ) {

      alert(
        'Please capture borrower name, issue date, and due date.'
      );

      return;
    }

    if (
      cleanedLendForm.dueDate <
      cleanedLendForm.issueDate
    ) {

      alert(
        'Due date cannot be before the issue date.'
      );

      return;
    }

    // -------------------------------------------------------
    // LEND BOOK
    // -------------------------------------------------------

    try {

      await this.libraryDataService
        .lendBook(
          this.selectedBook,
          cleanedLendForm
        );

      // Firestore will emit:
      //
      // books change
      // borrowings change
      //
      // Both listeners call detectChanges(),
      // therefore the dashboard immediately updates.

      this.closeLendDialog();

    } catch (error) {

      console.error(
        'Error lending book:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Could not lend this book.'
      );
    }
  }

  // =========================================================
  // RETURN BOOK
  // =========================================================

  async returnBook(
    borrowing: Borrowing
  ): Promise<void> {

    if (!this.isLoggedIn) {
      return;
    }

    const confirmed =
      confirm(
        `Mark "${borrowing.bookTitle}" as returned?`
      );

    if (!confirmed) {
      return;
    }

    try {

      await this.libraryDataService
        .returnBook(
          borrowing
        );

      // Firestore updates:
      //
      // borrowing.returned = true
      //
      // book.availableQuantity + 1
      //
      // The real-time listeners immediately
      // repaint the UI.

    } catch (error) {

      console.error(
        'Error returning book:',
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : 'Could not return this book.'
      );
    }
  }

  // =========================================================
  // BOOK STATUS
  // =========================================================

  getBookStatus(
    book: Book
  ): 'available' | 'low' | 'out' {

    if (
      book.availableQuantity === 0
    ) {

      return 'out';
    }

    if (
      book.availableQuantity <=
      Math.max(
        1,
        Math.floor(
          book.quantity / 2
        )
      )
    ) {

      return 'low';
    }

    return 'available';
  }

  // =========================================================
  // OVERDUE CHECK
  // =========================================================

  isOverdue(
    dueDate: string
  ): boolean {

    const today =
      new Date();

    const due =
      new Date(
        dueDate
      );

    today.setHours(
      0,
      0,
      0,
      0
    );

    due.setHours(
      0,
      0,
      0,
      0
    );

    return due < today;
  }

  // =========================================================
  // DATE HELPERS
  // =========================================================

  private getToday(): string {

    return new Date()
      .toISOString()
      .split('T')[0];
  }

  private getDateAfterDays(
    days: number
  ): string {

    const date =
      new Date();

    date.setDate(
      date.getDate() + days
    );

    return date
      .toISOString()
      .split('T')[0];
  }
}