import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()
conn = psycopg2.connect(os.getenv("DB_URL"))

with conn.cursor() as cur:
    cur.execute("ALTER TABLE users ADD IF NOT EXISTS widget_addon BOOLEAN DEFAULT FALSE;")
    conn.commit()
print("Add-on column added") 