# ADR-0018 — Cryptographic Evidence Boundary

**Status:** Accepted

Signature validation is decomposed into independent findings:

1. cryptographic signature integrity
2. signer certificate identity
3. certificate chain trust
4. revocation result
5. timestamp binding
6. signature profile/conformance

A cryptographically correct signature is not automatically reported as a
qualified/legal signature.

Unknown revocation or unavailable trust path produces `Indeterminate`, not `Valid`.

PAdES validation is behind `IPdfSignatureValidator`. PDF marker detection
(`/ByteRange`, `/Sig`, etc.) is explicitly forbidden as a compliance validator.
