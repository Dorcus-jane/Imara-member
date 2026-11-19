# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*ReadData*](#readdata)
- [**Mutations**](#mutations)
  - [*CreateAll*](#createall)
  - [*UpdateAndDelete*](#updateanddelete)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## ReadData
You can execute the `ReadData` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
readData(options?: ExecuteQueryOptions): QueryPromise<ReadDataData, undefined>;

interface ReadDataRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ReadDataData, undefined>;
}
export const readDataRef: ReadDataRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
readData(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ReadDataData, undefined>;

interface ReadDataRef {
  ...
  (dc: DataConnect): QueryRef<ReadDataData, undefined>;
}
export const readDataRef: ReadDataRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the readDataRef:
```typescript
const name = readDataRef.operationName;
console.log(name);
```

### Variables
The `ReadData` query has no variables.
### Return Type
Recall that executing the `ReadData` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `ReadDataData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `ReadData`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, readData } from '@dataconnect/generated';


// Call the `readData()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await readData();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await readData(dataConnect);

console.log(data.authors);
console.log(data.books);
console.log(data.members);
console.log(data.loans);
console.log(data.author);
console.log(data.book);
console.log(data.member);
console.log(data.loan);

// Or, you can use the `Promise` API.
readData().then((response) => {
  const data = response.data;
  console.log(data.authors);
  console.log(data.books);
  console.log(data.members);
  console.log(data.loans);
  console.log(data.author);
  console.log(data.book);
  console.log(data.member);
  console.log(data.loan);
});
```

### Using `ReadData`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, readDataRef } from '@dataconnect/generated';


// Call the `readDataRef()` function to get a reference to the query.
const ref = readDataRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = readDataRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.authors);
console.log(data.books);
console.log(data.members);
console.log(data.loans);
console.log(data.author);
console.log(data.book);
console.log(data.member);
console.log(data.loan);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.authors);
  console.log(data.books);
  console.log(data.members);
  console.log(data.loans);
  console.log(data.author);
  console.log(data.book);
  console.log(data.member);
  console.log(data.loan);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## CreateAll
You can execute the `CreateAll` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createAll(): MutationPromise<CreateAllData, undefined>;

interface CreateAllRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<CreateAllData, undefined>;
}
export const createAllRef: CreateAllRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createAll(dc: DataConnect): MutationPromise<CreateAllData, undefined>;

interface CreateAllRef {
  ...
  (dc: DataConnect): MutationRef<CreateAllData, undefined>;
}
export const createAllRef: CreateAllRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createAllRef:
```typescript
const name = createAllRef.operationName;
console.log(name);
```

### Variables
The `CreateAll` mutation has no variables.
### Return Type
Recall that executing the `CreateAll` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateAllData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateAllData {
  author_insert: Author_Key;
  book_insert: Book_Key;
  member_insert: Member_Key;
  loan_insert: Loan_Key;
}
```
### Using `CreateAll`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createAll } from '@dataconnect/generated';


// Call the `createAll()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createAll();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createAll(dataConnect);

console.log(data.author_insert);
console.log(data.book_insert);
console.log(data.member_insert);
console.log(data.loan_insert);

// Or, you can use the `Promise` API.
createAll().then((response) => {
  const data = response.data;
  console.log(data.author_insert);
  console.log(data.book_insert);
  console.log(data.member_insert);
  console.log(data.loan_insert);
});
```

### Using `CreateAll`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createAllRef } from '@dataconnect/generated';


// Call the `createAllRef()` function to get a reference to the mutation.
const ref = createAllRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createAllRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.author_insert);
console.log(data.book_insert);
console.log(data.member_insert);
console.log(data.loan_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.author_insert);
  console.log(data.book_insert);
  console.log(data.member_insert);
  console.log(data.loan_insert);
});
```

## UpdateAndDelete
You can execute the `UpdateAndDelete` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
updateAndDelete(): MutationPromise<UpdateAndDeleteData, undefined>;

interface UpdateAndDeleteRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): MutationRef<UpdateAndDeleteData, undefined>;
}
export const updateAndDeleteRef: UpdateAndDeleteRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
updateAndDelete(dc: DataConnect): MutationPromise<UpdateAndDeleteData, undefined>;

interface UpdateAndDeleteRef {
  ...
  (dc: DataConnect): MutationRef<UpdateAndDeleteData, undefined>;
}
export const updateAndDeleteRef: UpdateAndDeleteRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the updateAndDeleteRef:
```typescript
const name = updateAndDeleteRef.operationName;
console.log(name);
```

### Variables
The `UpdateAndDelete` mutation has no variables.
### Return Type
Recall that executing the `UpdateAndDelete` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `UpdateAndDeleteData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
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
```
### Using `UpdateAndDelete`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, updateAndDelete } from '@dataconnect/generated';


// Call the `updateAndDelete()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await updateAndDelete();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await updateAndDelete(dataConnect);

console.log(data.author_update);
console.log(data.book_update);
console.log(data.member_update);
console.log(data.loan_update);
console.log(data.author_delete);
console.log(data.book_delete);
console.log(data.member_delete);
console.log(data.loan_delete);

// Or, you can use the `Promise` API.
updateAndDelete().then((response) => {
  const data = response.data;
  console.log(data.author_update);
  console.log(data.book_update);
  console.log(data.member_update);
  console.log(data.loan_update);
  console.log(data.author_delete);
  console.log(data.book_delete);
  console.log(data.member_delete);
  console.log(data.loan_delete);
});
```

### Using `UpdateAndDelete`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, updateAndDeleteRef } from '@dataconnect/generated';


// Call the `updateAndDeleteRef()` function to get a reference to the mutation.
const ref = updateAndDeleteRef();

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = updateAndDeleteRef(dataConnect);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.author_update);
console.log(data.book_update);
console.log(data.member_update);
console.log(data.loan_update);
console.log(data.author_delete);
console.log(data.book_delete);
console.log(data.member_delete);
console.log(data.loan_delete);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.author_update);
  console.log(data.book_update);
  console.log(data.member_update);
  console.log(data.loan_update);
  console.log(data.author_delete);
  console.log(data.book_delete);
  console.log(data.member_delete);
  console.log(data.loan_delete);
});
```

