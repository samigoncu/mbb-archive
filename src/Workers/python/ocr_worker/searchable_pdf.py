from pathlib import Path
import os
import subprocess
import tempfile


def create_searchable_pdf(
    input_path: Path,
    languages: str,
    mime_type: str,
) -> Path | None:
    enabled = os.getenv(
        "OCR_SEARCHABLE_PDF_ENABLED",
        "false",
    ).lower() == "true"

    if not enabled or mime_type != "application/pdf":
        return None

    handle = tempfile.NamedTemporaryFile(
        suffix=".pdf",
        delete=False,
    )
    handle.close()
    output = Path(handle.name)

    try:
        subprocess.run(
            [
                "ocrmypdf",
                "--skip-text",
                "--deskew",
                "--rotate-pages",
                "-l",
                languages,
                str(input_path),
                str(output),
            ],
            check=True,
            capture_output=True,
            text=True,
        )

        return output
    except Exception:
        output.unlink(missing_ok=True)
        raise
