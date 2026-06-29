import { Injectable } from '@angular/core';
import { Book } from '../models/books.model';
import { Borrowing } from '../models/borrowings.model';
import appData from '../data/appData.json';

interface RawBookRow {
    'No.': number | string;
    'Book Title': string | null;
    'Author': string | null;
    'Gene': string | null;
}

@Injectable({
    providedIn: 'root'
})
export class LibraryDataService {
    private books: Book[] = [];
    private borrowings: Borrowing[] = [];

    constructor() {
        this.books = this.mapBooks((appData as { data: RawBookRow[] }).data);
    }

    getBooks(): Book[] {
        return [...this.books];
    }

    getBorrowings(): Borrowing[] {
        return [...this.borrowings];
    }

    addBook(book: Omit<Book, 'id'>): void {
        const newBook: Book = {
            id: crypto.randomUUID(),
            ...book
        };

        this.books = [newBook, ...this.books];
    }

    updateBook(updatedBook: Book): void {
        this.books = this.books.map((book) =>
            book.id === updatedBook.id ? { ...updatedBook } : book
        );
    }

    deleteBook(bookId: string): void {
        const hasActiveBorrowing = this.borrowings.some(
            (item) => item.bookId === bookId && !item.returned
        );

        if (hasActiveBorrowing) {
            throw new Error('This book cannot be deleted because it is currently lent out.');
        }

        this.books = this.books.filter((book) => book.id !== bookId);
    }

    lendBook(
        bookId: string,
        payload: Pick<
            Borrowing,
            'borrowerName' | 'borrowerPhone' | 'borrowerEmail' | 'issueDate' | 'dueDate'
        >
    ): void {
        const selectedBook = this.books.find((book) => book.id === bookId);

        if (!selectedBook) {
            throw new Error('Book not found.');
        }

        if (selectedBook.availableQuantity <= 0) {
            throw new Error('No available copies left for this book.');
        }

        const newBorrowing: Borrowing = {
            id: crypto.randomUUID(),
            bookId: selectedBook.id,
            bookTitle: selectedBook.title,
            bookNumber: selectedBook.number,
            borrowerName: payload.borrowerName,
            borrowerPhone: payload.borrowerPhone,
            borrowerEmail: payload.borrowerEmail,
            issueDate: payload.issueDate,
            dueDate: payload.dueDate,
            returned: false
        };

        this.borrowings = [newBorrowing, ...this.borrowings];

        this.books = this.books.map((book) =>
            book.id === selectedBook.id
                ? {
                    ...book,
                    availableQuantity: Math.max(book.availableQuantity - 1, 0)
                }
                : book
        );
    }

    returnBook(borrowingId: string): void {
        const borrowing = this.borrowings.find((item) => item.id === borrowingId);

        if (!borrowing || borrowing.returned) {
            return;
        }

        this.borrowings = this.borrowings.map((item) =>
            item.id === borrowingId
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

    private mapBooks(rows: RawBookRow[]): Book[] {
        return rows
            .filter((row) => row['Book Title'])
            .map((row, index) => ({
                id: `book-${index + 1}`,
                number: String(row['No.'] ?? index + 1),
                title: this.cleanText(row['Book Title']),
                author: this.cleanText(row['Author']) || 'Unknown',
                genre: this.cleanText(row['Gene']) || 'Uncategorised',
                quantity: 1,
                availableQuantity: 1
            }));
    }

    private cleanText(value: string | null | undefined): string {
        return String(value ?? '').trim();
    }
}