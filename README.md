# TOTP验证码生成器

一个简单、安全的基于浏览器的TOTP（基于时间的一次性密码）验证码生成器。完全在客户端运行，不会向服务器发送或存储您的密钥。

## 特性

- 纯客户端实现，所有计算在浏览器中完成
- 支持标准的TOTP算法（RFC 6238）
- 支持Base32编码的密钥和otpauth://链接
- 自动刷新验证码
- 倒计时计时器
- 支持亮色/暗色主题
- 响应式设计，适配移动设备

## 使用方法

1. 在输入框中输入您的Base32编码的密钥
2. 验证码会自动生成并显示
3. 验证码每30秒自动刷新一次
4. 点击验证码可复制到剪贴板

## 隐私与安全

- 所有计算完全在您的浏览器中进行
- 不会向任何服务器发送您的密钥
- 不会在本地存储您的密钥
- 无需网络连接即可使用

## 本地运行

只需将项目文件下载到本地，然后在浏览器中打开`index.html`文件即可。

## 许可证

本项目采用MIT许可证 - 详情请参阅[LICENSE](LICENSE)文件
