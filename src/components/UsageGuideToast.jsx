import React from 'react';

const UsageGuideToast = ({ onClose, onDoNotShowAgain }) => {
    const [currentPage, setCurrentPage] = React.useState(0);

    const handleNext = () => {
        if (currentPage < 2) {
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
                            이 서비스는 카카오톡 대화 내용을 분석하여<br />
                            대화 패턴, 통계, 그리고 재미있는 인사이트를 제공합니다.
                        </p>
                        <div className="usage-guide-icon-placeholder">
                            👋
                        </div>
                    </div>
                )}

                {currentPage === 1 && (
                    <div className="usage-guide-content fade-in">
                        <p className="usage-guide-step"><b>Step 1. 대화 내보내기</b></p>
                        <ol>
                            <li>카카오톡 채팅방 메뉴(≡)를 엽니다.</li>
                            <li><b>[대화 내용]</b> &gt; <b>[대화 내보내기]</b>를 선택합니다.</li>
                            <li><b>텍스트 메시지만 보내기</b>를 선택하여 저장합니다.</li>
                        </ol>
                        <p className="usage-guide-tip">
                            💡 <b>Tip:</b> 모바일 카카오톡에서도 가능합니다!
                        </p>
                    </div>
                )}

                {currentPage === 2 && (
                    <div className="usage-guide-content fade-in">
                        <p className="usage-guide-step"><b>Step 2. 업로드 및 분석</b></p>
                        <ol>
                            <li>저장된 <b>.txt 파일</b>을 채팅창에 드래그하거나 업로드 버튼을 누르세요.</li>
                            <li><b>[분석하기]</b> 버튼을 눌러 결과를 확인하세요!</li>
                        </ol>
                        <p className="usage-guide-tip">
                            💡 <b>Tip:</b> 대화량이 많을수록 더 정확한 분석이 나옵니다.
                        </p>
                    </div>
                )}
            </div>

            <div className="usage-guide-dots">
                {[0, 1, 2].map((idx) => (
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
                        {currentPage === 2 ? '시작하기' : '다음'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UsageGuideToast;
