/* eslint-disable */
// frontend/src/components/admin/content-resources/DeleteResourceButton.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { apiCall } from '@/utils/adminApi';
import ErrorMessage from '@/components/ui/ErrorMessage';

interface DeleteResourceButtonProps {
    resourceId: number;
    onSuccess: () => void;
}

const DeleteResourceButton: React.FC<DeleteResourceButtonProps> = ({ resourceId, onSuccess }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this resource?')) {
            setIsLoading(true);
            setError(null);
            try {
                await apiCall(`/api/v1/admin/content-resources/${resourceId}`,
                {
                    method: 'DELETE',
                });
                onSuccess();
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isLoading}>
                {isLoading ? 'Deleting...' : 'Delete'}
            </Button>
            {error && <ErrorMessage message={error} />}
        </>
    );
};

export default DeleteResourceButton;