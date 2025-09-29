'use client';

import React, { useState } from 'react';
import { apiCall } from '@/utils/adminApi';
import { FiTrash2 } from 'react-icons/fi';

interface DeleteCbtModuleButtonProps {
    moduleId: number;
    onSuccess: () => void;
}

const DeleteCbtModuleButton: React.FC<DeleteCbtModuleButtonProps> = ({ moduleId, onSuccess }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this module?')) {
            setIsDeleting(true);
            try {
                await apiCall(`/api/v1/admin/cbt-modules/${moduleId}`, {
                    method: 'DELETE',
                });
                onSuccess();
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to delete module';
                alert(`Failed to delete module: ${message}`);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    return (
        <button onClick={handleDelete} disabled={isDeleting} className="text-red-500 hover:text-red-400">
            {isDeleting ? '...' : <FiTrash2 />}
        </button>
    );
};

export default DeleteCbtModuleButton;
