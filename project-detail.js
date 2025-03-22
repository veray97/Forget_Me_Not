// 全局变量和状态
// 注意：不要声明 database 变量，它已经在 firebase-config.js 中声明
let quill;
let progressChart;
let progressData = {
    labels: [],
    datasets: [{
        label: '项目进度',
        data: [],
        borderColor: '#3498db',
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        tension: 0.4,
        fill: true
    }]
};

// DOM 元素
let backBtn, saveBtn, deleteBtn, projectTitle;
let reminderToggle, reminderSettings, reminderDate, reminderMusic, reminderRepeat;
let reminderDurationHours, reminderDurationMinutes;
let addProgressBtn, progressEntries;

// 页面状态变量
let hasUnsavedChanges = false;
let originalContent = null;
let originalProgressEntries = [];

// URL参数
let projectId, quadrantParam;

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    console.log('页面加载完成，开始初始化...');
    
    // 检查 Firebase 数据库是否已初始化
    if (!firebase || !firebase.database) {
        console.error('Firebase 数据库未初始化');
    } else {
        console.log('Firebase 数据库已初始化');
    }
    
    // 获取URL参数
    projectId = getUrlParameter('id');
    quadrantParam = getUrlParameter('quadrant');
    console.log('URL参数:', { projectId, quadrantParam });
    
    // 获取DOM元素引用
    initDOMReferences();
    console.log('DOM元素引用初始化完成');
    
    // 初始化Quill编辑器
    initQuillEditor();
    console.log('Quill编辑器初始化完成');
    
    // 添加保存按钮事件监听器
    saveBtn.addEventListener('click', saveProject);
    console.log('已为保存按钮添加事件监听器');

    // 检查用户是否已登录
    console.log('开始检查用户认证状态...');
    
    // 首先检查 Firebase 是否已正确初始化
    if (!firebase || !firebase.auth) {
        console.error('Firebase 未正确初始化，请检查 firebase-config.js 是否正确加载');
        alert('系统错误：Firebase 未正确初始化。请刷新页面或联系管理员。');
        return;
    }
    
    // 检查当前用户状态
    const currentUser = firebase.auth().currentUser;
    if (currentUser) {
        console.log('用户已登录（同步检查）:', currentUser.uid);
        initPage();
        return;
    }
    
    // 异步检查用户认证状态
    try {
        // onAuthStateChanged 是 Firebase 提供的方法，用于监听用户认证状态变化
        // user 参数是 Firebase 从服务器获取的当前登录用户信息
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // user 对象存在，表示用户已登录
                console.log('用户已登录（异步检查）:', user.uid);
                // 记录用户信息，便于调试
                console.log('用户信息:', {
                    email: user.email,
                    uid: user.uid,
                    isAnonymous: user.isAnonymous,
                    emailVerified: user.emailVerified
                });
                initPage();
            } else {
                // user 为 null，表示用户未登录
                console.log('用户未登录，重定向到登录页面');
                console.log('认证状态:', firebase.auth().currentUser);
                
                // 添加延迟检查，有时 Firebase 认证状态需要时间同步
                setTimeout(() => {
                    const delayedUser = firebase.auth().currentUser;
                    if (delayedUser) {
                        console.log('延迟检查发现用户已登录:', delayedUser.uid);
                        initPage();
                        return;
                    }
                    
                    alert('请先登录后再访问此页面');
                    window.location.href = '/login.html';
                }, 1000);
            }
        });
    } catch (error) {
        console.error('认证检查异常:', error);
        alert('认证检查失败，请重新登录。错误信息: ' + (error.message || '未知错误'));
        window.location.href = '/login.html';
    }
});

// 初始化DOM元素引用
function initDOMReferences() {
    backBtn = document.getElementById('back-btn');
    saveBtn = document.getElementById('save-btn');
    deleteBtn = document.getElementById('delete-btn');
    projectTitle = document.getElementById('project-title');
    reminderToggle = document.getElementById('reminder-toggle');
    reminderSettings = document.getElementById('reminder-settings');
    reminderDate = document.getElementById('reminder-date');
    reminderMusic = document.getElementById('reminder-music');
    reminderRepeat = document.getElementById('reminder-repeat');
    reminderDurationHours = document.getElementById('reminder-duration-hours');
    reminderDurationMinutes = document.getElementById('reminder-duration-minutes');
    addProgressBtn = document.getElementById('add-progress-btn');
    progressEntries = document.getElementById('progress-entries');
}

// 初始化Quill编辑器
function initQuillEditor() {
    quill = new Quill('#editor-container', {
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                ['blockquote', 'code-block'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['link', 'image', 'video'],
                ['clean']
            ]
        },
        theme: 'snow',
        placeholder: '项目概述'
    });
}

// 获取URL参数
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// 初始化页面
function initPage() {
    console.log('开始初始化页面...');
    console.log('参数状态:', { projectId, quadrantParam });
    
    // 根据参数决定加载已有项目或创建新项目
    if (projectId) {
        console.log('检测到项目ID，加载现有项目:', projectId);83
        loadProjectData();
        
        // 只有在编辑现有项目时才启用删除按钮
        if (deleteBtn) {
            deleteBtn.style.display = 'inline-block';
            deleteBtn.addEventListener('click', deleteProject);
        }
    } else if (quadrantParam) {
        console.log('检测到象限参数，显示创建新项目对话框');
        showInputDialog();
        
        // 创建新项目时隐藏删除按钮
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }
    } else {
        console.log('无效的参数组合，返回象限页面');
        alert('无效的项目参数，将返回象限页面');
        window.location.href = '/time-quadrant.html';
    }
    
    // 设置提醒切换事件
    setupReminderToggle();
    
    // 设置项目标题编辑功能
    setupTitleEditing();
    
    // 设置添加进度条目事件
    setupAddProgressEntry();
    
    // 初始化语音输入和弹窗对话框
    initInputDialog();
    
    // 设置返回按钮事件
    setupBackButton();
    
    // 设置修改跟踪
    setupChangeTracking();
}

// 设置提醒切换事件
function setupReminderToggle() {
    reminderToggle.addEventListener('change', () => {
        reminderSettings.style.display = reminderToggle.checked ? 'block' : 'none';
        
        // 如果开启提醒但未设置日期，则默认设置为明天这个时间
        if (reminderToggle.checked && !reminderDate.value) {
            setDefaultReminderDate();
        }
    });
}

