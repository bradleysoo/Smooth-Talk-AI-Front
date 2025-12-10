import React from 'react';

const UsageGuideToast = ({ onClose, onDoNotShowAgain }) => {
    return (
        <div className="usage-guide-toast">
            <div className="usage-guide-header">
                <h3>Smooth Talk AI 사용 가이드</h3>
                <button className="usage-guide-close-btn" onClick={onClose} aria-label="닫기">
                    &times;
                </button>
            </div>
            <div className="usage-guide-content">
                <p>Smooth Talk AI에 오신 것을 환영합니다!</p>
                <ol>
                    <li>카카오톡 채팅방에서 <b>[내보내기]</b>를 선택하여 대화 내용을 저장하세요.</li>
                    <li>저장된 <b>.txt 파일</b>을 채팅창에 업로드하거나 드래그 앤 드롭하세요.</li>
                    <li><b>[분석하기]</b> 버튼을 눌러 대화 패턴과 통계를 확인해보세요!</li>
                </ol>
                <p className="usage-guide-tip">
                    💡 <b>Tip:</b> 여러 날짜의 대화가 포함된 파일을 올리면 더 정확한 분석이 가능합니다.
                </p>
            </div>
            <div className="usage-guide-footer">
                <button className="usage-guide-btn-secondary" onClick={onDoNotShowAgain}>
                    일주일간 보지 않기
                </button>
                <button className="usage-guide-btn-primary" onClick={onClose}>
                    닫기
                </button>
            </div>
        </div>
    );
};

export default UsageGuideToast;
