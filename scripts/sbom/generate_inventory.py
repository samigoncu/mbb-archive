#!/usr/bin/env python3
"""Generate reproducible dependency inventories without adding runtime dependencies."""
from __future__ import annotations

import json
import pathlib
import re
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[2]
OUTPUT = ROOT / "artifacts" / "sbom"


def write(name: str, value: object) -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    (OUTPUT / name).write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def cyclonedx(components: list[dict[str, object]]) -> dict[str, object]:
    return {
        "bomFormat": "CycloneDX",
        "specVersion": "1.6",
        "version": 1,
        "components": sorted(components, key=lambda item: str(item.get("purl", ""))),
    }


def dotnet_components() -> list[dict[str, object]]:
    command = ["dotnet", "list", str(ROOT / "Mbb.Archive.slnx"), "package", "--format", "json"]
    payload = json.loads(subprocess.check_output(command, text=True, cwd=ROOT))
    found: dict[tuple[str, str], dict[str, object]] = {}
    for project in payload.get("projects", []):
        for framework in project.get("frameworks", []):
            for package in framework.get("topLevelPackages", []) + framework.get("transitivePackages", []):
                name = package["id"]
                version = package.get("resolvedVersion") or package.get("requestedVersion")
                found[(name, version)] = {
                    "type": "library", "name": name, "version": version,
                    "purl": f"pkg:nuget/{name}@{version}",
                }
    return list(found.values())


def npm_components() -> list[dict[str, object]]:
    lock = json.loads((ROOT / "web" / "package-lock.json").read_text(encoding="utf-8"))
    result = []
    for path, package in lock.get("packages", {}).items():
        if not path.startswith("node_modules/") or not package.get("version"):
            continue
        name = path.removeprefix("node_modules/")
        item: dict[str, object] = {"type": "library", "name": name, "version": package["version"],
                                  "purl": f"pkg:npm/{name}@{package['version']}"}
        if package.get("license"):
            item["licenses"] = [{"license": {"id": package["license"]}}]
        result.append(item)
    return result


def python_dependencies() -> list[dict[str, str]]:
    dependencies: dict[tuple[str, str], dict[str, str]] = {}
    pattern = re.compile(r"^([A-Za-z0-9_.-]+)==([^\s#]+)")
    for requirements in ROOT.rglob("requirements*.txt"):
        for line in requirements.read_text(encoding="utf-8").splitlines():
            match = pattern.match(line.strip())
            if match:
                name, version = match.groups()
                dependencies[(name.lower(), version)] = {
                    "name": name, "version": version,
                    "source": str(requirements.relative_to(ROOT)),
                }
    return sorted(dependencies.values(), key=lambda item: (item["name"].lower(), item["version"]))


def docker_images() -> list[dict[str, str]]:
    images: dict[str, dict[str, str]] = {}
    for path in (ROOT / "deploy").glob("*.yml"):
        for image in re.findall(r"^\s*image:\s*([^\s#]+)", path.read_text(encoding="utf-8"), re.MULTILINE):
            images[image] = {"image": image, "source": str(path.relative_to(ROOT))}
    return sorted(images.values(), key=lambda item: item["image"])


def main() -> None:
    nuget = dotnet_components()
    npm = npm_components()
    python = python_dependencies()
    write("dotnet-sbom.json", cyclonedx(nuget))
    write("npm-sbom.json", cyclonedx(npm))
    write("python-dependencies.json", python)
    write("docker-images.json", docker_images())
    licenses = [{"ecosystem": "npm", "name": item["name"], "version": item["version"],
                 "license": item.get("licenses", [{"license": {"id": "NOASSERTION"}}])[0]["license"]["id"]}
                for item in npm]
    licenses.extend({"ecosystem": "nuget", "name": item["name"], "version": item["version"],
                     "license": "NOASSERTION"} for item in nuget)
    write("license-inventory.json", licenses)


if __name__ == "__main__":
    main()
