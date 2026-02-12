import React, { useState, useRef, useEffect } from 'react';

interface QuantityInputProps {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    disabled?: boolean;
}

export const QuantityInput: React.FC<QuantityInputProps> = ({
    value,
    onChange,
    min = 1,
    max = 999,
    disabled = false
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState(value.toString());
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleClick = () => {
        if (!disabled) {
            setInputValue(value.toString());
            setIsEditing(true);
        }
    };

    const handleBlur = () => {
        saveValue();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            saveValue();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
            setInputValue(value.toString());
        }
    };

    const saveValue = () => {
        const numValue = parseInt(inputValue);
        if (!isNaN(numValue) && numValue >= min && numValue <= max) {
            onChange(numValue);
        } else {
            setInputValue(value.toString());
        }
        setIsEditing(false);
    };

    const handleIncrement = () => {
        if (!disabled && value < max) {
            onChange(value + 1);
        }
    };

    const handleDecrement = () => {
        if (!disabled && value > min) {
            onChange(value - 1);
        }
    };

    if (isEditing) {
        return (
            <input
                ref={inputRef}
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                min={min}
                max={max}
                className="w-12 px-1.5 text-xs font-mono text-white text-center bg-slate-700 border border-blue-500 rounded outline-none"
            />
        );
    }

    return (
        <div className="flex items-center bg-slate-900 rounded-lg border border-slate-700 h-7 overflow-hidden">
            <button
                onClick={handleDecrement}
                disabled={disabled || value <= min}
                className="px-2 h-full hover:bg-slate-800 text-slate-400 hover:text-white text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
                -
            </button>
            <span
                onClick={handleClick}
                className="px-1.5 text-xs font-mono text-white min-w-[20px] text-center cursor-pointer hover:bg-slate-800 h-full flex items-center justify-center transition-colors"
                title="Clique para editar"
            >
                {value}
            </span>
            <button
                onClick={handleIncrement}
                disabled={disabled || value >= max}
                className="px-2 h-full hover:bg-slate-800 text-slate-400 hover:text-white text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
                +
            </button>
        </div>
    );
};
