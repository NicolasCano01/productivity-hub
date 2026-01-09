// ============================================
// PRODUCTIVITY HUB - GOALS PANEL (FIXED)
// ============================================

// Drag-and-drop state for goals
let draggedGoalId = null;

// Calculate goal progress from linked tasks
function calculateGoalProgress(goalId) {
    const linkedTasks = appState.tasks.filter(t => t.goal_id === goalId);
    const totalTasks = linkedTasks.length;
    
    if (totalTasks === 0) return 0;
    
    const completedTasks = linkedTasks.filter(t => t.is_completed).length;
    return Math.round((completedTasks / totalTasks) * 100);
}

// Get task counts for a goal
function getGoalTaskCounts(goalId) {
    const linkedTasks = appState.tasks.filter(t => t.goal_id === goalId);
    const completed = linkedTasks.filter(t => t.is_completed).length;
    return { total: linkedTasks.length, completed };
}

// Render all goals
async function renderGoals() {
    const goalsList = document.getElementById('goals-list');
    if (!goalsList) return;
    
    // Get active goals sorted by user_order
    let activeGoals = appState.goals
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
    
    goalsList.innerHTML = activeGoals.map(goal => {
        // Map goal_type to category for color
        const categoryMap = {
            'travel': 'Travel',
            'personal': 'Personal',
            'career': 'Work',
            'health': 'Health',
            'financial': 'Finance',
            'learning': 'Learning',
            'other': 'Other'
        };
        
        const categoryName = categoryMap[goal.goal_type] || 'Other';
        const category = appState.categories.find(c => c.name === categoryName);
        const goalColor = category ? category.color_hex : '#6B7280';
        
        const taskCounts = getGoalTaskCounts(goal.id);
        const progress = calculateGoalProgress(goal.id);
        const dueDate = formatGoalDueDate(goal.due_date);
        const hasDeadline = goal.due_date !== null;
        
        return `
            <div class="goal-card bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                 data-goal-id="${goal.id}"
                 draggable="true"
                 ondragstart="handleGoalDragStart(event, '${goal.id}')"
                 ondragover="handleGoalDragOver(event)"
                 ondrop="handleGoalDrop(event, '${goal.id}')"
                 ondragend="handleGoalDragEnd(event)">
                
                <!-- Category Color Bar -->
                <div style="height: 3px; background-color: ${goalColor};"></div>
                
                <!-- Goal Content -->
                <div class="p-2.5">
                    <div class="flex items-start justify-between gap-2 mb-1.5">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-1.5 mb-0.5">
                                <h3 class="font-semibold text-gray-800 text-sm leading-tight">${escapeHtml(goal.name)}</h3>
                                <span class="text-xs px-1.5 py-0.5 rounded" style="background-color: ${goalColor}20; color: ${goalColor};">
                                    ${goal.goal_type}
                                </span>
                            </div>
                            ${goal.description ? `<p class="text-xs text-gray-600 line-clamp-1">${escapeHtml(goal.description)}</p>` : ''}
                        </div>
                        <button onclick="openGoalModal('${goal.id}')" class="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1">
                            <i class="fas fa-ellipsis-h text-sm"></i>
                        </button>
                    </div>
                    
                    <!-- Progress Bar -->
                    <div class="mb-1.5">
                        <div class="flex items-center justify-between mb-0.5">
                            <span class="text-xs font-medium text-gray-600">Progress</span>
                            <span class="text-xs font-bold" style="color: ${goalColor};">${progress}%</span>
                        </div>
                        <div class="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div class="h-full rounded-full transition-all duration-300" 
                                 style="width: ${progress}%; background-color: ${goalColor};"></div>
                        </div>
                    </div>
                    
                    <!-- Meta Info -->
                    <div class="flex items-center justify-between text-xs">
                        <div class="flex items-center gap-2">
                            ${taskCounts.total > 0 ? `
                                <span class="flex items-center gap-1 text-gray-600">
                                    <i class="fas fa-tasks"></i>
                                    ${taskCounts.completed}/${taskCounts.total}
                                </span>
                            ` : `
                                <span class="text-gray-400 text-xs">No tasks</span>
                            `}
                        </div>
                        <div class="flex items-center gap-2">
                            ${hasDeadline ? `
                                <span class="flex items-center gap-1 ${dueDate.isOverdue ? 'text-danger font-semibold' : 'text-gray-600'}">
                                    <i class="fas fa-clock text-xs"></i>
                                    ${dueDate.text}
                                </span>
                            ` : `
                                <span class="flex items-center gap-1 text-gray-500">
                                    <i class="fas fa-infinity text-xs"></i>
                                </span>
                            `}
                            ${progress >= 100 ? `
                                <button onclick="markGoalComplete('${goal.id}')" 
                                        class="text-success hover:text-green-700 ml-1"
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

// Mark goal as complete
async function markGoalComplete(goalId) {
    if (!confirm('Mark this goal as complete? It will be archived.')) return;
    
    try {
        const { error } = await supabaseClient
            .from('goals')
            .update({ 
                status: 'archived'
            })
            .eq('id', goalId);
        
        if (error) throw error;
        
        // Update local state immediately (optimistic)
        const goal = appState.goals.find(g => g.id === goalId);
        if (goal) {
            goal.status = 'archived';
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
        document.getElementById('goal-type').value = goal.goal_type || 'other';
        document.getElementById('goal-due-date').value = goal.due_date || '';
        
        // Show task count in edit mode
        const taskCounts = getGoalTaskCounts(goal.id);
        const taskInfo = document.getElementById('goal-task-info');
        if (taskInfo) {
            if (taskCounts.total > 0) {
                taskInfo.innerHTML = `
                    <div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div class="flex items-center gap-2 text-sm">
                            <i class="fas fa-info-circle text-primary"></i>
                            <span class="font-semibold">${taskCounts.completed}/${taskCounts.total} tasks completed</span>
                        </div>
                    </div>
                `;
            } else {
                taskInfo.innerHTML = `
                    <div class="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                        <div class="flex items-center gap-2 text-sm text-gray-600">
                            <i class="fas fa-link text-gray-400"></i>
                            <span>No tasks linked to this goal yet</span>
                        </div>
                    </div>
                `;
            }
        }
    } else {
        // Add mode
        modalTitle.textContent = 'Add Goal';
        deleteBtn.classList.add('hidden');
        form.reset();
        const taskInfo = document.getElementById('goal-task-info');
        if (taskInfo) taskInfo.innerHTML = '';
    }
    
    modal.classList.remove('hidden');
}

// Close goal modal
function closeGoalModal() {
    document.getElementById('goal-modal').classList.add('hidden');
    document.getElementById('goal-form').reset();
    editingGoalId = null;
}

// Save goal
async function saveGoal(event) {
    event.preventDefault();
    
    const goalData = {
        name: document.getElementById('goal-name').value.trim(),
        description: document.getElementById('goal-description').value.trim() || null,
        goal_type: document.getElementById('goal-type').value,
        due_date: document.getElementById('goal-due-date').value || null
    };
    
    try {
        if (editingGoalId) {
            // Update existing goal
            const { error } = await supabaseClient
                .from('goals')
                .update(goalData)
                .eq('id', editingGoalId);
            
            if (error) throw error;
            
            // Update local state immediately (optimistic)
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
            
            // Add to local state immediately (optimistic)
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
    
    const goal = appState.goals.find(g => g.id === editingGoalId);
    const taskCounts = getGoalTaskCounts(editingGoalId);
    
    let confirmMsg = 'Are you sure you want to delete this goal?';
    if (taskCounts.total > 0) {
        confirmMsg = `This goal has ${taskCounts.total} linked task(s). Deleting the goal will unlink these tasks. Continue?`;
    }
    
    if (!confirm(confirmMsg)) return;
    
    try {
        // Delete the goal (tasks will have goal_id set to NULL due to ON DELETE SET NULL)
        const { error } = await supabaseClient
            .from('goals')
            .delete()
            .eq('id', editingGoalId);
        
        if (error) throw error;
        
        // Remove from local state immediately (optimistic)
        appState.goals = appState.goals.filter(g => g.id !== editingGoalId);
        
        // Update tasks that were linked to this goal
        appState.tasks.forEach(task => {
            if (task.goal_id === editingGoalId) {
                task.goal_id = null;
            }
        });
        
        renderGoals();
        closeGoalModal();
        showToast('Goal deleted successfully', 'success');
        
    } catch (error) {
        console.error('Error deleting goal:', error);
        showToast('Failed to delete goal', 'error');
    }
}

// Drag-and-drop handlers (optimistic updates)
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

// Reorder goals with optimistic UI update
async function reorderGoals(draggedId, targetId) {
    const activeGoals = appState.goals
        .filter(g => g.status === 'active')
        .sort((a, b) => (a.user_order || 0) - (b.user_order || 0));
    
    const draggedIndex = activeGoals.findIndex(g => g.id === draggedId);
    const targetIndex = activeGoals.findIndex(g => g.id === targetId);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // OPTIMISTIC UPDATE: Update UI immediately
    const [draggedGoal] = activeGoals.splice(draggedIndex, 1);
    activeGoals.splice(targetIndex, 0, draggedGoal);
    
    // Update user_order in local state
    activeGoals.forEach((goal, index) => {
        goal.user_order = index + 1;
    });
    
    // Render immediately
    renderGoals();
    
    // Then update database in background
    try {
        const updates = activeGoals.map((goal, index) => ({
            id: goal.id,
            user_order: index + 1
        }));
        
        for (const update of updates) {
            const { error } = await supabaseClient
                .from('goals')
                .update({ user_order: update.user_order })
                .eq('id', update.id);
            
            if (error) throw error;
        }
        
    } catch (error) {
        console.error('Error reordering goals:', error);
        showToast('Failed to save new order', 'error');
    }
}