// 设置默认提醒日期为明天
function setDefaultReminderDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 格式化为 datetime-local 输入框所需的格式
    const year = tomorrow.getFullYear();
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
    const day = String(tomorrow.getDate()).padStart(2, '0');
    const hours = String(tomorrow.getHours()).padStart(2, '0');
    const minutes = String(tomorrow.getMinutes()).padStart(2, '0');
    
    reminderDate.value = `${year}-${month}-${day}T${hours}:${minutes}`;
}

// 设置项目标题编辑功能
function setupTitleEditing() {
    projectTitle.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = this.textContent.trim() || this.getAttribute('placeholder');
        input.className = 'project-title-input';
        
        input.addEventListener('blur', function() {
            updateProjectTitle(this.value);
            this.replaceWith(projectTitle);
        });
        
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                updateProjectTitle(this.value);
                this.replaceWith(projectTitle);
            }
        });
        
        this.replaceWith(input);
        input.focus();
        input.select();
    });
}

// 更新项目标题
function updateProjectTitle(value) {
    if (value.trim()) {
        projectTitle.textContent = value.trim();
    } else {
        projectTitle.textContent = '';
    }
}

// 设置添加进度条目事件
function setupAddProgressEntry() {
    if (addProgressBtn) {
        addProgressBtn.addEventListener('click', () => {
            createProgressEntry();
        });
    }
}

// 创建进度条目
function createProgressEntry(date = null, progress = '', content = '') {
    // 创建新进度条目
    const entryEl = document.createElement('div');
    entryEl.className = 'progress-entry';
    
    // 获取当前日期，如果未提供则使用今天
    const entryDate = date ? new Date(date) : new Date();
    const dateStr = formatDateForEntry(entryDate);
    
    // 添加HTML内容，使用日期输入框替代静态文本
    entryEl.innerHTML = `
        <div class="progress-entry-header">
            <div class="progress-entry-date-container">
                日期: <input type="date" class="progress-entry-date" value="${dateStr}" style="width: 130px;">
            </div>
            <div class="progress-entry-value-container">
                进度: <input type="number" class="progress-entry-progress" min="0" max="100" value="${progress}" style="width: 50px;"> %
            </div>
        </div>
        <textarea class="progress-entry-input" placeholder="输入此次进度更新的内容...">${content}</textarea>
        <button class="progress-entry-remove"><i class="fas fa-times"></i></button>
    `;
    
    // 添加删除按钮事件
    const removeBtn = entryEl.querySelector('.progress-entry-remove');
    removeBtn.addEventListener('click', () => {
        entryEl.remove();
        updateChart();
    });
    
    // 添加进度输入事件
    const progressInput = entryEl.querySelector('.progress-entry-progress');
    progressInput.addEventListener('change', () => {
        updateChart();
    });
    
    // 添加日期输入事件
    const dateInput = entryEl.querySelector('.progress-entry-date');
    dateInput.addEventListener('change', () => {
        updateChart();
    });
    
    // 添加到容器中
    progressEntries.appendChild(entryEl);
    
    // 更新图表
    updateChart();
    
    return entryEl;
}

// 为进度条目格式化日期
function formatDateForEntry(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// 加载项目数据
function loadProjectData() {
    const userProjects = userProjectsRef();
    if (!userProjects) {
        alert('用户未登录，无法加载项目');
        window.location.href = '/login.html';
        return;
    }
    
    userProjects.child(projectId).once('value', (snapshot) => {
        const project = snapshot.val();
        if (!project) {
            alert('项目不存在，将返回象限页面');
            window.location.href = '/time-quadrant.html';
            return;
        }
        
        // 设置项目标题
        projectTitle.textContent = project.title || '';
        
        // 设置项目内容
        setProjectContent(project.content);
        
        // 加载提醒设置
        loadReminderSettings(project);
        
        // 加载进度历史记录
        loadProgressEntries(project);
        
        // 更新图表
        updateChart();
        
        // 存储原始状态以跟踪更改
        originalContent = project.content;
        originalProgressEntries = project.progressEntries || [];
        
        // 重置更改状态
        hasUnsavedChanges = false;
    });
}

// 获取用户项目数据库引用
function userProjectsRef() {
    const user = firebase.auth().currentUser;
    if (!user) return null;
    return firebase.database().ref(`users/${user.uid}/projects`);
}

// 加载进度历史记录
function loadProgressEntries(project) {
    // 清空现有进度条目
    progressEntries.innerHTML = '';
    
    // 如果存在进度条目数据，则加载
    if (project.progressEntries && Array.isArray(project.progressEntries)) {
        // 按日期排序
        const sortedEntries = project.progressEntries.sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        });
        
        // 创建进度条目
        sortedEntries.forEach(entry => {
            createProgressEntry(entry.date, entry.progress, entry.content);
        });
    } else {
        // 如果没有进度条目，但有进度历史，则从进度历史中创建
        if (project.progressHistory) {
            const sortedHistory = Object.entries(project.progressHistory)
                .sort(([timeA], [timeB]) => parseInt(timeB) - parseInt(timeA));
            
            if (sortedHistory.length > 0) {
                // 只创建最新的一条记录
                const [latestTime, latestProgress] = sortedHistory[0];
                const date = new Date(parseInt(latestTime));
                createProgressEntry(date, latestProgress, '从旧版本自动迁移的进度记录');
            }
        }
        
        // 如果仍然没有条目，创建一个新的
        if (progressEntries.children.length === 0) {
            createProgressEntry(new Date(), project.progress || 0, '初始进度记录');
        }
    }
}

// 从进度条目收集数据
function collectProgressEntries() {
    const entries = [];
    const entryElements = progressEntries.querySelectorAll('.progress-entry');
    
    entryElements.forEach(entryEl => {
        const dateEl = entryEl.querySelector('.progress-entry-date');
        const progressEl = entryEl.querySelector('.progress-entry-progress');
        const contentEl = entryEl.querySelector('.progress-entry-input');
        
        if (dateEl && progressEl && contentEl) {
            const date = dateEl.value;  // 从输入框获取值
            const progress = parseInt(progressEl.value) || 0;
            const content = contentEl.value.trim();
            
            entries.push({
                date: date,
                progress: progress,
                content: content
            });
        }
    });
    
    return entries;
}

// 设置项目内容
function setProjectContent(content) {
    if (!content) return;
    
    try {
        // 尝试解析JSON内容（如果是富文本）
        const contentObj = JSON.parse(content);
        quill.setContents(contentObj);
    } catch (e) {
        // 如果不是JSON，则设置为纯文本
        quill.setText(content);
    }
}

