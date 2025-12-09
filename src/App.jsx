// src/App.jsx
import { useState, useRef, useEffect } from "react";
import { parseKakaoTalkChat } from "./utils/kakaoParser";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import "./App.css";



// 시간
function nowTimeString() {
    const d = new Date();
    return d.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

// API 기본 URL 설정
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

function App() {

    // 사이드바 상태
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // 프로필 토스트 상태
    const [showProfileToast, setShowProfileToast] = useState(false);
    // 로그인 토스트 상태
    const [showLoginToast, setShowLoginToast] = useState(false);
    // 로그인 모달 모드 (중앙 표시)
    const [loginModalMode, setLoginModalMode] = useState(false);
    // 에러 토스트 상태
    const [showErrorToast, setShowErrorToast] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    // 복사 완료 토스트 상태
    const [showCopyToast, setShowCopyToast] = useState(false);
    // 충전 완료 토스트 상태
    const [showRechargeToast, setShowRechargeToast] = useState(false);
    // 대화 제목 편집 상태
    const [editingConversationId, setEditingConversationId] = useState(null);
    const [editingTitle, setEditingTitle] = useState("");
    // 로그인 상태
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    // 사용자 정보 상태
    const [userInfo, setUserInfo] = useState(null);
    // 토큰 잔액 상태
    const [tokenBalance, setTokenBalance] = useState(0);

    // 로그아웃 처리 (토큰 만료 등)
    const handleLogout = () => {
        localStorage.removeItem("accessToken");
        setIsLoggedIn(false);
        setUserInfo(null);
        setShowProfileToast(false);
        // 필요하다면 홈으로 리다이렉트하거나 추가적인 클린업 수행
        window.history.replaceState({}, document.title, "/");
    };

    // 사용자 정보 가져오기
    const fetchUserInfo = async (token) => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                if (data.data && data.data.profileImage) {
                    setUserInfo(data.data);
                } else {
                    // 프로필 이미지가 없으면 로그아웃 처리 (요구사항)
                    handleLogout();
                }
            } else if (response.status === 401 || response.status === 403) {
                // 토큰 만료 또는 인증 실패 시 로그아웃 처리
                handleLogout();
            }
        } catch (error) {
            console.error("Failed to fetch user info:", error);
        }
    };

    // 토큰 잔액 가져오기
    const fetchTokenBalance = async () => {
        try {
            const token = localStorage.getItem("accessToken");
            const response = await fetch(`${API_BASE_URL}/api/usage/quota`, {
                headers: token ? {
                    "Authorization": `Bearer ${token}`
                } : {}
            });
            if (response.ok) {
                const data = await response.json();
                if (data.tokenBalance !== undefined) {
                    setTokenBalance(data.tokenBalance);
                }
            }
        } catch (error) {
            console.error("Failed to fetch token balance:", error);
        }
    };

    // 초기 로드 시 토큰 확인
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        if (token) {
            localStorage.setItem("accessToken", token);
            setIsLoggedIn(true);
            fetchUserInfo(token);
            fetchConversations(token);
            // URL에서 토큰 제거
            window.history.replaceState({}, document.title, "/");
        } else {
            // 저장된 토큰이 있는지 확인
            const savedToken = localStorage.getItem("accessToken");
            if (savedToken) {
                setIsLoggedIn(true);
                fetchUserInfo(savedToken);
                fetchConversations(savedToken);
            } else {
                // 비로그인 상태일 때 기본 대화 하나 생성
                const initialId = Date.now();
                setConversations([
                    { id: initialId, title: "새 대화", messages: [], analysis: null, createdAt: new Date() }
                ]);
                setCurrentConversationId(initialId);
            }
        }
        // 토큰 잔액 초기 로드
        if (isLoggedIn) {
            fetchTokenBalance();
        }
    }, [isLoggedIn]);

    // 결제 모달 상태
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    // 사용량 초과 모달 상태
    const [showLimitModal, setShowLimitModal] = useState(false);
    // 토큰 토스트 상태
    const [showTokenToast, setShowTokenToast] = useState(false);
    // 선택된 토큰 수와 가격
    const [selectedTokenAmount, setSelectedTokenAmount] = useState(null);
    const [selectedTokenPrice, setSelectedTokenPrice] = useState(null);

    // 대화 프레임 관리
    const [conversations, setConversations] = useState([]);
    const [currentConversationId, setCurrentConversationId] = useState(() => {
        const savedId = localStorage.getItem("currentConversationId");
        return savedId ? Number(savedId) : null;
    });

    // currentConversationId가 변경될 때마다 로컬 스토리지에 저장
    useEffect(() => {
        if (currentConversationId) {
            localStorage.setItem("currentConversationId", currentConversationId);
        }
    }, [currentConversationId]);

    const [draftSender, setDraftSender] = useState(null);
    const [draftText, setDraftText] = useState("");
    const [showTime, setShowTime] = useState(false);
    const [loading, setLoading] = useState(false);
    const [leftWidth, setLeftWidth] = useState(50);
    const [isResizing, setIsResizing] = useState(false);
    const [selectedMessageId, setSelectedMessageId] = useState(null);
    const splitLayoutRef = useRef(null);
    const draftInputRef = useRef(null);
    const dateInputRef = useRef(null);
    const fileInputRef = useRef(null); // 파일 업로드용 ref
    const chatBgRef = useRef(null);
    const processingPayment = useRef(false);
    const tempDateRef = useRef(null);
    const lastSelectedDateRef = useRef(null); // 마지막 선택 날짜 추적

    // 날짜 선택 상태 (초기값: 오늘)
    const [tempSelectedDate, setTempSelectedDate] = useState(() => {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    // 현재 대화 프레임 가져오기
    const currentConversation = conversations.find(c => c.id === currentConversationId) || conversations[0];
    const messages = currentConversation ? currentConversation.messages : [];
    const analysis = currentConversation ? currentConversation.analysis : null;

    // 시스템 메시지 추가 공통 함수
    const addSystemMessage = async (text) => {
        const newMsg = {
            id: Date.now(),
            sender: 'system',
            text: text,
            time: '',
        };

        setConversations(prev => prev.map(conv =>
            conv.id === currentConversationId
                ? { ...conv, messages: [...conv.messages, newMsg] }
                : conv
        ));

        // 로그인 상태라면 백엔드에 저장
        if (isLoggedIn) {
            try {
                await fetch(`${API_BASE_URL}/conversations/${currentConversationId}/messages`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
                    },
                    body: JSON.stringify({
                        sender: "SYSTEM",
                        text: text,
                        timeLabel: ""
                    })
                });
            } catch (error) {
                console.error("Failed to save system message:", error);
            }
        }
    };

    // 마지막 날짜 찾기 (없으면 오늘)
    const getLastDateFromMessages = () => {
        // 뒤에서부터 탐색하여 system 메시지 찾기
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].sender === 'system') {
                // "2025년 11월 29일 금요일" 형식 파싱 시도
                const dateStr = messages[i].text;
                // 정규식으로 년, 월, 일 추출
                const match = dateStr.match(/(\d+)년\s+(\d+)월\s+(\d+)일/);
                if (match) {
                    const year = parseInt(match[1], 10);
                    const month = parseInt(match[2], 10) - 1; // 월은 0부터 시작
                    const day = parseInt(match[3], 10);
                    return new Date(year, month, day);
                }
            }
        }
        return new Date(); // 기본값 오늘
    };

    // "다음 날" 버튼 클릭 시
    const handleNextDay = () => {
        const lastDate = getLastDateFromMessages();
        // 하루 추가
        lastDate.setDate(lastDate.getDate() + 1);

        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' };
        const formattedDate = lastDate.toLocaleDateString('ko-KR', options);

        addSystemMessage(formattedDate);
    };

    // 날짜 값 변경 감지
    const handleDateChange = (e) => {
        setTempSelectedDate(e.target.value);
    };

    // 날짜 확정 (확인 버튼 클릭 시)
    const handleConfirmDate = (e) => {
        e.stopPropagation();
        const dateStr = tempSelectedDate;
        if (!dateStr) return;

        const dateObj = new Date(dateStr);
        if (isNaN(dateObj.getTime())) return;

        const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' };
        const formattedDate = dateObj.toLocaleDateString('ko-KR', options);

        addSystemMessage(formattedDate);
    };

    // 메시지 추가
    const addMessage = async () => {
        const text = draftText.trim();
        if (!text) return;

        let currentContextDate;

        // 메시지가 없을 때(첫 시작) 오늘 날동 추가
        if (messages.length === 0) {
            const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' };
            const today = new Date();
            const todayStr = today.toLocaleDateString('ko-KR', options);
            await addSystemMessage(todayStr);
            currentContextDate = today;
        } else {
            currentContextDate = getLastDateFromMessages();
        }

        // YYYY-MM-DD HH:mm 형식 생성 (마지막 날짜 구분선 기준)
        const year = currentContextDate.getFullYear();
        const month = String(currentContextDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentContextDate.getDate()).padStart(2, '0');
        const timeStr = nowTimeString(); // HH:mm
        const fullTimeLabel = `${year}-${month}-${day} ${timeStr}`;

        if (isLoggedIn) {
            try {
                const response = await fetch(`${API_BASE_URL}/conversations/${currentConversationId}/messages`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
                    },
                    body: JSON.stringify({
                        sender: draftSender === "me" ? "USER" : "OTHER",
                        text: text,
                        timeLabel: fullTimeLabel
                    })
                });

                if (response.ok) {
                    // 메시지 전송 성공 시 대화 내용 갱신
                    await fetchConversationDetail(currentConversationId, localStorage.getItem("accessToken"));
                } else {
                    console.error("Failed to send message");
                    // 에러 처리 로직 추가 가능
                }
            } catch (error) {
                console.error("Error sending message:", error);
            }
        } else {
            // 비로그인 상태: 로컬 처리
            const newMsg = {
                id: Date.now(),
                sender: draftSender,
                text,
                time: fullTimeLabel,
            };

            setConversations(prev => prev.map(conv =>
                conv.id === currentConversationId
                    ? { ...conv, messages: [...conv.messages, newMsg] }
                    : conv
            ));
        }

        setDraftText("");
        if (draftInputRef.current) {
            draftInputRef.current.focus();
        }
    };

    // 메시지 삭제
    const deleteMessage = async (messageId, e) => {
        e.stopPropagation();

        if (isLoggedIn) {
            try {
                const response = await fetch(`${API_BASE_URL}/conversations/${currentConversationId}/messages/${messageId}`, {
                    method: "DELETE",
                    headers: {
                        "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
                    }
                });

                if (response.ok) {
                    // 삭제 성공 시 대화 내용 갱신
                    await fetchConversationDetail(currentConversationId, localStorage.getItem("accessToken"));
                } else {
                    console.error("Failed to delete message");
                }
            } catch (error) {
                console.error("Error deleting message:", error);
            }
        } else {
            setConversations(prev => prev.map(conv =>
                conv.id === currentConversationId
                    ? {
                        ...conv,
                        messages: conv.messages.filter(m => m.id !== messageId),

                    }
                    : conv
            ));
        }
        setSelectedMessageId(null);
    };

    // 시간 수정 상태
    const [editingTimeId, setEditingTimeId] = useState(null);

    const updateMessageTime = async (messageId, newTime) => {
        // 현재 메시지 찾기
        const currentMsg = messages.find(m => m.id === messageId);
        if (!currentMsg) return;

        let updatedTimeLabel = newTime;

        // 기존 timeLabel이 날짜를 포함하고 있다면 날짜 부분 유지
        if (currentMsg.time && currentMsg.time.length > 5) {
            // YYYY-MM-DD HH:mm 형식 가정 (또는 날짜 부분이 앞에 있음)
            // 공백으로 분리하여 날짜 부분 추출
            const parts = currentMsg.time.split(' ');
            if (parts.length > 1) {
                // 날짜 부분 + 새 시간
                updatedTimeLabel = `${parts[0]} ${newTime}`;
            }
        }

        if (isLoggedIn) {
            try {
                await fetch(`${API_BASE_URL}/conversations/${currentConversationId}/messages/${messageId}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
                    },
                    body: JSON.stringify({ time: updatedTimeLabel })
                });
            } catch (error) {
                console.error("Error updating message time:", error);
            }
        }

        setConversations(prev => prev.map(conv =>
            conv.id === currentConversationId
                ? {
                    ...conv,
                    messages: conv.messages.map(m =>
                        m.id === messageId ? { ...m, time: updatedTimeLabel } : m
                    )
                }
                : conv
        ));
        setEditingTimeId(null);
    };

    // 말풍선 클릭 핸들러
    const handleBubbleClick = (messageId, e) => {
        e.stopPropagation();
        setSelectedMessageId(messageId === selectedMessageId ? null : messageId);
    };

    // 회원 탈퇴
    const handleDeleteAccount = async () => {
        if (!isLoggedIn) return;

        const confirmDelete = window.confirm(
            "정말로 회원 탈퇴하시겠습니까?\n\n모든 대화 내역과 데이터가 영구적으로 삭제되며, 복구할 수 없습니다."
        );

        if (!confirmDelete) return;

        try {
            const response = await fetch(`${API_BASE_URL}/auth/account`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${localStorage.getItem("accessToken")}` }
            });

            if (response.ok) {
                alert("회원 탈퇴가 완료되었습니다.");
                localStorage.removeItem("accessToken");
                setIsLoggedIn(false);
                setUserInfo(null);
                setShowProfileToast(false);
                // Reset to default conversation
                const initialId = Date.now();
                setConversations([
                    { id: initialId, title: "새 대화", messages: [], analysis: null, createdAt: new Date() }
                ]);
                setCurrentConversationId(initialId);
            } else {
                alert("회원 탈퇴에 실패했습니다. 다시 시도해 주세요.");
            }
        } catch (error) {
            console.error("Failed to delete account:", error);
            alert("회원 탈퇴 중 오류가 발생했습니다.");
        }
    };

    // 결제 준비 요청 (카카오페이)
    const handlePayment = async () => {
        if (!selectedTokenAmount || !selectedTokenPrice) return;

        if (!isLoggedIn) {
            setLoginModalMode(true);
            setShowLoginToast(true);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/payment/ready`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
                },
                body: JSON.stringify({
                    item_name: `${selectedTokenAmount} 토큰`,
                    quantity: 1,
                    total_amount: selectedTokenPrice
                })
            });

            if (response.ok) {
                const data = await response.json();
                // tid 저장 (승인 요청 시 필요)
                localStorage.setItem("payment_tid", data.tid);

                // 모바일/PC 환경 체크하여 리다이렉트
                const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
                const nextUrl = isMobile ? data.next_redirect_mobile_url : data.next_redirect_pc_url;

                window.location.href = nextUrl;
            } else {
                alert("결제 준비 중 오류가 발생했습니다.");
            }
        } catch (error) {
            console.error("Payment ready error:", error);
            alert("결제 요청 중 오류가 발생했습니다.");
        }
    };

    // 결제 승인 처리 (리다이렉트 후)
    useEffect(() => {
        const pgToken = new URLSearchParams(window.location.search).get("pg_token");
        const tid = localStorage.getItem("payment_tid");

        if (pgToken && tid && !processingPayment.current) {
            processingPayment.current = true;

            const approvePayment = async () => {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/payment/approve`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
                        },
                        body: JSON.stringify({
                            pg_token: pgToken,
                            tid: tid
                        })
                    });

                    if (response.ok) {
                        setShowRechargeToast(true);
                        setTimeout(() => setShowRechargeToast(false), 3000);

                        fetchTokenBalance(); // 토큰 갱신
                        window.history.replaceState({}, document.title, "/"); // URL 정리
                        localStorage.removeItem("payment_tid");
                    } else {
                        // 이미 처리된 결제인지 확인 (-702)
                        try {
                            const errorData = await response.json();
                            // 백엔드가 카카오 에러를 그대로 반환한다고 가정하거나, 
                            // 백엔드에서 500/400을 던질 때 메시지를 확인
                            if (errorData.error_code === -702 ||
                                (errorData.error_message && errorData.error_message.includes("already done"))) {
                                setShowRechargeToast(true);
                                setTimeout(() => setShowRechargeToast(false), 3000);
                                fetchTokenBalance();
                                window.history.replaceState({}, document.title, "/");
                                localStorage.removeItem("payment_tid");
                                return;
                            }
                        } catch (e) {
                            // JSON 파싱 실패 등
                        }
                        alert("결제 승인에 실패했습니다.");
                    }
                } catch (error) {
                    console.error("Payment approve error:", error);
                    alert("결제 처리 중 오류가 발생했습니다.");
                }
            };
            approvePayment();
        }
    }, []);

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

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setShowCopyToast(true);
        setTimeout(() => {
            setShowCopyToast(false);
        }, 2000);
    };

    // 분석 실행
    // 분석 실행
    const handleAnalyze = async () => {
        if (messages.length === 0) {
            alert("먼저 말풍선을 하나 이상 만들어 주세요!");
            return;
        }
        setLoading(true);

        try {
            // 백엔드 DTO 형식에 맞게 변환 (시스템 메시지 제외)
            const analysisMessages = messages
                .filter(m => m.sender !== 'system')
                .map(m => ({
                    sender: m.sender === "me" ? "USER" : "OTHER", // Enum 매핑 (USER, OTHER)
                    text: m.text,
                    timeLabel: m.time
                }));

            const response = await fetch(`${API_BASE_URL}/conversations/${currentConversationId}/analyze`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(isLoggedIn && { "Authorization": `Bearer ${localStorage.getItem("accessToken")}` }),
                },
                body: JSON.stringify({ messages: analysisMessages }),
            });

            if (response.status === 429) {
                if (!isLoggedIn) {
                    setLoginModalMode(true);
                    setShowLoginToast(true);
                } else {
                    setShowLimitModal(true);
                }
                setLoading(false);
                return;
            }

            if (!response.ok) {
                throw new Error("분석 요청 실패");
            }

            const data = await response.json();
            // 202 Accepted response with analysisId
            const { analysisId } = data;

            if (!analysisId) {
                throw new Error("분석 ID를 받지 못했습니다.");
            }

            // SSE 연결
            const eventSource = new EventSource(`${API_BASE_URL}/analysis/subscribe/${analysisId}`);

            eventSource.addEventListener("complete", (event) => {
                console.log("SSE complete event received:", event.data);
                const result = JSON.parse(event.data);
                console.log("Parsed result:", result);
                console.log("messageFrequency:", result.messageFrequency);

                setConversations(prev => prev.map(conv =>
                    conv.id === currentConversationId
                        ? { ...conv, analysis: result }
                        : conv
                ));

                setLoading(false);

                // 분석 완료 후 토큰 잔액 업데이트
                if (isLoggedIn) {
                    fetchTokenBalance();
                }

                eventSource.close();
            });

            eventSource.onerror = (error) => {
                console.error("SSE Error:", error);
                eventSource.close();
                setLoading(false);
                alert("분석 중 오류가 발생했습니다 (연결 끊김).");
            };

        } catch (error) {
            console.error("Analysis error:", error);
            alert("분석 요청 중 오류가 발생했습니다.");
            setLoading(false);
        }
    };

    // 대화 목록 가져오기
    const fetchConversations = async (token) => {
        try {
            const response = await fetch(`${API_BASE_URL}/conversations`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();

                // 백엔드에서 받은 목록을 상태로 설정
                const summaryList = data.data.map(c => ({
                    ...c,
                    messages: [], // 초기에는 빈 배열
                    analysis: null
                }));
                setConversations(summaryList);

                // 1. URL 파라미터나 상태 등으로 특정 대화를 열어야 하는지 확인 (여기서는 생략, 기본적으로 첫 번째 또는 마지막 대화)
                // 2. 현재 선택된 대화가 없거나, 목록에 있는 경우 상세 내용 가져오기
                if (summaryList.length > 0) {
                    // 기존에 선택된 ID가 유효한지 확인
                    const validCurrentId = summaryList.find(c => c.id === currentConversationId);

                    if (validCurrentId && currentConversationId) {
                        // 이미 선택된 대화가 유효하면 그 대화의 상세 내용을 다시 불러옴 (새로고침 시)
                        fetchConversationDetail(currentConversationId, token);
                    } else {
                        // 선택된 대화가 없거나 유효하지 않으면 첫 번째 대화 선택
                        selectConversation(summaryList[0].id, token);
                    }
                }
            } else if (response.status === 401 || response.status === 403) {
                handleLogout();
            }
        } catch (error) {
            console.error("Failed to fetch conversations:", error);
        }
    };

    // 대화 상세 조회
    const fetchConversationDetail = async (id, token) => {
        try {
            const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                const detail = data.data;

                // 백엔드 메시지 포맷을 프론트엔드 포맷으로 변환
                const formattedMessages = detail.messages.map(m => ({
                    id: m.id,
                    sender: m.sender === "USER" ? "me" : (m.sender === "SYSTEM" ? "system" : "other"),
                    text: m.text,
                    time: m.timeLabel || "", // timeLabel이 없으면 빈 문자열
                    createdAt: m.createdAt // 정렬을 위해 생성일자 저장
                }));

                // 메시지 ID 기준 오름차순 정렬 (또는 createdAt 기준)
                formattedMessages.sort((a, b) => a.id - b.id);

                setConversations(prev => prev.map(c =>
                    c.id === id ? { ...c, messages: formattedMessages, analysis: detail.analysis } : c
                ));
            }
        } catch (error) {
            console.error("Failed to fetch conversation detail:", error);
        }
    };

    // 새 대화 프레임 생성
    const createNewConversation = async () => {
        if (!isLoggedIn) {
            // 비로그인 사용자는 새 대화를 생성할 수 없음
            setShowLoginToast(true);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/conversations`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ title: "새 대화" })
            });
            if (response.ok) {
                const data = await response.json();
                const newConv = {
                    ...data.data,
                    messages: [],
                    analysis: null
                };
                setConversations(prev => [newConv, ...prev]);
                setCurrentConversationId(newConv.id);

                // 새 대화 생성 직후 제목 편집 모드 활성화
                setEditingConversationId(newConv.id);
                setEditingTitle("새 대화");
            }
        } catch (error) {
            console.error("Failed to create conversation:", error);
        }
    };

    // 대화 프레임 선택
    const selectConversation = (id, tokenOverride) => {
        setCurrentConversationId(id);
        setDraftSender(null);

        const token = tokenOverride || localStorage.getItem("accessToken");
        if (isLoggedIn && token) {
            fetchConversationDetail(id, token);
        }
    };

    // 파일 업로드 핸들러
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const parsedMessages = parseKakaoTalkChat(text);

            if (parsedMessages.length === 0) {
                alert("대화 내용을 찾을 수 없습니다.");
                return;
            }

            const confirmImport = window.confirm("가져온 대화 내용으로 현재 대화창을 채우시겠습니까?\n기존 내용은 유지되거나 뒤에 추가됩니다.");
            if (!confirmImport) return;

            if (isLoggedIn) {
                setLoading(true);
                try {
                    // 순차적으로 저장하여 ID 순서 보장
                    for (const msg of parsedMessages) {
                        const payload = {
                            sender: msg.type === 'system' ? 'SYSTEM' : (msg.sender === 'me' ? 'USER' : 'OTHER'),
                            text: msg.text,
                            timeLabel: msg.time || ""
                        };

                        await fetch(`${API_BASE_URL}/conversations/${currentConversationId}/messages`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
                            },
                            body: JSON.stringify(payload)
                        });
                    }
                    // 모든 저장 완료 후 목록 갱신
                    await fetchConversationDetail(currentConversationId, localStorage.getItem("accessToken"));
                } catch (error) {
                    console.error("Import failed:", error);
                    alert("대화 내용 저장 중 오류가 발생했습니다.");
                } finally {
                    setLoading(false);
                }
            } else {
                // 비로그인 상태: 로컬 처리
                const newMessages = parsedMessages.map(msg => {
                    if (msg.type === 'system') {
                        return {
                            id: msg.id,
                            sender: 'system',
                            text: msg.text,
                            time: ''
                        };
                    } else {
                        return {
                            id: msg.id,
                            sender: msg.sender, // 'me' or 'other'
                            text: msg.text,
                            time: msg.time
                        };
                    }
                });

                setConversations(prev => prev.map(conv =>
                    conv.id === currentConversationId
                        ? { ...conv, messages: [...conv.messages, ...newMessages] }
                        : conv
                ));
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    };

    // 대화 프레임 삭제
    const deleteConversation = async (id, e) => {
        e.stopPropagation();

        // Check if trying to delete the last conversation
        if (conversations.length === 1) {
            setErrorMessage("최소 하나의 대화 프레임은 필요합니다!");
            setShowErrorToast(true);
            setTimeout(() => setShowErrorToast(false), 3000);
            return;
        }

        if (isLoggedIn) {
            try {
                const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${localStorage.getItem("accessToken")}` }
                });

                if (response.ok) {
                    // 삭제 후 목록 다시 불러오기 (최소 1개 유지 로직이 백엔드에 있으므로)
                    fetchConversations(localStorage.getItem("accessToken"));
                }
            } catch (error) {
                console.error("Failed to delete conversation:", error);
            }
        } else {
            const newConversations = conversations.filter(c => c.id !== id);
            setConversations(newConversations);
            if (id === currentConversationId) {
                setCurrentConversationId(newConversations[0].id);
            }
        }
    };

    // 대화 제목 수정
    const updateConversationTitle = async (id, newTitle) => {
        if (!newTitle || !newTitle.trim()) {
            setEditingConversationId(null);
            return;
        }

        if (isLoggedIn) {
            try {
                const response = await fetch(`${API_BASE_URL}/conversations/${id}`, {
                    method: "PATCH",
                    headers: {
                        "Authorization": `Bearer ${localStorage.getItem("accessToken")}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({ title: newTitle.trim() })
                });

                if (response.ok) {
                    const data = await response.json();
                    setConversations(prev => prev.map(conv =>
                        conv.id === id ? { ...conv, title: data.data.title } : conv
                    ));
                }
            } catch (error) {
                console.error("Failed to update conversation title:", error);
            }
        } else {
            setConversations(prev => prev.map(conv =>
                conv.id === id ? { ...conv, title: newTitle.trim() } : conv
            ));
        }

        setEditingConversationId(null);
        setEditingTitle("");
    };

    // 메시지 추가 시 스크롤을 아래로 이동
    useEffect(() => {
        if (chatBgRef.current) {
            chatBgRef.current.scrollTop = chatBgRef.current.scrollHeight;
        }
    }, [messages]);

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
            if (chatBgRef.current || !chatBgRef.current.contains(e.target)) {
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
            {isLoggedIn && sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* 사이드바 */}
            {isLoggedIn && (
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
                                        onClick={() => {
                                            if (editingConversationId !== conv.id) {
                                                selectConversation(conv.id);
                                            }
                                        }}
                                    >
                                        {editingConversationId === conv.id ? (
                                            <input
                                                className="conversation-title-input"
                                                value={editingTitle}
                                                onChange={(e) => setEditingTitle(e.target.value)}
                                                onBlur={() => updateConversationTitle(conv.id, editingTitle)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        updateConversationTitle(conv.id, editingTitle);
                                                    } else if (e.key === 'Escape') {
                                                        setEditingConversationId(null);
                                                        setEditingTitle("");
                                                    }
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                autoFocus
                                            />
                                        ) : (
                                            <div className="conversation-title-wrapper">
                                                <div className="conversation-title">{conv.title}</div>
                                                <button
                                                    className="conversation-edit"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingConversationId(conv.id);
                                                        setEditingTitle(conv.title);
                                                    }}
                                                    title="제목 수정"
                                                >
                                                    ✎
                                                </button>
                                            </div>
                                        )}
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
            )}

            {/* 메인 콘텐츠 */}
            <div className="main-content" style={{ marginLeft: isLoggedIn ? (sidebarOpen ? '260px' : '50px') : '0' }}>
                <header className="header">
                    {isLoggedIn && (
                        <button
                            className="mobile-sidebar-toggle"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            title="사이드바 열기/닫기"
                        >
                            ☰
                        </button>
                    )}
                    <div className="logo-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                        <img src="/smtalk_icon.png" alt="SmoothTalk AI" style={{ height: '40px', width: 'auto' }} />
                        <h1>SmoothTalk AI</h1>
                    </div>
                    <div className="header-right">
                        {isLoggedIn && (
                            <div
                                className="token-display"
                                onClick={() => setShowTokenToast(!showTokenToast)}
                                style={{ cursor: 'pointer' }}
                            >
                                <span className="token-icon">🪙</span>
                                <span className="token-count">{tokenBalance}</span>
                            </div>
                        )}
                        {isLoggedIn ? (
                            <button
                                className="user-profile-button"
                                onClick={() => setShowProfileToast(!showProfileToast)}
                                title="프로필"
                            >
                                {userInfo && userInfo.profileImage && (
                                    <img src={userInfo.profileImage} alt="Profile" className="user-profile-image" />
                                )}
                            </button>
                        ) : (
                            <button
                                className="user-profile-button login-button"
                                onClick={() => {
                                    setLoginModalMode(false);
                                    setShowLoginToast(!showLoginToast);
                                }}
                                title="로그인"
                            >
                                <div className="user-profile-circle login-circle">로그인</div>
                            </button>
                        )}
                    </div>
                </header>

                {/* 로그인 토스트 오버레이 */}
                {showLoginToast && (
                    <div
                        className="toast-overlay"
                        onClick={() => {
                            setShowLoginToast(false);
                            setLoginModalMode(false);
                        }}
                    />
                )}

                {/* 로그인 토스트 알림 창 */}
                {showLoginToast && (
                    <div className={`profile-toast login-toast ${loginModalMode ? 'centered-login' : ''}`}>
                        <div className="profile-toast-header">
                            <h3 className="user-nickname">{loginModalMode ? "로그인 요청" : "로그인 필요"}</h3>
                        </div>
                        <div className="profile-toast-content">
                            <p className="login-message">
                                {loginModalMode
                                    ? "무료 사용량을 초과했습니다. 계속하려면 로그인해주세요."
                                    : "더 많은 기능을 사용하려면 로그인하세요."}
                            </p>
                            <button
                                className="google-login-button"
                                onClick={() => {
                                    // 백엔드 OAuth2 로그인 엔드포인트로 리다이렉트
                                    window.location.href = `${API_BASE_URL}/oauth2/authorization/google`;
                                }}
                            >
                                <img src="/google_g_logo.png" alt="Google" className="google-logo" />
                                Google 계정으로 로그인
                            </button>
                        </div>
                    </div>
                )}

                {/* 프로필 토스트 오버레이 */}
                {showProfileToast && (
                    <div
                        className="toast-overlay"
                        onClick={() => setShowProfileToast(false)}
                    />
                )}

                {/* 프로필 토스트 알림 창 */}
                {showProfileToast && (
                    <div className="profile-toast">
                        <div className="profile-toast-header">
                            <h3 className="user-nickname">{userInfo ? userInfo.name : "사용자"}</h3>
                        </div>
                        <div className="profile-toast-content">
                            <button
                                className="profile-menu-button profile-menu-button-logout"
                                onClick={() => {
                                    handleLogout();
                                }}
                            >
                                Logout
                            </button>
                            <button
                                className="profile-menu-button profile-menu-button-delete"
                                onClick={() => {
                                    handleDeleteAccount();
                                }}
                            >
                                Cancel Membership
                            </button>
                        </div>
                    </div>
                )}

                {/* 토큰 토스트 오버레이 */}
                {showTokenToast && (
                    <div
                        className="toast-overlay"
                        onClick={() => setShowTokenToast(false)}
                    />
                )}

                {/* 토큰 토스트 알림 창 */}
                {showTokenToast && (
                    <div className="token-recharge-modal">
                        <div className="token-recharge-header">
                            <h3>토큰 충전</h3>
                            <div className="current-balance">현재 잔액: {tokenBalance}개</div>
                        </div>
                        <div className="token-recharge-content">
                            <button
                                className="recharge-option-button"
                                onClick={() => {
                                    setSelectedTokenAmount(10);
                                    setSelectedTokenPrice(1800);
                                    setShowTokenToast(false);
                                    setShowPaymentModal(true);
                                }}
                            >
                                <span className="token-amount">🪙 10개</span>
                                <span className="token-price">₩1,800</span>
                            </button>
                            <button
                                className="recharge-option-button"
                                onClick={() => {
                                    setSelectedTokenAmount(20);
                                    setSelectedTokenPrice(3200);
                                    setShowTokenToast(false);
                                    setShowPaymentModal(true);
                                }}
                            >
                                <span className="token-amount">🪙 20개</span>
                                <span className="token-price">₩3,200</span>
                            </button>
                            <button
                                className="recharge-option-button best-value"
                                onClick={() => {
                                    setSelectedTokenAmount(30);
                                    setSelectedTokenPrice(4900);
                                    setShowTokenToast(false);
                                    setShowPaymentModal(true);
                                }}
                            >
                                <div className="best-value-badge">BEST</div>
                                <span className="token-amount">🪙 30개</span>
                                <span className="token-price">₩4,900</span>
                            </button>
                        </div>
                        <div className="legal-links">
                            <a href="https://smoothtalkai.com/terms" target="_blank" rel="noreferrer">이용약관</a>
                            <span>|</span>
                            <a href="https://smoothtalkai.com/privacy" target="_blank" rel="noreferrer">개인정보 처리방침</a>
                            <span>|</span>
                            <a href="https://smoothtalkai.com/business-info" target="_blank" rel="noreferrer">사업자정보확인</a>
                            <span>|</span>
                            <a href="https://smoothtalkai.com/refund" target="_blank" rel="noreferrer">환불 안내</a>
                        </div>
                        <div className="business-info">
                            <p>주식회사 smoothTalkAI | 대표: 김수민</p>
                            <p>사업자등록번호: ???-??-??????</p>
                            <p>통신판매 : 2025-인천-?????</p>
                            <p>주소: 인천광역시 미추홀구 관교동 삼환 apt 103동 1505호</p>
                            <p>전화번호: 010-2041-3255</p>
                            <p>이메일: ksm3255@gmail.com</p>
                            <p>Copyright @2025 Singularity All rights reserved</p>
                        </div>
                        <button
                            className="modal-close-btn-text"
                            onClick={() => setShowTokenToast(false)}
                        >
                            취소
                        </button>
                    </div>
                )}

                {/* 복사 완료 토스트 */}
                <div className={`toast-container ${showCopyToast ? "show" : ""}`}>
                    <div className="toast success">
                        <span>Message copied!</span>
                    </div>
                </div>

                {/* 충전 완료 토스트 */}
                <div className={`toast-container ${showRechargeToast ? "show" : ""}`}>
                    <div className="toast success">
                        <span>토큰이 충전되었습니다! 🪙</span>
                    </div>
                </div>

                {/* 에러 토스트 오버레이 */}
                {
                    showErrorToast && (
                        <div
                            className="error-toast-overlay"
                            onClick={() => setShowErrorToast(false)}
                        />
                    )
                }

                {/* 에러 토스트 알림 */}
                {
                    showErrorToast && (
                        <div className="error-toast">
                            <div className="error-toast-icon">⚠️</div>
                            <div className="error-toast-message">{errorMessage}</div>
                        </div>
                    )
                }

                {/* 사용량 초과 모달 */}
                {
                    showLimitModal && (
                        <>
                            <div
                                className="modal-overlay"
                                onClick={() => setShowLimitModal(false)}
                            />
                            <div className="plan-modal limit-modal">
                                <div className="plan-modal-header">
                                    <h2>알림</h2>
                                    <button
                                        className="modal-close-button"
                                        onClick={() => setShowLimitModal(false)}
                                        title="닫기"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="plan-modal-content limit-modal-content">
                                    <h3>Free usage exceeded</h3>
                                    <p className="limit-message">
                                        일일 무료 사용량을 초과했습니다.<br />
                                        토큰을 충전하여 계속 이용하세요.
                                    </p>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => {
                                            setShowLimitModal(false);
                                            setShowTokenToast(true);
                                        }}
                                    >
                                        토큰 충전하기
                                    </button>
                                </div>
                            </div>
                        </>
                    )
                }

                {/* 결제 모달 */}
                {
                    showPaymentModal && selectedTokenAmount && selectedTokenPrice && (
                        <>
                            <div
                                className="modal-overlay"
                                onClick={() => {
                                    setShowPaymentModal(false);
                                    setSelectedTokenAmount(null);
                                    setSelectedTokenPrice(null);
                                }}
                            />
                            <div className="plan-modal payment-modal">
                                <div className="plan-modal-header">
                                    <h2>토큰 재충전</h2>
                                    <button
                                        className="modal-close-button"
                                        onClick={() => {
                                            setShowPaymentModal(false);
                                            setSelectedTokenAmount(null);
                                            setSelectedTokenPrice(null);
                                        }}
                                        title="닫기"
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className="plan-modal-content payment-modal-content">
                                    <div className="payment-info-group">
                                        <label>충전 토큰 수</label>
                                        <div className="payment-amount">{selectedTokenAmount} tokens</div>
                                    </div>

                                    <div className="payment-info-group">
                                        <label>결제 금액</label>
                                        <div className="payment-amount">₩{selectedTokenPrice.toLocaleString()}</div>
                                    </div>

                                    <div className="payment-info-group">
                                        <label>결제 방법</label>
                                        <div className="payment-method">
                                            <img
                                                src="/payment_icon_yellow_small.png"
                                                alt="Kakao Pay"
                                                style={{ height: '24px', width: 'auto', marginRight: '4px' }}
                                            />
                                            Kakao Pay
                                        </div>
                                    </div>

                                    <div className="payment-info-group">
                                        <label>플랜 정보</label>
                                        <ul className="payment-benefits">
                                            <li>{selectedTokenAmount} tokens for ₩{selectedTokenPrice.toLocaleString()}</li>
                                        </ul>
                                    </div>

                                    <div className="payment-footer">

                                        <p className="refund-policy">
                                            결제 시 환불 정책에 동의하는 것으로 간주됩니다.
                                        </p>
                                        <button
                                            className="btn btn-primary payment-button"
                                            onClick={handlePayment}
                                        >
                                            결제하기
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )
                }

                <section className="split-layout" ref={splitLayoutRef}>
                    {/* LEFT */}
                    <div className="pane pane-chat" style={{ width: `${leftWidth}%` }}>
                        <div className="pane-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h2 className="pane-title" style={{ margin: 0 }}>대화 프레임 만들기</h2>
                            <button
                                onClick={() => fileInputRef.current.click()}
                                title="카카오톡 대화 가져오기"
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '20px'
                                }}
                            >
                                📥
                            </button>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                                accept=".txt"
                                style={{ display: 'none' }}
                            />
                        </div>

                        <div className="chat-frame">
                            <div className="chat-bg" ref={chatBgRef}>
                                {messages.map((m) =>
                                    m.sender === "system" ? (
                                        <div key={m.id} className="bubble-row bubble-system-row">
                                            <div className="bubble-system">
                                                {m.text}
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
                                    ) : m.sender === "other" ? (
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
                                            <div>
                                                {showTime && (
                                                    editingTimeId === m.id ? (
                                                        <input
                                                            type="time"
                                                            lang="en-GB"
                                                            className="time-picker-input"
                                                            defaultValue={m.time && m.time.length > 5 ? m.time.slice(-5) : m.time}
                                                            autoFocus
                                                            onClick={(e) => e.stopPropagation()}
                                                            onBlur={(e) => updateMessageTime(m.id, e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    updateMessageTime(m.id, e.currentTarget.value);
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        <span
                                                            className="bubble-time"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingTimeId(m.id);
                                                            }}
                                                            style={{ cursor: 'pointer' }}
                                                            title="시간 수정"
                                                        >
                                                            {m.time && m.time.length > 5 ? m.time.slice(-5) : m.time}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div
                                            key={m.id}
                                            className={`bubble-row bubble-row-right ${selectedMessageId === m.id ? 'selected' : ''}`}
                                            onClick={(e) => handleBubbleClick(m.id, e)}
                                        >
                                            <div>
                                                {showTime && (
                                                    editingTimeId === m.id ? (
                                                        <input
                                                            type="time"
                                                            className="time-picker-input"
                                                            defaultValue={m.time && m.time.length > 5 ? m.time.slice(-5) : m.time}
                                                            autoFocus
                                                            onClick={(e) => e.stopPropagation()}
                                                            onBlur={(e) => updateMessageTime(m.id, e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') {
                                                                    updateMessageTime(m.id, e.currentTarget.value);
                                                                }
                                                            }}
                                                        />
                                                    ) : (
                                                        <span
                                                            className="bubble-time"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingTimeId(m.id);
                                                            }}
                                                            style={{ cursor: 'pointer' }}
                                                            title="시간 수정"
                                                        >
                                                            {m.time && m.time.length > 5 ? m.time.slice(-5) : m.time}
                                                        </span>
                                                    )
                                                )}
                                            </div>
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
                                        className="placeholder-bubble center"
                                        style={{ position: 'relative', cursor: messages.length > 0 ? 'pointer' : 'default' }}
                                        onClick={() => {
                                            if (messages.length > 0) {
                                                handleNextDay();
                                            }
                                        }}
                                    >
                                        {messages.length > 0 ? (
                                            "다음 날"
                                        ) : (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>{tempSelectedDate}</span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (dateInputRef.current) dateInputRef.current.showPicker();
                                                    }}
                                                    style={{
                                                        padding: '6px 10px',
                                                        fontSize: '14px',
                                                        cursor: 'pointer',
                                                        backgroundColor: 'transparent',
                                                        border: 'none',
                                                        color: '#888',
                                                        fontWeight: '500'
                                                    }}
                                                >
                                                    수정
                                                </button>
                                                <button
                                                    onClick={handleConfirmDate}
                                                    style={{
                                                        padding: '6px 10px',
                                                        fontSize: '14px',
                                                        cursor: 'pointer',
                                                        backgroundColor: 'transparent',
                                                        color: '#4CAF50',
                                                        border: 'none',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    확인
                                                </button>
                                            </div>
                                        )}
                                        <input
                                            type="date"
                                            ref={dateInputRef}
                                            value={tempSelectedDate}
                                            onChange={handleDateChange}
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                position: 'absolute',
                                                top: '-30px',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                width: '1px',
                                                height: '1px',
                                                opacity: 0,
                                                zIndex: -1,
                                                border: 0,
                                                padding: 0,
                                                pointerEvents: 'none'
                                            }}
                                        />
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
                                        className={`chat-input ${draftSender === 'me' ? 'chat-input-me' : 'chat-input-other'}`}
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
                    <div className="pane pane-analysis" style={{ width: `${100 - leftWidth}%` }}>
                        <h2 className="pane-title">분석 결과</h2>

                        {loading ? (
                            <div className="loading-container">
                                <div className="loading-spinner"></div>
                                <p>대화를 분석하고 있습니다...</p>
                            </div>
                        ) : (
                            <>


                                {analysis && (
                                    <div className="analysis">
                                        <h3 className="sub-heading">대화 분석 요약</h3>
                                        <p>{analysis.summary}</p>

                                        {/* Message Frequency Pie Chart */}
                                        {analysis.messageFrequency && Object.keys(analysis.messageFrequency).length > 0 && (
                                            <div className="chart-container">
                                                <h4>메시지 빈도</h4>
                                                <svg viewBox="0 0 200 200" className="pie-chart">
                                                    {(() => {
                                                        const total = Object.values(analysis.messageFrequency).reduce((a, b) => a + b, 0);
                                                        let currentAngle = -90; // Start from top
                                                        const colors = {
                                                            'USER': '#2A52BE',
                                                            'OTHER': '#FFC0CB',

                                                        };

                                                        return Object.entries(analysis.messageFrequency).map(([sender, count], idx) => {
                                                            if (count === 0) return null;

                                                            const percentage = (count / total) * 100;

                                                            // 100%일 경우 원 그리기
                                                            if (percentage === 100) {
                                                                return (
                                                                    <g key={sender}>
                                                                        <circle
                                                                            cx="100"
                                                                            cy="100"
                                                                            r="80"
                                                                            fill={colors[sender] || '#6b7280'}
                                                                            stroke="white"
                                                                            strokeWidth="2"
                                                                        />
                                                                        <text
                                                                            x="100"
                                                                            y="100"
                                                                            textAnchor="middle"
                                                                            dominantBaseline="middle"
                                                                            fill="white"
                                                                            fontSize="12"
                                                                            fontWeight="bold"
                                                                        >
                                                                            100%
                                                                        </text>
                                                                    </g>
                                                                );
                                                            }

                                                            const angle = (count / total) * 360;
                                                            const startAngle = currentAngle;
                                                            const endAngle = currentAngle + angle;
                                                            currentAngle = endAngle;

                                                            // Calculate arc path
                                                            const startRad = (startAngle * Math.PI) / 180;
                                                            const endRad = (endAngle * Math.PI) / 180;
                                                            const x1 = 100 + 80 * Math.cos(startRad);
                                                            const y1 = 100 + 80 * Math.sin(startRad);
                                                            const x2 = 100 + 80 * Math.cos(endRad);
                                                            const y2 = 100 + 80 * Math.sin(endRad);
                                                            const largeArc = angle > 180 ? 1 : 0;

                                                            const labelAngle = (startAngle + endAngle) / 2;
                                                            const labelRad = (labelAngle * Math.PI) / 180;
                                                            const labelX = 100 + 50 * Math.cos(labelRad);
                                                            const labelY = 100 + 50 * Math.sin(labelRad);

                                                            return (
                                                                <g key={sender}>
                                                                    <path
                                                                        d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                                                                        fill={colors[sender] || '#6b7280'}
                                                                        stroke="white"
                                                                        strokeWidth="2"
                                                                    />
                                                                    <text
                                                                        x={labelX}
                                                                        y={labelY}
                                                                        textAnchor="middle"
                                                                        fill="white"
                                                                        fontSize="12"
                                                                        fontWeight="bold"
                                                                    >
                                                                        {percentage.toFixed(0)}%
                                                                    </text>
                                                                </g>
                                                            );
                                                        });
                                                    })()}
                                                </svg>
                                                <div className="chart-legend">
                                                    {Object.entries(analysis.messageFrequency).map(([sender, count]) => (
                                                        <div key={sender} className="legend-item">
                                                            <span className="legend-color" style={{
                                                                backgroundColor: sender === 'USER' ? '#2A52BE' : '#FFC0CB'
                                                            }}></span>
                                                            <span className="legend-label">{sender === 'USER' ? '나' : '상대'}: {count}개</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Time Frequency Bar Chart */}
                                        {analysis.timeFrequency && Object.keys(analysis.timeFrequency).length > 0 && (
                                            <div className="chart-container" style={{ marginTop: '30px' }}>
                                                <h4>시간대별 연락 빈도 (상대방)</h4>
                                                <ResponsiveContainer width="100%" height={300}>
                                                    <BarChart data={(() => {
                                                        // Convert to array and sort by hour
                                                        const data = Object.entries(analysis.timeFrequency).map(([hour, count]) => ({
                                                            hour: `${hour}시`,
                                                            hourNum: parseInt(hour),
                                                            count: count
                                                        }));
                                                        data.sort((a, b) => a.hourNum - b.hourNum);
                                                        return data;
                                                    })()}>
                                                        <XAxis
                                                            dataKey="hour"
                                                            tick={{ fontSize: 12 }}
                                                            stroke="#888"
                                                        />
                                                        <YAxis
                                                            tick={{ fontSize: 12 }}
                                                            stroke="#888"
                                                            allowDecimals={false}
                                                        />
                                                        <Tooltip
                                                            contentStyle={{
                                                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                                border: '1px solid #ddd',
                                                                borderRadius: '8px'
                                                            }}
                                                            formatter={(value) => [`${value}개`, '메시지']}
                                                        />
                                                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                                            {(() => {
                                                                const data = Object.entries(analysis.timeFrequency).map(([hour, count]) => ({
                                                                    hour: `${hour}시`,
                                                                    hourNum: parseInt(hour),
                                                                    count: count
                                                                }));
                                                                data.sort((a, b) => a.hourNum - b.hourNum);
                                                                return data;
                                                            })().map((entry, index) => (
                                                                <Cell
                                                                    key={`cell-${index}`}
                                                                    fill={`hsl(${220 + index * 5}, 70%, 60%)`}
                                                                />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}

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
                                                        onClick={() => handleCopy(r)}
                                                    >
                                                        복사
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
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
            </div >
        </div >
    );
}

export default App;
