/* eslint-disable */
// frontend/src/components/admin/content-resources/ContentResourceForm.tsx
'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Textarea } from '@/components/ui/TextArea';
import { apiCall } from '@/utils/adminApi';
import ErrorMessage from '@/components/ui/ErrorMessage';

interface ContentResource {
    id?: number;
    title: string;
    content: string;
    source: string | null;
    type: string;
}

interface ContentResourceFormProps {
    resource?: ContentResource;
    onSuccess: () => void;
}

const ContentResourceForm: React.FC<ContentResourceFormProps> = ({ resource, onSuccess }) => {
    const [formData, setFormData] = useState<ContentResource>(
        resource || {
            title: '',
            content: '',
            source: '',
            type: 'text',
        }
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (resource) {
                await apiCall(`/api/v1/admin/content-resources/${resource.id}`,
                {
                    method: 'PUT',
                    body: JSON.stringify(formData),
                });
            } else {
                await apiCall('/api/v1/admin/content-resources', {
                    method: 'POST',
                    body: JSON.stringify(formData),
                });
            }
            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Input
                name="title"
                label="Title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full pl-10 pr-3 py-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm hover:bg-white/10"
            />
            <Select
                name="type"
                label="Type"
                value={formData.type}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors"
            >
                <option value="text" className="bg-gray-800">Text</option>
                <option value="url" className="bg-gray-800">URL</option>
                <option value="pdf" className="bg-gray-800">PDF</option>
            </Select>

            {formData.type === 'url' && (
                <Input
                    name="source"
                    label="URL"
                    value={formData.source || ''}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm hover:bg-white/10"
                />
            )}

            {formData.type === 'text' && (
                <div className="space-y-1">
                    <label htmlFor="content" className="block text-sm font-medium text-gray-300">Content</label>
                    <Textarea
                        name="content"
                        value={formData.content}
                        onChange={handleChange}
                        required
                        className="w-full min-h-[150px] p-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm hover:bg-white/10"
                    />
                </div>
            )}

            {formData.type === 'pdf' && (
                <Input
                    type="file"
                    name="file"
                    label="PDF File"
                    onChange={(e) => { /* Handle file upload */ }}
                    className="w-full text-white"
                />
            )}

            {error && <ErrorMessage message={error} />}

            <Button type="submit" disabled={isLoading} className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-[#FFCA40] to-[#FFD700] text-[#001D58] font-semibold rounded-xl hover:from-[#FFD700] hover:to-[#FFCA40] focus:outline-none focus:ring-2 focus:ring-[#FFCA40] focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed group shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                {isLoading ? 'Saving...' : 'Save Resource'}
            </Button>
        </form>
    );
};

export default ContentResourceForm;