// 加载提醒设置
function loadReminderSettings(project) {
    // 重置提醒设置
    reminderToggle.checked = false;
    reminderSettings.style.display = 'none';
    reminderDate.value = '';
    reminderMusic.value = 'default';
    reminderRepeat.value = 'once';
    reminderDurationHours.value = '0';
    reminderDurationMinutes.value = '30';
    
    // 如果项目有提醒设置，则加载
    if (project.hasReminder) {
        reminderToggle.checked = true;
        reminderSettings.style.display = 'block';
        
        // 设置提醒日期时间
        if (project.reminderTime) {
            const reminderDateTime = new Date(project.reminderTime);
            reminderDate.value = formatDateForInput(reminderDateTime);
        }
        
        // 设置提醒音乐和重复类型
        if (project.reminderMusic) {
            reminderMusic.value = project.reminderMusic;
        }
        
        if (project.reminderRepeat) {
            reminderRepeat.value = project.reminderRepeat;
        }
        
        // 设置预计用时
        if (project.reminderDuration) {
            // 将总分钟数转换为小时和分钟
            const totalMinutes = project.reminderDuration;
            const hours = Math.floor(totalMinutes / 60);
            const minutes = totalMinutes % 60;
            
            reminderDurationHours.value = hours.toString();
            reminderDurationMinutes.value = minutes.toString();
        }
    }
}

// 格式化日期为datetime-local输入框格式
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// 更新图表
function updateChart() {
    // 更新标题显示未更新天数
    updateChartTitle();
    
    // 清空现有数据
    progressData.labels = [];
    progressData.datasets[0].data = [];
    
    // 获取所有进度条目
    const entryElements = progressEntries.querySelectorAll('.progress-entry');
    
    // 按日期排序（升序）
    const entries = [];
    entryElements.forEach(entryEl => {
        const dateEl = entryEl.querySelector('.progress-entry-date');
        const progressEl = entryEl.querySelector('.progress-entry-progress');
        
        if (dateEl && progressEl) {
            const date = dateEl.value;  // 从输入框获取日期值
            const progress = parseInt(progressEl.value) || 0;
            
            entries.push({ date, progress });
        }
    });
    
    // 按日期排序
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 填充数据
    entries.forEach(entry => {
        const date = new Date(entry.date);
        const dateStr = formatDateForChart(date);
        
        progressData.labels.push(dateStr);
        progressData.datasets[0].data.push(entry.progress);
    });
    
    // 如果没有数据，添加一个空的数据点
    if (progressData.labels.length === 0) {
        const today = new Date();
        const todayStr = formatDateForChart(today);
        
        progressData.labels.push(todayStr);
        progressData.datasets[0].data.push(0);
    }
    
    // 更新图表
    if (progressChart) {
        progressChart.update();
    } else {
        initChart();
    }
}

// 更新图表标题以显示未更新天数
function updateChartTitle() {
    const chartTitle = document.getElementById('chart-title');
    if (!chartTitle) return;
    
    // 获取最新的进度记录日期
    const entryElements = progressEntries.querySelectorAll('.progress-entry');
    if (entryElements.length === 0) {
        chartTitle.textContent = '进度追踪';
        return;
    }
    
    // 找到最新的日期
    let latestDate = null;
    entryElements.forEach(entryEl => {
        const dateEl = entryEl.querySelector('.progress-entry-date');
        if (dateEl) {
            const date = new Date(dateEl.value);  // 从输入框获取日期值
            if (!latestDate || date > latestDate) {
                latestDate = date;
            }
        }
    });
    
    if (!latestDate) {
        chartTitle.textContent = '进度追踪';
        return;
    }
    
    // 计算与当前日期的差距
    const today = new Date();
    const diffTime = Math.abs(today - latestDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // 更新标题
    if (diffDays <= 0) {
        chartTitle.textContent = '今天已更新项目进度';
    } else if (diffDays === 1) {
        chartTitle.textContent = '1天未更新项目进度';
    } else {
        chartTitle.textContent = `${diffDays}天未更新项目进度`;
    }
}

// 格式化日期为图表显示格式
function formatDateForChart(date) {
    return `${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}-${date.getFullYear()}`;
}

// 初始化图表
function initChart() {
    const ctx = document.getElementById('progress-chart').getContext('2d');
    progressChart = new Chart(ctx, {
        type: 'line',
        data: progressData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: '进度 (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '日期'
                    }
                }
            }
        }
    });
}

// 保存项目
function saveProject(callback) {
    console.log('saveProject 函数已触发');
    
    // 检查用户是否已登录
    const user = firebase.auth().currentUser;
    
    if (!user) {
        console.log('同步检查未发现用户，尝试异步检查...');
        
        // 如果同步检查未发现用户，尝试使用异步方法
        firebase.auth().onAuthStateChanged(function(asyncUser) {
            if (asyncUser) {
                console.log('异步检查发现用户，继续保存...');
                // 找到用户后，继续保存过程
                continueProjectSave(asyncUser, callback);
            } else {
                console.error('用户未登录，无法保存项目');
                alert('用户未登录，无法保存项目，请重新登录');
                window.location.href = '/login.html';
            }
        });
    } else {
        // 用户已登录，直接继续
        console.log('同步检查发现用户，继续保存...');
        continueProjectSave(user, callback);
    }
}

