import sqlite3
import os

def init_db():
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DB_PATH = os.path.join(BASE_DIR, 'items.db')
    
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    
    # Create table with new 'belongs_to' column
    c.execute('''CREATE TABLE IF NOT EXISTS items
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  location TEXT NOT NULL,
                  belongs_to TEXT NOT NULL)''')
    
    # Insert sample data with ownership
    sample_data = [
        ('phone charger', 'blue suitcase in bedroom', 'John'),
        ('passport', 'black backpack side pocket', 'Alice'),
        ('laptop', 'office desk drawer', 'Bob'),
        ('headphones', 'red suitcase front pocket', 'Sarah'),
        ('stapler', 'just removed it', 'Mike')  # Matches your screenshot
    ]
    
    c.executemany('INSERT OR IGNORE INTO items (name, location, belongs_to) VALUES (?, ?, ?)', sample_data)
    
    conn.commit()
    conn.close()
    print("Database initialized successfully.")

if __name__ == '__main__':
    init_db()