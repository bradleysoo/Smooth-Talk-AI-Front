import React from 'react';

const UsageGuideToast = ({ onClose, onDoNotShowAgain }) => {
    const [currentPage, setCurrentPage] = React.useState(0);

    const handleNext = () => {
        if (currentPage < 3) {
            setCurrentPage(currentPage + 1);
        } else {
            onClose();
        }
    };

    const handlePrev = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    };

    return (
        <div className="usage-guide-toast">
            <div className="usage-guide-header">
                <h3>Smooth Talk AI 사용 가이드</h3>
                <button className="usage-guide-close-btn" onClick={onClose} aria-label="닫기">
                    &times;
                </button>
            </div>

            <div className="usage-guide-content-wrapper">
                {currentPage === 0 && (
                    <div className="usage-guide-content fade-in">
                        <p className="usage-guide-welcome"><b>Smooth Talk AI에 오신 것을 환영합니다!</b></p>
                        <p>
                            두 분의 카카오톡 혹은 일반 <b>대화 패턴</b>을 분석하고 숨겨진 의미를 파악하여,<br />
                            <b>친밀도를 높이고 관계를 발전</b>시킬 수 있는<br />
                            <b>실질적인 대화 노하우와 핵심 인사이트</b>를 알려드립니다.
                        </p>
                        <div className="usage-guide-icon-placeholder">
                            👋
                        </div>
                    </div>
                )}

                {currentPage === 1 && (
                    <div className="usage-guide-content fade-in">
                        <p className="usage-guide-step"><b>Step 1-1. 메뉴 열기</b></p>
                        <ol>
                            <li>카카오톡 상대 채팅방 우측 상단의<br /><b>메뉴 버튼(≡)</b>을 눌러주세요.</li>
                        </ol>
                        <div className="usage-guide-icon-placeholder" style={{ fontSize: '40px', marginTop: '10px' }}>
                            ☰
                        </div>
                    </div>
                )}

                {currentPage === 2 && (
                    <div className="usage-guide-content fade-in">
                        <p className="usage-guide-step"><b>Step 1-2. 대화 내보내기</b></p>
                        <div className="usage-guide-os-section">
                            <p className="usage-guide-sub-title"><b>Windows</b></p>
                            <ol>
                                <li>우측 하단 <b>[대화 내용]</b> &gt; <b>[대화 내보내기]</b></li>
                                <li><b>텍스트 메시지만 보내기</b> 선택</li>
                            </ol>
                        </div>
                        <div className="usage-guide-os-section">
                            <p className="usage-guide-sub-title"><b>Mac</b></p>
                            <ol>
                                <li><b>[채팅방 설정]</b> &gt; <b>[대화 내용 관리]</b></li>
                                <li><b>[대화 내용 저장]</b> &gt; <b>텍스트 파일로 저장</b></li>
                            </ol>
                        </div>
                    </div>
                )}

                {currentPage === 3 && (
                    <div className="usage-guide-content fade-in">
                        <p className="usage-guide-step"><b>Step 2. 업로드 및 분석</b></p>
                        <ol>
                            <li>저장된 <b>.txt 파일</b> 혹은 <b>.csv 파일</b>을 채팅창에 드래그하거나 업로드 버튼을 누르세요.</li>
                            <li><b>[분석하기]</b> 버튼을 눌러 결과를 확인하세요!</li>
                            <li>추가적인 대화는 <b>Smooth Talk AI</b> 안에서 입력하세요.</li>
                        </ol>
                        <p className="usage-guide-tip">
                            💡 <b>Tip:</b> 대화량이 많을수록 더 정확한 분석이 나옵니다.
                        </p>
                    </div>
                )}
            </div>

            <div className="usage-guide-dots">
                {[0, 1, 2, 3].map((idx) => (
                    <span
                        key={idx}
                        className={`usage-guide-dot ${currentPage === idx ? 'active' : ''}`}
                        onClick={() => setCurrentPage(idx)}
                    />
                ))}
            </div>

            <div className="usage-guide-footer">
                <button className="usage-guide-btn-secondary" onClick={onDoNotShowAgain}>
                    일주일간 보지 않기
                </button>
                <div className="usage-guide-nav-buttons">
                    {currentPage > 0 && (
                        <button className="usage-guide-btn-nav prev" onClick={handlePrev}>
                            이전
                        </button>
                    )}
                    <button className="usage-guide-btn-primary" onClick={handleNext}>
                        {currentPage === 3 ? '시작하기' : '다음'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UsageGuideToast;
