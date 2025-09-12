'use client';

import React, { useState } from 'react';
import { apiCall } from '@/utils/adminApi';
import { FiTrash2 } from 'react-icons/fi';

interface DeleteCbtModuleStepButtonProps {
    stepId: number;
    onSuccess: () => void;
}

const DeleteCbtModuleStepButton: React.FC<DeleteCbtModuleStepButtonProps> = ({ stepId, onSuccess }) => {
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this step?')) {
            setIsDeleting(true);
            try {
                await apiCall(`/api/v1/admin/cbt-modules/steps/${stepId}`, {
                    method: 'DELETE',
                });
                onSuccess();
            } catch (err: any) {
                alert('Failed to delete step: ' + err.message);
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

export default DeleteCbtModuleStepButton;
