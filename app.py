import os
from flask import Flask, render_template, request, jsonify
import sqlite3
from rapidfuzz import process, fuzz
import logging

logging.basicConfig(level=logging.INFO)

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'items.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
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
    try:
        search_term = request.form['search_term'].lower()
        logging.info(f"Search term received: {search_term}")
        conn = get_db_connection()
        
        all_items = get_all_items()
        matches = process.extract(search_term, all_items, scorer=fuzz.partial_ratio, limit=3)
        
        results = []
        if matches and matches[0][1] >= 70:
            for match in matches:
                item_name = match[0]
                item = conn.execute('SELECT * FROM items WHERE name = ?', (item_name,)).fetchone()
                results.append({
                    'id': item['id'],
                    'name': item['name'],
                    'location': item['location'],
                    'belongs_to': item['belongs_to'],  # New field
                    'score': match[1]
                })
        else:
            items = conn.execute('SELECT * FROM items WHERE name LIKE ?', (f'%{search_term}%',)).fetchall()
            for item in items:
                results.append({
                    'id': item['id'],
                    'name': item['name'],
                    'location': item['location'],
                    'belongs_to': item['belongs_to'],  # New field
                    'score': 100
                })
        
        conn.close()
        
        if not results:
            return jsonify({'message': 'No items found matching your search'})
        
        return jsonify({'results': results})
    except Exception as e:
        logging.error(f"Error in search: {str(e)}")
        return jsonify({'message': 'An error occurred during search'}), 500

@app.route('/add', methods=['POST'])
def add_item():
    try:
        name = request.form['name'].lower()
        location = request.form['location']
        belongs_to = request.form['belongs_to']  # New field
        
        conn = get_db_connection()
        conn.execute('INSERT INTO items (name, location, belongs_to) VALUES (?, ?, ?)', 
                     (name, location, belongs_to))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Item added successfully'})
    except Exception as e:
        logging.error(f"Error in add_item: {str(e)}")
        return jsonify({'message': 'Failed to add item'}), 500

@app.route('/update', methods=['POST'])
def update_item():
    try:
        item_id = request.form['id']
        name = request.form['name'].lower()
        location = request.form['location']
        belongs_to = request.form['belongs_to']  # New field
        
        conn = get_db_connection()
        conn.execute('UPDATE items SET name = ?, location = ?, belongs_to = ? WHERE id = ?', 
                     (name, location, belongs_to, item_id))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Item updated successfully'})
    except Exception as e:
        logging.error(f"Error in update_item: {str(e)}")
        return jsonify({'message': 'Failed to update item'}), 500

@app.route('/delete', methods=['POST'])
def delete_item():
    try:
        item_id = request.form['id']
        
        conn = get_db_connection()
        conn.execute('DELETE FROM items WHERE id = ?', (item_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'message': 'Item deleted successfully'})
    except Exception as e:
        logging.error(f"Error in delete_item: {str(e)}")
        return jsonify({'message': 'Failed to delete item'}), 500

@app.route('/suggest', methods=['GET'])
def suggest():
    try:
        query = request.args.get('query', '').lower()
        conn = get_db_connection()
        items = conn.execute('SELECT name FROM items WHERE name LIKE ?', (f'{query}%',)).fetchall()
        conn.close()
        suggestions = [item['name'] for item in items]
        return jsonify(suggestions)
    except Exception as e:
        logging.error(f"Error in suggest: {str(e)}")
        return jsonify([]), 500

if __name__ == '__main__':
    app.run()