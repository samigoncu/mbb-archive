# Supply-chain inventory

Run `python3 scripts/sbom/generate_inventory.py` after dependency changes. Outputs are
written to `artifacts/sbom`. NuGet licenses remain `NOASSERTION` until an approved
license metadata source is connected; the script never guesses a license.
