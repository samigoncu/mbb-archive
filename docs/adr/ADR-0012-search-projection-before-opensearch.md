# ADR-0012 — PostgreSQL Search Projection Before OpenSearch
**Status:** Accepted

OpenSearch kaynak sistem değildir. Search bounded context eventlerle kendi PostgreSQL projection'ını oluşturur. OpenSearch bu projection'dan yeniden üretilebilir bir index'tir.

Bu karar; cluster kaybında re-index, out-of-order event gözlemi, operasyonel audit ve bounded-context izolasyonu sağlar.
