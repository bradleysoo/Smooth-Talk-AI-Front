export const parseKakaoTalkCsv = (text, filename) => {
    const lines = text.split('\n');
    const messages = [];
    let otherName = "상대방"; // Default

    // 1. Try to extract "Other" name from filename
    // Format: KakaoTalk_Chat_Name_YYYY-MM-DD-HH-mm-ss.csv
    if (filename) {
        // Remove extension
        const namePart = filename.replace('.csv', '');
        // Split by '_'
        const parts = namePart.split('_');
        // Usually: KakaoTalk, Chat, [Name], [Date]...
        if (parts.length >= 3) {
            // If the format is strictly KakaoTalk_Chat_Name_Date...
            // The name is at index 2 (0-based)
            // But sometimes name has underscores?
            // Let's assume the standard format.
            if (parts[0] === 'KakaoTalk' && parts[1] === 'Chat') {
                // The date part usually starts with YYYY-MM-DD
                // Let's find the part that looks like a date
                const dateIndex = parts.findIndex(p => /^\d{4}-\d{2}-\d{2}/.test(p));
                if (dateIndex > 2) {
                    // Name is everything between 'Chat' and Date
                    otherName = parts.slice(2, dateIndex).join('_');
                } else if (dateIndex === -1 && parts.length > 2) {
                    // Can't find date, just take the rest?
                    // Let's just take index 2 for safety if consistent
                    otherName = parts[2];
                }
            }
        }
    }

    // CSV Parsing Helper handles quotes safely
    const parseCsvLine = (line) => {
        const result = [];
        let current = '';
        let inQuote = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuote && line[i + 1] === '"') {
                    // Escaped quote
                    current += '"';
                    i++;
                } else {
                    // Toggle quote
                    inQuote = !inQuote;
                }
            } else if (char === ',' && !inQuote) {
                // Separator
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    };


    // Skip Header (first line)
    // Check if first line is "Date,User,Message"
    const startIndex = lines[0].startsWith('Date,User,Message') ? 1 : 0;

    let previousDate = null;

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple check if it's a valid CSV line start (starts with date)
        // Regex for YYYY-MM-DD HH:mm:ss
        if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(line)) {
            // Contributor to previous message (multiline)?
            // CSV structure usually handles newlines within quotes, so line.trim() at start might break multiline messages if we strictly split by \n first.
            // CAUTION: splitting text by \n is risky for CSVs with newlines in fields.
            // Better approach for CSV: Use a regex or state machine to split ONLY on newlines outside quotes.
            // But for simplicity/speed, let's assume Kakao export puts each record on a new line or quotes properly.
            // Actually, `text.split('\n')` WILL break multiline messages inside quotes.
            // Need a smarter split or re-join.

            // Re-join strategy:
            // If the current line doesn't look like a start of a record, append it to the last valid line?
            // Or better: write a proper iterator.
            continue;
        }

        // Wait, `text.split('\n')` is dangerous if the message contains \n.
        // Let's use a robust CSV splitter logic instead of simple loop.
        // But for this environment, implementing a full CSV parser is heavy.
        // Let's rely on the specific format of Kakao CSV.
        // Records start with a Date: YYYY-MM-DD HH:mm:ss
    }

    // Robust Parsing Strategy
    // 1. Regex to match the start of a CSV particular to Kakao:
    // ^"Date","User","Message" ... or just the date pattern.
    // The sample shows: 2025-12-12 15:11:12,"김수민","창선생ㄴ미"
    // No quotes around date? Quotes around User and Message.

    // Pattern: 
    // ^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),"([^"]*)","((?:[^"]|"{2})*)"$
    // But message might contain newlines.

    // Let's use a regex with `g` flag on the whole text to capture full records.
    // Date is unquoted. User is quoted. Message is quoted.

    const recordRegex = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}),"([^"]*)","((?:[^"]|"{2})*)"/gm;
    // Note: ^ and $ in multiline mode match start/end of line.
    // If message contains newlines, `.` won't match, and `$` won't match end of record if it spans lines.
    // Kakao CSV: Message is inside "...".

    // Proper tokenizer:
    // Look for `Date,"` pattern?
    // Actually the sample is:
    // 2025-12-12 15:11:12,"김수민","..."

    // Manual State Machine Parser
    let cursor = 0;
    const len = text.length;

    // Helper to peek/read
    // We expect: Date(19 chars) , " User " , " Message " \r\n or \n

    // First, verify header
    if (text.startsWith("Date,User,Message")) {
        // seek past headers
        const nextLine = text.indexOf('\n');
        if (nextLine !== -1) cursor = nextLine + 1;
    }

    while (cursor < len) {
        // 1. Read Date
        // Expecting YYYY-MM-DD HH:mm:ss (19 chars)
        // Check if we have enough chars
        if (cursor + 19 > len) break;

        const possibleDate = text.substring(cursor, cursor + 19);
        if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(possibleDate)) {
            // Not a valid start, maybe empty line or garbage?
            // Advance cursor
            cursor++;
            continue;
        }
        const dateStr = possibleDate;
        cursor += 19;

        // Expect comma
        if (text[cursor] !== ',') { cursor++; continue; }
        cursor++; // skip comma

        // 2. Read User (Quoted)
        if (text[cursor] !== '"') { cursor++; continue; }
        cursor++; // skip opening quote

        const userStart = cursor;
        while (cursor < len && text[cursor] !== '"') {
            cursor++;
        }
        const userName = text.substring(userStart, cursor);
        cursor++; // skip closing quote

        // Expect comma
        if (text[cursor] !== ',') { cursor++; continue; }
        cursor++; // skip comma

        // 3. Read Message (Quoted)
        // Message can contain escaped quotes ("") and newlines
        if (text[cursor] !== '"') { cursor++; continue; }
        cursor++; // skip opening quote

        let message = "";
        while (cursor < len) {
            if (text[cursor] === '"') {
                // Check if escaped
                if (cursor + 1 < len && text[cursor + 1] === '"') {
                    message += '"';
                    cursor += 2;
                } else {
                    // End of message
                    break;
                }
            } else {
                message += text[cursor];
                cursor++;
            }
        }
        cursor++; // skip closing quote of message

        // 4. Process Record
        // dateStr: "2025-12-12 15:11:12"
        // userName: "김수민"
        // message: "Content"

        // Date handling
        const [dPart, tPart] = dateStr.split(' ');
        const [year, month, day] = dPart.split('-');

        // Logic for detecting date change to insert 'system' date message
        // Comparing with previousDate
        const currentDateOnly = `${year}-${month}-${day}`;
        if (currentDateOnly !== previousDate) {
            const dateObj = new Date(year, month - 1, day);
            const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
            // Use Intl or manual formatting to match "2025년 12월 12일 금요일"
            // Using manual mapping for safety if Intl is tricky with locale in strict JS env?
            // Let's use toLocaleDateString approach if possible, or manual.
            // kakaoParser uses "YYYY년 M월 D일 .요일"
            const weekday = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'][dateObj.getDay()];
            const formattedDate = `${year}년 ${parseInt(month)}월 ${parseInt(day)}일 ${weekday}`;

            messages.push({
                type: 'system',
                text: formattedDate,
                id: Date.now() + Math.random()
            });
            previousDate = currentDateOnly;
        }

        // Determine Sender
        // isMe logic using otherName from filename
        // If otherName is detected from filename
        // 💡 Fix: Normalize strings to NFC to handle macOS specific composite characters
        const isMe = userName.normalize('NFC') !== otherName.normalize('NFC');
        const sender = isMe ? 'me' : 'other';

        // Time Label: YYYY-MM-DD HH:mm
        const [h, m] = tPart.split(':');
        const timeLabel = `${dPart} ${h}:${m}`;

        messages.push({
            type: 'message',
            sender: sender,
            senderName: userName,
            text: message,
            time: timeLabel,
            id: Date.now() + Math.random()
        });

        // Skip until next newline to reset synchronization? 
        // Or just continue parsing. The loop expects Date at cursor.
        // We need to consume any trailing whitespace/newlines after the message closing quote.
        while (cursor < len && /\s/.test(text[cursor])) {
            cursor++;
        }
    }

    return messages;
};
