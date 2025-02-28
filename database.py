import sqlite3

def init_db():
    conn = sqlite3.connect('items.db')
    c = conn.cursor()
    
    # Create table
    c.execute('''CREATE TABLE IF NOT EXISTS items
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  name TEXT NOT NULL,
                  location TEXT NOT NULL)''')
    
    # Insert some sample data (optional)
    sample_data = [
        ('phone charger', 'blue suitcase in bedroom'),
        ('passport', 'black backpack side pocket'),
        ('laptop', 'office desk drawer'),
        ('headphones', 'red suitcase front pocket')
    ]
    
    c.executemany('INSERT OR IGNORE INTO items (name, location) VALUES (?, ?)', sample_data)
    
    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()