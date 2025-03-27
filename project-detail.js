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
let hardDeadlineToggle, hardDeadlineSettings, hardDeadlineDate, hardDeadlineImportance;
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
window.onload = function() {
    console.log('window.onload 初始化...');
    // 检查语音识别模块是否可用
    if (window.VoiceRecognition) {
        console.log('找到语音识别模块');
    } else {
        console.error('未找到语音识别模块，语音识别功能可能无法使用');
    }
};

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
    hardDeadlineToggle = document.getElementById('hard-deadline-toggle');
    hardDeadlineSettings = document.getElementById('hard-deadline-settings');
    hardDeadlineDate = document.getElementById('hard-deadline-date');
    hardDeadlineImportance = document.getElementById('hard-deadline-importance');
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
    
    // 已在页面加载时初始化编辑器，此处不需要重复初始化
    // initQuillEditor();
    
    // 初始化图表
    initChart();
    
    // 初始化语音输入和弹窗对话框
    initInputDialog();
    
    // 设置提醒切换事件
    setupReminderToggle();
    
    // 设置Hard DDL开关
    setupHardDeadlineToggle();
    
    // 设置项目标题编辑功能
    setupTitleEditing();
    
    // 设置添加进度条目事件
    setupAddProgressEntry();
    
    // 设置返回按钮事件
    setupBackButton();
    
    // 设置修改跟踪
    setupChangeTracking();
    
    // 默认提醒日期
    setDefaultReminderDate();
    
    // 默认Hard DDL日期
    setDefaultHardDDLDate();
    
    // 根据参数决定加载已有项目或创建新项目
    if (projectId) {
        console.log('检测到项目ID，加载现有项目:', projectId);
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
    
    // 开发时调试Firebase数据库连接
    debugFirebaseConnection();
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
    
    // 设置重复类型下拉框的变更事件
    const reminderRepeatSelect = document.getElementById('reminder-repeat');
    if (reminderRepeatSelect) {
        reminderRepeatSelect.addEventListener('change', handleReminderRepeatChange);
    }
    
    // 隐藏所有重复选项面板
    hideAllRepeatOptions();
    
    // 设置重复结束日期的默认值
    const repeatEndDate = document.getElementById('repeat-end-date');
    if (repeatEndDate) {
        const defaultEndDate = new Date();
        defaultEndDate.setMonth(defaultEndDate.getMonth() + 3); // 默认3个月后结束
        repeatEndDate.value = formatDateForInput(defaultEndDate).substring(0, 10); // 只保留日期部分
    }
    
    // 设置每周重复选项的默认选中日
    setupWeeklyRepeatDefaults();
    
    // 设置管理类别按钮事件
    const addCategoryBtn = document.getElementById('add-category');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', showCategoryManager);
    }
}

// 处理重复类型变更
function handleReminderRepeatChange() {
    const repeatType = document.getElementById('reminder-repeat').value;
    
    // 首先隐藏所有重复选项
    hideAllRepeatOptions();
    
    // 根据选择的重复类型显示对应的选项
    switch(repeatType) {
        case 'daily':
            document.getElementById('repeat-daily-options').style.display = 'block';
            break;
        case 'weekly':
        case 'biweekly':
            const weeklyOptions = document.getElementById('repeat-weekly-options');
            weeklyOptions.style.display = 'block';
            // 如果是双周重复，设置间隔为2
            if (repeatType === 'biweekly') {
                document.getElementById('repeat-weekly-interval').value = 2;
            } else {
                document.getElementById('repeat-weekly-interval').value = 1;
            }
            break;
        case 'monthly':
            document.getElementById('repeat-monthly-options').style.display = 'block';
            break;
        case 'yearly':
            document.getElementById('repeat-yearly-options').style.display = 'block';
            
            // 设置默认月份为当前月
            const currentMonth = new Date().getMonth() + 1; // getMonth() 返回 0-11
            document.getElementById('repeat-yearly-month').value = currentMonth;
            document.getElementById('repeat-yearly-position-month').value = currentMonth;
            break;
    }
}

// 隐藏所有重复选项面板
function hideAllRepeatOptions() {
    const repeatOptions = document.querySelectorAll('.repeat-options');
    repeatOptions.forEach(option => {
        option.style.display = 'none';
    });
}

