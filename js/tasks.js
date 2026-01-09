// ============================================
// PRODUCTIVITY HUB - TASKS PANEL
// ============================================

// Switch task view (All/Overdue/Upcoming)
function switchTaskView(view) {
    currentTaskView = view;
    
    // Update button states
    document.querySelectorAll('[data-view]').forEach(btn => {
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    renderTasks();
}

// Get filtered tasks based on current view and filters
function getFilteredTasks() {
    let filtered = [...appState.tasks];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Apply view filter
    if (currentTaskView === 'overdue') {
        filtered = filtered.filter(task => {
            if (!task.due_date || task.is_completed) return false;
            const dueDate = new Date(task.due_date);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate < today;
        });
    } else if (currentTaskView === 'upcoming') {
        filtered = filtered.filter(task => {
            if (!task.due_date || task.is_completed) return false;
            const dueDate = new Date(task.due_date);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate >= today;
        });
    }
    
    // Apply search filter
    const searchTerm = document.getElementById('task-search')?.value.toLowerCase() || '';
    if (searchTerm) {
        filtered = filtered.filter(task => 
            task.title.toLowerCase().includes(searchTerm) ||
            (task.notes && task.notes.toLowerCase().includes(searchTerm))
        );
    }
    
    // Apply category filter
    const categoryId = document.getElementById('filter-category')?.value;
    if (categoryId) {
        filtered = filtered.filter(task => task.category_id === categoryId);
    }
    
    // Apply goal filter
    const goalId = document.getElementById('filter-goal')?.value;
    if (goalId) {
        filtered = filtered.filter(task => task.goal_id === goalId);
    }
    
    return filtered;
}

// Get overdue severity level
function getOverdueSeverity(dueDate) {
    if (!dueDate) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((today - due) / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 7) return 'high';
    if (diffDays >= 3) return 'medium';
    if (diffDays >= 1) return 'low';
    return null;
}

// Format due date with smart text
function formatDueDate(dueDate) {
    if (!dueDate) return '';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays > 0 && diffDays <= 7) return `In ${diffDays} days`;
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    
    return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Render tasks list
function renderTasks() {
    const tasksList = document.getElementById('tasks-list');
    const filtered = getFilteredTasks();
    
    // Update counts
    const allTasks = appState.tasks.filter(t => !t.is_completed);
    const overdueTasks = allTasks.filter(t => {
        if (!t.due_date) return false;
        const dueDate = new Date(t.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dueDate < today;
    });
    const upcomingTasks = allTasks.filter(t => {
        if (!t.due_date) return false;
        const dueDate = new Date(t.due_date);
        dueDate.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dueDate >= today;
    });
    
    document.getElementById('count-all').textContent = allTasks.length;
    document.getElementById('count-overdue').textContent = overdueTasks.length;
    document.getElementById('count-upcoming').textContent = upcomingTasks.length;
    
    if (filtered.length === 0) {
        tasksList.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="fas fa-tasks text-4xl mb-2"></i>
                <p>${currentTaskView === 'all' ? 'No tasks yet. Tap + to add one!' : `No ${currentTaskView} tasks`}</p>
            </div>
        `;
        return;
    }
    
    tasksList.innerHTML = filtered.map(task => {
        const categoryColor = task.category?.color_hex || '#6B7280';
        const severity = getOverdueSeverity(task.due_date);
        const dueDateText = formatDueDate(task.due_date);
        
        return `
            <div class="task-card ${task.is_completed ? 'completed' : ''}">
                <div class="flex items-start gap-3">
                    <div 
                        class="task-checkbox ${task.is_completed ? 'checked' : ''}"
                        onclick="toggleTaskCompletion('${task.id}')"
                    ></div>
                    
                    <div class="flex-1 min-w-0" onclick="openEditTaskModal('${task.id}')">
                        <div class="flex items-center gap-2 mb-1">
                            ${task.category ? `<div class="category-dot" style="background-color: ${categoryColor}"></div>` : ''}
                            <h3 class="font-semibold text-gray-800 text-sm ${task.is_completed ? 'line-through text-gray-400' : ''} truncate flex-1">
                                ${task.title}
                            </h3>
                            ${severity ? `<span class="overdue-badge overdue-${severity}">Overdue</span>` : ''}
                        </div>
                        
                        <div class="flex items-center gap-2 flex-wrap">
                            ${task.category ? `<span class="text-xs text-gray-500">${task.category.name}</span>` : ''}
                            ${task.goal ? `<span class="text-xs text-gray-500">• ${task.goal.name}</span>` : ''}
                            ${task.due_date ? `<span class="text-xs ${severity ? 'text-danger font-semibold' : 'text-gray-500'}">• ${dueDateText}</span>` : ''}
                            ${task.is_recurring ? `<span class="text-xs text-primary">• <i class="fas fa-repeat"></i> Recurring</span>` : ''}
                        </div>
                        
                        ${task.notes ? `<p class="text-xs text-gray-500 mt-1 truncate">${task.notes}</p>` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Filter tasks (called from search/filter inputs)
function filterTasks() {
    renderTasks();
}

// Toggle task completion
async function toggleTaskCompletion(taskId) {
    const task = appState.tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Optimistic update
    task.is_completed = !task.is_completed;
    task.completed_at = task.is_completed ? new Date().toISOString() : null;
    renderTasks();
    
    try {
        const { error } = await supabaseClient
            .from('tasks')
            .update({
                is_completed: task.is_completed,
                completed_at: task.completed_at
            })
            .eq('id', taskId);
        
        if (error) throw error;
        
        if (task.is_completed) {
            showToast('✅ Task completed!', 'success');
        }
        
    } catch (error) {
        console.error('Error toggling task:', error);
        task.is_completed = !task.is_completed;
        renderTasks();
        showToast('Failed to update task', 'error');
    }
}

// ============================================
// TASK MODAL FUNCTIONS
// ============================================

function toggleRecurringOptions() {
    const isRecurring = document.getElementById('task-is-recurring').checked;
    const recurringOptions = document.getElementById('recurring-options');
    
    if (isRecurring) {
        recurringOptions.classList.remove('hidden');
        updateRecurringFields();
    } else {
        recurringOptions.classList.add('hidden');
    }
}

function updateRecurringFields() {
    const recurrenceType = document.getElementById('task-recurrence-type').value;
    const intervalLabel = document.getElementById('interval-label');
    const dayOfWeekContainer = document.getElementById('day-of-week-container');
    
    if (recurrenceType === 'daily') {
        intervalLabel.textContent = 'day(s)';
        dayOfWeekContainer.classList.add('hidden');
    } else if (recurrenceType === 'weekly') {
        intervalLabel.textContent = 'week(s)';
        dayOfWeekContainer.classList.remove('hidden');
    } else if (recurrenceType === 'monthly') {
        intervalLabel.textContent = 'month(s)';
        dayOfWeekContainer.classList.add('hidden');
    }
}

function openTaskModal() {
    editingTaskId = null;
    document.getElementById('task-modal-title').textContent = 'Add Task';
    document.getElementById('task-form').reset();
    document.getElementById('delete-task-btn').classList.add('hidden');
    document.getElementById('recurring-options').classList.add('hidden');
    document.getElementById('task-modal').classList.remove('hidden');
}

function openEditTaskModal(taskId) {
    editingTaskId = taskId;
    const task = appState.tasks.find(t => t.id === taskId);
    
    if (!task) return;
    
    document.getElementById('task-modal-title').textContent = 'Edit Task';
    document.getElementById('task-title').value = task.title;
    document.getElementById('task-notes').value = task.notes || '';
    document.getElementById('task-category').value = task.category_id || '';
    document.getElementById('task-goal').value = task.goal_id || '';
    document.getElementById('task-due-date').value = task.due_date || '';
    document.getElementById('task-is-recurring').checked = task.is_recurring;
    
    if (task.is_recurring) {
        document.getElementById('recurring-options').classList.remove('hidden');
        document.getElementById('task-recurrence-type').value = task.recurrence_type || 'daily';
        document.getElementById('task-recurrence-interval').value = task.recurrence_interval || 1;
        document.getElementById('task-recurrence-day').value = task.recurrence_day_of_week || 1;
        document.getElementById('task-recurrence-ends').value = task.recurrence_ends_on || '';
        updateRecurringFields();
    }
    
    document.getElementById('delete-task-btn').classList.remove('hidden');
    document.getElementById('task-modal').classList.remove('hidden');
}

function closeTaskModal() {
    document.getElementById('task-modal').classList.add('hidden');
    editingTaskId = null;
}

async function saveTask(event) {
    event.preventDefault();
    
    const title = document.getElementById('task-title').value.trim();
    const notes = document.getElementById('task-notes').value.trim() || null;
    const categoryId = document.getElementById('task-category').value || null;
    const goalId = document.getElementById('task-goal').value || null;
    const dueDate = document.getElementById('task-due-date').value || null;
    const isRecurring = document.getElementById('task-is-recurring').checked;
    
    let recurrenceData = {};
    if (isRecurring) {
        recurrenceData = {
            is_recurring: true,
            recurrence_type: document.getElementById('task-recurrence-type').value,
            recurrence_interval: parseInt(document.getElementById('task-recurrence-interval').value),
            recurrence_day_of_week: document.getElementById('task-recurrence-type').value === 'weekly' ? 
                parseInt(document.getElementById('task-recurrence-day').value) : null,
            recurrence_ends_on: document.getElementById('task-recurrence-ends').value || null
        };
    } else {
        recurrenceData = {
            is_recurring: false,
            recurrence_type: null,
            recurrence_interval: null,
            recurrence_day_of_week: null,
            recurrence_ends_on: null
        };
    }
    
    try {
        if (editingTaskId) {
            const { error } = await supabaseClient
                .from('tasks')
                .update({
                    title,
                    notes,
                    category_id: categoryId,
                    goal_id: goalId,
                    due_date: dueDate,
                    ...recurrenceData
                })
                .eq('id', editingTaskId);
            
            if (error) throw error;
            
            // Refetch tasks to get updated relations
            const { data: updatedTask } = await supabaseClient
                .from('tasks')
                .select(`
                    *,
                    category:categories(id, name, color_hex),
                    goal:goals(id, name)
                `)
                .eq('id', editingTaskId)
                .single();
            
            const taskIndex = appState.tasks.findIndex(t => t.id === editingTaskId);
            if (taskIndex !== -1 && updatedTask) {
                appState.tasks[taskIndex] = updatedTask;
            }
            
            showToast('Task updated!', 'success');
        } else {
            const maxOrder = Math.max(0, ...appState.tasks.map(t => t.user_order || 0));
            
            const { data, error } = await supabaseClient
                .from('tasks')
                .insert({
                    title,
                    notes,
                    category_id: categoryId,
                    goal_id: goalId,
                    due_date: dueDate,
                    is_completed: false,
                    user_order: maxOrder + 1,
                    status: 'active',
                    ...recurrenceData
                })
                .select(`
                    *,
                    category:categories(id, name, color_hex),
                    goal:goals(id, name)
                `)
                .single();
            
            if (error) throw error;
            
            appState.tasks.push(data);
            
            showToast('Task created!', 'success');
        }
        
        renderTasks();
        closeTaskModal();
    } catch (error) {
        console.error('Error saving task:', error);
        showToast('Failed to save task', 'error');
    }
}

async function deleteTask() {
    if (!editingTaskId) return;
    
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('tasks')
            .update({ status: 'deleted' })
            .eq('id', editingTaskId);
        
        if (error) throw error;
        
        appState.tasks = appState.tasks.filter(t => t.id !== editingTaskId);
        
        renderTasks();
        closeTaskModal();
        showToast('Task deleted', 'success');
    } catch (error) {
        console.error('Error deleting task:', error);
        showToast('Failed to delete task', 'error');
    }
}
