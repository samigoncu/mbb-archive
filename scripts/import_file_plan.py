#!/usr/bin/env python3
"""Import a reviewed file-plan JSON through the authorized API. Default: read-only.

Existing plans, classifications and unit assignments are never overwritten.
Run with --apply to create missing entries. ARCHIVE_API_TOKEN supports bearer auth.
"""
import argparse
import json
import os
import urllib.error
import urllib.request
from pathlib import Path


def validate(data):
    seen = {}
    for item in data['items']:
        code, parent = item['code'], item['parentCode']
        if code in seen or (parent and parent not in seen):
            raise ValueError(f'Duplicate code or missing preceding parent: {code}')
        if item['level'] != (seen[parent]['level'] + 1 if parent else 1):
            raise ValueError(f'Invalid level: {code}')
        seen[code] = item
    if not seen:
        raise ValueError('Empty plan')


def request(api, path, data=None):
    headers = {'Content-Type': 'application/json'}
    if os.getenv('ARCHIVE_API_TOKEN'):
        headers['Authorization'] = 'Bearer ' + os.environ['ARCHIVE_API_TOKEN']
    req = urllib.request.Request(api + path, headers=headers,
        data=None if data is None else json.dumps(data).encode())
    with urllib.request.urlopen(req, timeout=60) as response:
        return json.load(response)


def run(data, api, apply):
    validate(data)
    plans, page = [], 1
    while True:
        result = request(api, f'/classification/file-plans?page={page}&pageSize=100')
        plans.extend(result['items'])
        if len(plans) >= result['totalCount']: break
        page += 1
    matches = [p for p in plans if p['code'] == data['code'] and p['version'] == data['version']]
    if len(matches) > 1: raise ValueError('Ambiguous plan identity')
    plan = matches[0] if matches else None
    existing = request(api, f'/classification/file-plans/{plan["id"]}')['items'] if plan else []
    by_code = {x['code']: x for x in existing}
    by_id = {x['id']: x for x in existing}
    # Verify every existing row before the first write; never silently accept drift.
    for item in data['items']:
        old = by_code.get(item['code'])
        if not old: continue
        for field in ['title', 'level', 'isSelectable', 'description']:
            if old.get(field) != item[field]: raise ValueError(f'Existing {item["code"]}: {field} differs')
        parent = by_id[old['parentId']]['code'] if old['parentId'] else None
        if parent != item['parentCode']: raise ValueError(f'Parent differs: {item["code"]}')
    missing = len(data['items']) - sum(x['code'] in by_code for x in data['items'])
    print(f'{data["code"]} {data["version"]}: {len(data["items"])} source entries, {missing} missing', flush=True)
    if not apply: return
    if not plan:
        plan = request(api, '/classification/file-plans', {k: data[k] for k in
            ['code', 'name', 'version', 'authority', 'effectiveFrom', 'effectiveTo']})
    for i, item in enumerate(data['items']):
        if item['code'] in by_code: continue
        payload = {k: item[k] for k in ['code', 'title', 'level', 'isSelectable', 'description']}
        payload['parentId'] = by_code[item['parentCode']]['id'] if item['parentCode'] else None
        created = request(api, f'/classification/file-plans/{plan["id"]}/items', payload)
        by_code[item['code']] = dict(payload, id=created['id'])
        if (i + 1) % 100 == 0: print(f'{i + 1}/{len(data["items"])}', flush=True)
    final = request(api, f'/classification/file-plans/{plan["id"]}')
    assert len(final['items']) == len(data['items']), 'Unexpected final row count'
    print(f'Verified {len(final["items"])} entries; plan {plan["id"]}', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('file', type=Path)
    parser.add_argument('--api', default='http://localhost:5080/api/v1')
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    try: run(json.loads(args.file.read_text()), args.api.rstrip('/'), args.apply)
    except (ValueError, urllib.error.HTTPError) as error:
        raise SystemExit(str(error))
