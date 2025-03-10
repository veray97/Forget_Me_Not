# Forget Me Not - 笔记应用

一个简单而强大的笔记应用，使用Firebase Realtime Database存储数据。这个应用允许你创建、读取、编辑和删除笔记。

## 功能

- 创建新笔记
- 查看所有笔记列表
- 编辑现有笔记
- 删除笔记
- 实时数据存储与同步
- 响应式设计，适配移动设备

## 设置指南

### 1. Firebase设置

1. 访问 [Firebase控制台](https://console.firebase.google.com/)
2. 创建一个新项目
3. 在项目中添加一个Web应用
4. 启用Realtime Database（在"构建"菜单下）
5. 在数据库规则中设置读写权限（开发阶段可以设置为true）:
   ```json
   {
     "rules": {
       ".read": true,
       ".write": true
     }
   }
   ```

### 2. 配置Firebase

为了保护你的Firebase配置信息，我们使用单独的配置文件：

1. 复制`firebase-config.example.js`为`firebase-config.js`
2. 在`firebase-config.js`中填入你的Firebase配置信息
3. 确保`.gitignore`文件中包含`firebase-config.js`，这样它不会被提交到Git

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
```

### 3. 安装依赖

```bash
npm install
```

### 4. 开发模式运行

```bash
npm run dev
```

### 5. 构建生产版本

```bash
npm run build
```

## 部署到GitHub Pages

对于GitHub Pages部署，你需要安全地处理Firebase配置：

1. 确保不要提交`firebase-config.js`文件
2. 考虑使用环境变量或其他安全方式处理配置
3. 或者使用专门的部署服务如Vercel、Netlify等，它们支持环境变量设置

## 本地开发

由于浏览器的安全限制，直接在本地文件系统打开HTML文件可能无法正常工作。建议使用本地服务器：

```bash
# 使用Python启动简单的HTTP服务器
python -m http.server

# 或者使用Node.js的http-server
npx http-server
```

然后在浏览器中访问 `http://localhost:8000` 或服务器提供的URL。

## 注意事项

- 这个应用使用的是Firebase免费计划，有一定的读写限制
- 在生产环境中，应该设置更严格的数据库安全规则
- 考虑添加用户认证以保护你的笔记数据
- 不要将包含敏感信息的`firebase-config.js`文件提交到公开仓库

## 安全注意事项

### 关于Firebase客户端SDK的安全性

Firebase的Web客户端SDK配置（apiKey等）本身并不是高度敏感的秘密。Firebase设计时考虑了这些信息会在客户端公开的情况：

1. **apiKey**: 这不是一个可以完全访问你的Firebase项目的密钥。它主要用于项目识别和API请求限流。
2. **安全规则**: Firebase的真正安全保障来自于你在Firebase控制台中设置的安全规则。

然而，为了更好的安全实践，我们仍然建议：

1. 设置严格的Firebase安全规则，限制数据访问
2. 使用Firebase身份验证来控制用户访问
3. 在生产环境中，考虑使用环境变量或服务器端代理

### 设置更严格的安全规则

在Firebase控制台中，你可以设置更严格的安全规则，例如：

```json
{
  "rules": {
    "notes": {
      // 只有经过身份验证的用户可以读取笔记
      ".read": "auth != null",
      // 用户只能读写自己的笔记
      "$noteId": {
        ".read": "auth != null && data.child('userId').val() === auth.uid",
        ".write": "auth != null && (!data.exists() || data.child('userId').val() === auth.uid)"
      }
    }
  }
}
``` 