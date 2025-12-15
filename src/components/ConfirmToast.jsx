import React from 'react';

const ConfirmToast = ({ message, onConfirm, onCancel }) => {
    return (
        <div className="confirm-toast">
            <div className="confirm-toast-content">
                <span className="confirm-icon">ℹ️</span>
                <span>{message}</span>
            </div>
            <div className="confirm-toast-actions">
                <button className="confirm-btn-primary" onClick={onConfirm}>확인</button>
                <button className="confirm-btn-secondary" onClick={onCancel}>취소</button>
            </div>
        </div>
    );
};

export default ConfirmToast;
