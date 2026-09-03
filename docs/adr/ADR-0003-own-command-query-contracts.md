# ADR-0003 — Command/Query Core Contract'ları Uygulamaya Aittir

**Status:** Accepted

## Decision
İlk sürümde domain/application modelini MediatR vb. bir kütüphaneye bağlamıyoruz.

Çok küçük `ICommand`, `IQuery`, `ICommandHandler`, `IQueryHandler` sözleşmeleri BuildingBlocks içinde tutulur.

## Consequence
Daha sonra mediator eklenmesi gerekirse adapter olarak eklenebilir.
İş use-case'leri üçüncü taraf abstraction'a bağımlı kalmaz.
