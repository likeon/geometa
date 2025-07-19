import json
import os
from collections import namedtuple
from itertools import chain
from os import makedirs

from plumbum import local

tmp = '/tmp/git-cleanup'
makedirs(tmp, exist_ok=True)

with open("terms.txt") as f:
    terms = f.read().splitlines()

files = {}

for term in terms:
    matches = local['./git-search-history.sh'](term)
    matches_json = json.loads(matches)
    for match in matches_json:
        files[match['file']] = match['exists']

git_root = '/home/likeon/Devel/geometa-web-mirror'
files_to_restore = []
for file, keep in files.items():
    if not keep:
        continue

    file_dir = os.path.dirname(file)
    copy_dir = os.path.join(tmp, file_dir)
    os.makedirs(copy_dir, exist_ok=True)
    full_file_path = os.path.join(git_root, file)
    local['cp'](full_file_path, copy_dir)

os.chdir(git_root)
git_filter_params = ['filter-repo', '--invert-paths'] + list(
    chain.from_iterable((('--path', x) for x in files.keys())))
local['git'](*git_filter_params)

local['cp']('-R', f'{tmp}/*', git_root)
