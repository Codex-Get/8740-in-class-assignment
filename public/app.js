// API base URL - adjust if needed
const API_BASE = '';

// Toast notification helper
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// Tab switching
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        const tabName = button.dataset.tab;
        
        // Update active tab button
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        button.classList.add('active');
        
        // Update active tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Load data for the active tab
        if (tabName === 'pantry') {
            loadPantryItems();
        } else if (tabName === 'recipes') {
            loadRecipes();
        }
    });
});

// Pantry Items Management
async function loadPantryItems() {
    const container = document.getElementById('pantry-items');
    container.innerHTML = '<p class="loading">Loading pantry items...</p>';
    
    try {
        const response = await fetch(`${API_BASE}/pantry/items`);
        if (!response.ok) throw new Error('Failed to load pantry items');
        
        const items = await response.json();
        
        if (items.length === 0) {
            container.innerHTML = '<p class="info">No pantry items yet. Add your first item above!</p>';
            return;
        }
        
        container.innerHTML = items.map(item => createPantryItemCard(item)).join('');
        
        // Add delete event listeners
        document.querySelectorAll('.delete-item').forEach(btn => {
            btn.addEventListener('click', () => deleteItem(btn.dataset.id));
        });
    } catch (error) {
        container.innerHTML = '<p class="info">Error loading pantry items. Please try again.</p>';
        showToast('Error loading pantry items', 'error');
        console.error(error);
    }
}

function createPantryItemCard(item) {
    const statusClass = item.status || 'fresh';
    const freshnessPercent = Math.round((item.freshnessScore || 1) * 100);
    const daysText = item.daysUntilExpiry >= 0 
        ? `${item.daysUntilExpiry} days until expiry`
        : `Expired ${Math.abs(item.daysUntilExpiry)} days ago`;
    
    const storageIcon = {
        fridge: '🧊',
        freezer: '❄️',
        pantry: '🗄️'
    }[item.item.storageZone] || '';
    
    const tags = item.item.tags && item.item.tags.length > 0
        ? `<div class="item-tags">${item.item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>`
        : '';
    
    return `
        <div class="item-card ${statusClass}">
            <div class="item-header">
                <div class="item-name">${item.item.name}</div>
                <div class="item-status ${statusClass}">${statusClass}</div>
            </div>
            <div class="item-details">
                <div><strong>Quantity:</strong> ${item.item.quantity} ${item.item.unit}</div>
                <div><strong>Storage:</strong> ${storageIcon} ${item.item.storageZone || 'Not specified'}</div>
                <div><strong>Expires:</strong> ${new Date(item.expiresAt).toLocaleDateString()}</div>
                <div><strong>${daysText}</strong></div>
            </div>
            <div class="freshness-bar">
                <div class="freshness-fill ${statusClass}" style="width: ${freshnessPercent}%"></div>
            </div>
            <div style="font-size: 0.9rem; color: #666;">Freshness: ${freshnessPercent}%</div>
            ${tags}
            <div class="item-actions">
                <button class="btn btn-danger delete-item" data-id="${item.item.id}">Delete</button>
            </div>
        </div>
    `;
}

async function deleteItem(id) {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/pantry/items/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Failed to delete item');
        
        showToast('Item deleted successfully');
        loadPantryItems();
    } catch (error) {
        showToast('Error deleting item', 'error');
        console.error(error);
    }
}

// Add pantry item form
document.getElementById('add-item-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('item-name').value;
    const quantity = parseFloat(document.getElementById('item-quantity').value);
    const unit = document.getElementById('item-unit').value;
    const shelfLifeDays = parseInt(document.getElementById('item-shelf-life').value);
    const storageZone = document.getElementById('item-storage').value;
    const expiresAt = document.getElementById('item-expires').value;
    const tags = document.getElementById('item-tags').value
        .split(',')
        .map(t => t.trim())
        .filter(t => t);
    
    const addedAt = new Date().toISOString();
    
    const itemData = {
        name,
        quantity,
        unit,
        addedAt,
        shelfLifeDays
    };
    
    if (storageZone) itemData.storageZone = storageZone;
    if (expiresAt) itemData.expiresAt = new Date(expiresAt).toISOString();
    if (tags.length > 0) itemData.tags = tags;
    
    try {
        const response = await fetch(`${API_BASE}/pantry/items`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(itemData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add item');
        }
        
        showToast('Item added successfully');
        e.target.reset();
        loadPantryItems();
    } catch (error) {
        showToast('Error adding item', 'error');
        console.error(error);
    }
});

