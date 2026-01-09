// ============================================
// PRODUCTIVITY HUB - GOALS PANEL
// ============================================

// Drag-and-drop state for goals
let draggedGoalId = null;

// Render all goals
async function renderGoals() {
    const goalsList = document.getElementById('goals-list');
    if (!goalsList) return;
    
    // Get active goals sorted by user_order
    const activeGoals = appState.goals
        .filter(g => g.status === 'active')
        .sort((a, b) => (a.user_order || 0) - (b.user_order || 0));
    
    if (activeGoals.length === 0) {
        goalsList.innerHTML = `
            <div class="text-center text-gray-500 py-8">
                <i class="fas fa-bullseye text-4xl mb-2"></i>
                <p>No active goals yet</p>
                <p class="text-sm mt-1">Tap + to create your first goal</p>
            </div>
        `;
        return;
    }
    
    // Get task counts for each goal
    const taskCounts = {};
    appState.tasks.forEach(task => {
        if (task.goal_id) {
            taskCounts[task.goal_id] = (taskCounts[task.goal_id] || 0) + 1;
        }
    });
    
    goalsList.innerHTML = activeGoals.map(goal => {
        const category = appState.categories.find(c => c.id === goal.category_id);
        const categoryColor = category ? category.color : '#9CA3AF';
        const taskCount = taskCounts[goal.id] || 0;
        const dueDate = formatGoalDueDate(goal.due_date);
        const progress = goal.progress_percentage || 0;
        
        return `
            <div class="goal-card bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                 data-goal-id="${goal.id}"
                 draggable="true"
                 ondragstart="handleGoalDragStart(event, '${goal.id}')"
                 ondragover="handleGoalDragOver(event)"
                 ondrop="handleGoalDrop(event, '${goal.id}')"
                 ondragend="handleGoalDragEnd(event)">
                
                <!-- Category Color Bar -->
                <div style="height: 4px; background-color: ${categoryColor};"></div>
                
                <!-- Goal Content -->
                <div class="p-3">
                    <div class="flex items-start justify-between gap-3 mb-2">
                        <div class="flex-1 min-w-0">
                            <h3 class="font-semibold text-gray-800 text-base leading-tight mb-1">${escapeHtml(goal.name)}</h3>
                            ${goal.description ? `<p class="text-sm text-gray-600 line-clamp-2">${escapeHtml(goal.description)}</p>` : ''}
                        </div>
                        <button onclick="openGoalModal('${goal.id}')" class="text-gray-400 hover:text-gray-600 flex-shrink-0">
                            <i class="fas fa-ellipsis-h"></i>
                        </button>
                    </div>
                    
                    <!-- Progress Bar -->
                    <div class="mb-2">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-xs font-medium text-gray-600">Progress</span>
                            <div class="flex items-center gap-2">
                                <button onclick="adjustProgress('${goal.id}', -10)" class="text-gray-400 hover:text-primary text-xs px-1">
                                    <i class="fas fa-minus"></i>
                                </button>
                                <span class="text-xs font-bold text-primary">${progress}%</span>
                                <button onclick="adjustProgress('${goal.id}', 10)" class="text-gray-400 hover:text-primary text-xs px-1">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div class="h-full bg-primary rounded-full transition-all duration-300" 
                                 style="width: ${progress}%"></div>
                        </div>
                    </div>
                    
                    <!-- Meta Info -->
                    <div class="flex items-center justify-between text-xs">
                        <div class="flex items-center gap-3">
                            ${category ? `<span class="flex items-center gap-1 text-gray-600">
                                <span class="w-2 h-2 rounded-full" style="background-color: ${categoryColor};"></span>
                                ${escapeHtml(category.name)}
                            </span>` : ''}
                            ${taskCount > 0 ? `<span class="flex items-center gap-1 text-gray-600">
                                <i class="fas fa-tasks"></i>
                                ${taskCount} task${taskCount !== 1 ? 's' : ''}
                            </span>` : ''}
                        </div>
                        <div class="flex items-center gap-2">
                            ${goal.is_time_bound ? `
                                <span class="flex items-center gap-1 ${dueDate.isOverdue ? 'text-danger' : 'text-gray-600'}">
                                    <i class="fas fa-clock"></i>
                                    ${dueDate.text}
                                </span>
                            ` : `
                                <span class="flex items-center gap-1 text-gray-500">
                                    <i class="fas fa-infinity"></i>
                                    Open-ended
                                </span>
                            `}
                            ${progress >= 100 ? `
                                <button onclick="markGoalComplete('${goal.id}')" 
                                        class="text-success hover:text-green-700"
                                        title="Mark as complete">
                                    <i class="fas fa-check-circle"></i>
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Format goal due date with smart text
function formatGoalDueDate(dueDate) {
    if (!dueDate) return { text: 'No date', isOverdue: false };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
    const isOverdue = diffDays < 0;
    
    let text;
    if (diffDays === 0) text = 'Today';
    else if (diffDays === 1) text = 'Tomorrow';
    else if (diffDays === -1) text = 'Yesterday';
    else if (diffDays > 0 && diffDays <= 30) text = `${diffDays} days`;
    else if (diffDays < 0) text = `${Math.abs(diffDays)}d overdue`;
    else text = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    return { text, isOverdue };
}

// Adjust goal progress
async function adjustProgress(goalId, delta) {
    const goal = appState.goals.find(g => g.id === goalId);
    if (!goal) return;
    
    const newProgress = Math.max(0, Math.min(100, (goal.progress_percentage || 0) + delta));
    
    try {
        const { error } = await supabaseClient
            .from('goals')
            .update({ 
                progress_percentage: newProgress,
                updated_at: new Date().toISOString()
            })
            .eq('id', goalId);
        
        if (error) throw error;
        
        // Update local state
        goal.progress_percentage = newProgress;
        renderGoals();
        
        if (newProgress === 100) {
            showToast('🎉 Goal reached 100%! Ready to mark complete?', 'success');
        }
    } catch (error) {
        console.error('Error updating progress:', error);
        showToast('Failed to update progress', 'error');
    }
}

// Mark goal as complete
async function markGoalComplete(goalId) {
    if (!confirm('Mark this goal as complete? It will be moved to archived goals.')) return;
    
    try {
        const { error } = await supabaseClient
            .from('goals')
            .update({ 
                status: 'completed',
                progress_percentage: 100,
                updated_at: new Date().toISOString()
            })
            .eq('id', goalId);
        
        if (error) throw error;
        
        // Update local state
        const goal = appState.goals.find(g => g.id === goalId);
        if (goal) {
            goal.status = 'completed';
            goal.progress_percentage = 100;
        }
        
        renderGoals();
        showToast('🎉 Goal completed! Great work!', 'success');
    } catch (error) {
        console.error('Error completing goal:', error);
        showToast('Failed to complete goal', 'error');
    }
}

// Open goal modal
function openGoalModal(goalId = null) {
    const modal = document.getElementById('goal-modal');
    const modalTitle = document.getElementById('goal-modal-title');
    const deleteBtn = document.getElementById('delete-goal-btn');
    const form = document.getElementById('goal-form');
    
    editingGoalId = goalId;
    
    if (goalId) {
        // Edit mode
        const goal = appState.goals.find(g => g.id === goalId);
        if (!goal) return;
        
        modalTitle.textContent = 'Edit Goal';
        deleteBtn.classList.remove('hidden');
        
        document.getElementById('goal-name').value = goal.name || '';
        document.getElementById('goal-description').value = goal.description || '';
        document.getElementById('goal-category').value = goal.category_id || '';
        document.getElementById('goal-due-date').value = goal.due_date || '';
        document.getElementById('goal-is-time-bound').checked = goal.is_time_bound || false;
        document.getElementById('goal-progress').value = goal.progress_percentage || 0;
        
        toggleTimeBoundFields();
    } else {
        // Add mode
        modalTitle.textContent = 'Add Goal';
        deleteBtn.classList.add('hidden');
        form.reset();
        document.getElementById('goal-progress').value = 0;
        toggleTimeBoundFields();
    }
    
    // Populate category dropdown
    populateCategoryDropdown('goal-category');
    
    modal.classList.remove('hidden');
}

// Close goal modal
function closeGoalModal() {
    document.getElementById('goal-modal').classList.add('hidden');
    document.getElementById('goal-form').reset();
    editingGoalId = null;
}

// Toggle time-bound fields
function toggleTimeBoundFields() {
    const isTimeBound = document.getElementById('goal-is-time-bound').checked;
    const dueDateContainer = document.getElementById('due-date-container');
    
    if (isTimeBound) {
        dueDateContainer.classList.remove('hidden');
    } else {
        dueDateContainer.classList.add('hidden');
        document.getElementById('goal-due-date').value = '';
    }
}

// Save goal
async function saveGoal(event) {
    event.preventDefault();
    
    const goalData = {
        name: document.getElementById('goal-name').value.trim(),
        description: document.getElementById('goal-description').value.trim() || null,
        category_id: document.getElementById('goal-category').value || null,
        is_time_bound: document.getElementById('goal-is-time-bound').checked,
        due_date: document.getElementById('goal-due-date').value || null,
        progress_percentage: parseInt(document.getElementById('goal-progress').value) || 0,
        updated_at: new Date().toISOString()
    };
    
    try {
        if (editingGoalId) {
            // Update existing goal
            const { error } = await supabaseClient
                .from('goals')
                .update(goalData)
                .eq('id', editingGoalId);
            
            if (error) throw error;
            
            // Update local state
            const goalIndex = appState.goals.findIndex(g => g.id === editingGoalId);
            if (goalIndex !== -1) {
                appState.goals[goalIndex] = { ...appState.goals[goalIndex], ...goalData };
            }
            
            showToast('Goal updated successfully', 'success');
        } else {
            // Create new goal
            const maxOrder = Math.max(0, ...appState.goals.map(g => g.user_order || 0));
            
            const { data, error } = await supabaseClient
                .from('goals')
                .insert([{
                    ...goalData,
                    status: 'active',
                    user_order: maxOrder + 1,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (error) throw error;
            
            appState.goals.push(data);
            showToast('Goal created successfully', 'success');
        }
        
        renderGoals();
        closeGoalModal();
        
    } catch (error) {
        console.error('Error saving goal:', error);
        showToast('Failed to save goal', 'error');
    }
}

// Delete goal
async function deleteGoal() {
    if (!editingGoalId) return;
    if (!confirm('Are you sure you want to delete this goal? This action cannot be undone.')) return;
    
    try {
        const { error } = await supabaseClient
            .from('goals')
            .delete()
            .eq('id', editingGoalId);
        
        if (error) throw error;
        
        // Remove from local state
        appState.goals = appState.goals.filter(g => g.id !== editingGoalId);
        
        renderGoals();
        closeGoalModal();
        showToast('Goal deleted successfully', 'success');
        
    } catch (error) {
        console.error('Error deleting goal:', error);
        showToast('Failed to delete goal', 'error');
    }
}

// Drag-and-drop handlers
function handleGoalDragStart(event, goalId) {
    draggedGoalId = goalId;
    event.target.style.opacity = '0.5';
    event.dataTransfer.effectAllowed = 'move';
}

function handleGoalDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    const targetCard = event.target.closest('.goal-card');
    if (targetCard && targetCard.dataset.goalId !== draggedGoalId) {
        targetCard.style.borderTop = '2px solid #3B82F6';
    }
}

function handleGoalDrop(event, targetGoalId) {
    event.preventDefault();
    
    const targetCard = event.target.closest('.goal-card');
    if (targetCard) {
        targetCard.style.borderTop = '';
    }
    
    if (draggedGoalId && draggedGoalId !== targetGoalId) {
        reorderGoals(draggedGoalId, targetGoalId);
    }
}

function handleGoalDragEnd(event) {
    event.target.style.opacity = '1';
    document.querySelectorAll('.goal-card').forEach(card => {
        card.style.borderTop = '';
    });
    draggedGoalId = null;
}

// Reorder goals after drag-and-drop
async function reorderGoals(draggedId, targetId) {
    const activeGoals = appState.goals
        .filter(g => g.status === 'active')
        .sort((a, b) => (a.user_order || 0) - (b.user_order || 0));
    
    const draggedIndex = activeGoals.findIndex(g => g.id === draggedId);
    const targetIndex = activeGoals.findIndex(g => g.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // Reorder array
    const [draggedGoal] = activeGoals.splice(draggedIndex, 1);
    activeGoals.splice(targetIndex, 0, draggedGoal);
    
    // Update user_order for all goals
    const updates = activeGoals.map((goal, index) => ({
        id: goal.id,
        user_order: index + 1
    }));
    
    try {
        // Update in Supabase
        for (const update of updates) {
            const { error } = await supabaseClient
                .from('goals')
                .update({ user_order: update.user_order })
                .eq('id', update.id);
            
            if (error) throw error;
            
            // Update local state
            const goal = appState.goals.find(g => g.id === update.id);
            if (goal) goal.user_order = update.user_order;
        }
        
        renderGoals();
        
    } catch (error) {
        console.error('Error reordering goals:', error);
        showToast('Failed to reorder goals', 'error');
    }
}

// Populate category dropdown
function populateCategoryDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const currentValue = select.value;
    select.innerHTML = '<option value="">No category</option>';
    
    appState.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        select.appendChild(option);
    });
    
    if (currentValue) select.value = currentValue;
}
