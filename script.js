        const telegramForm = document.getElementById('telegramForm');
        const botTokenInput = document.getElementById('botToken');
        const chatIdInput = document.getElementById('chatId');
        const messageInput = document.getElementById('message');
        const charCount = document.getElementById('charCount');
        const sendBtn = document.getElementById('sendBtn');
        const resetBtn = document.getElementById('resetBtn');
        const loading = document.getElementById('loading');
        const statusDot = document.getElementById('statusDot');
        const statusText = document.getElementById('statusText');
        const botName = document.getElementById('botName');
        const notification = document.getElementById('notification');
        const notifTitle = document.getElementById('notifTitle');
        const notifMessage = document.getElementById('notifMessage');

        const CONFIG = {
            checkInterval: 30000,
            maxMessageLength: 4000
        };

        let botStatus = 'checking';
        let botData = null;

        function init() {
            loadSavedData();
            setupEventListeners();
            updateCharCount();
            checkBotStatus();
            startStatusChecker();
        }

        function loadSavedData() {
            try {
                const saved = localStorage.getItem('telegramBotData');
                if (saved) {
                    const data = JSON.parse(saved);
                    botTokenInput.value = data.token || '';
                    chatIdInput.value = data.chatId || '';
                    messageInput.value = data.message || '';
                    
                    if (data.token) {
                        checkBotStatus();
                    }
                }
            } catch (e) {
                console.error('Gagal memuat data:', e);
            }
        }

        function saveData() {
            const data = {
                token: botTokenInput.value,
                chatId: chatIdInput.value,
                message: messageInput.value
            };
            localStorage.setItem('telegramBotData', JSON.stringify(data));
        }

        function setupEventListeners() {
            messageInput.addEventListener('input', () => {
                updateCharCount();
                saveData();
            });

            botTokenInput.addEventListener('input', () => {
                saveData();
                debounceCheckBotStatus();
            });

            chatIdInput.addEventListener('input', saveData);

            telegramForm.addEventListener('submit', sendMessage);

            resetBtn.addEventListener('click', resetForm);
        }

        function updateCharCount() {
            const count = messageInput.value.length;
            charCount.textContent = count;
            
            if (count > CONFIG.maxMessageLength) {
                charCount.style.color = '#FF3B30';
            } else if (count > 3500) {
                charCount.style.color = '#FF9500';
            } else {
                charCount.style.color = '#888';
            }
        }

        function resetForm() {
            if (confirm('Reset semua form? Token dan Chat ID akan dihapus.')) {
                telegramForm.reset();
                localStorage.removeItem('telegramBotData');
                updateCharCount();
                updateBotStatus('checking', 'Token bot belum dimasukkan', '-');
                showNotification('Form telah direset', 'info');
            }
        }

        async function checkBotStatus() {
            const token = botTokenInput.value.trim();
            
            if (!token) {
                updateBotStatus('inactive', 'Token bot belum dimasukkan', '-');
                return;
            }

            updateBotStatus('checking', 'Memeriksa status...', '-');

            try {
                const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
                const data = await response.json();

                if (data.ok) {
                    botData = data.result;
                    updateBotStatus('active', 
                        `Bot aktif`, 
                        `@${data.result.username}`
                    );
                } else {
                    updateBotStatus('inactive', 'Token tidak valid', '-');
                }
            } catch (error) {
                console.error('Error checking bot:', error);
                updateBotStatus('inactive', 'Gagal memeriksa', '-');
            }
        }

        function updateBotStatus(status, text, name) {
            botStatus = status;
            statusText.textContent = text;
            botName.textContent = name;
            
            statusDot.className = 'status-dot';
            if (status === 'active') {
                statusDot.classList.add('active');
            } else if (status === 'inactive') {
                statusDot.style.background = '#FF3B30';
            } else {
                statusDot.style.background = '#FF9500';
            }
        }

        function startStatusChecker() {
            setInterval(() => {
                if (botTokenInput.value.trim()) {
                    checkBotStatus();
                }
            }, CONFIG.checkInterval);
        }

        let debounceTimer;
        function debounceCheckBotStatus() {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(checkBotStatus, 1000);
        }

        async function sendMessage(e) {
            e.preventDefault();

            const token = botTokenInput.value.trim();
            const chatId = chatIdInput.value.trim();
            const message = messageInput.value.trim();

            if (!token || !chatId || !message) {
                showNotification('Harap isi semua kolom yang diperlukan!', 'error');
                return;
            }

            if (message.length > CONFIG.maxMessageLength) {
                showNotification(`Pesan terlalu panjang (maks ${CONFIG.maxMessageLength} karakter)`, 'error');
                return;
            }

            loading.classList.add('active');
            sendBtn.disabled = true;

            try {
                const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: message,
                        parse_mode: 'HTML'
                    })
                });

                const data = await response.json();

                if (data.ok) {
                    sendBtn.style.animation = 'sendSuccess 0.5s ease';
                    setTimeout(() => {
                        sendBtn.style.animation = '';
                    }, 500);

                    showNotification('Pesan berhasil dikirim!', 'success');
                    
                    saveData();
                    
                    messageInput.value = '';
                    updateCharCount();
                    saveData();

                } else {
                    telegramForm.style.animation = 'sendError 0.5s ease';
                    setTimeout(() => {
                        telegramForm.style.animation = '';
                    }, 500);

                    showNotification(`Gagal: ${data.description || 'Error tidak diketahui'}`, 'error');
                }

            } catch (error) {
                console.error('Send error:', error);
                showNotification('Koneksi error. Coba lagi.', 'error');
            } finally {
                loading.classList.remove('active');
                sendBtn.disabled = false;
            }
        }

        function showNotification(message, type = 'success') {
            notifTitle.textContent = type === 'success' ? 'Sukses' : 
                                   type === 'error' ? 'Error' : 'Info';
            notifMessage.textContent = message;

            notification.className = 'notification';
            notification.classList.add(type);
            notification.classList.add('show');

            setTimeout(() => {
                notification.classList.remove('show');
            }, 4000);
        }

        document.addEventListener('DOMContentLoaded', init);