// 设置每周重复选项的默认选中日
function setupWeeklyRepeatDefaults() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0-6，0表示周日
    
    // 获取所有星期复选框
    const weekdayCheckboxes = document.querySelectorAll('.weekday-selector input[type="checkbox"]');
    
    // 默认选中今天的星期
    weekdayCheckboxes.forEach(checkbox => {
        if (parseInt(checkbox.value) === dayOfWeek) {
            checkbox.checked = true;
        }
    });
}

// 显示类别管理器
function showCategoryManager() {
    // 这里可以实现类别管理的弹窗
    alert('类别管理功能将在未来版本中实现');
}

// 设置默认提醒日期（设为明天的当前时间）
function setDefaultReminderDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // 将时间设置为当前时间
    const now = new Date();
    tomorrow.setHours(now.getHours());
    tomorrow.setMinutes(now.getMinutes());
    
    // 设置日期输入框的值
    reminderDate.value = formatDateForInput(tomorrow);
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

// 设置默认Hard DDL日期为一周后
function setDefaultHardDDLDate() {
    // 如果没有启用Hard DDL，不需要设置默认日期
    if (!hardDeadlineToggle.checked) {
        return;
    }
    
    // 如果已经有设置日期，也不需要设置默认日期
    if (hardDeadlineDate.value) {
        return;
    }
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    // 格式化为 datetime-local 输入框所需的格式
    hardDeadlineDate.value = formatDateForInput(nextWeek);
    
    // 更新格式化显示
    updateHardDDLDisplay();
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

// 初始化项目进度图表
function initChart() {
    const chartCanvas = document.getElementById('progress-chart');
    if (!chartCanvas) {
        console.error('未找到图表canvas元素');
        return;
    }
    
    // 初始化图表数据
    progressData = {
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
    
    // 创建图表
    progressChart = new Chart(chartCanvas, {
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
                        text: '完成百分比 (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: '日期'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `进度: ${context.parsed.y}%`;
                        }
                    }
                }
            }
        }
    });
}

