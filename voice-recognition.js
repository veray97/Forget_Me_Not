/**
 * 语音识别与输入模块 (voice-recognition.js)
 * 这个模块提供语音识别功能，可以在不同页面中复用
 */

// 模块作用域变量
let assemblyAiToken;
let isInitialized = false;
let persistentAudioStream = null; // 持久化的音频流
let hasMicrophonePermission = false; // 是否已获得麦克风权限

// 初始化函数 - 在使用模块前必须调用
async function initVoiceRecognition() {
    if (isInitialized) return true;
    
    console.log('语音识别模块初始化...');
    
    // 确保 ASSEMBLY_API 已正确加载
    if (window.ASSEMBLY_API && window.ASSEMBLY_API.KEY) {
        assemblyAiToken = window.ASSEMBLY_API.KEY;
        // 打印部分Token以便确认
        const truncatedToken = assemblyAiToken.substring(0, 10) + "...";
        console.log('AssemblyAI API Token 已加载:', truncatedToken);
        // 验证API密钥是否有效
        verifyAssemblyAIKey();
        
        // 尝试提前获取麦克风权限
        try {
            console.log('尝试初始化时获取麦克风权限...');
            persistentAudioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            hasMicrophonePermission = true;
            console.log('成功获取麦克风权限，流已保存供后续使用');
            
            // 添加页面关闭时释放资源的处理
            window.addEventListener('beforeunload', () => {
                if (persistentAudioStream) {
                    persistentAudioStream.getTracks().forEach(track => track.stop());
                    persistentAudioStream = null;
                    console.log('页面关闭，释放音频流资源');
                }
            });
        } catch (error) {
            console.warn('初始化时无法获取麦克风权限:', error.message);
            // 继续初始化，稍后将在用户交互时再次尝试
        }
        
        isInitialized = true;
        return true;
    } else {
        console.error('未找到 AssemblyAI API 配置，语音识别功能可能无法使用');
        return false;
    }
}

// 验证AssemblyAI API密钥是否有效
function verifyAssemblyAIKey() {
    console.log("正在验证AssemblyAI API密钥...");
    fetch("https://api.assemblyai.com/v2/account", {
        method: "GET",
        headers: {
            "Authorization": assemblyAiToken
        }
    })
    .then(response => {
        if (response.ok) {
            console.log("AssemblyAI API密钥验证成功！");
            
            // 再验证是否为付费账户（检查是否可以使用实时语音识别）
            checkStreamingCapability();
            
            return response.json();
        } else {
            throw new Error(`API请求失败，状态码: ${response.status}`);
        }
    })
    .catch(error => {
        console.error("AssemblyAI API密钥验证失败:", error);
        // 只记录错误日志
    });
}

// 检查AssemblyAI账户是否支持实时语音识别
function checkStreamingCapability() {
    console.log("正在检查实时语音识别功能...");
    
    // 尝试建立WebSocket连接，测试实时语音识别功能
    try {
        const testWs = new WebSocket(`wss://api.assemblyai.com/v2/realtime/ws?sample_rate=16000&auth_key=${assemblyAiToken}`);
        
        // 设置超时，如果5秒内没有收到错误消息，则认为连接成功
        const connectionTimeout = setTimeout(() => {
            console.log("实时语音识别功能检查超时，假定支持");
            testWs.close();
        }, 5000);
        
        testWs.onopen = () => {
            console.log("WebSocket连接成功打开，看起来API密钥是有效的");
        };
        
        testWs.onmessage = (event) => {
            const message = JSON.parse(event.data);
            console.log("WebSocket测试消息:", message);
            
            // 直接关闭WebSocket连接
            clearTimeout(connectionTimeout);
            testWs.close();
        };
        
        testWs.onerror = (error) => {
            console.error("WebSocket连接错误:", error);
            clearTimeout(connectionTimeout);
        };
        
        testWs.onclose = (event) => {
            console.log("WebSocket连接关闭:", event);
            clearTimeout(connectionTimeout);
        };
    } catch (error) {
        console.error("检查实时语音识别功能时出错:", error);
    }
}

