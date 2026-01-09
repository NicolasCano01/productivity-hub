// ============================================
// PRODUCTIVITY HUB - CATEGORY MANAGEMENT
// ============================================


// Available colors for categories
const CATEGORY_COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16', '#10B981',
    '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1', '#8B5CF6',
    '#A855F7', '#D946EF', '#EC4899', '#F43F5E', '#64748B'
];

let selectedColor = CATEGORY_COLORS[0];

// Open category management modal
function openCategoryModal() {
    const modal = document.getElementById('category-modal');
    modal.classList.remove('hidden');
    
    // Reset form
    editingCategoryId = null;
    document.getElementById('category-form').reset();
    selectedColor = CATEGORY_COLORS[0];
    
    // Render color picker
    renderColorPicker();
    
    // Render category list
    renderCategoryList();
}

// Close category modal
function closeCategoryModal() {
    document.getElementById('category-modal').classList.add('hidden');
    editingCategoryId = null;
}

// Render color picker circles
function renderColorPicker() {
    const container = document.getElementById('color-picker');
    container.innerHTML = CATEGORY_COLORS.map(color => 
        '<button type="button" class="w-10 h-10 rounded-full border-2 transition-all ' + 
        (color === selectedColor ? 'border-gray-800 scale-110' : 'border-transparent') + 
        '" style="background-color: ' + color + ';" onclick="selectColor(\'' + color + '\')"></button>'
    ).join('');
}

// Select a color
function selectColor(color) {
    selectedColor = color;
    renderColorPicker();
}

// Render list of existing categories
function renderCategoryList() {
    const list = document.getElementById('category-list');
    
    if (appState.categories.length === 0) {
        list.innerHTML = '<p class="text-gray-500 text-sm text-center py-4">No categories yet</p>';
        return;
    }
    
    list.innerHTML = appState.categories.map(cat => 
        '<div class="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition">' +
        '<div class="flex items-center gap-3">' +
        '<div class="w-6 h-6 rounded-full" style="background-color: ' + cat.color_hex + ';"></div>' +
        '<span class="font-medium text-gray-800">' + escapeHtml(cat.name) + '</span>' +
        '</div>' +
        '<div class="flex items-center gap-2">' +
        '<button onclick="editCategory(\'' + cat.id + '\')" class="text-primary hover:text-blue-700 p-1" title="Edit">' +
        '<i class="fas fa-pen text-sm"></i>' +
        '</button>' +
        '<button onclick="deleteCategory(\'' + cat.id + '\')" class="text-danger hover:text-red-700 p-1" title="Delete">' +
        '<i class="fas fa-trash text-sm"></i>' +
        '</button>' +
        '</div>' +
        '</div>'
    ).join('');
}

// Edit existing category
function editCategory(categoryId) {
    const category = appState.categories.find(c => c.id === categoryId);
    if (!category) return;
    
    editingCategoryId = categoryId;
    document.getElementById('category-name').value = category.name;
    selectedColor = category.color_hex;
    renderColorPicker();
    
    // Scroll to top
    document.querySelector('#category-modal .modal-content').scrollTop = 0;
}

// Save category (create or update)
async function saveCategory(event) {
    event.preventDefault();
    
    const categoryName = document.getElementById('category-name').value.trim();
    
    if (!categoryName) {
        showToast('Please enter a category name', 'error');
        return;
    }
    
    // Check for duplicate names (excluding current if editing)
    const duplicate = appState.categories.find(c => 
        c.name.toLowerCase() === categoryName.toLowerCase() && 
        c.id !== editingCategoryId
    );
    
    if (duplicate) {
        showToast('A category with this name already exists', 'error');
        return;
    }
    
    const categoryData = {
        name: categoryName,
        color_hex: selectedColor
    };
    
    try {
        if (editingCategoryId) {
            // Update existing category
            const { error } = await supabaseClient
                .from('categories')
                .update(categoryData)
                .eq('id', editingCategoryId);
            
            if (error) throw error;
            
            // Update local state
            const categoryIndex = appState.categories.findIndex(c => c.id === editingCategoryId);
            if (categoryIndex !== -1) {
                appState.categories[categoryIndex] = {
                    ...appState.categories[categoryIndex],
                    ...categoryData
                };
            }
            
            showToast('Category updated successfully', 'success');
        } else {
            // Create new category
            const { data, error } = await supabaseClient
                .from('categories')
                .insert([{
                    ...categoryData,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();
            
            if (error) throw error;
            
            appState.categories.push(data);
            showToast('Category created successfully', 'success');
        }
        
        // Reset form and refresh UI
        editingCategoryId = null;
        document.getElementById('category-form').reset();
        selectedColor = CATEGORY_COLORS[0];
        renderColorPicker();
        renderCategoryList();
        
        // Refresh all panels that use categories
        if (typeof renderTasks === 'function') renderTasks();
        if (typeof renderGoals === 'function') renderGoals();
        if (typeof populateFilterDropdowns === 'function') populateFilterDropdowns();
        
    } catch (error) {
        console.error('Error saving category:', error);
        showToast('Failed to save category', 'error');
    }
}

// Delete category
async function deleteCategory(categoryId) {
    const category = appState.categories.find(c => c.id === categoryId);
    if (!category) return;
    
    // Count tasks/goals using this category
    const tasksCount = appState.tasks.filter(t => t.category_id === categoryId).length;
    const goalsCount = appState.goals.filter(g => {
        const categoryMap = {
            'travel': 'Travel', 'personal': 'Personal', 'career': 'Work',
            'health': 'Health', 'financial': 'Finance', 'learning': 'Learning', 'other': 'Other'
        };
        const categoryName = categoryMap[g.goal_type] || 'Other';
        const matchedCat = appState.categories.find(c => c.name === categoryName);
        return matchedCat && matchedCat.id === categoryId;
    }).length;
    
    let confirmMsg = 'Delete "' + category.name + '" category?';
    if (tasksCount > 0 || goalsCount > 0) {
        confirmMsg += '\n\n' + tasksCount + ' task(s) and ' + goalsCount + ' goal(s) will be unlinked.';
    }
    
    if (!confirm(confirmMsg)) return;
    
    try {
        const { error } = await supabaseClient
            .from('categories')
            .delete()
            .eq('id', categoryId);
        
        if (error) throw error;
        
        // Update local state
        appState.categories = appState.categories.filter(c => c.id !== categoryId);
        
        // Update tasks/goals that used this category (handled by DB ON DELETE SET NULL)
        appState.tasks.forEach(task => {
            if (task.category_id === categoryId) {
                task.category_id = null;
            }
        });
        
        renderCategoryList();
        showToast('Category deleted successfully', 'success');
        
        // Refresh all panels
        if (typeof renderTasks === 'function') renderTasks();
        if (typeof renderGoals === 'function') renderGoals();
        if (typeof populateFilterDropdowns === 'function') populateFilterDropdowns();
        
    } catch (error) {
        console.error('Error deleting category:', error);
        showToast('Failed to delete category', 'error');
    }
}
