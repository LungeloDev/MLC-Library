import { Injectable } from '@angular/core';

import {
    Firestore,
    collection,
    collectionData,
    doc,
    setDoc,
    updateDoc,
    deleteDoc,
    increment,
    writeBatch
} from '@angular/fire/firestore';

import { Observable } from 'rxjs';

import { Book } from '../models/books.model';
import { Borrowing } from '../models/borrowings.model';

// Temporary import used only for initial database seeding
import appData from '../data/appData.json';

/**
 * Represents one row from the original church book JSON file.
 *
 * Original JSON structure:
 * {
 *   "No.": 1,
 *   "Book Title": "23 Minutes",
 *   "Author": "VANDE VELDE",
 *   "Gene": "Young Adult"
 * }
 */
interface RawBookRow {
    'No.': number | string | null;
    'Book Title': string | null;
    'Author': string | null;
    'Gene': string | null;
}

/**
 * appData.json has this structure:
 *
 * {
 *   "data": [...]
 * }
 */
interface AppData {
    data: RawBookRow[];
}

@Injectable({
    providedIn: 'root'
})
export class LibraryDataService {

    constructor(
        private firestore: Firestore
    ) { }

    // =========================================================
    // BOOKS
    // =========================================================

    /**
     * Get all books from Firestore.
     *
     * collectionData creates a real-time listener.
     * Whenever Firestore changes, the dashboard will receive
     * the latest book list automatically.
     */
    getBooks(): Observable<Book[]> {

        const booksRef = collection(
            this.firestore,
            'books'
        );

        return collectionData(
            booksRef,
            {
                idField: 'id'
            }
        ) as Observable<Book[]>;
    }

    // =========================================================
    // BORROWINGS
    // =========================================================

    /**
     * Get all borrowing records from Firestore.
     */
    getBorrowings(): Observable<Borrowing[]> {

        const borrowingsRef = collection(
            this.firestore,
            'borrowings'
        );

        return collectionData(
            borrowingsRef,
            {
                idField: 'id'
            }
        ) as Observable<Borrowing[]>;
    }

    // =========================================================
    // ADD BOOK
    // =========================================================

    async addBook(
        book: Omit<Book, 'id'>
    ): Promise<void> {

        const id = crypto.randomUUID();

        const bookRef = doc(
            this.firestore,
            `books/${id}`
        );

        const now = new Date().toISOString();

        await setDoc(
            bookRef,
            {
                ...book,

                createdAt: now,
                updatedAt: now
            }
        );
    }

    // =========================================================
    // UPDATE BOOK
    // =========================================================

    async updateBook(
        book: Book
    ): Promise<void> {

        const bookRef = doc(
            this.firestore,
            `books/${book.id}`
        );

        await updateDoc(
            bookRef,
            {
                number: book.number,
                title: book.title,
                author: book.author,
                genre: book.genre,
                quantity: book.quantity,
                availableQuantity: book.availableQuantity,

                updatedAt: new Date().toISOString()
            }
        );
    }

    // =========================================================
    // DELETE BOOK
    // =========================================================

    async deleteBook(
        bookId: string
    ): Promise<void> {

        const bookRef = doc(
            this.firestore,
            `books/${bookId}`
        );

        await deleteDoc(bookRef);
    }

    // =========================================================
    // LEND BOOK
    // =========================================================

    async lendBook(
        book: Book,

        payload: Pick<
            Borrowing,
            | 'borrowerName'
            | 'borrowerPhone'
            | 'borrowerEmail'
            | 'issueDate'
            | 'dueDate'
        >
    ): Promise<void> {

        if (book.availableQuantity <= 0) {

            throw new Error(
                'No available copies left for this book.'
            );
        }

        const borrowingId =
            crypto.randomUUID();

        const borrowingRef = doc(
            this.firestore,
            `borrowings/${borrowingId}`
        );

        const bookRef = doc(
            this.firestore,
            `books/${book.id}`
        );

        const now =
            new Date().toISOString();

        await setDoc(
            borrowingRef,
            {
                bookId: book.id,

                bookNumber: book.number,

                bookTitle: book.title,

                borrowerName:
                    payload.borrowerName,

                borrowerPhone:
                    payload.borrowerPhone,

                borrowerEmail:
                    payload.borrowerEmail,

                issueDate:
                    payload.issueDate,

                dueDate:
                    payload.dueDate,

                returned: false,

                createdAt: now,

                updatedAt: now
            }
        );

        /**
         * One copy is now unavailable.
         */
        await updateDoc(
            bookRef,
            {
                availableQuantity:
                    increment(-1),

                updatedAt:
                    new Date().toISOString()
            }
        );
    }