// 继续保存项目（在确认用户已登录后）
function continueProjectSave(user, callback) {
    console.log('继续保存项目，用户ID:', user.uid);
    
    // 获取用户特定的项目引用
    const userProjects = firebase.database().ref(`users/${user.uid}/projects`);
    
    // 获取项目数据
    const projectData = getProjectData();
    if (!projectData) {
        console.error('获取项目数据失败');
        return;
    }
    
    // 显示保存中状态
    showSavingState();
    
    // 保存到Firebase
    if (projectId) {
        // 更新现有项目
        console.log('更新现有项目:', projectId);
        userProjects.child(projectId).update(projectData)
            .then(() => {
                console.log('项目更新成功');
                restoreSaveButton();
                
                // 重置更改状态
                hasUnsavedChanges = false;
                originalContent = JSON.stringify(quill.getContents());
                originalProgressEntries = collectProgressEntries();
                
                // 如果有回调函数则执行它
                if (typeof callback === 'function') {
                    callback();
                    return;
                }
                
                // 询问用户是否返回象限页面
                if (confirm('项目保存成功！是否返回象限页面？')) {
                    window.location.href = '/time-quadrant.html';
                } else {
                    // 重新加载进度历史
                    loadProgressEntries(projectData);
                }
            })
            .catch((error) => {
                console.error('保存项目失败:', error);
                alert('保存项目失败: ' + error.message);
                restoreSaveButton();
            });
    } else {
        // 创建新项目
        console.log('创建新项目');
        userProjects.push(projectData)
            .then((ref) => {
                console.log('新项目创建成功，ID:', ref.key);
                restoreSaveButton();
                
                // 重置更改状态
                hasUnsavedChanges = false;
                projectId = ref.key; // 更新项目ID
                originalContent = JSON.stringify(quill.getContents());
                originalProgressEntries = collectProgressEntries();
                
                // 如果有回调函数则执行它
                if (typeof callback === 'function') {
                    callback();
                    return;
                }
                
                // 询问用户是否返回象限页面
                if (confirm('项目创建成功！是否返回象限页面？')) {
                    window.location.href = '/time-quadrant.html';
                } else {
                    // 重定向到带有新项目ID的URL
                    window.location.href = `/project-detail.html?id=${ref.key}`;
                }
            })
            .catch((error) => {
                console.error('创建项目失败:', error);
                alert('创建项目失败: ' + error.message);
                restoreSaveButton();
            });
    }
}

// 获取项目数据
function getProjectData() {
    const content = JSON.stringify(quill.getContents());
    const title = projectTitle.textContent || projectTitle.getAttribute('placeholder');
    
    // 验证标题
    if (!title.trim()) {
        alert('请输入项目标题');
        projectTitle.focus();
        return null;
    }
    
    console.log('准备保存项目:', {
        title: title,
        projectId: projectId,
        quadrantParam: quadrantParam
    });
    
    // 获取当前时间戳
    const timestamp = Date.now();
    
    // 准备更新数据
    const updates = {
        title: title,
        content: content,
        lastUpdated: timestamp
    };
    
    // 获取进度条目数据
    const progressEntries = collectProgressEntries();
    
    // 如果有进度条目，计算最新的进度作为总进度
    if (progressEntries.length > 0) {
        // 按日期排序（降序）
        progressEntries.sort((a, b) => new Date(b.date) - new Date(a.date));
        // 使用最新的进度作为当前进度
        updates.progress = progressEntries[0].progress;
    } else {
        updates.progress = 0;
    }
    
    // 保存进度条目
    updates.progressEntries = progressEntries;
    
    // 如果从未保存过，则添加创建时间戳和象限信息
    if (!projectId && quadrantParam) {
        updates.quadrant = quadrantParam;
        updates.timestamp = timestamp;
    }
    
    // 保存提醒设置
    if (reminderToggle.checked) {
        updates.hasReminder = true;
        
        if (reminderDate.value) {
            updates.reminderTime = new Date(reminderDate.value).getTime();
        }
        
        updates.reminderMusic = reminderMusic.value;
        updates.reminderRepeat = reminderRepeat.value;
        
        // 保存预计用时（转换为总分钟数）
        const hours = parseInt(reminderDurationHours.value) || 0;
        const minutes = parseInt(reminderDurationMinutes.value) || 0;
        updates.reminderDuration = hours * 60 + minutes;
    } else {
        updates.hasReminder = false;
    }
    
    // 创建进度历史对象，保持向后兼容
    updates.progressHistory = {};
    progressEntries.forEach(entry => {
        const entryDate = new Date(entry.date).getTime();
        updates.progressHistory[entryDate.toString()] = entry.progress;
    });
    
    return updates;
}

// 显示保存中状态
function showSavingState() {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
}

// 恢复保存按钮状态
function restoreSaveButton() {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-save"></i> 保存';
}

