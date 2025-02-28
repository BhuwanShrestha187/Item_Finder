from flask import Flask, render_template, request, jsonify
import sqlite3
from rapidfuzz import process, fuzz
import psycopg2
import os
app = Flask(__name__)

DATABASE_URL = os.getenv("DATABASE_URL")


def get_db_connection():
    return psycopg2.connect(DATABASE_URL, sslmode='require')
    return conn

def get_all_items():
    conn = get_db_connection()
    items = conn.execute('SELECT name FROM items').fetchall()
    conn.close()
    return [item['name'] for item in items]

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/search', methods=['POST'])
def search():
    search_term = request.form['search_term'].lower()
    conn = get_db_connection()
    
    all_items = get_all_items()
    matches = process.extract(search_term, all_items, scorer=fuzz.partial_ratio, limit=3)
    
    results = []
    if matches and matches[0][1] >= 70:
        for match in matches:
            item_name = match[0]
            item = conn.execute('SELECT * FROM items WHERE name = ?', (item_name,)).fetchone()
            results.append({
                'name': item['name'],
                'location': item['location'],
                'score': match[1]
            })
    else:
        items = conn.execute('SELECT * FROM items WHERE name LIKE ?', (f'%{search_term}%',)).fetchall()
        for item in items:
            results.append({
                'name': item['name'],
                'location': item['location'],
                'score': 100
            })
    
    conn.close()
    
    if not results:
        return jsonify({'message': 'No items found matching your search'})
    
    return jsonify({'results': results})

@app.route('/add', methods=['POST'])
def add_item():
    name = request.form['name'].lower()
    location = request.form['location']
    
    conn = get_db_connection()
    conn.execute('INSERT INTO items (name, location) VALUES (?, ?)', (name, location))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'Item added successfully'})

@app.route('/suggest', methods=['GET'])
def suggest():
    query = request.args.get('query', '').lower()
    conn = get_db_connection()
    items = conn.execute('SELECT name FROM items WHERE name LIKE ?', (f'{query}%',)).fetchall()  # Changed to start-with match
    conn.close()
    suggestions = [item['name'] for item in items]
    return jsonify(suggestions)

if __name__ == '__main__':
    app.run(debug=True)
