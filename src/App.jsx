// src/App.jsx
import { useState, useRef, useEffect } from "react";
import "./App.css";

// --- mockAnalyzeConversation 그대로 ---
function mockAnalyzeConversation(messages) {
    const otherMsgs = messages.filter((m) => m.sender === "other");
    const myMsgs = messages.filter((m) => m.sender === "me");
    const lastOther = otherMsgs[otherMsgs.length - 1];

    const totalLen = messages.reduce((acc, m) => acc + m.text.length, 0);

    let mood = "가벼운 일상 대화";
    if (messages.some((m) => m.text.includes("좋아") || m.text.includes("좋아해"))) {
        mood = "호감이 조금 섞인 대화";
    }
    if (messages.some((m) => m.text.includes("힘들") || m.text.includes("고민"))) {
        mood = "고민을 나누는 진지한 대화";
    }

    const summary = [
        `전체적으로 ${mood} 느낌의 대화예요.`,
        `메시지 수는 대략 ${messages.length}개, 문자 수는 ${totalLen}자 정도입니다.`,
        myMsgs.length > otherMsgs.length
            ? "내가 말을 조금 더 많이 하는 편이라, 질문을 던지고 상대 이야기를 더 끌어내면 좋아요."
            : "상대가 꽤 많이 이야기해준 편이라, 공감과 리액션을 더 강조하면 좋습니다.",
    ].join(" ");

    const advice = [
        "① 한 번에 너무 많은 정보를 쓰기보다는 1–2문장으로 가볍게 이야기해 보세요.",
        "② 상대가 쓴 표현을 그대로 한 번 따라 써 주면 ‘내 말을 잘 들어주고 있네’라는 느낌을 줍니다.",
        "③ 마지막에는 항상 질문 하나를 붙여서 대화를 이어갈 수 있는 여지를 남겨두는 게 좋습니다.",
    ];

    const sampleReplies = [];

    if (lastOther) {
        sampleReplies.push(
            `✨ 기본형 답장\n\n“${lastOther.text.slice(
                0,
                20
            )}” 라고 말해준 거 너무 좋다. 네 얘기 들으니까 나도 해보고 싶어졌어 ㅎㅎ 혹시 더 추천해줄 거 있어?`
        );
        sampleReplies.push(
            "😆 가벼운 텐션\n\n“ㅋㅋ 너 진짜 스타일 보인다 이 대화에서. 이런 얘기 더 들어보고 싶은데, 또 재미있는 썰 있어?”"
        );
        sampleReplies.push(
            "🙂 조금 진지하게\n\n“방금 얘기 들으니까 너가 어떤 사람인지 조금 더 알게 된 느낌이야. 나도 나중에 이런 얘기 여유 있을 때 더 하고 싶다 :)”"
        );
    } else {
        sampleReplies.push(
            "“요즘 너 얘기 듣는 거 은근 재밌다 ㅋㅋ 나도 너한테 물어보고 싶은 거 많아졌어.”"
        );
        sampleReplies.push(
            "“아까 얘기해준 거 더 듣고 싶은데, 네 기준에서는 어떤 게 제일 기억에 남아?”"
        );
    }

    return { summary, advice, sampleReplies };
}