// 显示输入对话框
async function showInputDialog() {
    // 获取对话框元素
    const inputDialog = document.getElementById('input-dialog');
    if (!inputDialog) {
        console.error('对话框元素未找到，无法显示对话框');
        return;
    }
    
    // 显示弹窗
    inputDialog.style.display = 'flex';
    
    // 清空输入框
    const dialogInput = document.getElementById('dialog-input');
    if (dialogInput) {
        dialogInput.value = '';
    }
    
    // 移除旧的事件监听器（避免重复绑定）
    const dialogCancel = document.getElementById('dialog-cancel');
    const dialogSubmit = document.getElementById('dialog-submit');
    
    if (dialogCancel) dialogCancel.onclick = null;
    if (dialogSubmit) dialogSubmit.onclick = null;
    
    // 添加新的事件监听器
    if (dialogCancel) {
        dialogCancel.onclick = handleDialogCancel;
    }
    
    if (dialogSubmit) {
        dialogSubmit.onclick = handleDialogSubmit;
    }
    
    // 取消按钮处理函数
    function handleDialogCancel() {
        // 确保在取消时关闭所有录音和WebSocket连接
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn && voiceBtn.classList.contains('recording')) {
            // 触发点击事件以停止录音
            voiceBtn.click();
        }
        
        inputDialog.style.display = 'none';
        // 重定向回时间象限页面
        window.location.href = '/time-quadrant.html';
    }
    
    // 提交按钮处理函数
    async function handleDialogSubmit() {
        console.log("提交按钮点击事件已触发");
        const content = dialogInput.value.trim();
        
        if (!content) {
            alert('请输入项目详情');
            return;
        }
        
        // 确保在提交前停止任何进行中的录音
        const voiceBtn = document.getElementById('voice-btn');
        if (voiceBtn && voiceBtn.classList.contains('recording')) {
            // 触发点击事件以停止录音
            voiceBtn.click();
        }
        
        // 显示处理中状态
        dialogSubmit.disabled = true;
        dialogSubmit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 处理中...';
        
        try {
            // 处理内容，将其拆分为每一行
            const lines = content.split('\n');
            
            // 过滤掉所有包含 [正在录音] 或 [识别录音中] 的行
            const filteredLines = lines.filter(line => 
                !line.includes('[正在录音]') && 
                !line.includes('[识别录音中]')
            );
            
            // 合并剩余的文本作为识别内容
            const assemblyContent = filteredLines.join('\n').trim();
            console.log("使用处理后的内容:", assemblyContent);
            
            // 使用 ChatGPT API 解析项目详情
            console.log("开始调用 parseProjectDetails 函数");
            const parsedInfo = await parseProjectDetails(assemblyContent);
            console.log('解析结果:', parsedInfo);
            
            if (!parsedInfo) {
                console.warn("解析结果为空，使用默认值");
                // 使用默认值
                handleWithDefaultValues(assemblyContent);
                return;
            }
            
            // 关闭弹窗
            inputDialog.style.display = 'none';
            
            // 设置项目内容
            quill.setText(assemblyContent);
            
            // 设置项目标题（如果 API 解析出了标题，否则自动生成一个）
            if (parsedInfo && parsedInfo.title) {
                projectTitle.textContent = parsedInfo.title;
            } else {
                // 如果没有标题，使用当前日期和"新添加项目"作为标题
                const today = new Date();
                const dateStr = ('0' + (today.getMonth() + 1)).slice(-2) + 
                               ('0' + today.getDate()).slice(-2) + 
                               today.getFullYear();
                const autoTitle = dateStr + "新添加项目";
                projectTitle.textContent = autoTitle;
            }
            
            // 设置进度（如果 API 解析出了进度，否则默认为0）
            const progress = parsedInfo && parsedInfo.progress !== undefined ? parsedInfo.progress : 0;
            
            // 创建第一个进度条目
            createProgressEntry(new Date(), progress, assemblyContent);
            
            // 设置提醒（如果 API 解析出了提醒设置）
            if (parsedInfo && parsedInfo.reminderTime) {
                reminderToggle.checked = true;
                reminderSettings.style.display = 'block';
                
                // 设置提醒时间
                const [hours, minutes] = parsedInfo.reminderTime.split(':');
                const now = new Date();
                now.setHours(hours, minutes, 0);
                reminderDate.value = now.toISOString().slice(0, 16);
                
                // 设置提醒频率
                if (parsedInfo.reminderFrequency) {
                    reminderRepeat.value = parsedInfo.reminderFrequency;
                }
                
                // 设置预计用时
                if (parsedInfo.reminderDuration) {
                    const duration = parsedInfo.reminderDuration;
                    const durationHours = Math.floor(duration / 60);
                    const durationMinutes = duration % 60;
                    
                    reminderDurationHours.value = durationHours.toString();
                    reminderDurationMinutes.value = durationMinutes.toString();
                }
            }
            
            // 更新图表
            updateChart();
            
            // 自动保存项目
            saveProject();
        } catch (error) {
            console.error('处理项目详情失败:', error);
            alert('处理失败: ' + error.message);
            
            // 恢复按钮状态
            dialogSubmit.disabled = false;
            dialogSubmit.innerHTML = '添加新项目';
            
            // 如果发生错误，使用默认值继续
            handleWithDefaultValues(assemblyContent);
        }
    }
    
    // 当解析失败时，使用默认值处理内容
    function handleWithDefaultValues(content) {
        console.log("使用默认值处理内容");
        // 关闭弹窗
        inputDialog.style.display = 'none';
        
        // 设置项目内容
        quill.setText(content);
        
        // 使用当前日期和"新添加项目"作为标题
        const today = new Date();
        const dateStr = ('0' + (today.getMonth() + 1)).slice(-2) + 
                       ('0' + today.getDate()).slice(-2) + 
                       today.getFullYear();
        const autoTitle = dateStr + "新添加项目";
        projectTitle.textContent = autoTitle;
        
        // 创建初始进度条目
        createProgressEntry(new Date(), 0, content);
        
        // 更新图表
        updateChart();
        
        // 自动保存项目
        saveProject();
    }
}

// 初始化语音输入和弹窗对话框
function initInputDialog() {
    console.log("初始化语音输入和对话框");
    const voiceBtn = document.getElementById('voice-btn');
    const dialogInput = document.getElementById('dialog-input');
    
    if (!voiceBtn) {
        console.error("未找到语音按钮元素");
        return;
    }
    
    if (!dialogInput) {
        console.error("未找到对话框输入元素");
        return;
    }
    
    // 检查浏览器是否支持语音识别
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        console.log("浏览器支持语音识别，设置语音功能");
        setupSpeechRecognition(voiceBtn, dialogInput);
    } else {
        // 浏览器不支持语音识别
        voiceBtn.style.display = 'none';
        console.warn('当前浏览器不支持语音识别功能');
    }
}

