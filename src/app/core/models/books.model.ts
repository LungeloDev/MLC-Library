export interface Book {
  id?: string;
  number: string;
  title: string;
  author: string;
  genre: string;
  quantity: number;
  availableQuantity: number;
  createdAt?: any;
  updatedAt?: any;
}