// 更新图表数据
function updateChart() {
    // 确保图表已初始化
    if (!progressChart) {
        console.warn('图表未初始化，尝试初始化');
        initChart();
        if (!progressChart) {
            console.error('无法初始化图表');
            return;
        }
    }
    
    // 收集进度数据
    const entries = collectProgressEntries();
    if (entries.length === 0) {
        console.log('没有进度数据，不更新图表');
        return;
    }
    
    // 按日期排序（升序）
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // 准备图表数据
    const labels = [];
    const data = [];
    
    entries.forEach(entry => {
        // 格式化日期标签
        const date = new Date(entry.date);
        const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;
        
        labels.push(formattedDate);
        data.push(entry.progress);
    });
    
    // 更新图表数据
    progressChart.data.labels = labels;
    progressChart.data.datasets[0].data = data;
    
    // 更新图表
    progressChart.update();
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
        
        // 加载Hard DDL设置
        loadHardDeadlineSettings(project);
        
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
    
    // 重置基本字段
    resetReminderFields();
    
    // 如果项目有提醒设置，则加载
    if (project.hasReminder) {
        reminderToggle.checked = true;
        reminderSettings.style.display = 'block';
        
        // 设置提醒日期时间
        if (project.reminderTime) {
            const reminderDateTime = new Date(project.reminderTime);
            reminderDate.value = formatDateForInput(reminderDateTime);
        }
        
        // 设置提前提醒时间
        if (project.reminderAdvance) {
            const reminderAdvance = document.getElementById('reminder-advance');
            if (reminderAdvance) {
                reminderAdvance.value = project.reminderAdvance;
            }
        }
        
        // 设置提醒音乐
        if (project.reminderMusic) {
            reminderMusic.value = project.reminderMusic;
        }
        
        // 设置提醒重复
        if (project.reminderRepeat) {
            const reminderRepeatSelect = document.getElementById('reminder-repeat');
            if (reminderRepeatSelect) {
                reminderRepeatSelect.value = project.reminderRepeat;
                // 触发变更事件以显示对应的选项
                handleReminderRepeatChange();
                
                // 加载具体的重复设置
                loadRepeatSettings(project);
            }
        }
        
        // 设置类别
        if (project.reminderCategory) {
            const categorySelect = document.getElementById('reminder-category');
            if (categorySelect) {
                categorySelect.value = project.reminderCategory;
            }
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
        
        // 设置显示选项
        if (project.reminderShowOverWindows !== undefined) {
            const showOverWindows = document.getElementById('reminder-show-over-windows');
            if (showOverWindows) {
                showOverWindows.checked = project.reminderShowOverWindows;
            }
        }
        
        if (project.reminderDismissPast !== undefined) {
            const dismissPast = document.getElementById('reminder-dismiss-past');
            if (dismissPast) {
                dismissPast.checked = project.reminderDismissPast;
            }
        }
    }
}

// 重置提醒字段为默认值
function resetReminderFields() {
    reminderDate.value = '';
    
    const reminderAdvance = document.getElementById('reminder-advance');
    if (reminderAdvance) reminderAdvance.value = '15';
    
    reminderMusic.value = 'default';
    
    const reminderRepeat = document.getElementById('reminder-repeat');
    if (reminderRepeat) reminderRepeat.value = 'once';
    
    const reminderCategory = document.getElementById('reminder-category');
    if (reminderCategory) reminderCategory.value = 'none';
    
    reminderDurationHours.value = '0';
    reminderDurationMinutes.value = '30';
    
    const showOverWindows = document.getElementById('reminder-show-over-windows');
    if (showOverWindows) showOverWindows.checked = true;
    
    const dismissPast = document.getElementById('reminder-dismiss-past');
    if (dismissPast) dismissPast.checked = true;
    
    // 重置所有重复选项
    resetRepeatOptions();
    
    // 隐藏所有重复选项面板
    hideAllRepeatOptions();
}

// 重置重复选项为默认值
function resetRepeatOptions() {
    // 重置每日重复
    const dailyInterval = document.getElementById('repeat-daily-interval');
    if (dailyInterval) dailyInterval.value = '1';
    
    // 重置每周重复
    const weeklyInterval = document.getElementById('repeat-weekly-interval');
    if (weeklyInterval) weeklyInterval.value = '1';
    
    // 取消选中所有星期
    const weekdayCheckboxes = document.querySelectorAll('.weekday-selector input[type="checkbox"]');
    weekdayCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // 重置每月重复
    const monthlyInterval = document.getElementById('repeat-monthly-interval');
    if (monthlyInterval) monthlyInterval.value = '1';
    
    const monthlyDay = document.getElementById('repeat-monthly-day');
    if (monthlyDay) monthlyDay.value = '1';
    
    // 选中按日期重复
    const monthlyDayRadio = document.getElementById('monthly-day');
    if (monthlyDayRadio) monthlyDayRadio.checked = true;
    
    const monthlyPositionInterval = document.getElementById('repeat-monthly-position-interval');
    if (monthlyPositionInterval) monthlyPositionInterval.value = '1';
    
    const monthlyPosition = document.getElementById('repeat-monthly-position');
    if (monthlyPosition) monthlyPosition.value = 'first';
    
    const monthlyDayOfWeek = document.getElementById('repeat-monthly-day-of-week');
    if (monthlyDayOfWeek) monthlyDayOfWeek.value = 'day';
    
    // 重置每年重复
    const yearlyMonth = document.getElementById('repeat-yearly-month');
    if (yearlyMonth) yearlyMonth.value = '1';
    
    const yearlyDay = document.getElementById('repeat-yearly-day');
    if (yearlyDay) yearlyDay.value = '1';
    
    // 选中按日期重复
    const yearlyDateRadio = document.getElementById('yearly-date');
    if (yearlyDateRadio) yearlyDateRadio.checked = true;
    
    const yearlyPositionMonth = document.getElementById('repeat-yearly-position-month');
    if (yearlyPositionMonth) yearlyPositionMonth.value = '1';
    
    const yearlyPosition = document.getElementById('repeat-yearly-position');
    if (yearlyPosition) yearlyPosition.value = 'first';
    
    const yearlyDayOfWeek = document.getElementById('repeat-yearly-day-of-week');
    if (yearlyDayOfWeek) yearlyDayOfWeek.value = 'day';
    
    // 重置结束条件
    const noEndRadio = document.getElementById('repeat-no-end');
    if (noEndRadio) noEndRadio.checked = true;
    
    const endCount = document.getElementById('repeat-end-count');
    if (endCount) endCount.value = '10';
    
    // 设置结束日期为3个月后
    const endDate = document.getElementById('repeat-end-date');
    if (endDate) {
        const defaultEndDate = new Date();
        defaultEndDate.setMonth(defaultEndDate.getMonth() + 3);
        endDate.value = formatDateForInput(defaultEndDate).substring(0, 10);
    }
}

// 加载重复设置
function loadRepeatSettings(project) {
    if (!project.reminderRepeatSettings) return;
    
    const settings = project.reminderRepeatSettings;
    const repeatType = project.reminderRepeat;
    
    switch(repeatType) {
        case 'daily':
            if (settings.interval) {
                const dailyInterval = document.getElementById('repeat-daily-interval');
                if (dailyInterval) dailyInterval.value = settings.interval;
            }
            break;
            
        case 'weekly':
        case 'biweekly':
            if (settings.interval) {
                const weeklyInterval = document.getElementById('repeat-weekly-interval');
                if (weeklyInterval) weeklyInterval.value = settings.interval;
            }
            
            if (settings.daysOfWeek && Array.isArray(settings.daysOfWeek)) {
                const weekdayCheckboxes = document.querySelectorAll('.weekday-selector input[type="checkbox"]');
                weekdayCheckboxes.forEach(checkbox => {
                    const dayValue = parseInt(checkbox.value);
                    checkbox.checked = settings.daysOfWeek.includes(dayValue);
                });
            }
            break;
            
        case 'monthly':
            if (settings.type === 'day') {
                // 按日期重复
                const monthlyDayRadio = document.getElementById('monthly-day');
                if (monthlyDayRadio) monthlyDayRadio.checked = true;
                
                if (settings.interval) {
                    const monthlyInterval = document.getElementById('repeat-monthly-interval');
                    if (monthlyInterval) monthlyInterval.value = settings.interval;
                }
                
                if (settings.dayOfMonth) {
                    const monthlyDay = document.getElementById('repeat-monthly-day');
                    if (monthlyDay) monthlyDay.value = settings.dayOfMonth;
                }
            } else if (settings.type === 'position') {
                // 按位置重复
                const monthlyPositionRadio = document.getElementById('monthly-position');
                if (monthlyPositionRadio) monthlyPositionRadio.checked = true;
                
                if (settings.interval) {
                    const monthlyPositionInterval = document.getElementById('repeat-monthly-position-interval');
                    if (monthlyPositionInterval) monthlyPositionInterval.value = settings.interval;
                }
                
                if (settings.position) {
                    const monthlyPosition = document.getElementById('repeat-monthly-position');
                    if (monthlyPosition) monthlyPosition.value = settings.position;
                }
                
                if (settings.dayOfWeek) {
                    const monthlyDayOfWeek = document.getElementById('repeat-monthly-day-of-week');
                    if (monthlyDayOfWeek) monthlyDayOfWeek.value = settings.dayOfWeek;
                }
            }
            break;
            
        case 'yearly':
            if (settings.type === 'date') {
                // 按日期重复
                const yearlyDateRadio = document.getElementById('yearly-date');
                if (yearlyDateRadio) yearlyDateRadio.checked = true;
                
                if (settings.month) {
                    const yearlyMonth = document.getElementById('repeat-yearly-month');
                    if (yearlyMonth) yearlyMonth.value = settings.month;
                }
                
                if (settings.dayOfMonth) {
                    const yearlyDay = document.getElementById('repeat-yearly-day');
                    if (yearlyDay) yearlyDay.value = settings.dayOfMonth;
                }
            } else if (settings.type === 'position') {
                // 按位置重复
                const yearlyPositionRadio = document.getElementById('yearly-position');
                if (yearlyPositionRadio) yearlyPositionRadio.checked = true;
                
                if (settings.month) {
                    const yearlyPositionMonth = document.getElementById('repeat-yearly-position-month');
                    if (yearlyPositionMonth) yearlyPositionMonth.value = settings.month;
                }
                
                if (settings.position) {
                    const yearlyPosition = document.getElementById('repeat-yearly-position');
                    if (yearlyPosition) yearlyPosition.value = settings.position;
                }
                
                if (settings.dayOfWeek) {
                    const yearlyDayOfWeek = document.getElementById('repeat-yearly-day-of-week');
                    if (yearlyDayOfWeek) yearlyDayOfWeek.value = settings.dayOfWeek;
                }
            }
            break;
    }
    
    // 加载结束条件
    if (settings.end) {
        if (settings.end.type === 'noEnd') {
            const noEndRadio = document.getElementById('repeat-no-end');
            if (noEndRadio) noEndRadio.checked = true;
        } else if (settings.end.type === 'afterCount' && settings.end.count) {
            const endAfterRadio = document.getElementById('repeat-end-after');
            if (endAfterRadio) endAfterRadio.checked = true;
            
            const endCount = document.getElementById('repeat-end-count');
            if (endCount) endCount.value = settings.end.count;
        } else if (settings.end.type === 'byDate' && settings.end.date) {
            const endByRadio = document.getElementById('repeat-end-by');
            if (endByRadio) endByRadio.checked = true;
            
            const endDate = document.getElementById('repeat-end-date');
            if (endDate) endDate.value = settings.end.date;
        }
    }
}

// 收集重复设置
function collectRepeatSettings() {
    const repeatType = document.getElementById('reminder-repeat').value;
    
    if (repeatType === 'once') {
        return null; // 不重复，不需要收集设置
    }
    
    const settings = {};
    
    switch(repeatType) {
        case 'daily':
            settings.interval = parseInt(document.getElementById('repeat-daily-interval').value) || 1;
            break;
            
        case 'weekdays':
            settings.type = 'weekdays';
            settings.daysOfWeek = [1, 2, 3, 4, 5]; // 周一到周五
            break;
            
        case 'weekly':
        case 'biweekly':
            settings.interval = parseInt(document.getElementById('repeat-weekly-interval').value) || 1;
            settings.daysOfWeek = [];
            
            // 收集选中的星期
            const weekdayCheckboxes = document.querySelectorAll('.weekday-selector input[type="checkbox"]:checked');
            weekdayCheckboxes.forEach(checkbox => {
                settings.daysOfWeek.push(parseInt(checkbox.value));
            });
            
            // 如果没有选中任何星期，默认选择今天
            if (settings.daysOfWeek.length === 0) {
                settings.daysOfWeek = [new Date().getDay()];
            }
            break;
            
        case 'monthly':
            if (document.getElementById('monthly-day').checked) {
                // 按日期重复
                settings.type = 'day';
                settings.interval = parseInt(document.getElementById('repeat-monthly-interval').value) || 1;
                settings.dayOfMonth = parseInt(document.getElementById('repeat-monthly-day').value) || 1;
            } else {
                // 按位置重复
                settings.type = 'position';
                settings.interval = parseInt(document.getElementById('repeat-monthly-position-interval').value) || 1;
                settings.position = document.getElementById('repeat-monthly-position').value;
                settings.dayOfWeek = document.getElementById('repeat-monthly-day-of-week').value;
            }
            break;
            
        case 'yearly':
            if (document.getElementById('yearly-date').checked) {
                // 按日期重复
                settings.type = 'date';
                settings.month = parseInt(document.getElementById('repeat-yearly-month').value) || 1;
                settings.dayOfMonth = parseInt(document.getElementById('repeat-yearly-day').value) || 1;
            } else {
                // 按位置重复
                settings.type = 'position';
                settings.month = parseInt(document.getElementById('repeat-yearly-position-month').value) || 1;
                settings.position = document.getElementById('repeat-yearly-position').value;
                settings.dayOfWeek = document.getElementById('repeat-yearly-day-of-week').value;
            }
            break;
    }
    
    // 收集结束条件
    settings.end = {};
    
    if (document.getElementById('repeat-no-end').checked) {
        settings.end.type = 'noEnd';
    } else if (document.getElementById('repeat-end-after').checked) {
        settings.end.type = 'afterCount';
        settings.end.count = parseInt(document.getElementById('repeat-end-count').value) || 10;
    } else if (document.getElementById('repeat-end-by').checked) {
        settings.end.type = 'byDate';
        settings.end.date = document.getElementById('repeat-end-date').value;
    }
    
    return settings;
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
        
        // 保存提前提醒时间
        const reminderAdvance = document.getElementById('reminder-advance');
        if (reminderAdvance) {
            updates.reminderAdvance = reminderAdvance.value;
        }
        
        updates.reminderMusic = reminderMusic.value;
        
        // 保存重复设置
        const reminderRepeat = document.getElementById('reminder-repeat');
        if (reminderRepeat) {
            updates.reminderRepeat = reminderRepeat.value;
            
            // 如果有重复设置，收集详细设置
            if (reminderRepeat.value !== 'once') {
                updates.reminderRepeatSettings = collectRepeatSettings();
            }
        }
        
        // 保存类别
        const reminderCategory = document.getElementById('reminder-category');
        if (reminderCategory) {
            updates.reminderCategory = reminderCategory.value;
        }
        
        // 保存预计用时（转换为总分钟数）
        const hours = parseInt(reminderDurationHours.value) || 0;
        const minutes = parseInt(reminderDurationMinutes.value) || 0;
        updates.reminderDuration = hours * 60 + minutes;
        
        // 保存显示选项
        const showOverWindows = document.getElementById('reminder-show-over-windows');
        if (showOverWindows) {
            updates.reminderShowOverWindows = showOverWindows.checked;
        }
        
        const dismissPast = document.getElementById('reminder-dismiss-past');
        if (dismissPast) {
            updates.reminderDismissPast = dismissPast.checked;
        }
    } else {
        updates.hasReminder = false;
    }
    
    // 保存Hard DDL设置
    if (hardDeadlineToggle.checked) {
        updates.hasHardDeadline = true;
        
        if (hardDeadlineDate.value) {
            updates.hardDeadlineTime = new Date(hardDeadlineDate.value).getTime();
        }
        
        updates.hardDeadlineImportance = hardDeadlineImportance.value;
    } else {
        updates.hasHardDeadline = false;
    }
    
    // 创建进度历史对象，保持向后兼容
    updates.progressHistory = {};
    progressEntries.forEach(entry => {
        const entryDate = new Date(entry.date).getTime();
        updates.progressHistory[entryDate.toString()] = entry.progress;
    });
    
    return updates;
}