// 시간
function nowTimeString() {
    const d = new Date();
    return d.toLocaleTimeString("ko-KR", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

function App() {

    // 사이드바 상태
    const [sidebarOpen, setSidebarOpen] = useState(false);
    
    // 대화 프레임 관리
    const [conversations, setConversations] = useState(() => {
        const initialId = Date.now()// 나중에 uuid 로 바꾸기
       // const initialId = crypto.randomUUID();
        return [
            { id: initialId, title: "새 대화", messages: [], analysis: null, createdAt: new Date() }
        ];
    });
    const [currentConversationId, setCurrentConversationId] = useState(
        () => conversations[0].id
    );
    
    const [draftSender, setDraftSender] = useState(null);
    const [draftText, setDraftText] = useState("");
    const [showTime, setShowTime] = useState(false);
    const [loading, setLoading] = useState(false);
    const [leftWidth, setLeftWidth] = useState(50);
    const [isResizing, setIsResizing] = useState(false);
    const [selectedMessageId, setSelectedMessageId] = useState(null);
    const splitLayoutRef = useRef(null);
    const draftInputRef = useRef(null);
    const chatBgRef = useRef(null);

    // 현재 대화 프레임 가져오기
    const currentConversation = conversations.find(c => c.id === currentConversationId) || conversations[0];
    const messages = currentConversation.messages;
    const analysis = currentConversation.analysis;

    // 메시지 추가
    const addMessage = () => {
        const text = draftText.trim();
        if (!text) return;

        const newMsg = {
            id: Date.now(),
            //id : crypto.randomUUID();나중에 바꾸기
            sender: draftSender,
            text,
            time: nowTimeString(),
        };

        setConversations(prev => prev.map(conv => 
            conv.id === currentConversationId
                ? { ...conv, messages: [...conv.messages, newMsg] }
                : conv
        ));

        setDraftText("");
        // setDraftSender(null);
        if (draftInputRef.current) {
            draftInputRef.current.focus();
        }
    };

    // 메시지 삭제
    const deleteMessage = (messageId, e) => {
        e.stopPropagation();
        setConversations(prev => prev.map(conv => 
            conv.id === currentConversationId
                ? { 
                    ...conv, 
                    messages: conv.messages.filter(m => m.id !== messageId),
                
                }
                : conv
        ));
        setSelectedMessageId(null);
    };

    // 말풍선 클릭 핸들러
    const handleBubbleClick = (messageId, e) => {
        e.stopPropagation();
        setSelectedMessageId(messageId === selectedMessageId ? null : messageId);
    };
    const handleKeyDown = (e) => {
        // 💡 Shift 키를 누르지 않고 Enter 키만 눌렸을 때
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault(); // Enter의 기본 동작(줄 바꿈)을 막습니다.
            addMessage();       // addMessage 함수를 호출하여 메시지를 추가합니다.
        }
        // Shift + Enter는 줄 바꿈을 허용 (기본 동작 유지)
    };

    // 대화 프레임 초기화
    const clearMessages = () => {
        setConversations(prev => prev.map(conv => 
            conv.id === currentConversationId
                ? { ...conv, messages: [], analysis: null }
                : conv
        ));
        setDraftSender(null);
    };

    // 분석 실행
    const handleAnalyze = () => {
        if (messages.length === 0) {
            alert("먼저 말풍선을 하나 이상 만들어 주세요!");
            return;
        }
        setLoading(true);
        const result = mockAnalyzeConversation(messages);
        setConversations(prev => prev.map(conv => 
            conv.id === currentConversationId
                ? { ...conv, analysis: result }
                : conv
        ));
        setLoading(false);
    };

    // 새 대화 프레임 생성
    const createNewConversation = () => {
        const newId = Date.now()
        const newConv = {
            id: newId,
            title: "새 대화",
            messages: [],
            analysis: null,
            createdAt: new Date()
        };
        setConversations(prev => [...prev, newConv]);
        setCurrentConversationId(newId);
    };

    // 대화 프레임 선택
    const selectConversation = (id) => {
        setCurrentConversationId(id);
        setDraftSender(null);
    };

    // 대화 프레임 삭제
    const deleteConversation = (id, e) => {
        e.stopPropagation();
        if (conversations.length === 1) {
            alert("최소 하나의 대화 프레임은 필요합니다!");
            return;
        }
        const newConversations = conversations.filter(c => c.id !== id);
        setConversations(newConversations);
        if (id === currentConversationId) {
            setCurrentConversationId(newConversations[0].id);
        }
    };

    // 대화 프레임 제목 업데이트 (첫 메시지 기반)
    const updateConversationTitle = (id, messages) => {
        if (messages.length > 0) {
            const firstMsg = messages[0].text.slice(0, 20);
            setConversations(prev => prev.map(conv => 
                conv.id === id && conv.title === "새 대화"
                    ? { ...conv, title: firstMsg }
                    : conv
            ));
        }
    };

    // 메시지가 추가될 때 제목 업데이트
    useEffect(() => {
        if (messages.length > 0) {
            updateConversationTitle(currentConversationId, messages);
        }
    }, [messages.length, currentConversationId]);

    const otherMessages = messages.filter((m) => m.sender === "other");
    const myMessages = messages.filter((m) => m.sender === "me");

    // 리사이저 드래그 핸들러
    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e) => {
            if (!splitLayoutRef.current) return;
            
            const container = splitLayoutRef.current;
            const rect = container.getBoundingClientRect();
            const newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100;

            // 최소/최대 너비 제한 (20% ~ 80%)
            const clampedWidth = Math.max(20, Math.min(80, newLeftWidth));
            setLeftWidth(clampedWidth);
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        // 전역 이벤트 리스너 등록
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        
        // 스타일 적용
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            document.body.style.cursor = "";
            document.body.style.userSelect = "";
        };
    }, [isResizing]);

    useEffect(() => {
        // draftSender가 설정되었고 (입력창이 화면에 나타났고),
        // ref가 DOM 요소를 성공적으로 참조하고 있을 때 (null이 아닐 때)
        if (draftSender && draftInputRef.current) {
            // 해당 DOM 요소에 포커스를 맞춥니다.
            draftInputRef.current.focus();
        }
    }, [draftSender]);

    // 다른 곳 클릭 시 선택 해제
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (chatBgRef.current ||!chatBgRef.current.contains(e.target)) {
                setSelectedMessageId(null);
            }
        };

        if (selectedMessageId) {
            document.addEventListener('click', handleClickOutside);
            return () => {
                document.removeEventListener('click', handleClickOutside);
            };
        }
    }, [selectedMessageId]);

    return (
        <div className="app">
            {/* 모바일 오버레이 */}
            {sidebarOpen && (
                <div 
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            
            {/* 사이드바 */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <button 
                        className="sidebar-toggle"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        title={sidebarOpen ? "사이드바 닫기" : "사이드바 열기"}
                    >
                        {sidebarOpen ? "◀" : "▶"}
                    </button>
                    {sidebarOpen && (
                        <>
                            <h2>대화 목록</h2>
                            <button 
                                className="btn btn-small btn-new"
                                onClick={createNewConversation}
                                title="대화 추가"
                            >
                                + 새 대화
                            </button>
                        </>
                    )}
                </div>
                {sidebarOpen && (
                    <div className="sidebar-content">
                        <div className="conversation-list">
                            {conversations.map(conv => (
                                <div
                                    key={conv.id}
                                    className={`conversation-item ${conv.id === currentConversationId ? 'active' : ''}`}
                                    onClick={() => selectConversation(conv.id)}
                                >
                                    <div className="conversation-title">{conv.title}</div>
                                    <div className="conversation-meta">
                                        {conv.messages.length}개 메시지
                                    </div>
                                    <button
                                        className="conversation-delete"
                                        onClick={(e) => deleteConversation(conv.id, e)}
                                        title="삭제"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </aside>

            {/* 메인 콘텐츠 */}
            <div className="main-content" style={{ marginLeft: sidebarOpen ? '260px' : '50px' }}>
                <header className="header">
                    <button 
                        className="mobile-sidebar-toggle"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        title="사이드바 열기/닫기"
                    >
                        ☰
                    </button>
                    <h1>SmoothTalk AI</h1>
                </header>

            <section className="split-layout" ref={splitLayoutRef}>
                {/* LEFT */}
                <div className="pane" style={{ width: `${leftWidth}%` }}>
                    <h2 className="pane-title">대화 프레임 만들기</h2>

                    <div className="chat-frame">
                        <div className="chat-bg" ref={chatBgRef}>
                            {messages.map((m) =>
                                m.sender === "other" ? (
                                    <div 
                                        key={m.id} 
                                        className={`bubble-row bubble-row-left ${selectedMessageId === m.id ? 'selected' : ''}`}
                                        onClick={(e) => handleBubbleClick(m.id, e)}
                                    >
                                        <div className="avatar">상</div>
                                        <div className="bubble bubble-other">
                                            <p>{m.text}</p>
                                            {selectedMessageId === m.id && (
                                                <button 
                                                    className="bubble-delete"
                                                    onClick={(e) => deleteMessage(m.id, e)}
                                                    title="삭제"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                        <div> {showTime && <span className="bubble-time">{m.time}</span>}</div>
                                    </div>
                                ) : (
                                    <div 
                                        key={m.id} 
                                        className={`bubble-row bubble-row-right ${selectedMessageId === m.id ? 'selected' : ''}`}
                                        onClick={(e) => handleBubbleClick(m.id, e)}
                                    >
                                        <div> {showTime && <span className="bubble-time">{m.time}</span>}</div>
                                        <div className="bubble bubble-me">
                                            <p>{m.text}</p>
                                            {selectedMessageId === m.id && (
                                                <button 
                                                    className="bubble-delete"
                                                    onClick={(e) => deleteMessage(m.id, e)}
                                                    title="삭제"
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            )}

                            {/* 🔥 점선 말풍선 2개 */}
                            <div className="placeholder-row">
                                <div
                                        className="placeholder-bubble left"
                                        onClick={() => {
                                            setDraftSender("other");
                                            setDraftText("");
                                        }}
                                >
                                    상대 말 입력…
                                </div>

                                    <div
                                        className="placeholder-bubble right"
                                        onClick={() => {
                                            // 1. 발신자 설정
                                            setDraftSender("me");
                                            setDraftText("");
                                        }}
                                    >
                                    내 말 입력…
                                </div>
                            </div>
                        </div>

                        {/* 입력창 */}
                        {draftSender && (
                            <div className="chat-input-bar">
                                <textarea
                                    className="chat-input"
                                    rows={2}
                                        // 💡 추가: ref 속성을 draftInputRef에 연결
                                    ref={draftInputRef}
                                    placeholder={
                                        draftSender === "other"
                                            ? "상대가 보낼 말"
                                            : "내가 보낼 말"
                                    }
                                    value={draftText}
                                        onChange={(e) => setDraftText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        
                                />
                                <button className="btn btn-primary" onClick={addMessage}>
                                    말풍선 추가
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 모바일용 컨트롤 - 대화 프레임 다음에 표시 */}
                    <div className="controls-section mobile-controls">
                        <div className="controls">
                            <label className="checkbox">
                                <input
                                    type="checkbox"
                                    checked={showTime}
                                    onChange={(e) => setShowTime(e.target.checked)}
                                />
                                <span>말풍선에 시간 표시</span>
                            </label>
                            <button className="btn btn-outline" onClick={clearMessages}>
                                전체 초기화
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleAnalyze}
                                disabled={loading}
                            >
                                {loading ? "분석 중..." : "Analyze (분석하기)"}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 리사이저 바 */}
                <div
                    className="resizer"
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsResizing(true);
                    }}
                    style={{ touchAction: 'none' }}
                />

                {/* RIGHT */}
                <div className="pane" style={{ width: `${100 - leftWidth}%` }}>
                    <h2 className="pane-title">분석 결과</h2>

                    <div className="my-chat-window">
                        <h3 className="sub-heading">상대의 대화</h3>
                        <div className="my-chat-bg">
                            {otherMessages.length === 0 && (
                                <p className="empty">아직 대화 프레임이 형성되지 않았어요요.</p>
                            )}
                            {otherMessages.map((m) => (
                                <div key={m.id} className="bubble-row bubble-row-left">
                                    <div className="bubble bubble-other">
                                        <p>{m.text}</p>
                                    </div>
                                    {showTime && <span className="bubble-time">{m.time}</span>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {analysis && (
                        <div className="analysis">
                            <h3 className="sub-heading">대화 분석 요약</h3>
                            <p>{analysis.summary}</p>

                            <h4>대화 TIP</h4>
                            <ul>
                                {analysis.advice.map((a, idx) => (
                                    <li key={idx}>{a}</li>
                                ))}
                            </ul>

                            <h4>추천 답장</h4>
                            <div className="reply-list">
                                {analysis.sampleReplies.map((r, idx) => (
                                    <div key={idx} className="reply-card">
                                        <pre>{r}</pre>
                                        <button
                                            className="btn btn-small"
                                            onClick={() => navigator.clipboard.writeText(r)}
                                        >
                                            복사
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* 컨트롤 - 데스크톱에서는 하단, 모바일에서는 중간 */}
            <section className="controls-section desktop-controls">
                <div className="controls">
                    <label className="checkbox">
                        <input
                            type="checkbox"
                            checked={showTime}
                            onChange={(e) => setShowTime(e.target.checked)}
                        />
                        <span>말풍선에 시간 표시</span>
                    </label>
                    <button className="btn btn-outline" onClick={clearMessages}>
                        전체 초기화
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={handleAnalyze}
                        disabled={loading}
                    >
                        {loading ? "분석 중..." : "Analyze (분석하기)"}
                    </button>
                </div>
            </section>
            </div>
        </div>
    );
}

export default App;
