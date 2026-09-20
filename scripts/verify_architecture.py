from __future__ import annotations

from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ERRORS: list[str] = []

FORBIDDEN_DOMAIN_TOKENS = (
    "Microsoft.EntityFrameworkCore",
    "Microsoft.AspNetCore",
    "Npgsql",
    "RabbitMQ",
    "OpenSearch",
)

# Güçlü tipli id'ler (record struct XId(Guid Value)) EF value converter ile
# eşlenir. Sorgu predicate'inde .Value üzerinden karşılaştırmak converter'ı
# atlar ve sorgu çeviri hatası verir; hata ancak çalışma zamanında 500 olarak
# görünür. Karşılaştırma güçlü tipin kendisiyle yapılmalıdır.
VALUE_OBJECT_PREDICATE = re.compile(r"\.Value\s*==|==\s*\w+\.Value")

BLOCKING_ASYNC_PATTERNS = (
    re.compile(r"\.Result\b"),
    re.compile(r"\.Wait\s*\("),
)

def fail(message: str) -> None:
    ERRORS.append(message)

def relative(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()

def check_csharp_files() -> None:
    for file in ROOT.rglob("*.cs"):
        text = file.read_text(encoding="utf-8")
        lines = text.splitlines()
        normalized = relative(file)
        is_ef_generated = "/Migrations/" in f"/{normalized}" and (
            normalized.endswith(".Designer.cs") or normalized.endswith("ModelSnapshot.cs")
        )

        if is_ef_generated:
            continue

        if len(lines) > 400:
            fail(f"{relative(file)}: {len(lines)} lines; 400+ requires refactor.")

        if ".Domain/" in normalized:
            for token in FORBIDDEN_DOMAIN_TOKENS:
                if token in text:
                    fail(f"{normalized}: Domain contains forbidden dependency token '{token}'.")

        for pattern in BLOCKING_ASYNC_PATTERNS:
            if pattern.search(text):
                fail(f"{normalized}: blocking async usage detected: {pattern.pattern}")

        if re.search(r"\bIRepository\s*<", text):
            fail(f"{normalized}: generic IRepository<T> is forbidden by RULES.md.")

        if "/Modules/" in f"/{normalized}" or normalized.startswith("src/Modules/"):
            if re.search(r"\bIUnitOfWork\b(?!\s*<)", text):
                fail(f"{normalized}: module must use bounded IUnitOfWork<TBoundary>.")
            if re.search(r"\bIOutbox\b(?!\s*<)", text):
                fail(f"{normalized}: module must use bounded IOutbox<TBoundary>.")
            if re.search(r"\bIInbox\b(?!\s*<)", text):
                fail(f"{normalized}: module must use bounded IInbox<TBoundary>.")

def get_module_name(project: Path) -> str | None:
    parts = project.relative_to(ROOT).parts

    try:
        module_index = parts.index("Modules")
    except ValueError:
        return None

    return parts[module_index + 1] if len(parts) > module_index + 1 else None

# Aşırı uzun satırların taban çizgisi.
#
# Depoda iki farklı yazım alışkanlığı birikmiş: bir bölüm özenle açılmış,
# bir bölüm tek satıra sıkıştırılmış. Mevcut borcu tek seferde kapatmak
# devasa bir diff üretir ve davranış değiştirme riski taşır; onun yerine
# borç dondurulur. Yeni kod bu sayıyı artıramaz, azaltabilir.
#
# Sayı düştükçe bu sabit de düşürülmelidir.
LONG_LINE_LIMIT = 200
LONG_LINE_BASELINE = 230

def check_long_lines() -> None:
    offenders = 0

    for file in ROOT.rglob("*.cs"):
        normalized = relative(file)

        if "/obj/" in f"/{normalized}" or "/bin/" in f"/{normalized}":
            continue
        if "/Migrations/" in f"/{normalized}":
            continue

        for line in file.read_text(encoding="utf-8").splitlines():
            if len(line) > LONG_LINE_LIMIT:
                offenders += 1

    if offenders > LONG_LINE_BASELINE:
        fail(
            f"{offenders} satır {LONG_LINE_LIMIT} karakteri aşıyor; taban çizgisi "
            f"{LONG_LINE_BASELINE}. Yeni kod uzun satır eklememelidir."
        )
    elif offenders < LONG_LINE_BASELINE:
        print(
            f"note: uzun satır sayısı {offenders}; "
            f"LONG_LINE_BASELINE değerini {offenders} yapın."
        )

def check_value_object_predicates() -> None:
    for file in ROOT.rglob("*.cs"):
        normalized = relative(file)

        if "/obj/" in normalized or "/bin/" in normalized:
            continue

        if ".Infrastructure/" not in normalized:
            continue

        for number, line in enumerate(
            file.read_text(encoding="utf-8").splitlines(), start=1
        ):
            if VALUE_OBJECT_PREDICATE.search(line):
                fail(
                    f"{normalized}:{number}: strongly-typed id compared through "
                    ".Value in a query predicate; compare the typed id itself."
                )

def check_project_references() -> None:
    for project in ROOT.rglob("*.csproj"):
        tree = ET.parse(project)

        source_module = get_module_name(project)
        source_name = project.stem

        for element in tree.findall(".//ProjectReference"):
            include = element.attrib.get("Include")

            if not include:
                continue

            target = (project.parent / include).resolve()

            if not target.exists():
                fail(f"{relative(project)}: missing ProjectReference '{include}'.")
                continue

            target_name = target.stem
            target_module = get_module_name(target)

            if ".Domain" in source_name:
                if ".Infrastructure" in target_name or ".Presentation" in target_name:
                    fail(
                        f"{relative(project)}: Domain cannot reference {target_name}."
                    )

            if ".Application" in source_name:
                if ".Infrastructure" in target_name or ".Presentation" in target_name:
                    fail(
                        f"{relative(project)}: Application cannot reference {target_name}."
                    )

            # Cross bounded-context references are allowed only through Contracts.
            if (
                source_module
                and target_module
                and source_module != target_module
                and ".Contracts" not in target_name
            ):
                fail(
                    f"{relative(project)}: module '{source_module}' directly references "
                    f"module '{target_module}' through non-Contracts project '{target_name}'."
                )

def check_solution() -> None:
    solution = ROOT / "Mbb.Archive.slnx"

    if not solution.exists():
        fail("Mbb.Archive.slnx is missing.")
        return

    tree = ET.parse(solution)

    for project in tree.findall(".//Project"):
        path = project.attrib.get("Path")

        if path and not (ROOT / path).exists():
            fail(f"Mbb.Archive.slnx references missing project '{path}'.")

def main() -> int:
    check_csharp_files()
    check_long_lines()
    check_value_object_predicates()
    check_project_references()
    check_solution()

    if ERRORS:
        print("Architecture verification FAILED:")
        for error in ERRORS:
            print(f"  - {error}")
        return 1

    print("Architecture verification PASSED.")
    print("Checked:")
    print("  - C# file size guard")
    print("  - long line baseline")
    print("  - Domain forbidden dependencies")
    print("  - blocking async usage")
    print("  - strongly-typed id query predicates")
    print("  - generic IRepository<T>")
    print("  - bounded UnitOfWork/Outbox/Inbox contracts")
    print("  - project reference existence")
    print("  - layer dependency direction")
    print("  - cross-bounded-context Contracts rule")
    print("  - solution project references")
    return 0

if __name__ == "__main__":
    sys.exit(main())
