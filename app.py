from flask import Flask, render_template, jsonify, request, abort
from googleapiclient.discovery import build
import random

# =========================
# 設定
# =========================
import os

API_KEY = os.environ.get("YOUTUBE_API_KEY")

PLAYLIST_A_ID = "PLp6OMak5yXrvYbtuH4HyrYhqG_hb-fawB"
PLAYLIST_B_ID = "PLp6OMak5yXruRxBTdzU2xe6mlVKQ0FpwF"

TOTAL_QUESTIONS = 4

# ★ アクセス用秘密キー（これを知っている人だけOK）
ACCESS_KEY = "my_super_secret_key_sakurako1004"

app = Flask(__name__)
youtube = build("youtube", "v3", developerKey=API_KEY)

# =====================
# 共通：アクセス制限
# =====================
@app.before_request
def check_access_key():
    # 静的ファイルは通す
    if request.path.startswith("/static"):
        return

    key = request.args.get("key")
    if key != ACCESS_KEY:
        abort(403)  # アクセス拒否

# =========================
# プレイリスト全曲取得
# =========================
def load_all_playlist_items(playlist_id):
    items = []
    next_page_token = None

    while True:
        request = youtube.playlistItems().list(
            part="snippet",
            playlistId=playlist_id,
            maxResults=50,
            pageToken=next_page_token
        )
        response = request.execute()

        for item in response["items"]:
            snippet = item["snippet"]

            # 削除済み・非公開動画対策
            if snippet["title"] in ["Deleted video", "Private video"]:
                continue

            items.append({
                "title": snippet["title"],
                "video_id": snippet["resourceId"]["videoId"]
            })

        next_page_token = response.get("nextPageToken")
        if not next_page_token:
            break

    return items

# =========================
# 起動時に全曲ロード
# =========================
PLAYLIST_A = load_all_playlist_items(PLAYLIST_A_ID)
PLAYLIST_B = load_all_playlist_items(PLAYLIST_B_ID)

print(f"Playlist A loaded: {len(PLAYLIST_A)} songs")
print(f"Playlist B loaded: {len(PLAYLIST_B)} songs")

# =========================
# 問題生成
# =========================
def make_question(playlist):
    correct = random.choice(playlist)

    wrongs = random.sample(
        [p for p in playlist if p["title"] != correct["title"]],
        3
    )

    choices = [correct["title"]] + [w["title"] for w in wrongs]
    random.shuffle(choices)

    return {
        "video_id": correct["video_id"],
        "correct": correct["title"],
        "choices": choices
    }

# =========================
# ルーティング
# =========================
@app.route("/")
def index():
    return render_template("index.html")

@app.route("/question")
def question():
    number = int(request.args.get("num", 1))

    # 1問目だけA、それ以外はB
    if number == 1:
        playlist = PLAYLIST_A
    else:
        playlist = PLAYLIST_B

    if len(playlist) < 4:
        return jsonify({"error": "曲数が足りません"}), 400

    q = make_question(playlist)
    return jsonify(q)

# =========================
# 起動
# =========================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
