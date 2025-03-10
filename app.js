// DOM 元素
const notesList = document.getElementById('notes-list');
const titleInput = document.getElementById('note-title');
const contentTextarea = document.getElementById('note-content');
const saveBtn = document.getElementById('save-btn');
const newBtn = document.getElementById('new-btn');
const deleteBtn = document.getElementById('delete-btn');

// 当前选中的笔记
let currentNoteId = null;

// 加载所有笔记
function loadNotes() {
    notesList.innerHTML = '<div class="loading">加载笔记中...</div>';
    
    notesRef.orderByChild('timestamp').once('value', (snapshot) => {
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
    
    const noteData = {
        title: title,
        content: content,
        timestamp: Date.now()
    };
    
    if (currentNoteId) {
        // 更新现有笔记
        notesRef.child(currentNoteId).update(noteData)
            .then(() => {
                loadNotes();
            })
            .catch((error) => {
                console.error('更新笔记失败:', error);
                alert('更新笔记失败，请重试');
            });
    } else {
        // 创建新笔记
        notesRef.push(noteData)
            .then((ref) => {
                currentNoteId = ref.key;
                loadNotes();
            })
            .catch((error) => {
                console.error('保存笔记失败:', error);
                alert('保存笔记失败，请重试');
            });
    }
}

// 删除笔记
function deleteNote() {
    if (!currentNoteId) {
        alert('请先选择一个笔记');
        return;
    }
    
    if (confirm('确定要删除这个笔记吗？此操作不可撤销。')) {
        notesRef.child(currentNoteId).remove()
            .then(() => {
                currentNoteId = null;
                titleInput.value = '';
                contentTextarea.value = '';
                loadNotes();
            })
            .catch((error) => {
                console.error('删除笔记失败:', error);
                alert('删除笔记失败，请重试');
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

// 事件监听
saveBtn.addEventListener('click', saveNote);
newBtn.addEventListener('click', newNote);
deleteBtn.addEventListener('click', deleteNote);

// 初始加载
loadNotes(); 