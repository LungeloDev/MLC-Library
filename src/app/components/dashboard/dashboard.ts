import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Book {
  id: number;
  number: string;
  title: string;
  author: string;
  genre: string;
  quantity: number;
  availableQuantity: number;
}

interface Borrowing {
  id: number;
  bookId: number;
  bookTitle: string;
  borrowerName: string;
  borrowerPhone: string;
  borrowerEmail: string;
  issueDate: string;
  dueDate: string;
  returned: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  searchTerm = '';

  showBookDialog = false;
  showLendDialog = false;
  isEditingBook = false;

  selectedBook: Book | null = null;

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

  books: Book[] = [
    {
      id: 1,
      number: '1',
      title: '23 Minutes',
      author: 'Vande Velde',
      genre: 'Young Adult',
      quantity: 1,
      availableQuantity: 1
    },
    {
      id: 2,
      number: '2',
      title: 'About David',
      author: 'Shawn Bold',
      genre: 'General',
      quantity: 1,
      availableQuantity: 1
    },
    {
      id: 3,
      number: '3',
      title: 'A Class Apart',
      author: 'Susan Lewis',
      genre: 'Fiction',
      quantity: 2,
      availableQuantity: 1
    },
    {
      id: 4,
      number: '4',
      title: 'Animals',
      author: 'Various',
      genre: 'Reference',
      quantity: 3,
      availableQuantity: 3
    },
    {
      id: 5,
      number: '5',
      title: 'Amazing Grace',
      author: 'Unknown',
      genre: 'Christian',
      quantity: 2,
      availableQuantity: 0
    }
  ];

  borrowings: Borrowing[] = [
    {
      id: 1,
      bookId: 5,
      bookTitle: 'Amazing Grace',
      borrowerName: 'Nomsa Dlamini',
      borrowerPhone: '072 456 9981',
      borrowerEmail: 'nomsa@email.com',
      issueDate: '2026-03-10',
      dueDate: '2026-03-17',
      returned: false
    },
    {
      id: 2,
      bookId: 3,
      bookTitle: 'A Class Apart',
      borrowerName: 'Thabo Mokoena',
      borrowerPhone: '071 222 3344',
      borrowerEmail: 'thabo@email.com',
      issueDate: '2026-03-18',
      dueDate: '2026-04-01',
      returned: false
    }
  ];

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

  get activeBorrowings(): Borrowing[] {
    return this.borrowings.filter((item) => !item.returned);
  }

  get totalTitles(): number {
    return this.books.length;
  }

  get totalCopies(): number {
    return this.books.reduce((sum, book) => sum + book.quantity, 0);
  }

  get availableCopies(): number {
    return this.books.reduce((sum, book) => sum + book.availableQuantity, 0);
  }

  get lentOutCount(): number {
    return this.books.reduce((sum, book) => sum + (book.quantity - book.availableQuantity), 0);
  }

  get overdueCount(): number {
    return this.activeBorrowings.filter((item) => this.isOverdue(item.dueDate)).length;
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
  }

  saveBook(): void {
    if (!this.bookForm.number || !this.bookForm.title || !this.bookForm.author || !this.bookForm.genre) {
      return;
    }

    if (this.bookForm.availableQuantity > this.bookForm.quantity) {
      this.bookForm.availableQuantity = this.bookForm.quantity;
    }

    if (this.isEditingBook && this.selectedBook) {
      this.books = this.books.map((book) =>
        book.id === this.selectedBook!.id
          ? {
              ...book,
              ...this.bookForm
            }
          : book
      );
    } else {
      const newBook: Book = {
        id: Date.now(),
        ...this.bookForm
      };

      this.books = [newBook, ...this.books];
    }

    this.closeBookDialog();
  }

  deleteBook(book: Book): void {
    const hasActiveBorrowing = this.activeBorrowings.some((item) => item.bookId === book.id);

    if (hasActiveBorrowing) {
      alert('This book cannot be deleted because it is currently lent out.');
      return;
    }

    this.books = this.books.filter((item) => item.id !== book.id);
  }

  openLendDialog(book: Book): void {
    if (book.availableQuantity <= 0) {
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
  }

  lendBook(): void {
    if (!this.selectedBook) {
      return;
    }

    if (!this.lendForm.borrowerName || !this.lendForm.issueDate || !this.lendForm.dueDate) {
      return;
    }

    const borrowing: Borrowing = {
      id: Date.now(),
      bookId: this.selectedBook.id,
      bookTitle: this.selectedBook.title,
      borrowerName: this.lendForm.borrowerName,
      borrowerPhone: this.lendForm.borrowerPhone,
      borrowerEmail: this.lendForm.borrowerEmail,
      issueDate: this.lendForm.issueDate,
      dueDate: this.lendForm.dueDate,
      returned: false
    };

    this.borrowings = [borrowing, ...this.borrowings];
    this.books = this.books.map((book) =>
      book.id === this.selectedBook!.id
        ? {
            ...book,
            availableQuantity: Math.max(book.availableQuantity - 1, 0)
          }
        : book
    );

    this.closeLendDialog();
  }

  returnBook(borrowing: Borrowing): void {
    this.borrowings = this.borrowings.map((item) =>
      item.id === borrowing.id
        ? {
            ...item,
            returned: true
          }
        : item
    );

    this.books = this.books.map((book) =>
      book.id === borrowing.bookId
        ? {
            ...book,
            availableQuantity: Math.min(book.availableQuantity + 1, book.quantity)
          }
        : book
    );
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

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  private getDateAfterDays(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }
}