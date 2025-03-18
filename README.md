# Forget Me Not - 高效任务与笔记管理应用

一个功能强大的任务和笔记管理应用，使用Firebase Realtime Database存储数据，帮助您更有效地规划和跟踪工作与生活中的各项任务。

## 核心功能

- **时间四象限管理**：基于紧急性和重要性分类任务
- **项目详情管理**：创建和编辑详细的项目内容
- **富文本编辑器**：支持格式化文本、列表、链接等
- **进度追踪**：通过进度条和图表可视化项目完成情况
- **提醒系统**：设置项目提醒，支持不同重复频率
- **语音输入**：支持中英文混合语音识别
- **数据实时同步**：所有设备上的数据实时更新
- **用户认证**：安全的用户登录和数据隔离
- **响应式设计**：适配各种屏幕尺寸的设备

## 最新特性

### 项目详情页面
- 详细的项目信息查看和编辑界面
- 使用Quill.js实现强大的富文本编辑功能
- 项目进度管理和历史记录跟踪

### 语音识别功能
- 支持中英文混合语音输入
- 可随时切换中英文识别模式以获得最佳识别效果
- 友好的用户反馈和错误提示

### 提醒管理
- 灵活设置提醒时间和重复频率
- 多种提醒音效选择
- 直观的日期选择界面

### 进度追踪
- 使用Chart.js可视化项目进度历史
- 自动记录进度变化时间点
- 直观展示项目发展趋势

## 设置指南

### 1. Firebase设置

1. 访问 [Firebase控制台](https://console.firebase.google.com/)
2. 创建一个新项目
3. 在项目中添加一个Web应用
4. 启用以下服务：
   - Realtime Database（在"构建"菜单下）
   - Authentication（开启电子邮件/密码登录方式）
   - Hosting（如果需要部署）
5. 在数据库规则中设置读写权限（生产环境推荐基于认证的权限）:
   ```json
   {
     "rules": {
       "users": {
         "$uid": {
           ".read": "$uid === auth.uid",
           ".write": "$uid === auth.uid"
         }
       }
     }
   }
   ```

### 2. 配置Firebase

创建配置文件：

1. 创建`firebase-config.js`文件
2. 在文件中填入你的Firebase配置信息

```javascript
// Firebase 配置
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// 初始化 Firebase
firebase.initializeApp(firebaseConfig);

// 获取数据库引用
const database = firebase.database();

// 获取用户特定的项目引用
function userProjectsRef() {
  const user = firebase.auth().currentUser;
  if (!user) {
    console.error('用户未登录');
    return null;
  }
  return database.ref(`users/${user.uid}/projects`);
}

// 其他帮助函数...
```

### 3. 本地运行

由于使用了模块和API调用，需要通过HTTP服务器运行：

```bash
# 使用Python启动简单的HTTP服务器
python -m http.server

# 或者使用Node.js的http-server
npx http-server
```

然后在浏览器中访问 `http://localhost:8000` 或服务器提供的URL。

### 4. 部署到Firebase Hosting

```bash
# 安装Firebase CLI
npm install -g firebase-tools

# 登录到Firebase
firebase login

# 初始化Firebase项目
firebase init

# 部署应用
firebase deploy
```

## 开发指南

### 项目结构

```
forget-me-not/
├── index.html             # 应用入口页面
├── login.html             # 用户登录页面
├── time-quadrant.html     # 时间四象限页面
├── project-detail.html    # 项目详情页面
├── firebase-config.js     # Firebase配置
├── css/                   # 样式文件
├── js/                    # JavaScript文件
└── README.md              # 项目说明文档
```

### 关键技术

- **Firebase**：用于数据存储、用户认证和托管
- **Chart.js**：数据可视化库，用于进度图表
- **Quill.js**：富文本编辑器
- **Font Awesome**：提供图标支持
- **Web Speech API**：实现语音识别功能

## 配置说明

### firebase.json

```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "cleanUrls": true,
    "trailingSlash": false
  }
}
```

## 安全最佳实践

1. **使用Firebase身份验证**：确保所有数据访问需要身份验证
2. **数据库安全规则**：实施严格的安全规则，基于用户ID限制数据访问
3. **客户端数据验证**：在保存到数据库前验证所有用户输入
4. **使用HTTPS**：确保所有数据传输通过HTTPS进行
5. **错误处理**：实现全面的错误处理以提高稳定性

## 疑难解答

1. **认证问题**：如遇认证失败，请确保Firebase配置正确，并检查浏览器控制台
2. **数据加载问题**：检查数据库规则是否允许您的用户读取数据
3. **部署问题**：确保所有必要文件都包含在部署中，特别是配置文件

## 贡献指南

欢迎贡献代码、报告问题或提出新功能建议。请通过GitHub Issues系统提交反馈。

## 许可证

本项目采用MIT许可证。详情请参阅LICENSE文件。 