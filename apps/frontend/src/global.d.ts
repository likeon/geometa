import '@tanstack/table-core';

declare module '@tanstack/table-core' {
  interface ColumnMeta<_TData, _TValue> {
    class?: string;
    preventRowClick?: boolean;
  }
}
