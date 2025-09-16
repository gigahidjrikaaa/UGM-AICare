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

interface EditableResource {
  id?: number;
  title: string;
  content: string;
  source: string | null;
  description?: string | null;
  type: string;
  tags?: string[];
}

interface ContentResourceFormProps {
  resource?: EditableResource;
  onSuccess: () => void;
}

const ContentResourceForm: React.FC<ContentResourceFormProps> = ({ resource, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: resource?.title ?? '',
    type: resource?.type ?? 'text',
    content: resource?.content ?? '',
    source: resource?.source ?? '',
    description: resource?.description ?? '',
    tags: resource?.tags?.join(', ') ?? '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const payload = new FormData();
      payload.append('title', formData.title);
      payload.append('type', formData.type);
      if (formData.description) payload.append('description', formData.description);
      if (formData.tags) payload.append('tags', formData.tags);

      if (formData.type === 'text') {
        if (!formData.content) {
          throw new Error('Content is required for text resources.');
        }
        payload.append('content', formData.content);
      }

      if (formData.type === 'url') {
        if (!formData.source) {
          throw new Error('A valid URL is required for URL resources.');
        }
        payload.append('source', formData.source);
      }

      if (formData.type === 'pdf') {
        if (file) {
          payload.append('file', file);
        } else if (!resource) {
          throw new Error('Please upload a PDF file.');
        }
        if (formData.source) {
          payload.append('source', formData.source);
        }
      }

      if (resource) {
        await apiCall('/api/v1/admin/content-resources/' + resource.id,
          {
            method: 'PUT',
            body: payload,
          });
      } else {
        await apiCall('/api/v1/admin/content-resources', {
          method: 'POST',
          body: payload,
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
    <form onSubmit={handleSubmit} className="space-y-6" encType="multipart/form-data">
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

      <Input
        name="description"
        label="Description"
        value={formData.description}
        onChange={handleChange}
        placeholder="Short summary to help admins find this resource"
        className="w-full pl-10 pr-3 py-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm hover:bg-white/10"
      />

      <Input
        name="tags"
        label="Tags"
        value={formData.tags}
        onChange={handleChange}
        placeholder="Comma separated e.g. anxiety, self-care"
        className="w-full pl-10 pr-3 py-3 bg-white/8 border border-white/15 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 outline-none transition-all duration-300 backdrop-blur-sm hover:bg-white/10"
      />

      {formData.type === 'url' && (
        <Input
          name="source"
          label="URL"
          value={formData.source}
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
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-300">PDF File</label>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-white file:mr-4 file:rounded-md file:border-0 file:bg-white/20 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-white/30"
          />
        </div>
      )}

      {error && <ErrorMessage message={error} />}

      <Button type="submit" disabled={isLoading} className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-[#FFCA40] to-[#FFD700] text-[#001D58] font-semibold rounded-xl hover:from-[#FFD700] hover:to-[#FFCA40] focus:outline-none focus:ring-2 focus:ring-[#FFCA40] focus:ring-offset-2 focus:ring-offset-transparent transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed group shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
        {isLoading ? 'Saving...' : 'Save Resource'}
      </Button>
    </form>
  );
};

export default ContentResourceForm;
