import React, { useEffect } from 'react';

const ErrorToast = ({ message, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="error-toast">
            <div className="error-toast-content">
                <span className="error-icon">⚠️</span>
                <span>{message}</span>
            </div>
            <button className="error-toast-close" onClick={onClose}>&times;</button>
        </div>
    );
};

export default ErrorToast;
