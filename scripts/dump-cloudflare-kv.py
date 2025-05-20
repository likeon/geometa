import csv
import os
import json
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import concurrent.futures


def requests_retry_session(
    retries=50,
    backoff_factor=0.5,
):
    session = requests.Session()
    retry = Retry(
        total=retries,
        read=retries,
        connect=retries,
        backoff_factor=backoff_factor,
        status_forcelist=list(range(500, 600)) + [429],
        allowed_methods=("GET", "POST"),
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('http://', adapter)
    session.mount('https://', adapter)
    return session
session = requests_retry_session()


account_id = os.environ.get('CLOUDFLARE_ACCOUNT_ID')
namespace_id = os.environ.get('CLOUDFLARE_KV_NAMESPACE_ID')
cloudflare_api_key = os.environ.get('CLOUDFLARE_BEARER')

bulk_get_url = f'https://api.cloudflare.com/client/v4/accounts/{account_id}/storage/kv/namespaces/{namespace_id}/bulk/get'
list_keys_url = f'https://api.cloudflare.com/client/v4/accounts/{account_id}/storage/kv/namespaces/{namespace_id}/keys'
headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {cloudflare_api_key}',
}

def get_page(cursor):
    params = {}
    if cursor:
        params['cursor'] = cursor
    response = session.get(list_keys_url, headers=headers, params=params)
    response.raise_for_status()
    result = response.json()
    # Extract keys and new cursor in similar format as the Cloudflare client
    keys = [key['name'] for key in result['result']]
    return keys, result['result_info']['count'], result['result_info'].get('cursor')


def chunk_list(data, chunk_size=100):
    return [data[i:i + chunk_size] for i in range(0, len(data), chunk_size)]


def fetch_key_batch(key_batch):
    response = session.post(bulk_get_url, headers=headers, json={'keys': key_batch})
    response.raise_for_status()
    return list(response.json()['result']['values'].items())


data = []
cursor = None
while True:
    keys, count, cursor = get_page(cursor)
    key_batches = chunk_list(keys, 100)

    # Process batches in parallel
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        results = list(executor.map(fetch_key_batch, key_batches))

    # Flatten the list of lists
    for batch_data in results:
        data.extend(batch_data)

    print(len(data))

    if len(keys) < 1000:
        break

headers = ["key", "value"]

with open('kv2.csv', 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.writer(
        csvfile,
        quoting=csv.QUOTE_ALL,  # Quote all fields to ensure JSON is preserved
        doublequote=True,  # Double quotes for escaping quotes inside fields
        quotechar='"'  # Use double quote as quote character
    )

    # Write the headers
    writer.writerow(headers)

    # Write data rows
    for row in data:
        # Validate that the second column is valid JSON
        try:
            # Parse and re-serialize to ensure valid JSON format
            json_str = row[0]
            json_data = row[1]
            # Optionally validate JSON (commented out to use original strings)
            # json_data = json.dumps(json.loads(row[1]))
            writer.writerow([json_str, json_data])
        except json.JSONDecodeError as e:
            print(f"Warning: Invalid JSON in row {row[0]}: {e}")
            # Write the row anyway, or skip based on your preference
            writer.writerow(row)
