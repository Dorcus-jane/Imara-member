import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise, DataConnectSettings } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;
export const dataConnectSettings: DataConnectSettings;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface Author_Key {
  id: UUIDString;
  __typename?: 'Author_Key';
}

export interface Book_Key {
  id: UUIDString;
  __typename?: 'Book_Key';
}

export interface CreateAllData {
  author_insert: Author_Key;
  book_insert: Book_Key;
  member_insert: Member_Key;
  loan_insert: Loan_Key;
}

export interface Loan_Key {
  id: UUIDString;
  __typename?: 'Loan_Key';
}

export interface Member_Key {
  id: UUIDString;
  __typename?: 'Member_Key';
}

export interface ReadDataData {
  authors: ({
    name: string;
    bio?: string | null;
  })[];
  books: ({
    title: string;
    isbn: string;
  })[];
  members: ({
    firstName: string;
    lastName: string;
    email: string;
  })[];
  loans: ({
    loanDate: TimestampString;
    dueDate: TimestampString;
    returnDate?: TimestampString | null;
  })[];
  author?: {
    name: string;
  };
  book?: {
    title: string;
  };
  member?: {
    email: string;
  };
  loan?: {
    loanDate: TimestampString;
  };
}

export interface UpdateAndDeleteData {
  author_update?: Author_Key | null;
  book_update?: Book_Key | null;
  member_update?: Member_Key | null;
  loan_update?: Loan_Key | null;
  author_delete?: Author_Key | null;
  book_delete?: Book_Key | null;
  member_delete?: Member_Key | null;
  loan_delete?: Loan_Key | null;
}

interface CreateAllRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateAllData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<CreateAllData, undefined>;
  operationName: string;
}
export const createAllRef: CreateAllRef;

export function createAll(): MutationPromise<CreateAllData, undefined>;
export function createAll(dc: DataConnect): MutationPromise<CreateAllData, undefined>;

interface UpdateAndDeleteRef {
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpdateAndDeleteData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): MutationRef<UpdateAndDeleteData, undefined>;
  operationName: string;
}
export const updateAndDeleteRef: UpdateAndDeleteRef;

export function updateAndDelete(): MutationPromise<UpdateAndDeleteData, undefined>;
export function updateAndDelete(dc: DataConnect): MutationPromise<UpdateAndDeleteData, undefined>;

interface ReadDataRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ReadDataData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ReadDataData, undefined>;
  operationName: string;
}
export const readDataRef: ReadDataRef;

export function readData(options?: ExecuteQueryOptions): QueryPromise<ReadDataData, undefined>;
export function readData(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ReadDataData, undefined>;

