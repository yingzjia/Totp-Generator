document.addEventListener('DOMContentLoaded', function() {
    // DOM元素
    const secretInput = document.getElementById('secretInput');
    const toggleVisibilityBtn = document.getElementById('toggleVisibility');
    const tokenCard = document.getElementById('tokenCard');
    const tokenCode = document.getElementById('tokenCode');
    const timerProgress = document.getElementById('timerProgress');
    const secondsRemaining = document.getElementById('secondsRemaining');
    const themeToggle = document.getElementById('themeToggle');
    
    // 状态变量
    let updateInterval;
    let currentSecret = '';
    let digits = 6;
    let period = 30;
    let algorithm = 'SHA1';
    
    // 检查主题偏好
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        themeToggle.querySelector('i').className = 'fas fa-sun';
    }
    
    // 事件监听器
    secretInput.addEventListener('input', handleSecretInput);
    toggleVisibilityBtn.addEventListener('click', toggleSecretVisibility);
    tokenCode.addEventListener('click', copyToClipboard);
    themeToggle.addEventListener('click', toggleTheme);
    
    // 处理密钥输入
    function handleSecretInput() {
        const secret = secretInput.value.trim();
        
        if (secret) {
            // 尝试解析密钥并生成验证码
            try {
                const result = parseSecret(secret);
                if (result.success) {
                    currentSecret = result.secret;
                    digits = result.digits;
                    period = result.period;
                    algorithm = result.algorithm;
                    
                    // 显示令牌并开始更新
                    tokenCard.style.display = 'block';
                    startTokenUpdate();
                } else {
                    // 如果密钥无效，隐藏令牌卡片
                    tokenCard.style.display = 'none';
                }
            } catch (error) {
                console.error('Error parsing secret:', error);
                tokenCard.style.display = 'none';
            }
        } else {
            // 如果密钥为空，隐藏令牌卡片
            tokenCard.style.display = 'none';
            if (updateInterval) {
                clearInterval(updateInterval);
                updateInterval = null;
            }
        }
    }
    
    // 解析密钥（普通Base32或otpauth URI）
    function parseSecret(input) {
        // 检查是否是otpauth URI
        if (input.startsWith('otpauth://')) {
            try {
                const uri = new URL(input);
                const params = new URLSearchParams(uri.search);
                
                // 提取密钥
                const secret = params.get('secret');
                if (!secret) {
                    return { success: false, message: '未找到密钥参数' };
                }
                
                // 提取其他参数
                let digits = 6;
                if (params.has('digits')) {
                    const d = parseInt(params.get('digits'));
                    if (d === 6 || d === 8) digits = d;
                }
                
                let period = 30;
                if (params.has('period')) {
                    const p = parseInt(params.get('period'));
                    if (p > 0) period = p;
                }
                
                let algorithm = 'SHA1';
                if (params.has('algorithm')) {
                    const alg = params.get('algorithm').toUpperCase();
                    if (['SHA1', 'SHA256', 'SHA512'].includes(alg)) {
                        algorithm = alg;
                    }
                }
                
                return {
                    success: true,
                    secret: secret.replace(/\s/g, '').toUpperCase(),
                    digits,
                    period,
                    algorithm
                };
                
            } catch (e) {
                return { success: false, message: '无效的URI格式' };
            }
        }
        
        // 普通Base32密钥
        const cleanedSecret = input.replace(/\s/g, '').toUpperCase();
        
        // 验证是否是有效的Base32
        if (!/^[A-Z2-7]+=*$/.test(cleanedSecret)) {
            // 允许任何输入，即使不是标准Base32也尝试生成
            return {
                success: true,
                secret: cleanedSecret,
                digits: 6,
                period: 30,
                algorithm: 'SHA1'
            };
        }
        
        return {
            success: true,
            secret: cleanedSecret,
            digits: 6,
            period: 30,
            algorithm: 'SHA1'
        };
    }
    
    // 开始令牌更新
    function startTokenUpdate() {
        // 清除现有的更新间隔
        if (updateInterval) {
            clearInterval(updateInterval);
        }
        
        // 立即更新一次
        updateToken();
        
        // 每秒更新一次
        updateInterval = setInterval(updateToken, 1000);
    }
    
    // 更新令牌
    function updateToken() {
        if (!currentSecret) return;
        
        try {
            // 生成TOTP代码
            const code = generateTOTP(currentSecret, digits, period, algorithm);
            
            // 计算剩余时间
            const epoch = Math.floor(Date.now() / 1000);
            const countdown = period - (epoch % period);
            const progressPercent = (countdown / period) * 100;
            
            // 更新UI
            tokenCode.textContent = formatCode(code);
            secondsRemaining.textContent = countdown;
            timerProgress.style.width = `${progressPercent}%`;
            
            // 如果剩余时间少于5秒，添加警告颜色
            if (countdown <= 5) {
                timerProgress.style.background = 'linear-gradient(90deg, #ff4d4d 0%, #ff8080 100%)';
            } else {
                timerProgress.style.background = '';
            }
            
        } catch (error) {
            console.error('令牌更新错误:', error);
            tokenCode.textContent = '错误';
        }
    }
    
    // 生成TOTP代码
    function generateTOTP(secret, digits, period, algorithm) {
        // 解码Base32密钥
        const key = _b32ToHex(secret);
        
        // 计算时间计数器
        const epoch = Math.floor(Date.now() / 1000);
        const counter = Math.floor(epoch / period);
        
        // 将计数器转换为16进制字符串，并填充为16个字符
        const counterHex = counter.toString(16).padStart(16, '0');
        
        // 使用CryptoJS计算HMAC
        let hmacObj;
        switch (algorithm) {
            case 'SHA256':
                hmacObj = CryptoJS.HmacSHA256(CryptoJS.enc.Hex.parse(counterHex), CryptoJS.enc.Hex.parse(key));
                break;
            case 'SHA512':
                hmacObj = CryptoJS.HmacSHA512(CryptoJS.enc.Hex.parse(counterHex), CryptoJS.enc.Hex.parse(key));
                break;
            default:
                hmacObj = CryptoJS.HmacSHA1(CryptoJS.enc.Hex.parse(counterHex), CryptoJS.enc.Hex.parse(key));
        }
        
        // 将HMAC结果转换为十六进制字符串
        const hmac = hmacObj.toString(CryptoJS.enc.Hex);
        
        // 动态截断
        const offset = parseInt(hmac.substring(hmac.length - 1), 16);
        const truncatedHex = hmac.substr(offset * 2, 8);
        
        // 将截断后的十六进制转换为整数，并屏蔽最高位
        let truncatedDecimal = parseInt(truncatedHex, 16) & 0x7fffffff;
        
        // 生成OTP
        const otp = truncatedDecimal % Math.pow(10, digits);
        return otp.toString().padStart(digits, '0');
    }
    
    // Base32解码为十六进制字符串 (重命名并稍微混淆)
    function _b32ToHex(b32str) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let bits = '';
        let hex = '';
        
        // 移除填充字符
        b32str = b32str.replace(/=+$/, '');
        
        // 将每个Base32字符转换为5位二进制
        for (let i = 0; i < b32str.length; i++) {
            const val = charset.indexOf(b32str.charAt(i));
            if (val === -1) throw new Error('无效的字符');
            bits += val.toString(2).padStart(5, '0');
        }
        
        // 将二进制转换为十六进制
        for (let i = 0; i + 4 <= bits.length; i += 4) {
            const chunk = bits.substr(i, 4);
            hex += parseInt(chunk, 2).toString(16);
        }
        
        return hex;
    }
    
    // 格式化代码显示
    function formatCode(code) {
        if (code.length === 6) {
            return `${code.substring(0, 3)} ${code.substring(3)}`;
        } else if (code.length === 8) {
            return `${code.substring(0, 4)} ${code.substring(4)}`;
        }
        return code;
    }
    
    // 切换密钥可见性
    function toggleSecretVisibility() {
        if (secretInput.type === 'password') {
            secretInput.type = 'text';
            toggleVisibilityBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            secretInput.type = 'password';
            toggleVisibilityBtn.innerHTML = '<i class="fas fa-eye"></i>';
        }
    }
    
    // 复制到剪贴板
    function copyToClipboard() {
        const code = tokenCode.textContent.replace(/\s/g, '');
        navigator.clipboard.writeText(code)
            .then(() => _showNotification('已复制到剪贴板'))
            .catch(err => console.error('复制失败:', err));
    }
    
    // 切换主题
    function toggleTheme() {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
        
        if (isDarkMode) {
            themeToggle.querySelector('i').className = 'fas fa-sun';
        } else {
            themeToggle.querySelector('i').className = 'fas fa-moon';
        }
    }
    
    // 显示提示消息 (重命名)
    function _showNotification(message) {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert position-fixed top-0 start-50 translate-middle-x mt-3';
        alertDiv.style.zIndex = '1050';
        alertDiv.innerHTML = `<i class="fas fa-check-circle me-2"></i>${message}`;
        
        document.body.appendChild(alertDiv);
        
        // 添加动画效果
        setTimeout(() => {
            alertDiv.style.opacity = '1';
        }, 10);
        
        setTimeout(() => {
            alertDiv.style.opacity = '0';
            alertDiv.style.transition = 'opacity 0.5s ease';
            
            setTimeout(() => {
                alertDiv.remove();
            }, 500);
        }, 2000);
    }
});