// Recipe Management
async function loadRecipes() {
    const container = document.getElementById('recipes-list');
    container.innerHTML = '<p class="loading">Loading recipes...</p>';
    
    try {
        const response = await fetch(`${API_BASE}/recipes`);
        if (!response.ok) throw new Error('Failed to load recipes');
        
        const recipes = await response.json();
        
        if (recipes.length === 0) {
            container.innerHTML = '<p class="info">No recipes yet. Add your first recipe above!</p>';
            return;
        }
        
        container.innerHTML = recipes.map(recipe => createRecipeCard(recipe)).join('');
    } catch (error) {
        container.innerHTML = '<p class="info">Error loading recipes. Please try again.</p>';
        showToast('Error loading recipes', 'error');
        console.error(error);
    }
}

function createRecipeCard(recipe) {
    const tags = recipe.tags && recipe.tags.length > 0
        ? `<div class="item-tags">${recipe.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>`
        : '';
    
    return `
        <div class="recipe-card">
            <div class="recipe-name">${recipe.name}</div>
            <div class="recipe-ingredients">
                <h4>Ingredients:</h4>
                <div class="ingredient-list">
                    ${recipe.ingredients.map(ing => `<span class="ingredient">${ing}</span>`).join('')}
                </div>
            </div>
            ${tags}
        </div>
    `;
}

// Add recipe form
document.getElementById('add-recipe-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('recipe-name').value;
    const ingredients = document.getElementById('recipe-ingredients').value
        .split(',')
        .map(i => i.trim())
        .filter(i => i);
    const tags = document.getElementById('recipe-tags').value
        .split(',')
        .map(t => t.trim())
        .filter(t => t);
    
    const recipeData = {
        name,
        ingredients
    };
    
    if (tags.length > 0) recipeData.tags = tags;
    
    try {
        const response = await fetch(`${API_BASE}/recipes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(recipeData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to add recipe');
        }
        
        showToast('Recipe added successfully');
        e.target.reset();
        loadRecipes();
    } catch (error) {
        showToast('Error adding recipe', 'error');
        console.error(error);
    }
});

// Priority Cooking List
document.getElementById('priority-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const container = document.getElementById('priority-list');
    container.innerHTML = '<p class="loading">Loading recommendations...</p>';
    
    const limit = parseInt(document.getElementById('priority-limit').value) || 10;
    const requiredTags = document.getElementById('required-tags').value
        .split(',')
        .map(t => t.trim())
        .filter(t => t);
    const excludedTags = document.getElementById('excluded-tags').value
        .split(',')
        .map(t => t.trim())
        .filter(t => t);
    const excludedIngredients = document.getElementById('excluded-ingredients').value
        .split(',')
        .map(i => i.trim())
        .filter(i => i);
    
    const requestData = {
        limit
    };
    
    const constraints = {};
    if (requiredTags.length > 0) constraints.requiredRecipeTags = requiredTags;
    if (excludedTags.length > 0) constraints.excludedRecipeTags = excludedTags;
    if (excludedIngredients.length > 0) constraints.excludedIngredients = excludedIngredients;
    
    if (Object.keys(constraints).length > 0) {
        requestData.constraints = constraints;
    }
    
    try {
        const response = await fetch(`${API_BASE}/recipes/priority`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to get priority list');
        }
        
        const priorities = await response.json();
        
        if (priorities.length === 0) {
            container.innerHTML = '<p class="info">No matching recipes found. Try adjusting your constraints or add more recipes and pantry items.</p>';
            return;
        }
        
        container.innerHTML = priorities.map((priority, index) => createPriorityCard(priority, index + 1)).join('');
    } catch (error) {
        container.innerHTML = '<p class="info">Error loading recommendations. Please try again.</p>';
        showToast('Error loading recommendations', 'error');
        console.error(error);
    }
});

function createPriorityCard(priority, rank) {
    const tags = priority.recipe.tags && priority.recipe.tags.length > 0
        ? `<div class="item-tags">${priority.recipe.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>`
        : '';
    
    const matchedItemsHtml = priority.matchedItems && priority.matchedItems.length > 0
        ? `
            <div class="matched-items">
                <h4>Matched Ingredients from Your Pantry:</h4>
                ${priority.matchedItems.map(item => `
                    <div class="matched-item">
                        <span>${item.item.name} - ${item.item.quantity} ${item.item.unit}</span>
                        <span class="item-status ${item.status}">${item.status}</span>
                    </div>
                `).join('')}
            </div>
        `
        : '<p style="color: #999; font-size: 0.9rem;">No matching ingredients in pantry</p>';
    
    return `
        <div class="priority-card">
            <div class="priority-header">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div class="priority-rank">#${rank}</div>
                    <div class="recipe-name">${priority.recipe.name}</div>
                </div>
                <div class="priority-score">Score: ${priority.score.toFixed(2)}</div>
            </div>
            <div class="recipe-ingredients">
                <h4>All Ingredients:</h4>
                <div class="ingredient-list">
                    ${priority.recipe.ingredients.map(ing => `<span class="ingredient">${ing}</span>`).join('')}
                </div>
            </div>
            ${tags}
            ${matchedItemsHtml}
        </div>
    `;
}

// Load initial data
loadPantryItems();