// 保存项目
function saveProject() {
    console.log('开始保存项目...');
    
    // 获取项目数据
    const projectData = getProjectData();
    if (!projectData) {
        console.error('获取项目数据失败，取消保存操作');
        return;
    }
    
    // 显示保存中状态
    const saveBtn = document.getElementById('save-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = '保存中...';
    saveBtn.disabled = true;
    
    try {
        // 获取当前用户
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            console.error('用户未登录，无法保存项目');
            alert('保存失败：您尚未登录或登录已过期，请重新登录');
            window.location.href = '/login.html';
            return;
        }
        
        // 获取用户项目引用
        const projectsRef = userProjectsRef();
        if (!projectsRef) {
            console.error('获取项目引用失败');
            alert('保存失败：无法连接到数据库');
            return;
        }
        
        // 使用现有项目ID或创建新ID
        const currentProjectId = projectId || projectsRef.push().key;
        
        // 保存项目数据
        projectsRef.child(currentProjectId).update(projectData)
            .then(() => {
                console.log('项目保存成功:', currentProjectId);
                
                // 如果是新项目，更新URL以反映项目ID
                if (!projectId) {
                    // 更新页面URL，保留当前象限参数
                    const newUrl = `project-detail.html?id=${currentProjectId}${quadrantParam ? `&quadrant=${quadrantParam}` : ''}`;
                    window.history.replaceState(null, '', newUrl);
                    
                    // 更新全局projectId变量
                    projectId = currentProjectId;
                    
                    // 显示删除按钮
                    const deleteBtn = document.getElementById('delete-btn');
                    if (deleteBtn) {
                        deleteBtn.style.display = 'inline-block';
                        deleteBtn.addEventListener('click', deleteProject);
                    }
                }
                
                // 更新最后保存状态
                lastSavedState = JSON.stringify(projectData);
                
                // 显示成功消息和动画
                showSuccessAnimation();
            })
            .catch(error => {
                console.error('保存项目时出错:', error);
                alert(`保存失败: ${error.message || '未知错误'}`);
            })
            .finally(() => {
                // 恢复保存按钮状态
                saveBtn.textContent = originalText;
                saveBtn.disabled = false;
            });
    } catch (error) {
        console.error('保存过程中发生异常:', error);
        alert(`保存过程中发生错误: ${error.message || '未知错误'}`);
        
        // 恢复保存按钮状态
        saveBtn.textContent = originalText;
        saveBtn.disabled = false;
    }
}

