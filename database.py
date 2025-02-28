import psycopg2
import os

DATABASE_URL = os.getenv("DATABASE_URL")  # Get DB URL from environment variables

def get_db_connection():
    conn = psycopg2.connect(DATABASE_URL, sslmode='require')
    return conn

def init_db():
    conn = get_db_connection()
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS items (
                    id SERIAL PRIMARY KEY,
                    name TEXT NOT NULL,
                    location TEXT NOT NULL)''')
    
    sample_data = [
        ('phone charger', 'blue suitcase in bedroom'),
        ('passport', 'black backpack side pocket'),
        ('laptop', 'office desk drawer'),
        ('headphones', 'red suitcase front pocket')
    ]
    
    c.executemany('INSERT INTO items (name, location) VALUES (%s, %s) ON CONFLICT (name) DO NOTHING', sample_data)

    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
