import React from 'react';

export function LoadingScreen() {
    return (
        <div className="flex h-full w-full items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    );
}