// 显示保存成功动画
function showSuccessAnimation() {
    // 检查是否已存在动画元素，如果存在则先移除
    const existingAnimation = document.getElementById('save-success-animation');
    if (existingAnimation) {
        document.body.removeChild(existingAnimation);
    }
    
    // 创建动画容器
    const animationContainer = document.createElement('div');
    animationContainer.id = 'save-success-animation';
    animationContainer.style.position = 'fixed';
    animationContainer.style.top = '50%';
    animationContainer.style.left = '50%';
    animationContainer.style.transform = 'translate(-50%, -50%)';
    animationContainer.style.zIndex = '9999';
    animationContainer.style.backgroundColor = 'transparent';
    
    // 创建GIF图像
    const gifImage = document.createElement('img');
    gifImage.src = 'mario coin brick.gif'; // 本地GIF文件
    gifImage.alt = '保存成功';
    gifImage.style.maxWidth = '150px';
    gifImage.style.maxHeight = '150px';
    
    // 只添加GIF到页面，不添加文字
    animationContainer.appendChild(gifImage);
    document.body.appendChild(animationContainer);
    
    // 3秒后移除动画
    setTimeout(() => {
        if (animationContainer.parentNode) {
            document.body.removeChild(animationContainer);
        }
    }, 3000);
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
    
    // 使用语音识别模块来初始化语音输入
    if (window.VoiceRecognition) {
        console.log("找到语音识别模块，准备设置...");
        // 直接设置语音按钮，让voice-recognition.js处理所有权限相关的逻辑
        window.VoiceRecognition.setup(voiceBtn, dialogInput, {
            onTranscriptionComplete: (text) => {
                console.log("【回调函数】转录完成，文本长度:", text ? text.length : 0);
                console.log("【回调函数】转录文本内容:", text ? (text.substring(0, 50) + (text.length > 50 ? "..." : "")) : "无内容");
            },
            onRecordingStart: () => {
                console.log("【回调函数】开始录音");
            },
            onRecordingStop: () => {
                console.log("【回调函数】停止录音");
            }
        });
    } else {
        // 模块未加载，隐藏语音按钮
        voiceBtn.style.display = 'none';
        console.warn('未找到语音识别模块，禁用语音输入功能');
    }
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
            // 处理内容，直接使用原始输入内容
            const assemblyContent = content.trim();
            console.log("使用原始内容:", assemblyContent);
            
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
                // 如果没有标题，使用当前日期和"新建项目"作为标题
                const today = new Date();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                const year = today.getFullYear();
                const defaultTitle = `${month}${day}${year}&新建项目`;
                projectTitle.textContent = defaultTitle;
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
        
        // 使用当前日期和"新建项目"作为标题
        const today = new Date();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const year = today.getFullYear();
        const defaultTitle = `${month}${day}${year}&新建项目`;
        projectTitle.textContent = defaultTitle;
        
        // 创建初始进度条目
        createProgressEntry(new Date(), 0, content);
        
        // 更新图表
        updateChart();
        
        // 自动保存项目
        saveProject();
    }
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
    
    // 检查用户是否已登录
    const user = firebase.auth().currentUser;
    
    if (!user) {
        console.log('用户未登录，尝试异步检查...');
        
        // 如果同步检查未发现用户，尝试使用异步方法
        firebase.auth().onAuthStateChanged(function(asyncUser) {
            if (asyncUser) {
                console.log('异步检查发现用户');
                // 找到用户后，继续处理
                processDelete();
            } else {
                console.error('用户未登录，无法删除项目');
                alert('用户未登录，无法删除项目，请重新登录');
                window.location.href = '/login.html';
            }
        });
    } else {
        // 用户已登录，直接继续
        processDelete();
    }
    
    function processDelete() {
        // 如果有未保存的更改，先保存再删除
        if (hasUnsavedChanges) {
            // 执行保存，然后在保存成功的回调中执行删除
            console.log('有未保存的更改，先保存项目...');
            
            // 获取项目数据
            const projectData = getProjectData();
            if (!projectData) {
                console.error('获取项目数据失败，取消删除操作');
                return;
            }
            
            // 显示保存中状态
            const saveBtn = document.getElementById('save-btn');
            const originalSaveText = saveBtn.textContent;
            saveBtn.textContent = '保存中...';
            saveBtn.disabled = true;
            
            try {
                // 保存项目数据
                const projectsRef = userProjectsRef();
                if (!projectsRef) {
                    console.error('获取项目引用失败');
                    alert('保存失败：无法连接到数据库');
                    saveBtn.textContent = originalSaveText;
                    saveBtn.disabled = false;
                    return;
                }
                
                projectsRef.child(projectId).update(projectData)
                    .then(() => {
                        console.log('项目保存成功，准备删除...');
                        // 恢复保存按钮状态
                        saveBtn.textContent = originalSaveText;
                        saveBtn.disabled = false;
                        // 保存成功后执行删除
                        continueProjectDelete();
                    })
                    .catch(error => {
                        console.error('保存项目时出错:', error);
                        alert(`保存失败: ${error.message || '未知错误'}`);
                        // 恢复保存按钮状态
                        saveBtn.textContent = originalSaveText;
                        saveBtn.disabled = false;
                    });
            } catch (error) {
                console.error('保存过程中发生异常:', error);
                alert(`保存过程中发生错误: ${error.message || '未知错误'}`);
                // 恢复保存按钮状态
                saveBtn.textContent = originalSaveText;
                saveBtn.disabled = false;
            }
        } else {
            // 没有未保存的更改，直接执行删除
            continueProjectDelete();
        }
    }
}

