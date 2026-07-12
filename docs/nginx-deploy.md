# Nginx 部署指南

## 目录

- [本地部署（macOS + Homebrew）](#本地部署macos--homebrew)
- [远端部署（Ubuntu / Debian）](#远端部署ubuntu--debian)
- [HTTPS（Let's Encrypt + certbot）](#httpslets-encrypt--certbot)
- [更新流程](#更新流程)

---

## 本地部署（macOS + Homebrew）

### 1. 安装 nginx

```bash
brew install nginx
brew services start nginx
```

默认监听 `8080` 端口，静态文件根目录 `/opt/homebrew/var/www/`。

### 2. 构建项目

```bash
npm run build
```

产物在 `build/` 目录，资源路径为 `/that-math-things/static/...`（由 `package.json` 的 `homepage` 字段控制）。

### 3. 添加 nginx 路由配置

`/opt/homebrew/etc/nginx/servers/conf.d/that-math-things.conf`：

```nginx
location = /that-math-things {
    return 302 /that-math-things/;
}

location /that-math-things/ {
    alias /path/to/that-math-things/build/;
    index index.html;
}
```

确保 `/opt/homebrew/etc/nginx/nginx.conf` 的 `server` 块内有：

```nginx
include servers/conf.d/*.conf;
```

### 4. 验证并重载

```bash
nginx -t
nginx -s reload
```

访问 `http://localhost:8080/that-math-things/`。

---

## 远端部署（Ubuntu / Debian）

### 1. 安装 nginx

```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2. 构建并上传

在本地执行：

```bash
npm run build
rsync -avz build/ user@your-server:/var/www/that-math-things/
```

### 3. 创建 nginx 站点配置

`/etc/nginx/sites-available/that-math-things`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location = /that-math-things {
        return 302 /that-math-things/;
    }

    location /that-math-things/ {
        alias /var/www/that-math-things/;
        index index.html;
    }
}
```

> 如果站点部署在根路径（如 `https://your-domain.com/`），去掉 location 前缀，改用 `root`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /var/www/that-math-things/;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

> 注意：如果使用 **BrowserRouter**（非 HashRouter），必须加上 `try_files` 以便刷新时回退到 `index.html`。本项目使用 HashRouter，`try_files` 非必需，但加上也无害。

### 4. 启用站点

```bash
sudo ln -s /etc/nginx/sites-available/that-math-things /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## HTTPS（Let's Encrypt + certbot）

### 1. 安装 certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 2. 自动申请证书并配置 HTTPS

```bash
sudo certbot --nginx -d your-domain.com
```

certbot 会自动：

- 申请证书
- 修改 nginx 配置，添加 SSL 相关指令
- 设置 301 跳转（HTTP → HTTPS）
- 添加定时续期任务（systemd timer）

### 3. 验证

```bash
sudo systemctl status certbot.timer
```

证书续期自动执行，无需手动干预。

### 手动续期测试

```bash
sudo certbot renew --dry-run
```

### 最终 nginx 配置示例（certbot 自动生成）

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    location /that-math-things/ {
        alias /var/www/that-math-things/;
        index index.html;
    }
}

server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}
```

---

## 更新流程

### 仅更新静态资源

```bash
npm run build
rsync -avz build/ user@your-server:/var/www/that-math-things/
```

**不需要 reload nginx**，nginx 每次请求都从磁盘读取最新文件。

### 更新 nginx 配置

修改 `.conf` 文件后：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 本地开发迭代

```bash
npm run build           # 构建到 build/
# 或直接用 npm start   # 开发服务器 http://localhost:3000
```
