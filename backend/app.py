# pyrefly: ignore [missing-import]
from flask import Flask, request, send_file, jsonify
from flask_cors import CORS
import requests
from io import BytesIO
import hashlib
import json
import os
import threading
import time
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# The web app now loads posters and metadata straight from both catalogues, so
# the proxy routes are parked rather than deleted. Switch this back on when the
# proxy grows the extra sources it was always meant to cover.
PROXY_ENABLED = False

# I'll likely implement something more robust later,
# but for now this simple in-memory cache should help reduce redundant requests during development.
image_cache = {}
CACHE_DIR = os.path.join(os.path.dirname(__file__), 'cache')
os.makedirs(CACHE_DIR, exist_ok=True)

# To avoid hammering the already hammered free-service on donated infrastructure
# requests are serialised behind a lock with a minimum gap between outbound calls snd identical queries are
# cached on disk.
ANILIST_ENDPOINT = 'https://graphql.anilist.co'
ANILIST_MIN_INTERVAL = 1.5  # seconds between outbound calls
_anilist_lock = threading.Lock()
_last_anilist_call = 0.0


def _read_json_cache(cache_file):
    try:
        with open(cache_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f'Cache read error: {e}')
        return None


def _write_json_cache(cache_file, payload):
    try:
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(payload, f)
    except Exception as e:
        print(f'Cache write error: {e}')


# Registered at the bottom while PROXY_ENABLED is False.
def proxy_anilist():
    """Forward a GraphQL query to AniList, with caching and rate discipline."""
    if request.method == 'OPTIONS':
        return ('', 204)

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict) or not isinstance(payload.get('query'), str):
        return jsonify({'error': 'Missing GraphQL query'}), 400

    cache_key = hashlib.md5(
        json.dumps(payload, sort_keys=True).encode()
    ).hexdigest()
    cache_file = os.path.join(CACHE_DIR, f'anilist-{cache_key}.json')

    cached = _read_json_cache(cache_file)
    if cached is not None:
        return jsonify(cached)

    global _last_anilist_call
    with _anilist_lock:
        wait = ANILIST_MIN_INTERVAL - (time.time() - _last_anilist_call)
        if wait > 0:
            time.sleep(wait)

        try:
            response = requests.post(
                ANILIST_ENDPOINT,
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'User-Agent': 'Ranku/1.0 (+https://ranku.app)',
                },
                timeout=12,
            )
        except requests.exceptions.Timeout:
            return jsonify({'error': 'AniList timed out'}), 504
        except requests.exceptions.RequestException as e:
            print(f'AniList fetch error: {e}')
            return jsonify({'error': 'AniList unreachable'}), 502
        finally:
            _last_anilist_call = time.time()

    retry_after = response.headers.get('retry-after')
    if retry_after:
        # Surfaced so the client can back off rather than retry blindly.
        pass

    if response.status_code == 429:
        result = response.headers.get('retry-after')
        return jsonify({'error': 'AniList rate limited'}), 429, {'Retry-After': result or '60'}

    try:
        data = response.json()
    except ValueError:
        return jsonify({'error': 'AniList returned a non-JSON response'}), 502

    if response.status_code == 200 and not data.get('errors'):
        _write_json_cache(cache_file, data)

    return jsonify(data), response.status_code

def proxy_image():
    """Fetch an image from a URL and return it with CORS headers"""
    image_url = request.args.get('url')

    if not image_url:
        return jsonify({'error': 'Missing url parameter'}), 400

    if not image_url.startswith(('http://', 'https://')):
        return jsonify({'error': 'Invalid URL'}), 400

    allowed_domains = [
        'myanimelist.net',
        's4.anilist.co',
        'anilist.co',
        'anilistcdn.com',
        'cdn.myanimelist.net',
        'imgur.com',
        'discordapp.com',
        'discord.com',
        'media.discordapp.net',
        'pinterest.com',
        'pinimg.com',
        'unsplash.com',
        'images.unsplash.com'
    ]
    if not any(domain in image_url for domain in allowed_domains):
        return jsonify({'error': 'Domain not allowed'}), 403

    cache_key = hashlib.md5(image_url.encode()).hexdigest()
    cache_file = os.path.join(CACHE_DIR, cache_key)

    if os.path.exists(cache_file):
        try:
            with open(cache_file, 'rb') as f:
                return send_file(
                    BytesIO(f.read()),
                    mimetype='image/jpeg',
                    as_attachment=False,
                    download_name='image.jpg'
                )
        except Exception as e:
            print(f'Cache read error: {e}')

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        response = requests.get(image_url, headers=headers, timeout=10)
        response.raise_for_status()

        try:
            with open(cache_file, 'wb') as f:
                f.write(response.content)
        except Exception as e:
            print(f'Cache write error: {e}')

        return send_file(
            BytesIO(response.content),
            mimetype=response.headers.get('content-type', 'image/jpeg'),
            as_attachment=False,
            download_name='image.jpg'
        )

    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request timeout'}), 504
    except requests.exceptions.RequestException as e:
        print(f'Fetch error: {e}')
        return jsonify({'error': 'Failed to fetch image'}), 502
    except Exception as e:
        print(f'Proxy error: {e}')
        return jsonify({'error': 'Internal server error'}), 500

if PROXY_ENABLED:
    app.add_url_rule(
        '/proxy/anilist', view_func=proxy_anilist, methods=['POST', 'OPTIONS']
    )
    app.add_url_rule('/proxy/image', view_func=proxy_image, methods=['GET'])


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