// 继续删除项目
function continueProjectDelete() {
    const user = firebase.auth().currentUser;
    if (!user) {
        console.error('用户未登录，无法删除项目');
        alert('用户未登录，无法删除项目，请重新登录');
        window.location.href = '/login.html';
        return;
    }
    
    console.log('继续删除项目，用户ID:', user.uid);
    
    // 获取用户特定的项目引用
    const userProjects = firebase.database().ref(`users/${user.uid}/projects`);
    
    // 显示删除中状态
    showDeletingState();
    
    // 从Firebase删除
    if (projectId) {
        // 先获取项目数据
        userProjects.child(projectId).once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const projectData = snapshot.val();
                    
                    // 添加删除时间和类型标记
                    projectData.deletedAt = Date.now();
                    projectData.type = 'project';
                    
                    // 将项目移动到回收站
                    const trashRef = firebase.database().ref(`users/${user.uid}/trash/${projectId}`);
                    
                    return trashRef.set(projectData).then(() => {
                        // 移动成功后，从项目列表中删除
                        return userProjects.child(projectId).remove();
                    });
                } else {
                    throw new Error('找不到项目数据');
                }
            })
            .then(() => {
                console.log('项目已移动到回收站');
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
    deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在移动到回收站...';
}

// 恢复删除按钮状态
function restoreDeleteButton() {
    deleteBtn.disabled = false;
    deleteBtn.innerHTML = '<i class="fas fa-trash"></i> 删除';
}

// 设置Hard DDL开关
function setupHardDeadlineToggle() {
    hardDeadlineToggle.addEventListener('change', () => {
        hardDeadlineSettings.style.display = hardDeadlineToggle.checked ? 'block' : 'none';
        
        // 如果勾选且未设置默认日期，设置为当前时间的一周后
        if (hardDeadlineToggle.checked && !hardDeadlineDate.value) {
            const nextWeek = new Date();
            nextWeek.setDate(nextWeek.getDate() + 7);
            hardDeadlineDate.value = formatDateForInput(nextWeek);
            
            // 更新格式化显示
            updateHardDDLDisplay();
        }
    });
    
    // 监听日期变化，更新格式化显示
    hardDeadlineDate.addEventListener('change', updateHardDDLDisplay);
}

// 更新Hard DDL格式化显示
function updateHardDDLDisplay() {
    const deadlineDateDisplay = document.querySelector('.hard-deadline-display');
    if (deadlineDateDisplay && hardDeadlineDate.value) {
        const dateObj = new Date(hardDeadlineDate.value);
        deadlineDateDisplay.textContent = formatDateForHardDDL(dateObj);
    }
}

// 加载Hard DDL设置
function loadHardDeadlineSettings(project) {
    // 重置Hard DDL设置
    hardDeadlineToggle.checked = false;
    hardDeadlineSettings.style.display = 'none';
    hardDeadlineDate.value = '';
    hardDeadlineImportance.value = 'medium';
    
    // 如果项目有Hard DDL设置，则加载
    if (project.hasHardDeadline) {
        hardDeadlineToggle.checked = true;
        hardDeadlineSettings.style.display = 'block';
        
        // 设置截止日期时间
        if (project.hardDeadlineTime) {
            const deadlineDateTime = new Date(project.hardDeadlineTime);
            
            // 设置日期选择器的值
            hardDeadlineDate.value = formatDateForInput(deadlineDateTime);
            
            // 为了显示，还可以格式化为指定格式 (mm/dd/yyyy hh:mins)
            const formattedDeadline = formatDateForHardDDL(deadlineDateTime);
            console.log('Hard DDL formatted date:', formattedDeadline);
            
            // 如果页面上有需要显示格式化日期的元素，可以在这里设置
            const deadlineDateDisplay = document.querySelector('.hard-deadline-display');
            if (deadlineDateDisplay) {
                deadlineDateDisplay.textContent = formattedDeadline;
            }
        }
        
        // 设置重要程度
        if (project.hardDeadlineImportance) {
            hardDeadlineImportance.value = project.hardDeadlineImportance;
        }
    }
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
