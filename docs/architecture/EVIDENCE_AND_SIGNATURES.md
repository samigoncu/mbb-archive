# Evidence and Signature Architecture

## CMS / PKCS#7

```text
SignedCms.Decode
  ↓
cryptographic CheckSignature
  ↓
signer certificate
  ↓
X509Chain
  ├── online revocation
  ├── entire chain
  └── host trust store
```

Results are separated:

```text
CryptographicValid
CertificateTrust
ChainStatus
Overall EvidenceValidationStatus
```

A cryptographically valid signature with unresolved trust is `Indeterminate`.

## RFC 3161 Timestamp

Validation binds the timestamp token to the exact supplied bytes.

```text
encoded token
  ↓
Rfc3161TimestampToken.TryDecode
  ↓
VerifySignatureForData(exact data)
  ↓
TSA certificate trust
  ↓
Timestamp / Policy OID / Hash Algorithm OID
```

Timestamp issuance is isolated behind `IRfc3161TimestampClient`.

## PDF / PAdES

Current built-in status:

```text
ProviderConfigured = false
Status = Indeterminate
```

A vetted ETSI/PAdES provider must be connected before the product claims PAdES
profile/conformance validation.

## Evidence database

```text
evidence.validations
evidence.outbox_messages
```

Validation reports are immutable snapshots and can be exported into later
archival-evidence packages.
