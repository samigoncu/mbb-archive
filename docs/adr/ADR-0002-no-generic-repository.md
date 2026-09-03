# ADR-0002 — Generic Repository Varsayılan Değildir

**Status:** Accepted

## Decision
`IRepository<T>` genel abstraction'ı kullanılmayacaktır.

Aggregate-specific repository veya read-model query tercih edilir.

## Rationale
Generic repository iş dilini zayıflatır ve domain davranışının application service'lere kaçmasını kolaylaştırır.
