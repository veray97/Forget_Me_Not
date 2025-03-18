// DOM 元素
const notesList = document.getElementById('notes-list');
const titleInput = document.getElementById('note-title');
const contentTextarea = document.getElementById('note-content');
const saveBtn = document.getElementById('save-btn');
const newBtn = document.getElementById('new-btn');
const deleteBtn = document.getElementById('delete-btn');

// 当前选中的笔记
let currentNoteId = null;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    // 检查用户是否已登录
    checkAuth().then(user => {
        console.log('用户已登录，用户ID:', user.uid);
        // 用户已登录，继续加载页面
        initPage();
    }).catch(error => {
        console.error('认证检查失败:', error);
        // 错误处理已在checkAuth函数中完成（重定向到登录页面）
    });
});

// 初始化页面
function initPage() {
    // 事件监听
    saveBtn.addEventListener('click', saveNote);
    newBtn.addEventListener('click', newNote);
    deleteBtn.addEventListener('click', deleteNote);
    
    // 初始加载
    loadNotes();
}

// 加载所有笔记
function loadNotes() {
    notesList.innerHTML = '<div class="loading">加载笔记中...</div>';
    
    // 获取用户特定的笔记引用
    const userNotes = userNotesRef();
    if (!userNotes) {
        notesList.innerHTML = '<div class="error">用户未登录，无法加载笔记</div>';
        return;
    }
    
    userNotes.orderByChild('timestamp').once('value', (snapshot) => {
        notesList.innerHTML = '';
        
        const notes = [];
        snapshot.forEach((childSnapshot) => {
            const note = childSnapshot.val();
            note.id = childSnapshot.key;
            notes.push(note);
        });
        
        // 按时间倒序排列
        notes.reverse().forEach((note) => {
            const noteItem = createNoteItem(note);
            notesList.appendChild(noteItem);
        });
        
        if (notes.length === 0) {
            notesList.innerHTML = '<div class="note-item">没有笔记，点击"新建笔记"开始</div>';
        }
    });
}

// 创建笔记列表项
function createNoteItem(note) {
    const noteItem = document.createElement('div');
    noteItem.className = 'note-item';
    noteItem.dataset.id = note.id;
    
    const date = new Date(note.timestamp);
    const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    
    noteItem.innerHTML = `
        <div class="note-title">${note.title || '无标题'}</div>
        <div class="note-preview">${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}</div>
        <div class="note-date">${formattedDate}</div>
    `;
    
    noteItem.addEventListener('click', () => {
        document.querySelectorAll('.note-item').forEach(item => {
            item.classList.remove('active');
        });
        noteItem.classList.add('active');
        
        currentNoteId = note.id;
        titleInput.value = note.title || '';
        contentTextarea.value = note.content || '';
    });
    
    return noteItem;
}

// 保存笔记
function saveNote() {
    const title = titleInput.value.trim();
    const content = contentTextarea.value.trim();
    
    if (!content) {
        alert('笔记内容不能为空');
        return;
    }
    
    // 获取用户特定的笔记引用
    const userNotes = userNotesRef();
    if (!userNotes) {
        alert('用户未登录，无法保存笔记');
        window.location.href = 'login.html';
        return;
    }
    
    // 显示保存中状态
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
    
    const noteData = {
        title: title,
        content: content,
        timestamp: Date.now()
    };
    
    if (currentNoteId) {
        // 更新现有笔记
        userNotes.child(currentNoteId).update(noteData)
            .then(() => {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '保存笔记';
                loadNotes();
            })
            .catch((error) => {
                console.error('更新笔记失败:', error);
                alert('更新笔记失败: ' + error.message);
                saveBtn.disabled = false;
                saveBtn.innerHTML = '保存笔记';
            });
    } else {
        // 创建新笔记
        userNotes.push(noteData)
            .then((ref) => {
                currentNoteId = ref.key;
                saveBtn.disabled = false;
                saveBtn.innerHTML = '保存笔记';
                loadNotes();
            })
            .catch((error) => {
                console.error('保存笔记失败:', error);
                alert('保存笔记失败: ' + error.message);
                saveBtn.disabled = false;
                saveBtn.innerHTML = '保存笔记';
            });
    }
}

// 删除笔记
function deleteNote() {
    if (!currentNoteId) {
        alert('请先选择一个笔记');
        return;
    }
    
    // 获取用户特定的笔记引用
    const userNotes = userNotesRef();
    if (!userNotes) {
        alert('用户未登录，无法删除笔记');
        window.location.href = 'login.html';
        return;
    }
    
    if (confirm('确定要删除这个笔记吗？此操作不可撤销。')) {
        // 显示删除中状态
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 删除中...';
        
        userNotes.child(currentNoteId).remove()
            .then(() => {
                currentNoteId = null;
                titleInput.value = '';
                contentTextarea.value = '';
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '删除笔记';
                loadNotes();
            })
            .catch((error) => {
                console.error('删除笔记失败:', error);
                alert('删除笔记失败: ' + error.message);
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = '删除笔记';
            });
    }
}

// 新建笔记
function newNote() {
    currentNoteId = null;
    titleInput.value = '';
    contentTextarea.value = '';
    
    document.querySelectorAll('.note-item').forEach(item => {
        item.classList.remove('active');
    });
} 