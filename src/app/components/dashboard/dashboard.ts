import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Book } from '../../core/models/books.model';
import { Borrowing } from '../../core/models/borrowings.model';
import { LibraryDataService } from '../../core/services/library-data.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  searchTerm = '';

  showBookDialog = false;
  showLendDialog = false;
  isEditingBook = false;

  selectedBook: Book | null = null;

  books: Book[] = [];
  borrowings: Borrowing[] = [];

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

  constructor(private libraryDataService: LibraryDataService) { }

  ngOnInit(): void {
    this.refreshData();
  }

  get filteredBooks(): Book[] {
    const term = this.searchTerm.trim().toLowerCase();

    if (!term) {
      return this.books;
    }

    return this.books.filter((book) =>
      book.number.toLowerCase().includes(term) ||
      book.title.toLowerCase().includes(term) ||
      book.author.toLowerCase().includes(term) ||
      book.genre.toLowerCase().includes(term)
    );
  }

  // Getters for statistics
  get activeBorrowings(): Borrowing[] {
    return this.borrowings.filter((borrowing) => !borrowing.returned);
  }

  get totalTitles(): number {
    return this.books.length;
  }

  get totalCopies(): number {
    return this.books.reduce((sum, book) => sum + Number(book.quantity || 0), 0);
  }

  get availableCopies(): number {
    return this.books.reduce((sum, book) => sum + Number(book.availableQuantity || 0), 0);
  }

  get lentOutCount(): number {
    return this.books.reduce(
      (sum, book) => sum + (Number(book.quantity || 0) - Number(book.availableQuantity || 0)),
      0
    );
  }

  get overdueCount(): number {
    return this.activeBorrowings.filter((borrowing) => this.isOverdue(borrowing.dueDate)).length;
  }

  openAddBookDialog(): void {
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

  openEditBookDialog(book: Book): void {
    this.isEditingBook = true;
    this.selectedBook = book;

    this.bookForm = {
      number: book.number,
      title: book.title,
      author: book.author,
      genre: book.genre,
      quantity: book.quantity,
      availableQuantity: book.availableQuantity
    };

    this.showBookDialog = true;
  }

  closeBookDialog(): void {
    this.showBookDialog = false;
    this.selectedBook = null;
  }

  saveBook(): void {
    const cleanedBook = {
      number: this.bookForm.number.trim(),
      title: this.bookForm.title.trim(),
      author: this.bookForm.author.trim(),
      genre: this.bookForm.genre.trim(),
      quantity: Number(this.bookForm.quantity),
      availableQuantity: Number(this.bookForm.availableQuantity)
    };

    if (!cleanedBook.number || !cleanedBook.title || !cleanedBook.author || !cleanedBook.genre) {
      alert('Please complete all required book fields.');
      return;
    }

    if (cleanedBook.quantity < 1) {
      alert('Quantity must be at least 1.');
      return;
    }

    if (cleanedBook.availableQuantity < 0) {
      alert('Available quantity cannot be less than 0.');
      return;
    }

    if (cleanedBook.availableQuantity > cleanedBook.quantity) {
      cleanedBook.availableQuantity = cleanedBook.quantity;
    }

    if (this.isEditingBook && this.selectedBook) {
      this.libraryDataService.updateBook({
        id: this.selectedBook.id,
        ...cleanedBook
      });
    } else {
      this.libraryDataService.addBook(cleanedBook);
    }

    this.refreshData();
    this.closeBookDialog();
  }

  deleteBook(book: Book): void {
    const confirmed = confirm(`Delete "${book.title}" from the library catalogue?`);

    if (!confirmed) {
      return;
    }

    try {
      this.libraryDataService.deleteBook(book.id);
      this.refreshData();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not delete this book.');
    }
  }

  openLendDialog(book: Book): void {
    if (book.availableQuantity <= 0) {
      alert('This book is currently out of stock.');
      return;
    }

    this.selectedBook = book;

    this.lendForm = {
      borrowerName: '',
      borrowerPhone: '',
      borrowerEmail: '',
      issueDate: this.getToday(),
      dueDate: this.getDateAfterDays(14)
    };

    this.showLendDialog = true;
  }

  closeLendDialog(): void {
    this.showLendDialog = false;
    this.selectedBook = null;
  }

  lendBook(): void {
    if (!this.selectedBook) {
      return;
    }

    const cleanedLendForm = {
      borrowerName: this.lendForm.borrowerName.trim(),
      borrowerPhone: this.lendForm.borrowerPhone.trim(),
      borrowerEmail: this.lendForm.borrowerEmail.trim(),
      issueDate: this.lendForm.issueDate,
      dueDate: this.lendForm.dueDate
    };

    if (!cleanedLendForm.borrowerName || !cleanedLendForm.issueDate || !cleanedLendForm.dueDate) {
      alert('Please capture borrower name, issue date, and due date.');
      return;
    }

    if (cleanedLendForm.dueDate < cleanedLendForm.issueDate) {
      alert('Due date cannot be before the issue date.');
      return;
    }

    try {
      this.libraryDataService.lendBook(this.selectedBook.id, cleanedLendForm);
      this.refreshData();
      this.closeLendDialog();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Could not lend this book.');
    }
  }

  returnBook(borrowing: Borrowing): void {
    const confirmed = confirm(`Mark "${borrowing.bookTitle}" as returned?`);

    if (!confirmed) {
      return;
    }

    this.libraryDataService.returnBook(borrowing.id!);
    this.refreshData();
  }

  getBookStatus(book: Book): 'available' | 'low' | 'out' {
    if (book.availableQuantity === 0) {
      return 'out';
    }

    if (book.availableQuantity <= Math.max(1, Math.floor(book.quantity / 2))) {
      return 'low';
    }

    return 'available';
  }

  isOverdue(dueDate: string): boolean {
    const today = new Date();
    const due = new Date(dueDate);

    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);

    return due < today;
  }

  private refreshData(): void {
    this.books = this.libraryDataService.getBooks();
    this.borrowings = this.libraryDataService.getBorrowings();
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getDateAfterDays(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }
}