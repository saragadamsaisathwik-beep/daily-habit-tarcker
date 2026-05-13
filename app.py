from flask import Flask, render_template, request, jsonify
from datetime import datetime, timedelta
import json
import os

app = Flask(__name__)

HABITS_FILE = 'habits.json'

def load_habits():
    """Load habits from JSON file"""
    if os.path.exists(HABITS_FILE):
        with open(HABITS_FILE, 'r') as f:
            return json.load(f)
    return {'habits': []}

def save_habits(data):
    """Save habits to JSON file"""
    with open(HABITS_FILE, 'w') as f:
        json.dump(data, f, indent=2)

@app.route('/')
def index():
    """Main page"""
    habits_data = load_habits()
    today = datetime.now().strftime('%Y-%m-%d')
    return render_template('index.html', habits=habits_data['habits'], today=today)

@app.route('/api/habits', methods=['GET'])
def get_habits():
    """Get all habits"""
    return jsonify(load_habits()['habits'])

@app.route('/api/habits', methods=['POST'])
def add_habit():
    """Add a new habit"""
    data = request.json
    habits_data = load_habits()
    
    new_habit = {
        'id': len(habits_data['habits']) + 1,
        'name': data.get('name', ''),
        'description': data.get('description', ''),
        'created_date': datetime.now().strftime('%Y-%m-%d'),
        'completed_dates': [],
        'color': data.get('color', '#3498db')
    }
    
    habits_data['habits'].append(new_habit)
    save_habits(habits_data)
    return jsonify(new_habit), 201

@app.route('/api/habits/<int:habit_id>/complete', methods=['POST'])
def complete_habit(habit_id):
    """Mark habit as complete for today"""
    habits_data = load_habits()
    today = datetime.now().strftime('%Y-%m-%d')
    
    for habit in habits_data['habits']:
        if habit['id'] == habit_id:
            if today not in habit['completed_dates']:
                habit['completed_dates'].append(today)
            save_habits(habits_data)
            return jsonify({'success': True, 'message': 'Habit completed!'})
    
    return jsonify({'success': False, 'message': 'Habit not found'}), 404

@app.route('/api/habits/<int:habit_id>/uncomplete', methods=['POST'])
def uncomplete_habit(habit_id):
    """Mark habit as incomplete for today"""
    habits_data = load_habits()
    today = datetime.now().strftime('%Y-%m-%d')
    
    for habit in habits_data['habits']:
        if habit['id'] == habit_id:
            if today in habit['completed_dates']:
                habit['completed_dates'].remove(today)
            save_habits(habits_data)
            return jsonify({'success': True, 'message': 'Habit unmarked!'})
    
    return jsonify({'success': False, 'message': 'Habit not found'}), 404

@app.route('/api/habits/<int:habit_id>', methods=['DELETE'])
def delete_habit(habit_id):
    """Delete a habit"""
    habits_data = load_habits()
    habits_data['habits'] = [h for h in habits_data['habits'] if h['id'] != habit_id]
    save_habits(habits_data)
    return jsonify({'success': True})

@app.route('/stats')
def stats():
    """Statistics page"""
    habits_data = load_habits()
    return render_template('stats.html', habits=habits_data['habits'])

@app.route('/api/stats/<int:habit_id>')
def get_stats(habit_id):
    """Get statistics for a habit"""
    habits_data = load_habits()
    
    for habit in habits_data['habits']:
        if habit['id'] == habit_id:
            completed_count = len(habit['completed_dates'])
            created_date = datetime.strptime(habit['created_date'], '%Y-%m-%d')
            days_since_creation = (datetime.now() - created_date).days + 1
            completion_rate = (completed_count / days_since_creation * 100) if days_since_creation > 0 else 0
            
            return jsonify({
                'habit_name': habit['name'],
                'total_completed': completed_count,
                'days_since_creation': days_since_creation,
                'completion_rate': round(completion_rate, 2),
                'current_streak': calculate_streak(habit['completed_dates'])
            })
    
    return jsonify({'error': 'Habit not found'}), 404

def calculate_streak(completed_dates):
    """Calculate current streak"""
    if not completed_dates:
        return 0
    
    completed_dates_obj = [datetime.strptime(d, '%Y-%m-%d').date() for d in completed_dates]
    completed_dates_obj.sort(reverse=True)
    
    streak = 0
    today = datetime.now().date()
    
    for i, date in enumerate(completed_dates_obj):
        expected_date = today - timedelta(days=i)
        if date == expected_date:
            streak += 1
        else:
            break
    
    return streak

if __name__ == '__main__':
    app.run(debug=True)