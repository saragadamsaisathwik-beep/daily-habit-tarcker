// Daily Habit Tracker - Main JavaScript File
// Handles all frontend functionality for the habit tracker application

// ============================================
// NOTIFICATION SYSTEM
// ============================================

/**
 * Display notifications to the user
 * @param {string} message - The notification message
 * @param {string} type - Type of notification: 'success', 'error', 'info'
 * @param {number} duration - Duration in milliseconds (default: 3000)
 */
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease-in-out;
    `;

    if (type === 'success') {
        notification.style.backgroundColor = '#22c55e';
        notification.style.color = 'white';
    } else if (type === 'error') {
        notification.style.backgroundColor = '#ef4444';
        notification.style.color = 'white';
    } else {
        notification.style.backgroundColor = '#3b82f6';
        notification.style.color = 'white';
    }

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-in-out';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

// ============================================
// SECURITY UTILITIES
// ============================================

/**
 * Escape HTML characters to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// ============================================
// DATE UTILITIES
// ============================================

/**
 * Format date to readable format
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

/**
 * Get today's date in YYYY-MM-DD format
 * @returns {string} Today's date
 */
function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

// ============================================
// MAIN HABIT FUNCTIONS
// ============================================

/**
 * Load all habits from the server and display them
 */
function loadHabits() {
    fetch('/api/habits')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load habits');
            return response.json();
        })
        .then(habits => {
            const container = document.getElementById('habitsContainer');
            container.innerHTML = '';

            if (habits.length === 0) {
                container.innerHTML = '<p class="no-habits">No habits yet. Add one to get started! 🚀</p>';
                return;
            }

            const today = getTodayDate();
            habits.forEach(habit => {
                const isCompleted = habit.completed_dates.includes(today);
                const habitEl = createHabitElement(habit, isCompleted);
                container.appendChild(habitEl);
            });
        })
        .catch(error => {
            console.error('Error loading habits:', error);
            showNotification('Failed to load habits', 'error');
        });
}

/**
 * Create a DOM element for a single habit card
 * @param {object} habit - Habit object from server
 * @param {boolean} isCompleted - Whether habit is completed today
 * @returns {HTMLElement} Habit card element
 */
function createHabitElement(habit, isCompleted) {
    const div = document.createElement('div');
    div.className = `habit-card ${isCompleted ? 'completed' : ''}`;
    div.style.borderLeftColor = habit.color;
    div.setAttribute('data-habit-id', habit.id);

    const streak = calculateStreak(habit.completed_dates);
    const description = escapeHtml(habit.description || 'No description');
    const habitName = escapeHtml(habit.name);

    div.innerHTML = `
        <div class="habit-header">
            <div class="habit-info">
                <h4>${habitName}</h4>
                <p>${description}</p>
            </div>
            <div class="habit-meta">
                <span class="streak-badge">🔥 ${streak} day streak</span>
                <button class="btn-delete" onclick="deleteHabit(${habit.id})" title="Delete habit">🗑️</button>
            </div>
        </div>
        <div class="habit-actions">
            <button class="btn-complete ${isCompleted ? 'active' : ''}" 
                    onclick="toggleHabit(${habit.id}, ${!isCompleted})">
                ${isCompleted ? '✓ Completed Today' : 'Mark Complete'}
            </button>
        </div>
    `;

    return div;
}

/**
 * Add a new habit
 */
function addHabit() {
    const name = document.getElementById('habitName').value.trim();
    const description = document.getElementById('habitDescription').value.trim();
    const color = document.getElementById('habitColor').value;

    if (!name) {
        showNotification('Please enter a habit name', 'error');
        return;
    }

    fetch('/api/habits', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, description, color })
    })
        .then(response => {
            if (!response.ok) throw new Error('Failed to add habit');
            return response.json();
        })
        .then(data => {
            document.getElementById('habitForm').reset();
            loadHabits();
            showNotification('Habit added successfully! 🎉', 'success');
        })
        .catch(error => {
            console.error('Error adding habit:', error);
            showNotification('Failed to add habit', 'error');
        });
}

/**
 * Toggle habit completion status for today
 * @param {number} habitId - ID of the habit
 * @param {boolean} complete - Whether to mark as complete or incomplete
 */
function toggleHabit(habitId, complete) {
    const endpoint = complete 
        ? `/api/habits/${habitId}/complete` 
        : `/api/habits/${habitId}/uncomplete`;

    fetch(endpoint, { method: 'POST' })
        .then(response => {
            if (!response.ok) throw new Error('Failed to toggle habit');
            return response.json();
        })
        .then(data => {
            loadHabits();
            const message = complete 
                ? 'Great job! Habit marked complete! 🎯' 
                : 'Habit marked incomplete';
            showNotification(message, 'success');
        })
        .catch(error => {
            console.error('Error toggling habit:', error);
            showNotification('Failed to update habit', 'error');
        });
}

/**
 * Delete a habit with confirmation
 * @param {number} habitId - ID of the habit to delete
 */
function deleteHabit(habitId) {
    if (confirm('Are you sure you want to delete this habit? This action cannot be undone.')) {
        fetch(`/api/habits/${habitId}`, { method: 'DELETE' })
            .then(response => {
                if (!response.ok) throw new Error('Failed to delete habit');
                return response.json();
            })
            .then(data => {
                loadHabits();
                showNotification('Habit deleted successfully', 'success');
            })
            .catch(error => {
                console.error('Error deleting habit:', error);
                showNotification('Failed to delete habit', 'error');
            });
    }
}

// ============================================
// STREAK CALCULATION
// ============================================

/**
 * Calculate the current streak for a habit
 * @param {array} completedDates - Array of completion dates
 * @returns {number} Current streak count
 */
function calculateStreak(completedDates) {
    if (completedDates.length === 0) return 0;

    const dates = completedDates
        .map(d => new Date(d).getTime())
        .sort((a, b) => b - a);

    const today = getTodayDate();
    let streak = 0;
    let currentDate = new Date(today);

    for (let date of dates) {
        const checkDate = new Date(date).toISOString().split('T')[0];
        const expectedDate = currentDate.toISOString().split('T')[0];

        if (checkDate === expectedDate) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        } else {
            break;
        }
    }

    return streak;
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the application when DOM is ready
 */
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Load habits on page load
        loadHabits();

        // Set up form submission
        const habitForm = document.getElementById('habitForm');
        if (habitForm) {
            habitForm.addEventListener('submit', function(e) {
                e.preventDefault();
                addHabit();
            });
        }

        // Refresh habits every 30 seconds (optional auto-refresh)
        // setInterval(loadHabits, 30000);

    } catch (error) {
        console.error('Error initializing app:', error);
        showNotification('Failed to initialize app', 'error');
    }
});

// ============================================
// UTILITY FUNCTIONS FOR FUTURE ENHANCEMENTS
// ============================================

/**
 * Export habits data as JSON
 */
function exportHabits() {
    fetch('/api/habits')
        .then(response => response.json())
        .then(habits => {
            const dataStr = JSON.stringify(habits, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `habits-backup-${getTodayDate()}.json`;
            link.click();
            showNotification('Habits exported successfully!', 'success');
        })
        .catch(error => {
            console.error('Error exporting habits:', error);
            showNotification('Failed to export habits', 'error');
        });
}

/**
 * Get statistics for all habits
 */
function getHabitsStats() {
    fetch('/api/habits')
        .then(response => response.json())
        .then(habits => {
            const stats = {
                totalHabits: habits.length,
                completedToday: 0,
                averageStreak: 0,
                totalCompletions: 0
            };

            const today = getTodayDate();
            let totalStreak = 0;

            habits.forEach(habit => {
                if (habit.completed_dates.includes(today)) {
                    stats.completedToday++;
                }
                const streak = calculateStreak(habit.completed_dates);
                totalStreak += streak;
                stats.totalCompletions += habit.completed_dates.length;
            });

            stats.averageStreak = habits.length > 0 ? Math.round(totalStreak / habits.length) : 0;

            console.log('Habits Statistics:', stats);
            return stats;
        })
        .catch(error => {
            console.error('Error getting statistics:', error);
            showNotification('Failed to get statistics', 'error');
        });
}
