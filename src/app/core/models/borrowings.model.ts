export interface Borrowing {
  id?: string;
  bookId: string;
  bookNumber: string;
  bookTitle: string;
  borrowerName: string;
  borrowerPhone?: string;
  borrowerEmail?: string;
  issueDate: string;
  dueDate: string;
  returned: boolean;
  returnedDate?: string | null;
  createdAt?: any;
  updatedAt?: any;
}