// 设置语音识别功能
function setupSpeechRecognition(voiceBtn, dialogInput) {
    // 保留现有的浏览器语音识别为即时反馈
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // 设置语音识别参数
    recognition.continuous = false;
    recognition.interimResults = true;
    
    // 默认使用中文识别
    let currentLang = 'zh-CN';
    recognition.lang = currentLang;
    
    // 添加语言切换按钮
    const voiceBtnContainer = voiceBtn.parentElement;
    const langToggle = document.createElement('button');
    langToggle.className = 'lang-toggle-btn';
    langToggle.innerHTML = '<i class="fas fa-globe"></i> 中/EN';
    langToggle.style.backgroundColor = '#3498db';
    langToggle.style.color = 'white';
    langToggle.style.border = 'none';
    langToggle.style.padding = '8px';
    langToggle.style.borderRadius = '4px';
    langToggle.style.marginRight = '10px';
    langToggle.style.cursor = 'pointer';
    voiceBtnContainer.insertBefore(langToggle, voiceBtn);
    
    // 语言切换逻辑
    langToggle.addEventListener('click', () => {
        if (currentLang === 'zh-CN') {
            currentLang = 'en-US';
            langToggle.innerHTML = '<i class="fas fa-globe"></i> EN/中';
            // 简化语言切换提示
            dialogInput.value += "\n[已切换到英语]\n";
        } else {
            currentLang = 'zh-CN';
            langToggle.innerHTML = '<i class="fas fa-globe"></i> 中/EN';
            // 简化语言切换提示
            dialogInput.value += "\n[已切换到中文]\n";
        }
        recognition.lang = currentLang;
    });
    
    let isRecording = false;
    let socket = null;
    let mediaRecorder = null;
    let audioChunks = []; // 存储录音数据
    const texts = {}; // 存储实时转录结果

    // 语音按钮点击事件
    voiceBtn.addEventListener('click', () => {
        toggleRecording();
    });
    
    // 切换录音状态
    async function toggleRecording() {
        if (isRecording) {
            stopRecording();
        } else {
            await startRecording();
        }
    }
    
    // 开始录音 - 使用AssemblyAI的实时WebSocket API
    async function startRecording() {
        try {
            // 首先获取临时令牌，避免在客户端暴露API密钥
            const apiKey = ASSEMBLY_API.KEY;
            if (!apiKey || apiKey === 'your-assemblyai-api-key-here') {
                throw new Error("AssemblyAI API 密钥未设置");
            }
            
            // 开始浏览器语音识别（用于即时反馈）
            recognition.start();
            
            // 建立与AssemblyAI的WebSocket连接
            socket = new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&language_code=zh,en`);
            
            // 处理WebSocket消息事件
            socket.onmessage = (message) => {
                try {
                    const res = JSON.parse(message.data);
                    
                    // 检查是否包含文本转录内容
                    if (res.text) {
                        texts[res.audio_start] = res.text;
                        
                        // 如果是最终结果，则更新为最终识别结果
                        if (res.message_type === 'FinalTranscript') {
                            // 替换"识别录音中"为最终识别结果
                            const lines = dialogInput.value.split('\n');
                            const lastLineIndex = lines.findIndex(line => line.includes('[识别录音中]'));
                            
                            if (lastLineIndex !== -1) {
                                // 移除"识别录音中"行，添加识别结果
                                lines.splice(lastLineIndex, 1);
                                lines.push(res.text);
                                dialogInput.value = lines.join('\n');
                            } else {
                                // 如果没有找到"识别录音中"行，直接添加结果
                                dialogInput.value += '\n' + res.text;
                            }
                        }
                    }
                } catch (error) {
                    console.error("处理转录消息失败:", error);
                }
            };
            
            // 处理WebSocket错误
            socket.onerror = (event) => {
                console.error("WebSocket错误:", event);
                socket.close();
                stopRecording();
            };
            
            // 处理WebSocket关闭
            socket.onclose = (event) => {
                console.log("WebSocket连接关闭:", event);
                socket = null;
            };
            
            // 处理WebSocket打开
            socket.onopen = async () => {
                // 发送握手消息，包含认证信息
                socket.send(JSON.stringify({
                    token: apiKey, 
                    expires_at: (new Date(Date.now() + 1000 * 60 * 10)).toISOString(), // 10分钟过期
                    language_preference: currentLang.substring(0, 2) // 'zh' 或 'en'
                }));
                
                // 启动媒体录制
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];
                
                mediaRecorder.ondataavailable = async (event) => {
                    if (event.data.size > 0) {
                        // 将音频数据添加到缓冲区
                        audioChunks.push(event.data);
                        
                        // 转换音频数据为适当的格式并发送
                        const audioBlob = new Blob([event.data], { type: 'audio/webm;codecs=pcm' });
                        const reader = new FileReader();
                        
                        reader.onload = () => {
                            if (socket && socket.readyState === WebSocket.OPEN) {
                                const base64data = reader.result;
                                const audioData = base64data.split('base64,')[1];
                                if (audioData) {
                                    socket.send(JSON.stringify({ audio_data: audioData }));
                                }
                            }
                        };
                        
                        reader.readAsDataURL(audioBlob);
                    }
                };
                
                // 设置较小的时间片，提高实时性
                mediaRecorder.start(100);
                
                voiceBtn.classList.add('recording');
                isRecording = true;
                
                // 显示录音状态 - 简化为只显示"正在录音"
                dialogInput.value += "\n[正在录音]\n";
            };
            
        } catch (error) {
            console.error("录音启动失败:", error);
            dialogInput.value += "\n[录音启动失败: " + error.message + "]\n";
        }
    }
    
    // 停止录音并关闭连接
    function stopRecording() {
        // 停止浏览器语音识别
        recognition.stop();
        
        // 停止录音，并更改提示为"识别录音中"
        const lines = dialogInput.value.split('\n');
        const lastLineIndex = lines.findIndex(line => line.includes('[正在录音]'));
        
        if (lastLineIndex !== -1) {
            // 替换"正在录音"为"识别录音中"
            lines.splice(lastLineIndex, 1, '[识别录音中]');
            dialogInput.value = lines.join('\n');
        } else {
            // 如果没有找到"正在录音"行，直接添加"识别录音中"
            dialogInput.value += "\n[识别录音中]\n";
        }
        
        // 如果WebSocket连接存在，发送终止会话的消息并关闭
        if (socket && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ terminate_session: true }));
            socket.close();
        }
        
        // 如果媒体录制器存在并处于录制状态
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            
            // 释放媒体流
            if (mediaRecorder.stream) {
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
            
            voiceBtn.classList.remove('recording');
            isRecording = false;
        }
    }
    
    // 浏览器语音识别结果事件（用于即时反馈）
    recognition.onresult = (event) => {
        // 禁用浏览器语音识别的实时文本反馈
        // 我们只使用AssemblyAI的结果
    };
}

// 语音合成（文字转语音）
// 保留但默认不使用
function speakText(text) {
    // 默认不启用语音合成
    const enableSpeech = false;
    
    if (enableSpeech && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-CN'; // 设置为中文
        speechSynthesis.speak(utterance);
    }
}

// 设置默认项目值
function setDefaultProjectValues() {
    // 设置默认标题
    projectTitle.textContent = '';
    
    // 创建初始进度条目
    createProgressEntry(new Date(), 0, '');
    
    // 初始化图表
    initChart();
}

// 调试用函数：检查Firebase连接
function debugFirebaseConnection() {
    console.log('检查Firebase连接状态');
    const user = firebase.auth().currentUser;
    
    if (user) {
        console.log('当前登录用户:', user.uid);
        
        const userProjects = userProjectsRef();
        if (userProjects) {
            console.log('用户项目引用获取成功');
            console.log('引用路径:', userProjects.toString());
            
            // 测试连接
            userProjects.limitToFirst(1).once('value')
                .then(snapshot => {
                    console.log('Firebase连接测试成功，获取到数据:', snapshot.val() !== null);
                })
                .catch(error => {
                    console.error('Firebase连接测试失败:', error);
                });
        } else {
            console.error('无法获取用户项目引用');
        }
    } else {
        console.error('用户未登录');
    }
}

// 添加解析项目详情的函数
async function parseProjectDetails(content) {
    console.log("开始解析项目详情:", content.substring(0, 30) + "...");
    try {
        // 使用 api-keys.js 中的 API 密钥
        const apiKey = OPENAI_API.KEY;
        if (!apiKey || apiKey === 'your-openai-api-key-here') {
            console.error("API 密钥未设置或使用了默认值");
            alert('请先在 api-keys.js 文件中设置您的 OpenAI API 密钥');
            return null;
        }
        
        console.log("准备发送 API 请求");
        const response = await fetch(OPENAI_API.URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: OPENAI_API.MODEL,
                messages: [
                    {
                        role: "system",
                        content: "你是一个项目信息解析助手。请从用户输入的项目详情中提取以下信息：\n" +
                                "1. 项目标题（通常在开头，或者根据内容主题推断）\n" +
                                "2. 项目进度（百分比，如果未提及则不返回）\n" +
                                "3. 提醒时间（如果有，返回HH:mm格式）\n" +
                                "4. 提醒频率（每天，每周，每月等）\n" +
                                "5. 预计用时（格式为分钟数，例如：90表示1小时30分钟）\n" +
                                "请以JSON格式返回，格式如下：\n" +
                                "{\n" +
                                "  \"title\": \"项目标题\",\n" +
                                "  \"progress\": 数字,\n" +
                                "  \"reminderTime\": \"HH:mm\",\n" +
                                "  \"reminderFrequency\": \"daily/weekly/monthly\",\n" +
                                "  \"reminderDuration\": 数字\n" +
                                "}\n" +
                                "如果信息未提及，对应字段可以省略。对于提醒频率，请将中文描述（每天、每周、每月）转换为英文格式（daily、weekly、monthly）。\n" +
                                "对于预计用时，请将其转换为总分钟数。例如，1小时30分钟应该转换为90分钟。"
                    },
                    {
                        role: "user",
                        content: content
                    }
                ],
                temperature: 0.3
            })
        });

        if (!response.ok) {
            console.error(`API 请求失败: 状态码 ${response.status}`, await response.text());
            throw new Error(`API请求失败：${response.statusText}`);
        }

        console.log("API 请求成功，处理响应数据");
        const data = await response.json();
        console.log("API 响应数据:", data);
        try {
            // 尝试将返回的内容解析为 JSON
            const parsedResult = JSON.parse(data.choices[0].message.content.trim());
            console.log("API解析结果:", parsedResult);
            return parsedResult;
        } catch (jsonError) {
            console.error('无法解析返回的 JSON:', jsonError);
            console.log('原始返回内容:', data.choices[0].message.content);
            
            // 尝试从文本中提取信息作为备选方案
            console.log('使用备选方法提取信息');
            return extractFallbackInfo(content);
        }
    } catch (error) {
        console.error('解析项目详情失败:', error);
        // 直接使用备选方案
        console.log('发生错误，使用备选方法提取信息');
        return extractFallbackInfo(content);
    }
}

// 备选的信息提取方法，当API解析失败时使用
function extractFallbackInfo(content) {
    console.log("执行备选信息提取方法");
    
    // 简单的标题提取：查找第一行或首句作为标题
    let title = '';
    const firstLineMatch = content.match(/^(.+?)[\n\r]/);
    const firstSentenceMatch = content.match(/^(.+?)[。.!！?？]/);
    
    if (firstLineMatch) {
        title = firstLineMatch[1].trim();
    } else if (firstSentenceMatch) {
        title = firstSentenceMatch[1].trim();
    } else {
        // 如果没有找到换行或句号，使用内容的前15个字符
        title = content.substring(0, 15) + (content.length > 15 ? '...' : '');
    }
    
    // 标题太长时截断
    if (title.length > 30) {
        title = title.substring(0, 30) + '...';
    }
    
    // 尝试从文本中匹配进度
    let progress = 0;
    const progressPatterns = [
        /进度[：:]\s*(\d+)%/,
        /进度[为是]\s*(\d+)%/,
        /完成[了]?\s*(\d+)%/,
        /(\d+)%\s*完成/,
        /已完成\s*(\d+)%/,
        /共完成\s*(\d+)%/
    ];
    
    // 遍历所有模式尝试匹配
    for (const pattern of progressPatterns) {
        const match = content.match(pattern);
        if (match && match[1]) {
            progress = parseInt(match[1]);
            if (progress >= 0 && progress <= 100) {
                break;  // 找到有效进度后停止
            }
        }
    }
    
    // 尝试提取提醒时间和频率
    let reminderTime = null;
    let reminderFrequency = null;
    let reminderDuration = null;
    
    // 匹配提醒时间，如"上午10点"、"下午3点"、"晚上8点"、"10:30"等格式
    const timePatterns = [
        /([上中下]午|早上|晚上)?(\d{1,2})[点:](\d{0,2})/,
        /(\d{1,2})[点:](\d{0,2})/
    ];
    
    for (const pattern of timePatterns) {
        const match = content.match(pattern);
        if (match) {
            let hours = parseInt(match[2]);
            const minutes = match[3] ? parseInt(match[3]) : 0;
            
            // 调整时间
            if (match[1] === '下午' || match[1] === '晚上') {
                if (hours < 12) hours += 12;
            } else if (match[1] === '上午' && hours === 12) {
                hours = 0;
            }
            
            if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
                reminderTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                break;
            }
        }
    }
    
    // 匹配提醒频率，如"每天"、"每周"、"每月"等
    if (content.includes('每天') || content.includes('每日')) {
        reminderFrequency = 'daily';
    } else if (content.includes('每周') || content.match(/周[一二三四五六日]/)) {
        reminderFrequency = 'weekly';
    } else if (content.includes('每月')) {
        reminderFrequency = 'monthly';
    }
    
    // 匹配预计用时
    const durationPatterns = [
        /用时[约为]?\s*(\d+)\s*小时\s*(\d+)\s*分钟/,
        /用时[约为]?\s*(\d+)\s*小时/,
        /用时[约为]?\s*(\d+)\s*分钟/,
        /需要[约]?\s*(\d+)\s*小时\s*(\d+)\s*分钟/,
        /需要[约]?\s*(\d+)\s*小时/,
        /需要[约]?\s*(\d+)\s*分钟/,
        /预计[用时|需要]\s*(\d+)\s*小时\s*(\d+)\s*分钟/,
        /预计[用时|需要]\s*(\d+)\s*小时/,
        /预计[用时|需要]\s*(\d+)\s*分钟/,
    ];
    
    for (const pattern of durationPatterns) {
        const match = content.match(pattern);
        if (match) {
            if (match[2]) {
                // 匹配到小时和分钟
                const hours = parseInt(match[1]) || 0;
                const minutes = parseInt(match[2]) || 0;
                reminderDuration = hours * 60 + minutes;
            } else {
                // 只匹配到一个数字
                if (pattern.toString().includes('小时')) {
                    // 如果模式中包含"小时"，则这个数字表示小时
                    const hours = parseInt(match[1]) || 0;
                    reminderDuration = hours * 60;
                } else {
                    // 否则，这个数字表示分钟
                    reminderDuration = parseInt(match[1]) || 0;
                }
            }
            break;
        }
    }
    
    // 构造并返回提取的信息
    const result = {
        title: title,
        progress: progress
    };
    
    if (reminderTime) {
        result.reminderTime = reminderTime;
    }
    
    if (reminderFrequency) {
        result.reminderFrequency = reminderFrequency;
    }
    
    if (reminderDuration) {
        result.reminderDuration = reminderDuration;
    }
    
    console.log("备选方法提取结果:", result);
    return result;
}

// 设置返回按钮事件
function setupBackButton() {
    if (backBtn) {
        // 移除默认的onclick属性（如果存在）
        backBtn.removeAttribute('onclick');
        
        // 添加新的点击事件监听器
        backBtn.addEventListener('click', function(e) {
            // 如果有未保存的更改，询问用户是否保存
            if (hasUnsavedChanges) {
                e.preventDefault(); // 阻止默认行为
                
                const userChoice = confirm('您有未保存的更改，是否保存后再返回？\n\n- 点击"确定"保存并返回\n- 点击"取消"不保存直接返回');
                
                if (userChoice) {
                    // 用户选择保存更改
                    saveProject(function() {
                        // 保存完成后返回象限页面
                        window.location.href = '/time-quadrant.html';
                    });
                } else {
                    // 用户选择不保存直接返回
                    window.location.href = '/time-quadrant.html';
                }
            } else {
                // 没有更改，直接返回
                window.location.href = '/time-quadrant.html';
            }
        });
    }
}

// 设置修改跟踪
function setupChangeTracking() {
    // 跟踪Quill编辑器的内容变化
    if (quill) {
        quill.on('text-change', function() {
            hasUnsavedChanges = true;
        });
    }
    
    // 跟踪项目标题变化
    if (projectTitle) {
        const originalTitle = projectTitle.textContent;
        projectTitle.addEventListener('DOMSubtreeModified', function() {
            if (projectTitle.textContent !== originalTitle) {
                hasUnsavedChanges = true;
            }
        });
    }
    
    // 跟踪提醒设置变化
    if (reminderToggle) {
        reminderToggle.addEventListener('change', function() {
            hasUnsavedChanges = true;
        });
    }
    
    if (reminderDate) {
        reminderDate.addEventListener('change', function() {
            hasUnsavedChanges = true;
        });
    }
    
    if (reminderMusic) {
        reminderMusic.addEventListener('change', function() {
            hasUnsavedChanges = true;
        });
    }
    
    if (reminderRepeat) {
        reminderRepeat.addEventListener('change', function() {
            hasUnsavedChanges = true;
        });
    }
    
    // 跟踪预计用时的变化
    if (reminderDurationHours) {
        reminderDurationHours.addEventListener('change', function() {
            hasUnsavedChanges = true;
        });
    }
    
    if (reminderDurationMinutes) {
        reminderDurationMinutes.addEventListener('change', function() {
            hasUnsavedChanges = true;
        });
    }
    
    // 在MutationObserver上监听进度条目的变化
    const progressObserver = new MutationObserver(function() {
        hasUnsavedChanges = true;
    });
    
    if (progressEntries) {
        progressObserver.observe(progressEntries, { 
            childList: true, 
            subtree: true,
            attributes: true,
            characterData: true
        });
    }
    
    // 监听进度条目的输入变化
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('progress-entry-input') || 
            e.target.classList.contains('progress-entry-progress') ||
            e.target.classList.contains('progress-entry-date')) {
            hasUnsavedChanges = true;
        }
    });
}

// 删除项目
function deleteProject() {
    console.log('deleteProject 函数已触发');
    
    // 如果有未保存的更改，先询问用户是否保存
    if (hasUnsavedChanges) {
        const saveChoice = confirm('您有未保存的更改，删除前是否需要保存？\n\n- 点击"确定"先保存再删除\n- 点击"取消"直接删除不保存');
        
        if (saveChoice) {
            // 先保存再删除
            saveProject(function() {
                // 保存完成后执行删除
                confirmAndDeleteProject();
            });
            return;
        }
    }
    
    // 没有未保存的更改或用户选择不保存，直接执行删除确认
    confirmAndDeleteProject();
}

// 确认并删除项目
function confirmAndDeleteProject() {
    // 确认删除
    if (!confirm('确定要删除此项目吗？此操作不可撤销。')) {
        return;
    }
    
    // 检查用户是否已登录
    const user = firebase.auth().currentUser;
    
    if (!user) {
        console.log('同步检查未发现用户，尝试异步检查...');
        
        // 如果同步检查未发现用户，尝试使用异步方法
        firebase.auth().onAuthStateChanged(function(asyncUser) {
            if (asyncUser) {
                console.log('异步检查发现用户，继续删除...');
                // 找到用户后，继续删除过程
                continueProjectDelete(asyncUser);
            } else {
                console.error('用户未登录，无法删除项目');
                alert('用户未登录，无法删除项目，请重新登录');
                window.location.href = '/login.html';
            }
        });
    } else {
        // 用户已登录，直接继续
        console.log('同步检查发现用户，继续删除...');
        continueProjectDelete(user);
    }
}

// 继续删除项目（在确认用户已登录后）
function continueProjectDelete(user) {
    console.log('继续删除项目，用户ID:', user.uid);
    
    // 获取用户特定的项目引用
    const userProjects = firebase.database().ref(`users/${user.uid}/projects`);
    
    // 显示删除中状态
    showDeletingState();
    
    // 从Firebase删除
    if (projectId) {
        // 删除项目
        console.log('删除项目:', projectId);
        userProjects.child(projectId).remove()
            .then(() => {
                console.log('项目删除成功');
                alert('项目已成功删除');
                // 删除成功后返回象限页面
                window.location.href = '/time-quadrant.html';
            })
            .catch((error) => {
                console.error('删除项目失败:', error);
                alert('删除项目失败: ' + error.message);
                restoreDeleteButton();
            });
    } else {
        // 没有项目ID，不能删除
        console.error('无法删除：项目ID不存在');
        alert('无法删除：项目ID不存在');
        restoreDeleteButton();
    }
}

// 显示删除中状态
function showDeletingState() {
    deleteBtn.disabled = true;
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 删除中...';
}

// 恢复删除按钮状态
function restoreDeleteButton() {
    deleteBtn.disabled = false;
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> 删除';
}