/**
 * 初始化语音输入按钮和目标输入框
 * @param {HTMLElement} voiceBtn - 语音按钮元素
 * @param {HTMLElement} targetInput - 目标输入框元素（可以是input, textarea等）
 * @param {Object} options - 可选参数
 * @param {Function} options.onTranscriptionComplete - 转录完成时的回调函数，接收转录文本作为参数
 * @param {Function} options.onRecordingStart - 开始录音时的回调函数
 * @param {Function} options.onRecordingStop - 停止录音时的回调函数
 * @param {string} options.language - 语音识别的语言，默认为"zh-CN"（中文）
 */
function setupVoiceRecognition(voiceBtn, targetInput, options = {}) {
    // 确保模块已初始化
    if (!isInitialized) {
        initVoiceRecognition();
    }
    
    if (!voiceBtn) {
        console.error("语音按钮元素未找到");
        return;
    }
    
    if (!targetInput) {
        console.error("目标输入框元素未找到");
        return;
    }
    
    // 默认选项
    const defaultOptions = {
        onTranscriptionComplete: null,
        onRecordingStart: null,
        onRecordingStop: null,
        language: "zh-CN"
    };
    
    // 合并选项
    const settings = { ...defaultOptions, ...options };
    
    // 检查浏览器是否支持语音识别
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        console.log("浏览器支持语音识别，设置语音功能");
        setupSpeechRecognition(voiceBtn, targetInput, settings);
    } else {
        // 浏览器不支持语音识别
        voiceBtn.style.display = 'none';
        console.warn('当前浏览器不支持语音识别功能');
    }
}

