export const parseKakaoTalkChat = (text) => {
    const lines = text.split('\n');
    const messages = [];
    let currentDate = null;
    let otherName = "상대방"; // Default

    // Header parsing to find "Other" name
    // Format: "석진희 님과 카카오톡 대화"
    const headerLine = lines.find(line => line.includes("님과 카카오톡 대화"));
    if (headerLine) {
        const match = headerLine.match(/(.*) 님과 카카오톡 대화/);
        if (match) {
            otherName = match[1].trim();
        }
    }

    const dateRegex = /--------------- (\d{4}년 \d{1,2}월 \d{1,2}일 .요일) ---------------/;
    const messageRegex = /\[(.*?)\] \[(오전|오후) (\d{1,2}:\d{2})\] (.*)/;

    // Date parsing helper
    const parseDateString = (dateStr) => {
        // "2025년 10월 31일 금요일" -> "2025-10-31"
        const match = dateStr.match(/(\d{4})년 (\d{1,2})월 (\d{1,2})일/);
        if (match) {
            const year = match[1];
            const month = match[2].padStart(2, '0');
            const day = match[3].padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        return null;
    };

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        // Check for Date Line
        const dateMatch = line.match(dateRegex);
        if (dateMatch) {
            currentDate = parseDateString(dateMatch[1]);

            messages.push({
                type: 'system',
                text: dateMatch[1],
                id: Date.now() + Math.random()
            });
            return;
        }

        // Check for Message Line
        const msgMatch = line.match(messageRegex);
        if (msgMatch) {
            const senderName = msgMatch[1];
            const ampm = msgMatch[2];
            const timeStr = msgMatch[3];
            const content = msgMatch[4];

            let [hours, minutes] = timeStr.split(':').map(Number);
            if (ampm === '오후' && hours !== 12) hours += 12;
            if (ampm === '오전' && hours === 12) hours = 0;
            const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

            // Combine with currentDate if available
            const fullTimeLabel = currentDate ? `${currentDate} ${formattedTime}` : formattedTime;

            const isMe = senderName !== otherName;

            const sender = isMe ? 'me' : 'other';

            messages.push({
                type: 'message',
                sender: sender,
                senderName: senderName,
                text: content,
                time: fullTimeLabel, // Now "YYYY-MM-DD HH:mm"
                id: Date.now() + Math.random()
            });
        } else {
            // Multi-line message support
            // If previous item was a message, append to it
            if (messages.length > 0 && messages[messages.length - 1].type === 'message') {
                messages[messages.length - 1].text += '\n' + line;
            }
        }
    });

    if (messages.length > 1000) {
        return messages.slice(-1000);
    }
    return messages;
};