    // =========================================================
    // RETURN BOOK
    // =========================================================

    async returnBook(
        borrowing: Borrowing
    ): Promise<void> {

        const borrowingRef = doc(
            this.firestore,
            `borrowings/${borrowing.id}`
        );

        const bookRef = doc(
            this.firestore,
            `books/${borrowing.bookId}`
        );

        const now =
            new Date().toISOString();

        /**
         * Mark borrowing as returned.
         */
        await updateDoc(
            borrowingRef,
            {
                returned: true,

                returnedDate: now,

                updatedAt: now
            }
        );

        /**
         * Make the copy available again.
         */
        await updateDoc(
            bookRef,
            {
                availableQuantity:
                    increment(1),

                updatedAt:
                    now
            }
        );
    }

    // =========================================================
    // TEMPORARY DATABASE SEEDER
    // =========================================================

    /**
     * Imports all books from appData.json into Firestore.
     *
     * IMPORTANT:
     * Run this only once.
     *
     * After the database has been successfully seeded,
     * we will remove this method and the appData import.
     */
    async seedBooks(): Promise<number> {

        const source =
            appData as AppData;

        if (
            !source.data ||
            !Array.isArray(source.data)
        ) {

            throw new Error(
                'appData.json does not contain a valid data array.'
            );
        }

        /**
         * Ignore rows without a book title.
         */
        const validBooks =
            source.data.filter(
                (row) =>
                    String(
                        row['Book Title'] ?? ''
                    ).trim().length > 0
            );

        if (validBooks.length === 0) {

            throw new Error(
                'No valid books were found in appData.json.'
            );
        }

        /**
         * Firestore batch writes have a write limit,
         * so we process the catalogue in smaller groups.
         */
        const batchSize = 400;

        let importedCount = 0;

        for (
            let startIndex = 0;
            startIndex < validBooks.length;
            startIndex += batchSize
        ) {

            const batch =
                writeBatch(this.firestore);

            const currentBatch =
                validBooks.slice(
                    startIndex,
                    startIndex + batchSize
                );

            currentBatch.forEach(
                (row) => {

                    /**
                     * doc(collection(...)) without an ID
                     * asks Firestore to generate a unique ID.
                     */
                    const bookRef = doc(
                        collection(
                            this.firestore,
                            'books'
                        )
                    );

                    const now =
                        new Date().toISOString();

                    const book = {

                        number: String(
                            row['No.'] ?? ''
                        ).trim(),

                        title: String(
                            row['Book Title'] ?? ''
                        ).trim(),

                        author:
                            String(
                                row['Author'] ?? ''
                            ).trim() ||
                            'Unknown',

                        genre:
                            String(
                                row['Gene'] ?? ''
                            ).trim() ||
                            'Uncategorised',

                        /**
                         * Original spreadsheet does not contain
                         * quantity information.
                         *
                         * Therefore every catalogue entry begins
                         * with one copy.
                         */
                        quantity: 1,

                        availableQuantity: 1,

                        createdAt: now,

                        updatedAt: now
                    };

                    batch.set(
                        bookRef,
                        book
                    );
                }
            );

            /**
             * Send this batch to Firestore.
             */
            await batch.commit();

            importedCount +=
                currentBatch.length;

            console.log(
                `Seed progress: ${importedCount}/${validBooks.length} books`
            );
        }

        console.log(
            `Database seed complete. ${importedCount} books imported.`
        );

        return importedCount;
    }
}