// 设置语音识别功能的内部函数
function setupSpeechRecognition(voiceBtn, targetInput, settings) {
    // 保留现有的浏览器语音识别作为主要识别方式
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    // 设置语音识别参数
    recognition.continuous = true;  // 改为持续模式
    recognition.interimResults = true;
    
    // 设置语言
    recognition.lang = settings.language;
    
    let isRecording = false;
    let mediaRecorder = null;
    let audioChunks = []; // 存储录音数据
    let recordingBlob = null; // 存储完整录音的Blob对象
    let localStream = null; // 当前使用的媒体流
    
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
    
    // 开始录音 - 使用浏览器内置录音功能
    async function startRecording() {
        try {
            console.log("开始录音，使用浏览器内置语音识别和录音功能");
            
            // 调用开始录音回调
            if (typeof settings.onRecordingStart === 'function') {
                settings.onRecordingStart();
            }
            
            // 初始化媒体录制，保存录音供后续上传到AssemblyAI处理
            // 尝试复用已有的流
            let stream;
            if (persistentAudioStream && persistentAudioStream.active) {
                console.log("复用已有的麦克风流，避免重复请求权限");
                stream = persistentAudioStream;
            } else {
                console.log("请求新的麦克风权限...");
                try {
                    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    // 更新持久化流
                    persistentAudioStream = stream;
                    hasMicrophonePermission = true;
                    console.log("成功获取麦克风权限并更新持久化流");
                } catch (permissionError) {
                    console.error("获取麦克风权限失败:", permissionError);
                    appendToInput(targetInput, "\n[无法访问麦克风: " + permissionError.message + "]\n");
                    return; // 如果无法获取权限，直接返回
                }
            }
            
            // 保存本地引用
            localStream = stream;
            
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];
            
            // 收集录音数据
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunks.push(event.data);
                }
            };
            
            // 录音完成时处理
            mediaRecorder.onstop = async () => {
                // 创建完整的录音Blob
                recordingBlob = new Blob(audioChunks, { type: 'audio/webm' });
                console.log("录音完成，录音大小:", recordingBlob.size, "字节");
                
                // 上传录音到AssemblyAI进行处理
                if (recordingBlob.size > 0) {
                    appendToInput(targetInput, '[正在处理录音...]', '[正在录音]');
                    uploadAndTranscribe(recordingBlob);
                }
            };
            
            // 开始录音
            console.log("启动媒体录制");
            mediaRecorder.start();
            
            // 同时启动浏览器内置语音识别，用于实时反馈
            recognition.start();
            
            // 更新UI状态
            voiceBtn.classList.add('recording');
            isRecording = true;
            
            // 显示录音状态
            appendToInput(targetInput, "\n[正在录音]\n");
            
        } catch (error) {
            console.error("录音启动失败:", error);
            appendToInput(targetInput, "\n[录音启动失败: " + error.message + "]\n");
        }
    }
    
    // 停止录音
    function stopRecording() {
        // 停止浏览器语音识别
        recognition.stop();
        
        // 更新UI状态
        voiceBtn.classList.remove('recording');
        isRecording = false;
        
        console.log("停止录音，准备处理");
        
        // 调用停止录音回调
        if (typeof settings.onRecordingStop === 'function') {
            settings.onRecordingStop();
        }
        
        // 如果媒体录制器存在并处于录制状态
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            console.log("停止媒体录制");
            mediaRecorder.stop();
            
            // 注意：我们不停止音频轨道，因为我们要复用它们
            // 只在必要时释放非持久化的本地流
            if (localStream && localStream !== persistentAudioStream) {
                localStream.getTracks().forEach(track => track.stop());
                localStream = null;
            }
        } else {
            console.log("媒体录制器不存在或未处于录制状态");
            
            // 清理UI显示
            if (targetInput.value && targetInput.value.includes('[正在录音]')) {
                targetInput.value = targetInput.value.replace('[正在录音]', '');
            }
        }
    }
    
    // 上传音频文件到AssemblyAI并进行转录
    async function uploadAndTranscribe(audioBlob) {
        try {
            console.log("开始上传录音文件到AssemblyAI...", "API Token:", assemblyAiToken ? "已设置" : "未设置");
            
            // 第1步：上传音频文件
            const formData = new FormData();
            formData.append('file', audioBlob, 'recording.webm');
            
            console.log("准备上传音频数据，大小:", audioBlob.size, "字节, 类型:", audioBlob.type);
            
            const uploadResponse = await fetch('https://api.assemblyai.com/v2/upload', {
                method: 'POST',
                headers: {
                    'Authorization': assemblyAiToken
                },
                body: audioBlob
            });
            
            console.log("上传响应状态:", uploadResponse.status, uploadResponse.statusText);
            
            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text().catch(() => "无法获取错误详情");
                console.error("上传响应错误详情:", errorText);
                throw new Error(`上传失败，状态码: ${uploadResponse.status}, 详情: ${errorText}`);
            }
            
            const uploadResult = await uploadResponse.json();
            const audioUrl = uploadResult.upload_url;
            console.log("音频文件上传成功，URL:", audioUrl);
            
            // 第2步：请求转录
            console.log("准备发送转录请求...");
            const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
                method: 'POST',
                headers: {
                    'Authorization': assemblyAiToken,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    audio_url: audioUrl,
                    language_code: "zh" // 指定中文，如果需要的话
                })
            });
            
            console.log("转录请求响应状态:", transcriptResponse.status, transcriptResponse.statusText);
            
            if (!transcriptResponse.ok) {
                const errorText = await transcriptResponse.text().catch(() => "无法获取错误详情");
                console.error("转录请求响应错误详情:", errorText);
                throw new Error(`转录请求失败，状态码: ${transcriptResponse.status}, 详情: ${errorText}`);
            }
            
            const transcriptResult = await transcriptResponse.json();
            const transcriptId = transcriptResult.id;
            console.log("转录请求已提交，ID:", transcriptId);
            
            // 第3步：轮询检查转录结果
            checkTranscriptionStatus(transcriptId);
            
        } catch (error) {
            console.error("转录处理失败:", error);
            appendToInput(targetInput, `[转录失败: ${error.message}]`, '[正在处理录音...]');
        }
    }
    
    // 轮询检查转录状态
    async function checkTranscriptionStatus(transcriptId) {
        try {
            console.log("开始检查转录状态，ID:", transcriptId);
            
            const pollingInterval = 1000; // 1秒检查一次
            const maxAttempts = 60; // 最多尝试60次，即等待约1分钟
            let attempts = 0;
            
            const checkStatus = async () => {
                attempts++;
                console.log(`检查转录状态中... (第${attempts}次尝试)`);
                
                const statusResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': assemblyAiToken
                    }
                });
                
                console.log("状态请求响应码:", statusResponse.status, statusResponse.statusText);
                
                if (!statusResponse.ok) {
                    const errorText = await statusResponse.text().catch(() => "无法获取错误详情");
                    console.error("获取状态响应错误详情:", errorText);
                    throw new Error(`获取转录状态失败，状态码: ${statusResponse.status}, 详情: ${errorText}`);
                }
                
                const statusResult = await statusResponse.json();
                console.log("转录状态:", statusResult.status, "详细数据:", JSON.stringify(statusResult).substring(0, 200) + "...");
                
                if (statusResult.status === 'completed') {
                    // 转录成功，显示结果
                    console.log("转录完成! 文本结果:", statusResult.text);
                    const transcriptionText = statusResult.text || '[没有识别到文字]';
                    
                    // 更新输入框内容
                    appendToInput(targetInput, transcriptionText, '[正在处理录音...]');
                    
                    // 如果提供了转录完成回调，则调用
                    if (typeof settings.onTranscriptionComplete === 'function') {
                        console.log("调用转录完成回调函数");
                        settings.onTranscriptionComplete(transcriptionText);
                    } else {
                        console.log("未提供转录完成回调函数");
                    }
                    
                    // 确保输入框滚动到底部
                    if (targetInput.scrollTop !== undefined) {
                        targetInput.scrollTop = targetInput.scrollHeight;
                    }
                } else if (statusResult.status === 'error') {
                    // 转录出错
                    console.error("转录出错:", statusResult.error);
                    appendToInput(targetInput, `[转录出错: ${statusResult.error}]`, '[正在处理录音...]');
                } else if (attempts < maxAttempts) {
                    // 继续轮询
                    setTimeout(checkStatus, pollingInterval);
                } else {
                    // 超过最大尝试次数
                    console.warn("转录超时, 达到最大尝试次数:", maxAttempts);
                    appendToInput(targetInput, '[转录超时，请稍后再试]', '[正在处理录音...]');
                }
            };
            
            // 开始轮询
            setTimeout(checkStatus, pollingInterval);
            
        } catch (error) {
            console.error("检查转录状态失败:", error);
            appendToInput(targetInput, `[检查转录状态失败: ${error.message}]`, '[正在处理录音...]');
        }
    }
    
    // 辅助函数：向输入框添加文本
    function appendToInput(input, text, replaceText = null) {
        console.log("appendToInput 调用，添加/替换文本");
        console.log("- 当前输入框值:", input.value.substring(0, 50) + (input.value.length > 50 ? "..." : ""));
        console.log("- 要添加/替换的文本:", text.substring(0, 50) + (text.length > 50 ? "..." : ""));
        console.log("- 要替换的文本:", replaceText || "无");
        
        if (replaceText && input.value.includes(replaceText)) {
            console.log(`- 执行替换: 将 "${replaceText}" 替换为新文本`);
            // 如果有指定的替换文本并且存在于当前值中，则替换
            input.value = input.value.replace(replaceText, text);
        } else {
            console.log("- 执行追加: 在末尾添加新文本");
            // 否则，添加到末尾
            input.value += text;
        }
        
        console.log("- 处理后的输入框值:", input.value.substring(0, 50) + (input.value.length > 50 ? "..." : ""));
        
        // 确保输入框滚动到底部
        if (input.scrollTop !== undefined) {
            input.scrollTop = input.scrollHeight;
        }
    }
    
    // 浏览器语音识别结果事件（用于即时反馈）
    recognition.onresult = (event) => {
        const result = event.results[0];
        const transcript = result[0].transcript;
        
        // 不显示浏览器识别的实时结果，仅保留"正在录音"提示
        // 以下代码被注释掉，不再替换文本
        // if (isRecording && targetInput.value.includes('[正在录音]')) {
        //     const tempDisplay = targetInput.value.replace('[正在录音]', `[正在录音] ${transcript}`);
        //     targetInput.value = tempDisplay;
        //     
        //     // 确保输入框滚动到底部
        //     if (targetInput.scrollTop !== undefined) {
        //         targetInput.scrollTop = targetInput.scrollHeight;
        //     }
        // }
        
        // 仅记录到控制台，不显示在输入框中
        console.log("浏览器语音识别临时结果:", transcript);
    };
    
    // 语音识别结束事件
    recognition.onend = () => {
        console.log("浏览器语音识别结束");
        // 不再自动重启，让continuous模式处理持续识别
    };
}

// 导出模块公共函数
window.VoiceRecognition = {
    init: initVoiceRecognition,
    setup: setupVoiceRecognition
}; 